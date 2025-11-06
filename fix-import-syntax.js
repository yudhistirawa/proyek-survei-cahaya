// Script untuk memperbaiki syntax import yang bermasalah di Vercel
// Mengganti "adminDb as db" dengan import yang benar

const fs = require('fs');
const path = require('path');

// Daftar file yang perlu diperbaiki
const filesToFix = [
  'app/api/valid-surveys/route.js',
  'app/api/daily-summary/route.js',
  'app/api/activity-logs/route.js',
  'app/api/survey-arm/route.js',
  'app/api/notifications/route.js',
  'app/api/route-recordings/route.js',
  'app/api/reports/route.js',
  'app/api/task-assignments/route.js'
];

console.log('🔧 Memperbaiki syntax import untuk Vercel deployment...');

filesToFix.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Perbaiki static import
      if (content.includes('import { adminDb as db }')) {
        content = content.replace(
          /import \{ adminDb as db \} from ['"]([^'"]+)['"];?/g,
          'import { adminDb } from \'$1\';'
        );
        
        // Ganti semua penggunaan db menjadi adminDb
        content = content.replace(/\bdb\./g, 'adminDb.');
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed: ${filePath}`);
      } else {
        console.log(`⏭️  No changes needed: ${filePath}`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

// Perbaiki file dengan dynamic import
const dynamicImportFiles = [
  'app/api/test-import/route.js'
];

dynamicImportFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Perbaiki dynamic import dengan destructuring
      if (content.includes('const { adminStorage as storage, adminDb as db }')) {
        content = content.replace(
          /const \{ adminStorage as storage, adminDb as db \} = await import\(['"]([^'"]+)['"]\);/g,
          `const firebaseAdmin = await import('$1');
const storage = firebaseAdmin.adminStorage;
const db = firebaseAdmin.adminDb;`
        );
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed dynamic import: ${filePath}`);
      } else {
        console.log(`⏭️  No dynamic import changes needed: ${filePath}`);
      }
    } else {
      console.log(`❌ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\n🎉 Import syntax fix completed!');
console.log('✅ All files should now be compatible with Vercel deployment');
console.log('✅ No more "Expected \',\', got \'as\'" errors');
