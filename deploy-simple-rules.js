const { execSync } = require('child_process');

console.log('🚀 Deploying Simple Firebase Storage Rules...');

try {
  // Cek apakah firebase CLI terinstall
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI detected');
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it first:');
    console.error('npm install -g firebase-tools');
    console.error('Then login with: firebase login');
    process.exit(1);
  }

  // Cek apakah sudah login
  try {
    execSync('firebase projects:list', { stdio: 'pipe' });
    console.log('✅ Firebase CLI authenticated');
  } catch (error) {
    console.error('❌ Please login to Firebase first:');
    console.error('firebase login');
    process.exit(1);
  }

  // Deploy storage rules dengan rules yang sederhana
  console.log('📤 Deploying simple storage rules...');
  execSync('firebase deploy --only storage', { stdio: 'inherit' });
  
  console.log('✅ Simple Firebase Storage Rules deployed successfully!');
  console.log('🔄 Rules baru akan aktif dalam beberapa menit');
  console.log('💡 Rules ini mengizinkan upload untuk semua user yang terautentikasi');
  
} catch (error) {
  console.error('❌ Failed to deploy Firebase Storage Rules:', error.message);
  process.exit(1);
}
