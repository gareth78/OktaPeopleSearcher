/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  output: "standalone",
  staticPageGenerationTimeout: 120,
  reactStrictMode: true,
};

export default nextConfig;
