import mongoose from "mongoose";

const globalCache = globalThis as typeof globalThis & {
  mongooseCache?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

let cache = globalCache.mongooseCache;

if (!cache) {
  cache = globalCache.mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (cache!.conn) return cache!.conn;
  if (!cache!.promise) {
    cache!.promise = mongoose.connect(uri, {
      maxPoolSize: 10,
    });
  }
  cache!.conn = await cache!.promise;
  return cache!.conn;
}
