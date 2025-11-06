@echo off
chcp 65001 >nul
title CORS Setup - Firebase Storage

echo.
echo ----------------------------------------------------
echo  Applying CORS Configuration to Firebase Storage
echo ----------------------------------------------------
echo.

set BUCKET_NAME=gs://aplikasi-survei-lampu-jalan.appspot.com
set PROJECT_ID=aplikasi-survei-lampu-jalan

echo 📋 Project: %PROJECT_ID%
echo 🪣 Bucket:  %BUCKET_NAME%
echo.

REM Check if cors.json exists
if not exist "cors.json" (
    echo ❌ ERROR: File 'cors.json' tidak ditemukan di direktori ini.
    echo    Pastikan Anda menjalankan skrip ini dari root direktori proyek.
    pause
    exit /b 1
)
echo ✅ File 'cors.json' ditemukan.

REM Check if gsutil is installed
gsutil --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Perintah 'gsutil' tidak ditemukan.
    echo    Pastikan Google Cloud SDK sudah terinstall dan ada di PATH sistem Anda.
    echo    Link download: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)
echo ✅ Perintah 'gsutil' ditemukan.

echo.
echo 🔐 Memeriksa status login Google Cloud...
gcloud auth login
if %errorlevel% neq 0 (
    echo ❌ Gagal login. Silakan coba lagi.
    pause
    exit /b 1
)

echo.
echo ⚙️  Mengatur project aktif ke '%PROJECT_ID%'...
gcloud config set project %PROJECT_ID%

echo.
echo 📤 Menerapkan konfigurasi CORS dari 'cors.json' ke bucket...
gsutil cors set cors.json %BUCKET_NAME%
if %errorlevel% neq 0 (
    echo ❌ Gagal menerapkan konfigurasi CORS.
    echo    Pastikan Anda memiliki izin 'Storage Object Admin' pada bucket.
    pause
    exit /b 1
)

echo.
echo 🔍 Memverifikasi konfigurasi CORS yang sudah terpasang...
gsutil cors get %BUCKET_NAME%

echo.
echo ----------------------------------------------------
echo  ✅ Konfigurasi CORS berhasil diterapkan!
echo.
echo  ⚠️ PENTING:
echo  1. Perubahan ini mungkin butuh beberapa menit untuk aktif sepenuhnya.
echo  2. Matikan dan nyalakan kembali server Next.js Anda (npm run dev).
echo  3. Hapus cache browser Anda (Ctrl+Shift+Delete).
echo ----------------------------------------------------
echo.
pause