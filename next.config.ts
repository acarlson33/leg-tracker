import type { NextConfig } from "next";

const configuredAllowedOrigins =
  process.env.NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0) ?? [];

const defaultAllowedOrigins = [
  "localhost:3000",
  "127.0.0.1:3000",
  "*.app.github.dev",
];

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins]),
);

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: allowedOrigins,
  experimental: {
    serverActions: {
      allowedOrigins,
    },
    inlineCss: true,
    cssChunking: true,
  },
  cacheComponents: true,
};

export default nextConfig;
