// Upstox WebSocket Service for live option chain data
import { supabase } from "@/integrations/supabase/client";

interface MarketFeedData {
  ltp: number;
  oi?: number;
  volume?: number;
  prev_close?: number;
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

  // Fetch access token from runalgo
  async fetchAccessToken(): Promise<string | null> {
    try {
      const response = await fetch("https://runalgo.xyz/DoNotTouch/upstox.txt");
      const token = await response.text();
      this.accessToken = token.trim();
      console.log("Upstox access token fetched successfully");
      return this.accessToken;
    } catch (error) {
      console.error("Error fetching Upstox access token:", error);
      return null;
    }
  }

  // Get WebSocket authorization URL
  async getWebSocketUrl(): Promise<string | null> {
    if (!this.accessToken) {
      await this.fetchAccessToken();
    }

    if (!this.accessToken) {
      console.error("No access token available");
      return null;
    }

    try {
      const response = await fetch(
        "https://api.upstox.com/v3/feed/market-data-feed/authorize",
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data.authorizedRedirectUri;
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
    const url = await this.getWebSocketUrl();
    
    if (!url) {
      console.error("Failed to get WebSocket URL");
      return false;
    }

    return new Promise((resolve) => {
      try {
        console.log("Connecting to Upstox WebSocket...");
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log("Upstox WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Subscribe to pending tokens
          if (this.pendingSubscriptions.length > 0) {
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

        this.ws.onclose = () => {
          console.log("WebSocket closed");
          this.isConnected = false;
          this.handleReconnect();
        };

        this.ws.onmessage = async (event) => {
          try {
            // Handle binary data (protobuf)
            if (event.data instanceof Blob) {
              const buffer = await event.data.arrayBuffer();
              const text = new TextDecoder().decode(buffer);
              try {
                const data = JSON.parse(text);
                this.processFeedData(data);
              } catch {
                // Not JSON, might be protobuf - for now just log
                console.log("Received binary data, length:", buffer.byteLength);
              }
            } else {
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

  // Process incoming feed data
  private processFeedData(data: any) {
    if (!data || !data.feeds) return;

    const updates: FeedUpdate[] = [];

    Object.entries(data.feeds).forEach(([token, feedData]: [string, any]) => {
      const marketData = feedData?.fullFeed?.marketFF || feedData?.ff?.marketFF;
      
      if (marketData) {
        updates.push({
          token,
          data: {
            ltp: marketData.ltpc?.ltp || 0,
            oi: marketData.marketOHLC?.ohlc?.[0]?.oi || 0,
            volume: marketData.marketOHLC?.ohlc?.[0]?.vol || 0,
            prev_close: marketData.ltpc?.cp || 0,
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
