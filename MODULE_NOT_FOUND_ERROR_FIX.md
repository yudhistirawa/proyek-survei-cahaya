# Perbaikan Error "Module not found: Can't resolve '../env-config'"

## Masalah
Error yang muncul: "Module not found: Can't resolve '../env-config'" di file `MapDisplay.js` pada baris 4.

## Penyebab
Path import yang salah untuk file `env-config.js`. File `env-config.js` berada di root directory, tetapi import menggunakan path relatif yang tidak tepat.

## Struktur Direktori
```
proyek-survei-cahaya/
├── env-config.js                    # File konfigurasi (root)
├── app/
│   └── components/
│       ├── MapDisplay.js           # File yang error
│       └── admin/
│           └── task-distribution/
│               ├── KMZMapComponent.js
│               └── MapComponent.js
```

## Solusi yang Diterapkan

### 1. Memperbaiki Path Import
- **File:** `app/components/MapDisplay.js`
- **Sebelum:** `import { GOOGLE_MAPS_API_KEY } from '../env-config';`
- **Sesudah:** `import { GOOGLE_MAPS_API_KEY } from '../../env-config';`

### 2. Verifikasi Path Import Lain
File-file lain sudah menggunakan path yang benar:
- `app/components/admin/task-distribution/KMZMapComponent.js`: `'../../../../env-config'` ✅
- `app/components/admin/task-distribution/MapComponent.js`: `'../../../../env-config'` ✅

## Perubahan Kode

### Sebelum:
```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../env-config';  // ❌ Path salah
import { KMZParser } from '../lib/kmzParser';
```

### Sesudah:
```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../../env-config';  // ✅ Path benar
import { KMZParser } from '../lib/kmzParser';
```

## Penjelasan Path
- Dari `app/components/MapDisplay.js` ke root directory:
  - `../` = naik ke `app/`
  - `../` = naik ke root directory
  - `env-config` = file `env-config.js`

## Hasil
- Error "Module not found" sudah teratasi
- Import `GOOGLE_MAPS_API_KEY` berfungsi dengan benar
- Aplikasi dapat mengakses konfigurasi Google Maps API
- Build process berjalan tanpa error

## Catatan
- Pastikan selalu menggunakan path relatif yang benar saat mengimpor file
- Gunakan `../../` untuk naik dua level direktori dari `app/components/`
- File `env-config.js` berisi konfigurasi terpusat untuk API keys dan Firebase
