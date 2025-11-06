import admin from 'firebase-admin';

// Resolve service account without static require (prevents bundling errors on Vercel)
let serviceAccount;
try {
  // Priority 1: Environment variable (for production/Vercel)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (json.private_key && json.private_key.includes('\\n')) {
      json.private_key = json.private_key.replace(/\\n/g, '\n');
    }
    serviceAccount = json;
    console.log('Using service account from environment variable');
  } 
  // Priority 2: Individual env vars with FIREBASE_ADMIN_ prefix (for Vercel)
  else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY || '';
    const privateKey = pk.includes('\\n') ? pk.replace(/\\n/g, '\n') : pk;
    serviceAccount = {
      type: process.env.FIREBASE_ADMIN_TYPE || 'service_account',
      project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
      private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
      auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_CERT_URL,
      universe_domain: process.env.FIREBASE_ADMIN_UNIVERSE_DOMAIN || 'googleapis.com'
    };
    console.log('Using service account from FIREBASE_ADMIN_ env vars');
  }
  // Priority 3: Individual env vars (legacy)
  else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const pk = process.env.FIREBASE_PRIVATE_KEY || '';
    const privateKey = pk.includes('\\n') ? pk.replace(/\\n/g, '\n') : pk;
    serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    };
    console.log('Using service account from individual env vars');
  }
  // Priority 4: Local file (for development)
  else {
    const r = eval('require');
    const fs = r('fs');
    const path = r('path');
    // Check root directory first
    const rootPath = path.join(process.cwd(), 'serviceAccountKey.json');
    const libPath = path.join(process.cwd(), 'app', 'lib', 'serviceAccountKey.json');
    
    if (fs.existsSync(rootPath)) {
      const raw = fs.readFileSync(rootPath, 'utf-8');
      serviceAccount = JSON.parse(raw);
      console.log('Using service account from root directory');
    } else if (fs.existsSync(libPath)) {
      const raw = fs.readFileSync(libPath, 'utf-8');
      serviceAccount = JSON.parse(raw);
      console.log('Using service account from lib directory');
    }
  }
} catch (_e) {
  // ignore
}

// Best-effort credential validation (do not throw on import)
let hasValidCert = false;
if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
  if (serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    hasValidCert = true;
  } else {
    console.error('Firebase Admin: private_key seems invalid PEM. Ensure newlines are preserved (use \\n in .env). Falling back if possible.');
  }
} else if (!serviceAccount) {
  console.error('Firebase Admin: credentials not found (serviceAccountKey.json nor FIREBASE_SERVICE_ACCOUNT_JSON). Will try applicationDefault.');
}

// Resolve bucket from env; normalize to appspot.com for Admin SDK
const envBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const requestedBucket = envBucket || 'aplikasi-survei-lampu-jalan.appspot.com';
// Admin SDK expects the GCS bucket name (typically *.appspot.com)
const storageBucket = requestedBucket.endsWith('.firebasestorage.app')
  ? requestedBucket.replace('.firebasestorage.app', '.appspot.com')
  : requestedBucket;

// Safe debug logging (tanpa kredensial sensitif)
try {
  const projectIdCandidate =
    (serviceAccount && serviceAccount.project_id) ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    '(unknown)';
  console.log('Firebase Admin: storage bucket config', {
    requestedBucket,
    resolvedBucket: storageBucket,
    projectIdCandidate,
    hasValidCert
  });
} catch (_e) {
  // ignore logging errors
}

if (!admin.apps.length) {
  try {
    if (hasValidCert) {
      // Ensure projectId is present
      const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket,
        projectId,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
      });
    } else {
      // Do not rely on implicit ADC for local dev; surface a clearer guidance.
      const hint = 'Set FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID in .env.local';
      console.error('Firebase Admin: no credentials configured. ' + hint);
      throw new Error('Firebase Admin credentials missing. ' + hint);
    }
  } catch (e) {
    console.error('Firebase Admin init error:', e);
  }
}

// Lazy getters to avoid throwing on import when Admin isn't initialized
const adminInitialized = () => admin.apps && admin.apps.length > 0;

// Storage accessor
const adminStorage = {
  bucket: (name) => {
    if (!adminInitialized()) {
      throw new Error('Firebase Admin not initialized: no default app. Check your service account envs.');
    }
    try {
      return name ? admin.storage().bucket(name) : admin.storage().bucket();
    } catch (err) {
      console.error('Error accessing Firebase Storage bucket:', err);
      throw err;
    }
  }
};

// Helper: get default Bucket instance for convenience in routes
const getAdminBucket = () => {
  return adminStorage.bucket();
};

// Firestore accessor with better error handling
let adminDb = null;
let adminApp = null;
let adminAuth = null;

try {
  if (adminInitialized()) {
    adminDb = admin.firestore();
    adminApp = admin.app();
    adminAuth = admin.auth();
  } else {
    console.warn('Firebase Admin not initialized - some API endpoints may not work');
  }
} catch (error) {
  console.error('Error accessing Firebase Admin services:', error);
}

// Helper: optional verification of Firebase ID token. Returns null if no token/invalid.
const verifyIdTokenOptional = async (authHeader) => {
  try {
    if (!adminAuth) return null;
    if (!authHeader || typeof authHeader !== 'string') return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
    const token = parts[1];
    if (!token) return null;
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) return null;
    return { uid: decoded.uid, decodedToken: decoded };
  } catch (_e) {
    return null;
  }
};

// Helper function untuk menghapus file dari storage
const deleteFileFromStorage = async (filePath) => {
  try {
    const bucket = adminStorage.bucket();
    await bucket.file(filePath).delete();
    console.log(`✅ File berhasil dihapus: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error menghapus file ${filePath}:`, error);
    return false;
  }
};

// Helper function untuk test koneksi storage
const testStorageConnection = async () => {
  try {
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Firebase Storage connection test berhasil');
    return { success: true, bucketName: bucket.name, fileCount: files.length };
  } catch (error) {
    console.error('❌ Firebase Storage connection test gagal:', error);
    return { success: false, error: error.message };
  }
};

export { adminApp, adminStorage, adminDb, adminAuth, verifyIdTokenOptional, deleteFileFromStorage, testStorageConnection, getAdminBucket };
