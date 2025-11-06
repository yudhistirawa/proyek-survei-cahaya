// firebase-client-config.js
// Konfigurasi Firebase Client SDK untuk testing

export const firebaseClientConfig = {
  apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.firebasestorage.app",
  messagingSenderId: "231759165437",
  appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

// Environment variables yang diperlukan untuk .env.local
export const requiredEnvVars = `
# Firebase Client SDK (untuk client-side)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="aplikasi-survei-lampu-jalan.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="aplikasi-survei-lampu-jalan"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="aplikasi-survei-lampu-jalan.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="231759165437"
NEXT_PUBLIC_FIREBASE_APP_ID="1:231759165437:web:8dafd8ffff8294c97f4b94"
`;

console.log('Firebase Client Config:', firebaseClientConfig);
console.log('Required Environment Variables:', requiredEnvVars); 