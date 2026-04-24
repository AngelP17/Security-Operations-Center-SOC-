/** @type {import('next').NextConfig} */
import path from "node:path";

const nextConfig = {
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(process.cwd());
    return config;
  }
};

export default nextConfig;
