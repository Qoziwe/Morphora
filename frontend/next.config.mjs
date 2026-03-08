/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://192.168.10.4:5000").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;