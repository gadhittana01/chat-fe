import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  reactStrictMode: false, // Temporarily disable to test duplicate requests
};

export default nextConfig;
