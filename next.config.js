// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    // Cache JS/CSS with Stale-While-Revalidate
    {
      urlPattern: ({ request }) => request.destination === 'script' || request.destination === 'style',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // Cache images with Cache First
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    // Cache critical pages with Network First strategy
    {
      urlPattern: ({ url }) => {
        const pathname = url.pathname;
        return pathname === '/apj-propose' || pathname === '/survey-existing' || pathname === '/drafts';
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'critical-pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 10, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // App pages: Network First, fallback to cache when offline
    {
      urlPattern: ({ request, url }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    // Other static assets
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/_next/static/'),
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'next-static' },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = withPWA(nextConfig);
