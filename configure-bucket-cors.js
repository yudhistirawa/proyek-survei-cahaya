const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Configuring Firebase Storage Bucket CORS...');

// CORS configuration untuk development
const corsConfig = {
    cors: [
        {
            origin: ["*"], // Izinkan semua origin untuk development
            method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
            maxAgeSeconds: 3600,
            responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-*"]
        }
    ]
};

try {
    // Simpan CORS config ke file temporary
    const fs = require('fs');
    const corsFile = 'cors-config.json';
    fs.writeFileSync(corsFile, JSON.stringify(corsConfig, null, 2));
    
    console.log('📋 CORS configuration created:', corsConfig);
    
    // Deploy CORS configuration ke bucket
    console.log('🚀 Deploying CORS configuration to Firebase Storage bucket...');
    execSync(`gsutil cors set ${corsFile} gs://aplikasi-survei-lampu-jalan.appspot.com`, { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname)
    });
    
    // Cleanup temporary file
    fs.unlinkSync(corsFile);
    
    console.log('✅ CORS configuration deployed successfully!');
    console.log('🌐 All origins now allowed for development');
    console.log('📸 Photo uploads should work without CORS errors');
    
} catch (error) {
    console.error('❌ Failed to configure CORS:', error.message);
    console.log('💡 Make sure you have gsutil installed and configured');
    console.log('💡 Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
    console.log('💡 Or try the Firebase Storage rules approach instead');
    
    // Fallback: deploy storage rules
    console.log('🔄 Falling back to Firebase Storage rules deployment...');
    try {
        execSync('node deploy-cors-fix-rules.js', { 
            stdio: 'inherit',
            cwd: path.resolve(__dirname)
        });
    } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        process.exit(1);
    }
}
