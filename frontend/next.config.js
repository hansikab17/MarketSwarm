/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Option: proxy API calls via rewrites (alternative to direct CORS)
  // Uncomment below and set NEXT_PUBLIC_API_BASE="" to use proxy mode
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/:path*`,
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
