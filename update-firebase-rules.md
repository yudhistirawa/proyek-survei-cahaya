# 🔧 Update Firebase Storage Rules

## 📋 **Masalah yang Ditemukan:**

Firebase Storage Rules saat ini **TIDAK mengizinkan** upload foto ke folder:
- `Survey Existing/{userId}/{docId}/`
- `Survey ARM/{userId}/{docId}/`
- `Survey Trafo/{userId}/{docId}/`
- dll.

## 🚀 **Solusi:**

### **1. Update Firebase Storage Rules**

Buka [Firebase Console](https://console.firebase.google.com) → Storage → Rules

**Ganti rules yang lama dengan yang baru:**

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Rules untuk folder kmz dan semua subfolder
    match /kmz/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        || request.auth.token.admin == true
        || request.auth.token.role == 'admin';
    }
    
    // Rules untuk folder Survey Existing - mengizinkan upload foto survey
    match /Survey Existing/{userId}/{docId}/{fileName} {
      allow read: if true; // Siapa saja bisa lihat foto
      allow write: if request.auth != null 
        && request.auth.uid == userId; // Hanya user yang bersangkutan yang bisa upload
    }
    
    // Rules untuk folder survey lainnya - mengizinkan upload foto survey
    match /Survey {surveyType}/{userId}/{docId}/{fileName} {
      allow read: if true; // Siapa saja bisa lihat foto
      allow write: if request.auth != null 
        && request.auth.uid == userId; // Hanya user yang bersangkutan yang bisa upload
    }
    
    // Rules untuk folder test - hanya untuk testing
    match /test/{allPaths=**} {
      allow read, write: if true;
    }
    
    // Rules untuk folder lain - deny by default
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### **2. Deploy Rules**

Setelah update rules, klik **"Publish"** untuk deploy.

### **3. Test Upload**

Setelah rules diupdate:
1. Restart aplikasi: `npm run dev`
2. Login dengan user yang valid
3. Coba upload foto di Survey Existing
4. Cek console untuk error messages yang lebih jelas

## 🔍 **Rules Explanation:**

- **`/Survey Existing/{userId}/{docId}/{fileName}`**: Mengizinkan user dengan ID yang sama untuk upload foto
- **`request.auth != null`**: User harus sudah login
- **`request.auth.uid == userId`**: User hanya bisa upload ke folder miliknya sendiri
- **`allow read: if true`**: Siapa saja bisa lihat foto (untuk preview)

## ⚠️ **Security Features:**

✅ **User Isolation**: User hanya bisa upload ke folder miliknya sendiri  
✅ **Authentication Required**: Harus login untuk upload  
✅ **Read Access**: Foto bisa dilihat siapa saja (untuk preview)  
✅ **Default Deny**: Semua folder lain diblokir secara default  

## 🎯 **Expected Result:**

Setelah update rules:
- ✅ Upload foto berhasil
- ✅ Error "Error response data: {}" hilang
- ✅ Permission errors ditangani dengan proper error messages
- ✅ User hanya bisa upload ke folder miliknya sendiri


