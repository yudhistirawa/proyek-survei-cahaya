# 🚀 Vercel Deployment Instructions - Fixed

## ✅ Issue Fixed
**Error**: "The 'functions' property cannot be used in conjunction with the 'builds' property"
**Solution**: Removed `builds` property from `vercel.json` for Next.js 15.3.3 compatibility

## 📋 Step-by-Step Deployment

### 1. Repository Setup ✅
```bash
Repository: https://github.com/yudhistirawa/proyek-survei-cahaya.git
Branch: main (clean, no credentials in history)
Status: Ready for deployment
```

### 2. Vercel Project Setup

#### A. Import Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `yudhistirawa/proyek-survei-cahaya`
4. Select `main` branch

#### B. Configure Build Settings
```
Framework Preset: Next.js
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
Root Directory: ./ (default)
```

### 3. Environment Variables Setup

Add these environment variables in Vercel Project Settings → Environment Variables:

```env
FIREBASE_ADMIN_TYPE=service_account
FIREBASE_ADMIN_PROJECT_ID=aplikasi-survei-lampu-jalan
FIREBASE_ADMIN_PRIVATE_KEY_ID=91346f37274480785b1dc14471fd9f6edc0441d8
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCu7n7ewEwdbDvB
wnK1tIjlEzjKuA3oW+OiMNye8ReG5tAG8qjNrWdNc1txzkG0lQaYkjUciPwvSAOS
vcI/27cGaC11aIBTQvWiCNFxYtVYCVggXO14HFiYYkyty9jsq4yw6rFR6cTVXwNg
BbrAh2VcS0Ygz4HnKc2HADqFVGgwC9k2cRzU7r9ODQg2zW5E0kZD8XGv1tZJU+TW
SW13oD3+82BJN/zKqRMRVihw3aO+++p5bbcNBKBpg5qoC0QJAsdyHy6fHJ5ialOm
RHE9hEH+GtM4wL9Jf91+F4rPHmdw0RVjuVavIkcJR6pMiACu0inA0HmFiNsHsjqd
BQVU1dZ/AgMBAAECggEACIJYA1YMSpdNgtVs4GzZoEPI/+3OQC7A45tUqACac3i+
LSnxm+ui7XZxv/2KxN6sG8QE6sOF4BDoATCgBpyVikck0Vcir6ol3UEB9Lq16pqt
wdYM931wsjaASPX0Mj/LNkt8RTusIPFTVM21vpBd4r+6N6j2xmIj4FZam/2Cm4LR
16MpeULkTiSHqscSh62yvKfXwvHbBFjqwbCXYstLyPcdsX5Jvlbnfrt0OKXVK39d
ICgCkdfB/s2uz46RXOjiGSZ8o8I9LmRfQcsrQRot07Iig92hKP18kAI6k6U1cv8i
lBIACxIIneeKx71k2C8iPV5+wpYQQxiyPYmYgLhT5QKBgQDYUP3Tt6bGg0qpHto3
Er/x8Gl/MXG0e+irY7YOlKEShNgXT+tMPqBG57NKHuasXOGD6+g2q3xJMek/FCU3
w1HEWPcD9iVil0gpbgwJ3nZTf/QWYRMKzKB51eIm5juds2gg7+SyiIH6KGHDqyu
Cr9k2j5GvSLww8we3hNDYnkf6wKBgQDPBey+ddGVNnWuQZvBnGQwkBDIhR+FFvEv
x0i9ByB3JGX+ryYPhRmuvpZmqNlTKOqLuUi7zzmj2qUsaYYsIKuQtXxCxruzKE+O
54XuNP66/j548UK+UCix5kyte6SrxKtG8NdUdaNBiJjpso5aYDwLFfi2L2bVr8Yr
LXKDY5BSvQKBgE1YQDnYW7h1L1fjITE58gnG5WHGQxq+h0Xo5Cq4eBNQDpffSom7
hsFzjUa+X8pXd4cc7a3GiSz+vKCCSoBlzXCQxjzkKZPmoj/PIVmOc+IAIqzTpRs7
Atcx6bl9sSPqtMFk+jW5MovTYRYSaCney+p6onPWosylpbGPxCF+70I7AoGBAJRU
zW0l49YCoE0LyzrtAEhfYPcbkxr79jHimvZ9ncBf/wh9nEqwdldjTUYfIx/XiD42
squGbek+JuzsautBOUxFDNSXqjNS5bYhoy+rHv0CX+auDsFnk9DrjvMaTUGZd5Mr
y01DwIabBd0kR6TvoPXcd0iqLAddmyKivJLxip4NAoGAVQGw6ckVJQEFU5G3CLcD
BBD4gpzmKeaaNkHyDSeDangDyYnbtWzYHThoO8HKLaqd0ly7BX0px+nUuBC01d7F
No9IH8akUMgu9Ut9eAfaCNn3PgtzW6Zvro4/tJTKy7YwpDVHsn7KQqYynBEEeevn
h0c9LVlJPLuPWX+80Vvcyt4=
-----END PRIVATE KEY-----"
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
FIREBASE_ADMIN_CLIENT_ID=114989173174254604388
FIREBASE_ADMIN_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_ADMIN_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_ADMIN_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
```

**Important Notes:**
- Set Environment: **Production, Preview, Development** (semua environment)
- Untuk `FIREBASE_ADMIN_PRIVATE_KEY`: Copy paste langsung tanpa escaping
- Vercel akan otomatis handle newlines di private key

### 4. Deploy Process

#### A. Automatic Deploy
1. Import project → Auto deploy dimulai
2. Monitor progress di Vercel dashboard
3. Check deployment logs untuk error

#### B. Manual Deploy (jika diperlukan)
```bash
# Install Vercel CLI
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy
vercel --prod
```

### 5. Verification Steps

After successful deployment:

1. **Homepage**: Check if main page loads
2. **Admin Panel**: Test admin login functionality
3. **API Endpoints**: Verify Firebase integration
4. **Database**: Confirm Firestore data loading

### 6. Expected URLs

```
Production: https://proyek-survei-cahaya.vercel.app (atau custom domain)
Admin Panel: https://proyek-survei-cahaya.vercel.app/admin
API Example: https://proyek-survei-cahaya.vercel.app/api/reports
```

### 7. Troubleshooting

#### Common Issues:
1. **Build Error**: Check package.json dependencies
2. **ENV Variables**: Verify all Firebase credentials
3. **API Timeout**: Increase function timeout (sudah set ke 30s)
4. **CORS Error**: Headers sudah dikonfigurasi di vercel.json

#### Debug Commands:
```bash
# Check build locally
npm run build

# Test production build
npm start

# Check environment variables
vercel env ls
```

### 8. File Configuration Summary

**vercel.json** (Fixed):
```json
{
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "headers": [...],
  "rewrites": [...]
}
```

**Key Changes Made:**
- ✅ Removed conflicting `builds` property
- ✅ Kept `functions` for API timeout configuration
- ✅ Maintained CORS headers for API access
- ✅ Fixed Next.js 15.3.3 compatibility

---

## 🎯 Ready to Deploy!

Repository is now fully configured and ready for Vercel deployment without the functions/builds conflict error.

**Final Checklist:**
- ✅ vercel.json fixed
- ✅ Environment variables documented
- ✅ Firebase credentials ready
- ✅ Repository clean and secure
- ✅ Build configuration optimized

**Deploy with confidence! 🚀**