// Upstox WebSocket Service for live option chain data
import { supabase } from "@/integrations/supabase/client";
import { initProtobuf, decodeProtobuf, DecodedFeedData } from "./upstoxProtobuf";

interface MarketFeedData {
  ltp: number;
  oi?: number;
  volume?: number;
  prev_close?: number;
  change?: number;
  changePercent?: number;
  iv?: number;
  delta?: number;
  theta?: number;
  gamma?: number;
  vega?: number;
  timestamp?: number;
}

interface FeedUpdate {
  token: string;
  data: MarketFeedData;
}

type FeedCallback = (updates: FeedUpdate[]) => void;

class UpstoxWebSocketService {
  private ws: WebSocket | null = null;
  private accessToken: string | null = null;
  private subscribedTokens: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private feedCallback: FeedCallback | null = null;
  private isConnected = false;
  private pendingSubscriptions: string[] = [];
  private symbolType: string = "NSE";
  private messageCount = 0;
  private protobufInitialized = false;

  // Fetch access token and WebSocket URL via edge function (avoids CORS)
  async getWebSocketUrl(): Promise<string | null> {
    try {
      console.log("Fetching WebSocket URL via edge function...");
      
      const { data, error } = await supabase.functions.invoke("upstox-websocket", {
        body: { action: "getWebSocketUrl" },
      });

      if (error) {
        console.error("Edge function error:", error);
        return null;
      }

      if (data?.websocketUrl) {
        this.accessToken = data.accessToken;
        console.log("WebSocket URL obtained successfully");
        return data.websocketUrl;
      }

      console.error("No WebSocket URL in response:", data);
      return null;
    } catch (error) {
      console.error("Error fetching WebSocket URL:", error);
      return null;
    }
  }

  // Set the callback for feed updates
  setFeedCallback(callback: FeedCallback) {
    this.feedCallback = callback;
  }

  // Set symbol type for token formatting
  setSymbolType(type: string) {
    this.symbolType = type;
  }

  // Format token with exchange prefix
  formatToken(token: string): string {
    if (!token) return "";
    
    // Skip if already has a prefix
    if (token.includes("_FO|") || token.includes("_INDEX")) return token;

    // Add prefix based on symbol type
    if (this.symbolType === "BSE") return "BSE_FO|" + token;
    if (this.symbolType === "CUR") return "NCD_FO|" + token;
    if (this.symbolType === "MCX") return "MCX_FO|" + token;
    return "NSE_FO|" + token;
  }

