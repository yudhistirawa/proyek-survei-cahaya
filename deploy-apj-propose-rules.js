const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Firebase Storage Rules for Survey APJ Propose...');

try {
    // Deploy storage rules
    console.log('📋 Deploying storage rules...');
    execSync('firebase deploy --only storage', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname)
    });
    
    console.log('✅ Firebase Storage Rules deployed successfully!');
    console.log('🔌 Survey APJ Propose folder now accessible');
    console.log('📸 Photo uploads should work without CORS errors');
    
} catch (error) {
    console.error('❌ Failed to deploy Firebase Storage Rules:', error.message);
    console.log('💡 Make sure you are logged in to Firebase CLI');
    console.log('💡 Run: firebase login');
    process.exit(1);
}
