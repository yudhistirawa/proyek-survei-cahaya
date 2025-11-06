const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Firebase Storage Rules with CORS Fix...');

try {
    // Deploy storage rules
    console.log('📋 Deploying storage rules with CORS fix...');
    execSync('firebase deploy --only storage', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname)
    });
    
    console.log('✅ Firebase Storage Rules with CORS fix deployed successfully!');
    console.log('🔌 All survey folders now accessible');
    console.log('📸 Photo uploads should work without CORS errors');
    console.log('⚠️  Note: These rules are permissive for development');
    
} catch (error) {
    console.error('❌ Failed to deploy Firebase Storage Rules:', error.message);
    console.log('💡 Make sure you are logged in to Firebase CLI');
    console.log('💡 Run: firebase login');
    process.exit(1);
}
