/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com', // for Google profile pictures
      'firebasestorage.googleapis.com', // for Firebase Storage images
      'api.multiavatar.com' // for default avatars
    ],
  },
};

module.exports = nextConfig; 