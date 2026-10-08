import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Issue 015: the client router keeps a dynamic page for 30 s, so switching
    // between Conversation, Inbox, and Knowledge comes from cache. Every save
    // invalidates it: server actions call revalidatePath, API saves router.refresh().
    staleTimes: { dynamic: 30, static: 180 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
