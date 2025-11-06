// Script untuk mengatur CORS Firebase Storage
// Jalankan dengan: node setup-firebase-cors.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Firebase Storage CORS...');

try {
    // Baca file CORS
    const corsConfig = fs.readFileSync('firebase-storage-cors.json', 'utf8');
    console.log('✅ CORS config loaded:', corsConfig);
    
    // Tulis ke file temporary
    const tempFile = 'temp-cors.json';
    fs.writeFileSync(tempFile, corsConfig);
    
    // Jalankan command gsutil untuk mengatur CORS
    console.log('📤 Applying CORS configuration to Firebase Storage...');
    
    // Command untuk mengatur CORS
    const command = `gsutil cors set ${tempFile} gs://aplikasi-survei-lampu-jalan.appspot.com`;
    
    console.log('🚀 Running command:', command);
    console.log('⚠️  Note: You need to be authenticated with Firebase CLI first');
    console.log('💡 Run: firebase login && firebase use aplikasi-survei-lampu-jalan');
    
    // Uncomment baris di bawah jika sudah login Firebase CLI
    // execSync(command, { stdio: 'inherit' });
    
    // Hapus file temporary
    fs.unlinkSync(tempFile);
    
    console.log('✅ CORS configuration ready to apply');
    console.log('📋 Manual steps:');
    console.log('1. firebase login');
    console.log('2. firebase use aplikasi-survei-lampu-jalan');
    console.log('3. gsutil cors set firebase-storage-cors.json gs://aplikasi-survei-lampu-jalan.appspot.com');
    
} catch (error) {
    console.error('❌ Error setting up CORS:', error.message);
    console.log('💡 Alternative solution: Use Firebase Admin SDK for server-side uploads');
}
