import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // デプロイ時にESLintエラーを無視
    ignoreDuringBuilds: true,
  },
  typescript: {
    // デプロイ時にTypeScriptエラーを無視
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
