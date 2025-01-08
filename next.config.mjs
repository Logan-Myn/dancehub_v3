/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "**",
      },
    ],
  },
  distDir: ".next",
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://dance-hub.firebaseapp.com/__/auth/:path*'
      }
    ]
  }
};

export default nextConfig;
