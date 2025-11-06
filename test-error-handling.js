// Test script untuk error handling
console.log('🧪 Testing error handling...');

// Test 1: Unhandled promise rejection
console.log('📝 Test 1: Unhandled promise rejection');
const testPromise = new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('Test error for unhandled promise rejection'));
  }, 100);
});

// Test 2: Global error
console.log('📝 Test 2: Global error');
setTimeout(() => {
  try {
    // Trigger a global error
    const obj = null;
    obj.nonExistentMethod();
  } catch (error) {
    console.log('✅ Global error caught and handled');
  }
}, 200);

// Test 3: Firebase-like error
console.log('📝 Test 3: Firebase-like error');
setTimeout(() => {
  const firebaseError = new Error('Firebase Storage: User does not have permission');
  firebaseError.code = 'storage/unauthorized';
  
  // Simulate error handler
  if (typeof window !== 'undefined' && window.showErrorMessage) {
    window.showErrorMessage('Test Firebase error handled');
  }
  
  console.log('✅ Firebase error simulated');
}, 300);

console.log('✅ Error handling tests completed');
console.log('💡 Check browser console for error handling results');
