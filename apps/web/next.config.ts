import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@svg-animator/engine", "@svg-animator/types"],
};

export default nextConfig;