  // Connect to WebSocket
  async connect(): Promise<boolean> {
    // Initialize protobuf first
    if (!this.protobufInitialized) {
      this.protobufInitialized = await initProtobuf();
      if (!this.protobufInitialized) {
        console.warn("Protobuf initialization failed, will try JSON decoding only");
      }
    }

    const url = await this.getWebSocketUrl();
    
    if (!url) {
      console.error("Failed to get WebSocket URL");
      return false;
    }

    return new Promise((resolve) => {
      try {
        console.log("Connecting to Upstox WebSocket:", url.substring(0, 50) + "...");
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log("Upstox WebSocket connected successfully!");
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Subscribe to pending tokens
          if (this.pendingSubscriptions.length > 0) {
            console.log(`Subscribing to ${this.pendingSubscriptions.length} pending tokens`);
            this.subscribe(this.pendingSubscriptions);
            this.pendingSubscriptions = [];
          }

          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          resolve(false);
        };

        this.ws.onclose = (event) => {
          console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
          this.isConnected = false;
          this.handleReconnect();
        };

        this.ws.onmessage = async (event) => {
          try {
            this.messageCount++;
            
            // Handle binary data (protobuf)
            if (event.data instanceof Blob) {
              const buffer = await event.data.arrayBuffer();
              const uint8Array = new Uint8Array(buffer);
              
              // Try protobuf decoding first (this is the expected format from Upstox)
              const decoded = decodeProtobuf(uint8Array);
              if (decoded && decoded.feeds) {
                this.processDecodedFeed(decoded);
                return;
              }
              
              // Fallback: try to decode as JSON
              try {
                const text = new TextDecoder().decode(uint8Array);
                const data = JSON.parse(text);
                this.processFeedData(data);
              } catch {
                // Silent fail for unparseable messages
                if (this.messageCount % 100 === 0) {
                  console.log(`Received ${this.messageCount} messages`);
                }
              }
            } else if (typeof event.data === "string") {
              const data = JSON.parse(event.data);
              this.processFeedData(data);
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        resolve(false);
      }
    });
  }

  // Process decoded protobuf feed data
  private processDecodedFeed(decoded: DecodedFeedData) {
    if (!decoded.feeds) return;

    const updates: FeedUpdate[] = [];

    Object.entries(decoded.feeds).forEach(([token, feed]: [string, any]) => {
      // Handle different feed types from protobuf
      const fullFeed = feed?.fullFeed;
      const marketFF = fullFeed?.marketFF;
      const indexFF = fullFeed?.indexFF;
      const ltpcDirect = feed?.ltpc;

      // Get LTPC data from various paths
      const ltpc = marketFF?.ltpc || indexFF?.ltpc || ltpcDirect;
      
      if (ltpc && ltpc.ltp) {
        const optionGreeks = marketFF?.optionGreeks;
        const cp = ltpc.cp || 0;
        const ltp = ltpc.ltp;
        const change = ltp - cp;
        const changePercent = cp ? (change / cp) * 100 : 0;

        updates.push({
          token,
          data: {
            ltp,
            oi: marketFF?.oi || 0,
            volume: marketFF?.vtt || 0,
            prev_close: cp,
            change,
            changePercent,
            iv: marketFF?.iv || 0,
            delta: optionGreeks?.delta,
            theta: optionGreeks?.theta,
            gamma: optionGreeks?.gamma,
            vega: optionGreeks?.vega,
            timestamp: Date.now(),
          },
        });
      }
    });

    if (updates.length > 0) {
      if (this.messageCount % 50 === 0) {
        console.log(`Live feed: ${updates.length} updates, sample LTP: ${updates[0]?.data.ltp}`);
      }
      if (this.feedCallback) {
        this.feedCallback(updates);
      }
    }
  }


  // Process incoming feed data (JSON format)
  private processFeedData(data: any) {
    if (!data || !data.feeds) return;

    const updates: FeedUpdate[] = [];

    Object.entries(data.feeds).forEach(([token, feedData]: [string, any]) => {
      // Try multiple data paths as Upstox format can vary
      const marketData = 
        feedData?.fullFeed?.marketFF || 
        feedData?.ff?.marketFF ||
        feedData?.ltpc ||
        feedData;
      
      if (marketData) {
        const ltp = marketData.ltpc?.ltp || marketData.ltp || 0;
        const cp = marketData.ltpc?.cp || marketData.cp || 0;
        const change = ltp - cp;
        const changePercent = cp ? (change / cp) * 100 : 0;

        updates.push({
          token,
          data: {
            ltp,
            oi: marketData.marketOHLC?.ohlc?.[0]?.oi || marketData.oi || 0,
            volume: marketData.marketOHLC?.ohlc?.[0]?.vol || marketData.vol || 0,
            prev_close: cp,
            change,
            changePercent,
            timestamp: Date.now(),
          },
        });
      }
    });

    if (updates.length > 0 && this.feedCallback) {
      this.feedCallback(updates);
    }
  }

  // Subscribe to tokens
  subscribe(tokens: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not ready, queueing subscriptions");
      this.pendingSubscriptions.push(...tokens);
      return;
    }

    // Format tokens and filter empty ones
    const formattedTokens = tokens
      .map((t) => this.formatToken(t))
      .filter((t) => t && !this.subscribedTokens.has(t));

    if (formattedTokens.length === 0) return;

    // Add to subscribed set
    formattedTokens.forEach((t) => this.subscribedTokens.add(t));

    // Send subscription in batches of 100
    const batchSize = 100;
    for (let i = 0; i < formattedTokens.length; i += batchSize) {
      const batch = formattedTokens.slice(i, i + batchSize);
      
      const request = {
        guid: `sub_${Date.now()}_${i}`,
        method: "sub",
        data: {
          mode: "full",
          instrumentKeys: batch,
        },
      };

      try {
        const buffer = new TextEncoder().encode(JSON.stringify(request)).buffer;
        this.ws.send(buffer);
        console.log(`Subscribed to ${batch.length} tokens`);
      } catch (error) {
        console.error("Error sending subscription:", error);
      }
    }
  }

  // Unsubscribe from tokens
  unsubscribe(tokens: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const formattedTokens = tokens
      .map((t) => this.formatToken(t))
      .filter((t) => this.subscribedTokens.has(t));

    if (formattedTokens.length === 0) return;

    // Remove from subscribed set
    formattedTokens.forEach((t) => this.subscribedTokens.delete(t));

    const request = {
      guid: `unsub_${Date.now()}`,
      method: "unsub",
      data: {
        mode: "full",
        instrumentKeys: formattedTokens,
      },
    };

    try {
      const buffer = new TextEncoder().encode(JSON.stringify(request)).buffer;
      this.ws.send(buffer);
      console.log(`Unsubscribed from ${formattedTokens.length} tokens`);
    } catch (error) {
      console.error("Error sending unsubscription:", error);
    }
  }

  // Handle reconnection
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      const connected = await this.connect();
      if (connected) {
        // Resubscribe to all tokens
        const tokens = Array.from(this.subscribedTokens);
        if (tokens.length > 0) {
          this.subscribedTokens.clear();
          this.subscribe(tokens.map((t) => t.split("|")[1] || t));
        }
      }
    }, delay);
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedTokens.clear();
  }

  // Check if connected
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const upstoxWebSocket = new UpstoxWebSocketService();
