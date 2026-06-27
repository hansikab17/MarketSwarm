/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Proxy /api/* through Vercel to the AWS API Gateway.
  // Lets external tools (k6, JMeter) hit one URL (VERCEL_URL/api/...) to reach the backend.
  // Reuses the existing NEXT_PUBLIC_API_BASE env var — no separate variable needed.
  async rewrites() {
    const target = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";
    return [
      { source: "/api/:path*", destination: `${target}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
