// env-config.js
// Konfigurasi environment variables untuk aplikasi

export const envConfig = {
  // Google Maps API Configuration
  GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8',
  // Feature flag to force Leaflet (OpenStreetMap) and bypass Google Maps
  USE_LEAFLET_ONLY: (process.env.NEXT_PUBLIC_USE_LEAFLET_ONLY || 'false').toLowerCase() === 'true',
  
  // Firebase Client SDK Configuration
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aplikasi-survei-lampu-jalan.firebaseapp.com",
  FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
  FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com",
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "231759165437",
  FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:231759165437:web:8dafd8ffff8294c97f4b94",
  
  // Firebase Admin SDK Configuration
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com",
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC96sMe0P5nQbiQ\nhmjZbWCGDmQLd07Ruhh7Id0cxr9clOHD6860/GkmQkbWS9yTDkI3htbOXgkHfNlr\nLWlqU/MPzdRRElYhBSVix/EfVqCx0PNVTaHmvulXey82AsKG/N9FmByKMRuCgOuw\ngUVYoaTgwhnMiQDZ9Knh9Aw3g0FSn83q6bju0rylHZK81l9CN5zxyBrcsLqESYRO\n0ZksUOrJwQAz2j4SFJ2aZ6OLH+mMvX16U1PcKw1aYZ2W59yziqEHuooJBwiYqn1t\nxuoInMeGB+Q3upDRpQ2Ai+pjqj3w3D/lMf51DovnrwyKZs318LWdvUroPAcNu+8g\nw5apae+zAgMBAAECggEAG9jT8m1PmEFdOCfVMOhmSlHK3pmIX50rYMam3sTPo1ob\nPniRjx0hp9/49gwalB93mx+02H6WUVg/owT+G36iubMDCj4njeDsye6qTt+LYXdT\nbrMa5bQhj9e6pO9DqbpjXJeAu8yWjYyswm06B1RwUhpz4PdHvi2vSTfZILyos94E\n7/yfXsbMA4V1dEjblAFjzAG6j72/QsWvl5QF37fm0QqAUIJjKbrmPq7qvt9M6oKd\nBgq4PXbziD6mTg7AjMtCwcMt2hBEW/i9fhEGXQgnh/kdr4Kmwtb2SnvkFenXGmgG\nA2Wo85HyA0uSTV23Rya9prqVqbEM6CtB4HXyuWiLBQKBgQDqvQqF3mAAkMv+p4d9\npFZXci4Wrm1LQkV4daiXqSgcDB8atAfQAmjuZmV+uhd8hOMkg263KNV2pb+2UOUy\nuvWs+Q9vNxNKCh33Ybl+pzQYWy4W7S+Nxp0f822wXFvA1Gz6pSi4csOg6UUiUKwZ\nOHhFRXuEaOjQkvQQJFXAtSy3FwKBgQDPHm6l4vtnsA8BRn27YNI9AMDNg/88QSbD\nIGSudGuDk6Ag9c54IMx3SG/qxd6Q+TaaG/F1Y0nXJK08z1pcaBOZmXq5EgTWD3+o\nRY4YD7qx2sryGs7Us9g5mPEHkE5r8rnTVpv460qfaKqU6V5M34QqdGjR01D1hlMv\nbxf0r/4txQKBgQDReP7R9V5wQsZ3qiJDoYoXIOI2BVOszCfYVg6rwBz14m9DUhKC\nshPXYnMCAqiAyskzxUHgmsTayxBobooJmkMwJ1V5polFEgApyQBSIH1hmsRnWyOL\nfgirAX0J23FZg3b4uLe82VTv3BqAg8MAAp95GYce4suXjPvVB8eqX0LW4wKBgGPK\nbdVPP4H9ub0LkZiuVZ0+t6ZNarRFT7/D476KKSMEBarbw9btNpZiOEoNe+atrDkk\nLXo5lGIsMauS3B6Zppfi8tYocFwSq5cPrB67tV/r4swzTmP9Irjdj4Pta1tnX1EL\n8apE83dKnqWQqvau2qb532b5QZCKX5oDFK+3++dhAoGACh0ty0HleWzz61fT7Hwj\nrdOuBDAd7kDwuxeDFyccRKeXPYaEufxc5xoCeTWzO1p7YK0nDWk0SX1Xu/mCCLPQ\nbA9cIxZd/lk87oKyokXWhxXegCqA1aUdLgpdNvgxfdreTjDXNGOktLFuE+pBOxDf\noOu+IUtjiYM+ElbGtBhDseE=\n-----END PRIVATE KEY-----\n",
  FIREBASE_ADMIN_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com"
};

// Export individual variables for convenience
export const {
  GOOGLE_MAPS_API_KEY,
  USE_LEAFLET_ONLY,
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY,
  FIREBASE_ADMIN_STORAGE_BUCKET
} = envConfig;

console.log('Environment Config loaded:', {
  GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY ? 'Set' : 'Not set',
  USE_LEAFLET_ONLY,
  FIREBASE_API_KEY: FIREBASE_API_KEY ? 'Set' : 'Not set',
  FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID ? 'Set' : 'Not set'
});
