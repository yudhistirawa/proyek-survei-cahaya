#!/usr/bin/env node

/**
 * Script untuk testing komponen Survey Existing
 * Jalankan dengan: node test-survey-existing.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Survey Existing Component...\n');

// Test 1: Check if files exist
const filesToCheck = [
    'app/components/pages/SurveyExistingPage.js',
    'app/api/survey-existing/route.js',
    'app/api/upload-image/route.js',
    'app/lib/firebase.js',
    'firebase-storage-cors.json',
    'setup-firebase-cors.js'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

console.log('');

// Test 2: Check Firebase configuration
console.log('🔥 Checking Firebase configuration...');
try {
    const firebaseConfig = fs.readFileSync('app/lib/firebase.js', 'utf8');
    
    const requiredFunctions = [
        'uploadImageToStorage',
        'uploadWithCorsProxy',
        'convertImageToWebP',
        'handleStorageError'
    ];
    
    requiredFunctions.forEach(func => {
        if (firebaseConfig.includes(func)) {
            console.log(`✅ ${func} function found`);
        } else {
            console.log(`❌ ${func} function missing`);
            allFilesExist = false;
        }
    });
    
    // Check for WebP conversion
    if (firebaseConfig.includes('image/webp')) {
        console.log('✅ WebP conversion configured');
    } else {
        console.log('❌ WebP conversion not found');
        allFilesExist = false;
    }
    
    // Check for retry mechanism
    if (firebaseConfig.includes('maxRetries')) {
        console.log('✅ Retry mechanism configured');
    } else {
        console.log('❌ Retry mechanism not found');
        allFilesExist = false;
    }
    
} catch (error) {
    console.log('❌ Error reading Firebase configuration:', error.message);
    allFilesExist = false;
}

console.log('');

// Test 3: Check API routes
console.log('🌐 Checking API routes...');
try {
    const surveyApi = fs.readFileSync('app/api/survey-existing/route.js', 'utf8');
    const uploadApi = fs.readFileSync('app/api/upload-image/route.js', 'utf8');
    
    if (surveyApi.includes('POST') && surveyApi.includes('addDoc')) {
        console.log('✅ Survey API route configured');
    } else {
        console.log('❌ Survey API route incomplete');
        allFilesExist = false;
    }
    
    if (uploadApi.includes('POST') && uploadApi.includes('uploadBytes')) {
        console.log('✅ Upload API route configured');
    } else {
        console.log('❌ Upload API route incomplete');
        allFilesExist = false;
    }
    
} catch (error) {
    console.log('❌ Error reading API routes:', error.message);
    allFilesExist = false;
}

console.log('');

// Test 4: Check CORS configuration
console.log('🔒 Checking CORS configuration...');
try {
    const corsConfig = fs.readFileSync('firebase-storage-cors.json', 'utf8');
    const corsData = JSON.parse(corsConfig);
    
    if (corsData[0] && corsData[0].origin && corsData[0].method) {
        console.log('✅ CORS configuration valid');
    } else {
        console.log('❌ CORS configuration invalid');
        allFilesExist = false;
    }
    
} catch (error) {
    console.log('❌ Error reading CORS configuration:', error.message);
    allFilesExist = false;
}

console.log('');

// Test 5: Check component structure
console.log('🧩 Checking component structure...');
try {
    const component = fs.readFileSync('app/components/pages/SurveyExistingPage.js', 'utf8');
    
    const requiredFeatures = [
        'useState',
        'useEffect',
        'handleSubmit',
        'handleImageCapture',
        'uploadWithCorsProxy',
        'formData',
        'previewImages'
    ];
    
    requiredFeatures.forEach(feature => {
        if (component.includes(feature)) {
            console.log(`✅ ${feature} found in component`);
        } else {
            console.log(`❌ ${feature} missing from component`);
            allFilesExist = false;
        }
    });
    
} catch (error) {
    console.log('❌ Error reading component:', error.message);
    allFilesExist = false;
}

console.log('');

// Test 6: Check package.json for dependencies
console.log('📦 Checking dependencies...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['firebase', 'next', 'react', 'lucide-react'];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep} dependency found`);
        } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
            console.log(`✅ ${dep} dev dependency found`);
        } else {
            console.log(`❌ ${dep} dependency missing`);
            allFilesExist = false;
        }
    });
    
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
    allFilesExist = false;
}

console.log('');

// Final result
console.log('📊 Test Results:');
console.log('================');

if (allFilesExist) {
    console.log('🎉 All tests passed! Survey Existing component is ready to use.');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Navigate to the Survey Existing page');
    console.log('3. Test form submission with images');
    console.log('4. Check Firebase database for saved data');
    console.log('5. Verify WebP conversion in Firebase Storage');
} else {
    console.log('❌ Some tests failed. Please check the missing components.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure all files are created correctly');
    console.log('2. Check Firebase configuration');
    console.log('3. Verify API routes are working');
    console.log('4. Test CORS setup if needed');
}

console.log('');
console.log('📚 Documentation: SURVEY_EXISTING_SOLUTION.md');
console.log('🔧 Setup CORS: node setup-firebase-cors.js');
console.log('📞 Support: Check the documentation for troubleshooting');
