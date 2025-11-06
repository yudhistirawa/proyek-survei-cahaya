/**
 * Global Error Handler untuk mencegah styling CSS hilang
 * dan menangani unhandled promise rejection
 */

// Prevent unhandled promise rejection
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', function(event) {
    console.warn('⚠️ Unhandled promise rejection caught:', event.reason);
    
    // Prevent the default browser behavior
    event.preventDefault();
    
    // Log error details
    if (event.reason) {
      console.error('❌ Promise rejection reason:', event.reason);
      
      // If it's an Error object, log the stack trace
      if (event.reason instanceof Error) {
        console.error('❌ Error stack:', event.reason.stack);
      }
    }
    
    // Show user-friendly error message
    showErrorMessage('Terjadi kesalahan yang tidak terduga. Silakan coba lagi.');
  });

  // Handle global errors
  window.addEventListener('error', function(event) {
    console.error('❌ Global error caught:', event.error);
    
    // Prevent default browser error handling
    event.preventDefault();
    
    // Log error details
    if (event.error) {
      console.error('❌ Error details:', {
        message: event.error.message,
        stack: event.error.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    }
    
    // Show user-friendly error message
    showErrorMessage('Terjadi kesalahan sistem. Silakan refresh halaman.');
  });
}

// Function to show user-friendly error message
function showErrorMessage(message) {
  // Check if error message already exists
  const existingError = document.getElementById('global-error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.id = 'global-error-message';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff6b6b;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  errorDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">⚠️</span>
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; margin-left: auto;">
        ✕
      </button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(errorDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 10000);
}

// Function to handle Firebase errors gracefully
export function handleFirebaseError(error, context = 'Unknown operation') {
  console.error(`❌ Firebase error in ${context}:`, error);
  
  let userMessage = 'Terjadi kesalahan dengan database. Silakan coba lagi.';
  
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
        userMessage = 'Anda tidak memiliki izin untuk melakukan operasi ini.';
        break;
      case 'unavailable':
        userMessage = 'Database tidak tersedia. Silakan cek koneksi internet.';
        break;
      case 'deadline-exceeded':
        userMessage = 'Operasi timeout. Silakan coba lagi.';
        break;
      case 'not-found':
        userMessage = 'Data tidak ditemukan.';
        break;
      case 'already-exists':
        userMessage = 'Data sudah ada.';
        break;
      case 'resource-exhausted':
        userMessage = 'Database penuh. Silakan hubungi administrator.';
        break;
      default:
        userMessage = `Terjadi kesalahan: ${error.code}`;
    }
  } else if (error.message) {
    userMessage = `Terjadi kesalahan: ${error.message}`;
  }
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    showErrorMessage(userMessage);
  }
  
  return userMessage;
}

// Function to handle network errors
export function handleNetworkError(error, context = 'Unknown request') {
  console.error(`❌ Network error in ${context}:`, error);
  
  let userMessage = 'Terjadi kesalahan jaringan. Silakan cek koneksi internet.';
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    userMessage = 'Gagal terhubung ke server. Silakan cek koneksi internet.';
  } else if (error.name === 'AbortError') {
    userMessage = 'Permintaan dibatalkan karena timeout. Silakan coba lagi.';
  }
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    showErrorMessage(userMessage);
  }
  
  return userMessage;
}

// Function to handle upload errors
export function handleUploadError(error, context = 'Unknown upload') {
  console.error(`❌ Upload error in ${context}:`, error);
  
  let userMessage = 'Gagal mengupload file. Silakan coba lagi.';
  
  if (error.code === 'storage/unauthorized') {
    userMessage = 'Tidak memiliki izin untuk upload. Silakan login ulang.';
  } else if (error.code === 'storage/quota-exceeded') {
    userMessage = 'Storage penuh. Silakan hubungi administrator.';
  } else if (error.code === 'storage/network-request-failed') {
    userMessage = 'Gagal terhubung ke storage. Silakan cek koneksi internet.';
  }
  
  // Show user-friendly error message
  if (typeof window !== 'undefined') {
    showErrorMessage(userMessage);
  }
  
  return userMessage;
}

// Export default error handler
const ErrorHandler = {
  handleFirebaseError,
  handleNetworkError,
  handleUploadError,
  showErrorMessage
};

export default ErrorHandler;
