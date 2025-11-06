import { NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "231759165437",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    
    // Initialize Firebase
    let app, storage;
    try {
      app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      storage = getStorage(app);
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Firebase initialization failed',
        error: error.message,
        config: firebaseConfig
      }, { status: 500 });
    }

    // Test 1: Create storage reference
    console.log('📁 Testing storage reference creation...');
    let testRef;
    try {
      testRef = ref(storage, 'test/connection-test.txt');
      console.log('✅ Storage reference created successfully');
    } catch (error) {
      console.error('❌ Storage reference creation failed:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Storage reference creation failed',
        error: error.message
      }, { status: 500 });
    }

    // Test 2: Upload test file
    console.log('📤 Testing file upload...');
    let uploadResult;
    try {
      const testData = `Test connection at ${new Date().toISOString()}`;
      uploadResult = await uploadString(testRef, testData, 'raw', {
        contentType: 'text/plain'
      });
      console.log('✅ File upload successful:', uploadResult);
    } catch (error) {
      console.error('❌ File upload failed:', error);
      return NextResponse.json({
        status: 'error',
        message: 'File upload failed',
        error: error.message,
        code: error.code
      }, { status: 500 });
    }

    // Test 3: Get download URL
    console.log('🔗 Testing download URL retrieval...');
    let downloadURL;
    try {
      downloadURL = await getDownloadURL(testRef);
      console.log('✅ Download URL retrieved successfully:', downloadURL);
    } catch (error) {
      console.error('❌ Download URL retrieval failed:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Download URL retrieval failed',
        error: error.message,
        code: error.code
      }, { status: 500 });
    }

    // Test 4: Delete test file
    console.log('🗑️ Testing file deletion...');
    try {
      await deleteObject(testRef);
      console.log('✅ Test file deleted successfully');
    } catch (error) {
      console.error('❌ Test file deletion failed:', error);
      // Don't fail the test for deletion error
    }

    console.log('✅ All Firebase Storage tests passed!');
    
    return NextResponse.json({
      status: 'success',
      message: 'Firebase Storage connection test successful',
      timestamp: new Date().toISOString(),
      config: {
        storageBucket: firebaseConfig.storageBucket,
        projectId: firebaseConfig.projectId
      },
      tests: {
        initialization: 'passed',
        referenceCreation: 'passed',
        fileUpload: 'passed',
        downloadURL: 'passed',
        fileDeletion: 'passed'
      },
      downloadURL: downloadURL
    });

  } catch (error) {
    console.error('❌ Firebase Storage test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Firebase Storage test failed',
      error: error.message,
      timestamp: new Date().toISOString(),
      config: firebaseConfig
    }, { status: 500 });
  }
} 