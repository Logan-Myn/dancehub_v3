/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
        pathname: '**',
      }
    ],
  },
  distDir: '.next',
};

export default nextConfig;
