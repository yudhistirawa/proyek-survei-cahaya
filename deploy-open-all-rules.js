const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Firebase Storage Rules - OPEN FOR ALL (DEVELOPMENT ONLY)...');

try {
    // Deploy storage rules
    console.log('📋 Deploying completely open storage rules...');
    execSync('firebase deploy --only storage', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname)
    });
    
    console.log('✅ Firebase Storage Rules - OPEN FOR ALL deployed successfully!');
    console.log('🔓 All access allowed for development');
    console.log('📸 Photo uploads should work without any restrictions');
    console.log('⚠️  WARNING: These rules are completely open - NOT FOR PRODUCTION!');
    
} catch (error) {
    console.error('❌ Failed to deploy Firebase Storage Rules:', error.message);
    console.log('💡 Make sure you are logged in to Firebase CLI');
    console.log('💡 Run: firebase login');
    process.exit(1);
}
