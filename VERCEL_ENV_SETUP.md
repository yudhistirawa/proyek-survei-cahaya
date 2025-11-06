# 🚀 Vercel Environment Variables Setup

## Langkah 1: Buka Vercel Dashboard
1. Pergi ke https://vercel.com/dashboard
2. Pilih project "project-gesa" 
3. Klik tab "Settings"
4. Klik "Environment Variables" di sidebar kiri

## Langkah 2: Tambahkan Environment Variables
Tambahkan variabel berikut satu per satu:

### Firebase Admin Configuration:
```
FIREBASE_ADMIN_TYPE = service_account
FIREBASE_ADMIN_PROJECT_ID = aplikasi-survei-lampu-jalan
FIREBASE_ADMIN_PRIVATE_KEY_ID = 91346f37274480785b1dc14471fd9f6edc0441d8
FIREBASE_ADMIN_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----
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
-----END PRIVATE KEY-----
FIREBASE_ADMIN_CLIENT_EMAIL = firebase-adminsdk-fbsvc@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
FIREBASE_ADMIN_CLIENT_ID = 114989173174254604388
FIREBASE_ADMIN_AUTH_URI = https://accounts.google.com/o/oauth2/auth
FIREBASE_ADMIN_TOKEN_URI = https://oauth2.googleapis.com/token
FIREBASE_ADMIN_AUTH_PROVIDER_CERT_URL = https://www.googleapis.com/oauth2/v1/certs
FIREBASE_ADMIN_CLIENT_CERT_URL = https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
```

**⚠️ PENTING untuk FIREBASE_ADMIN_PRIVATE_KEY:**
- Di Vercel, paste TANPA `\n` - gunakan actual line breaks (enter/newline) seperti di atas
- Vercel akan otomatis convert newlines menjadi format yang benar
- JANGAN copy dari dokumentasi dengan `\n` literal

## Langkah 3: Trigger Redeploy
1. Setelah menambahkan semua environment variables
2. Klik tab "Deployments"
3. Klik tombol "Redeploy" pada deployment terbaru
4. Atau push commit baru ke GitHub untuk trigger deployment otomatis

## Langkah 4: Verifikasi
- Cek deployment logs untuk memastikan tidak ada error Firebase credentials
- Test aplikasi di production URL

## ⚠️ PENTING:
- Pastikan semua environment variables ditambahkan PERSIS seperti di atas
- Untuk FIREBASE_ADMIN_PRIVATE_KEY, pastikan menggunakan format yang sama (dengan \n untuk newlines)
- Set environment untuk: Production, Preview, dan Development

## 🔄 Auto Deployment
Setelah environment variables dikonfigurasi:
- Setiap git push ke branch main akan trigger deployment otomatis
- Vercel akan menggunakan environment variables yang sudah dikonfigurasi
- Deployment akan berhasil karena Firebase credentials sudah tersedia