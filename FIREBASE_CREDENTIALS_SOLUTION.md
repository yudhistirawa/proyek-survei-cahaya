# 🚨 FIREBASE CREDENTIALS ERROR - SOLUTION

## ❌ Error pada Vercel Deployment:
```
Firebase Admin: no credentials configured. 
Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID in .env.local
```

## ✅ SOLUSI: Environment Variables di Vercel

### 📋 Steps to Fix:

1. **Buka Vercel Dashboard**
   - Go to project → Settings → Environment Variables

2. **Tambahkan Variables berikut:**

```
FIREBASE_ADMIN_TYPE=service_account
FIREBASE_ADMIN_PROJECT_ID=aplikasi-survei-lampu-jalan
FIREBASE_ADMIN_PRIVATE_KEY_ID=[get from serviceAccountKey.json]
FIREBASE_ADMIN_PRIVATE_KEY=[get from serviceAccountKey.json] 
FIREBASE_ADMIN_CLIENT_EMAIL=[get from serviceAccountKey.json]
FIREBASE_ADMIN_CLIENT_ID=[get from serviceAccountKey.json]
FIREBASE_ADMIN_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_ADMIN_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_ADMIN_CLIENT_CERT_URL=[get from serviceAccountKey.json]
```

3. **Dimana dapat values:**
   - Buka file `serviceAccountKey.json` di local development
   - Copy values yang sesuai ke Vercel environment variables

4. **Set Environment untuk:**
   - ✅ Production  
   - ✅ Preview
   - ✅ Development

5. **Redeploy Project**
   - Trigger redeploy untuk apply environment variables

### 🔧 What was Fixed:

- ✅ Added `FIREBASE_ADMIN_` prefix support in `app/lib/firebase-admin.js`
- ✅ Enhanced credential detection priority
- ✅ Better error messages for debugging
- ✅ Fallback to multiple credential sources

### 🎯 Expected Result:

After setting environment variables, deployment logs should show:
```
✅ Using service account from FIREBASE_ADMIN_ env vars
✅ Firebase Storage berhasil diinisialisasi
✅ Firebase Firestore berhasil diinisialisasi
```

---

**Repository updated with enhanced Firebase admin configuration!**
Get values from your local `serviceAccountKey.json` and add to Vercel environment variables.