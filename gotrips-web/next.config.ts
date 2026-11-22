import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // image Docker gọn nhẹ (chạy bằng node server.js)
  cacheComponents: true,
  partialPrefetching: true,
  // Ảnh mock của prototype lấy từ Unsplash (xem lib/mock/images.ts).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
    ],
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
