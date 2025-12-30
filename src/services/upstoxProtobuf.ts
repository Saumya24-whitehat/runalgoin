// Upstox Protobuf decoder for market data feed
// Based on marketDataFeed.proto from Upstox

import protobuf from "protobufjs";

// Proto definition as JSON (converted from .proto file)
const protoDefinition = {
  nested: {
    com: {
      nested: {
        upstox: {
          nested: {
            marketdatafeeder: {
              nested: {
                rpc: {
                  nested: {
                    proto: {
                      nested: {
                        LTPC: {
                          fields: {
                            ltp: { type: "double", id: 1 },
                            ltt: { type: "int64", id: 2 },
                            ltq: { type: "int64", id: 3 },
                            cp: { type: "double", id: 4 },
                          },
                        },
                        Quote: {
                          fields: {
                            bidQ: { type: "int64", id: 1 },
                            bidP: { type: "double", id: 2 },
                            askQ: { type: "int64", id: 3 },
                            askP: { type: "double", id: 4 },
                          },
                        },
                        MarketLevel: {
                          fields: {
                            bidAskQuote: { rule: "repeated", type: "Quote", id: 1 },
                          },
                        },
                        OHLC: {
                          fields: {
                            interval: { type: "string", id: 1 },
                            open: { type: "double", id: 2 },
                            high: { type: "double", id: 3 },
                            low: { type: "double", id: 4 },
                            close: { type: "double", id: 5 },
                            vol: { type: "int64", id: 6 },
                            ts: { type: "int64", id: 7 },
                          },
                        },
                        MarketOHLC: {
                          fields: {
                            ohlc: { rule: "repeated", type: "OHLC", id: 1 },
                          },
                        },
                        OptionGreeks: {
                          fields: {
                            delta: { type: "double", id: 1 },
                            theta: { type: "double", id: 2 },
                            gamma: { type: "double", id: 3 },
                            vega: { type: "double", id: 4 },
                            rho: { type: "double", id: 5 },
                          },
                        },
                        MarketFullFeed: {
                          fields: {
                            ltpc: { type: "LTPC", id: 1 },
                            marketLevel: { type: "MarketLevel", id: 2 },
                            optionGreeks: { type: "OptionGreeks", id: 3 },
                            marketOHLC: { type: "MarketOHLC", id: 4 },
                            atp: { type: "double", id: 5 },
                            vtt: { type: "int64", id: 6 },
                            oi: { type: "double", id: 7 },
                            iv: { type: "double", id: 8 },
                            tbq: { type: "double", id: 9 },
                            tsq: { type: "double", id: 10 },
                          },
                        },
                        IndexFullFeed: {
                          fields: {
                            ltpc: { type: "LTPC", id: 1 },
                            marketOHLC: { type: "MarketOHLC", id: 2 },
                          },
                        },
                        FullFeed: {
                          oneofs: {
                            FullFeedUnion: {
                              oneof: ["marketFF", "indexFF"],
                            },
                          },
                          fields: {
                            marketFF: { type: "MarketFullFeed", id: 1 },
                            indexFF: { type: "IndexFullFeed", id: 2 },
                          },
                        },
                        FirstLevelWithGreeks: {
                          fields: {
                            ltpc: { type: "LTPC", id: 1 },
                            firstDepth: { type: "Quote", id: 2 },
                            optionGreeks: { type: "OptionGreeks", id: 3 },
                            vtt: { type: "int64", id: 4 },
                            oi: { type: "double", id: 5 },
                            iv: { type: "double", id: 6 },
                          },
                        },
                        RequestMode: {
                          values: {
                            ltpc: 0,
                            full_d5: 1,
                            option_greeks: 2,
                            full_d30: 3,
                          },
                        },
                        Feed: {
                          oneofs: {
                            FeedUnion: {
                              oneof: ["ltpc", "fullFeed", "firstLevelWithGreeks"],
                            },
                          },
                          fields: {
                            ltpc: { type: "LTPC", id: 1 },
                            fullFeed: { type: "FullFeed", id: 2 },
                            firstLevelWithGreeks: { type: "FirstLevelWithGreeks", id: 3 },
                            requestMode: { type: "RequestMode", id: 4 },
                          },
                        },
                        Type: {
                          values: {
                            initial_feed: 0,
                            live_feed: 1,
                            market_info: 2,
                          },
                        },
                        MarketStatus: {
                          values: {
                            PRE_OPEN_START: 0,
                            PRE_OPEN_END: 1,
                            NORMAL_OPEN: 2,
                            NORMAL_CLOSE: 3,
                            CLOSING_START: 4,
                            CLOSING_END: 5,
                          },
                        },
                        MarketInfo: {
                          fields: {
                            segmentStatus: {
                              keyType: "string",
                              type: "MarketStatus",
                              id: 1,
                            },
                          },
                        },
                        FeedResponse: {
                          fields: {
                            type: { type: "Type", id: 1 },
                            feeds: { keyType: "string", type: "Feed", id: 2 },
                            currentTs: { type: "int64", id: 3 },
                            marketInfo: { type: "MarketInfo", id: 4 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

let FeedResponse: protobuf.Type | null = null;
let isInitialized = false;

export async function initProtobuf(): Promise<boolean> {
  if (isInitialized) return true;

  try {
    const root = protobuf.Root.fromJSON(protoDefinition);
    FeedResponse = root.lookupType(
      "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
    );
    isInitialized = true;
    console.log("Protobuf initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize protobuf:", error);
    return false;
  }
}

export interface DecodedFeedData {
  type: number;
  feeds: Record<string, any>;
  currentTs: number;
}

export function decodeProtobuf(buffer: Uint8Array): DecodedFeedData | null {
  if (!FeedResponse) {
    console.error("Protobuf not initialized");
    return null;
  }

  try {
    const message = FeedResponse.decode(buffer);
    const object = FeedResponse.toObject(message, {
      longs: Number,
      enums: Number,
      bytes: String,
      defaults: true,
    });
    return object as DecodedFeedData;
  } catch (error) {
    // Silently fail for invalid messages
    return null;
  }
}
