# Vercel Environment Variables Setup Guide

## VERCEL DEPLOYMENT SETUP

### 1. Environment Variables untuk Vercel
Buka Vercel Dashboard > Project Settings > Environment Variables dan tambahkan:

```
FIREBASE_SERVICE_ACCOUNT_JSON
```

Value: Copy paste seluruh isi file serviceAccountKey.json (as JSON string)
```json
Value: Copy paste seluruh isi file serviceAccountKey.json (as JSON string)
```json
[PASTE YOUR FIREBASE SERVICE ACCOUNT JSON HERE - DO NOT COMMIT TO REPOSITORY]
```

> ⚠️ **SECURITY IMPORTANT:** Never commit Firebase credentials to your repository! Always use environment variables for production.
```

### 2. Optional Environment Variables
```
NODE_ENV=production
VERCEL=1
```

### 3. Build Settings di Vercel
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Node.js Version: 18.x atau 20.x

### 4. Domain Settings
Setelah deploy berhasil, Anda bisa:
- Gunakan domain default Vercel (projectname.vercel.app)
- Atau setup custom domain

### 5. Deployment Steps
1. Push ke GitHub repository
2. Connect repository di Vercel
3. Add environment variables
4. Deploy!

### 6. Testing Production
Setelah deploy:
- Test admin login: https://yourapp.vercel.app/admin
- Test API endpoint: https://yourapp.vercel.app/api/reports
- Test PWA functionality

### 7. Firebase Admin di Production
File `firebase-admin.js` sudah dikonfigurasi untuk:
- Development: Baca dari `serviceAccountKey.json`
- Production: Baca dari environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`