/** @type {import('next').NextConfig} */
const nextConfig = {
  // Konfigurasi untuk Firebase compatibility
  serverExternalPackages: ['firebase-admin'],
  
  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      '*.js': {
        loaders: ['jsx'],
        as: '*.jsx',
      },
    },
  },
  
  // Webpack configuration untuk Firebase
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Konfigurasi untuk client-side Firebase
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Handle Firebase modules
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  
  // Environment variables configuration
  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'aplikasi-survei-lampu-jalan',
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'aplikasi-survei-lampu-jalan.firebasestorage.app',
  },
  
  // Headers untuk Firebase CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Konfigurasi untuk production
  output: 'standalone',
  
  // Disable static generation untuk halaman yang menggunakan window
  trailingSlash: false,
  

  
  // Images configuration untuk Firebase Storage
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'aplikasi-survei-lampu-jalan.firebasestorage.app'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Transpile modules untuk Firebase
  transpilePackages: ['firebase'],
};

// SINTAKS BARU (ES Modules)
export default nextConfig;
