@echo off
chcp 65001 >nul
title Firebase Storage CORS Setup

echo 🔧 Firebase Storage CORS Setup
echo ================================
echo.

REM Check if gcloud is installed
gcloud --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Google Cloud SDK (gcloud) tidak ditemukan!
    echo 📥 Silakan install Google Cloud SDK terlebih dahulu:
    echo    https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

echo ✅ Google Cloud SDK terdeteksi

REM Check if gsutil is available
gsutil version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ gsutil tidak ditemukan!
    echo 📥 Pastikan Google Cloud SDK sudah terinstall dengan benar
    pause
    exit /b 1
)

echo ✅ gsutil terdeteksi

REM Check if cors.json exists
if not exist "cors.json" (
    echo ❌ File cors.json tidak ditemukan!
    echo 📁 Pastikan file cors.json ada di direktori yang sama
    pause
    exit /b 1
)

echo ✅ File cors.json terdeteksi

REM Check if user is logged in
gcloud auth list --filter=status:ACTIVE --format="value(account)" >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Anda belum login ke Google Cloud
    echo 📝 Silakan login terlebih dahulu...
    gcloud auth login
)

echo ✅ Login status: OK

REM Get current project
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set CURRENT_PROJECT=%%i
if "%CURRENT_PROJECT%"=="" (
    echo ❌ Tidak ada project yang aktif
    echo 📝 Silakan set project Firebase Anda...
    set /p PROJECT_ID="Enter your Firebase Project ID: "
    gcloud config set project %PROJECT_ID%
    set CURRENT_PROJECT=%PROJECT_ID%
) else (
    echo ✅ Current project: %CURRENT_PROJECT%
)

echo.
echo 📦 Available buckets:
gsutil ls

echo.
echo 📝 Masukkan nama bucket Firebase Storage Anda:
echo    Format: gs://your-project-id.appspot.com
set /p BUCKET_NAME="Bucket name: "

REM Remove gs:// prefix if user includes it
set BUCKET_NAME=%BUCKET_NAME:gs://=%

REM Validate bucket name
if "%BUCKET_NAME%"=="" (
    echo ❌ Nama bucket tidak boleh kosong!
    pause
    exit /b 1
)

echo.
echo 🔧 Uploading CORS configuration...
echo    Bucket: gs://%BUCKET_NAME%

REM Upload CORS configuration
gsutil cors set cors.json gs://%BUCKET_NAME%
if %errorlevel% neq 0 (
    echo ❌ Gagal upload CORS configuration!
    pause
    exit /b 1
)

echo ✅ CORS configuration berhasil diupload!

echo.
echo 🔍 Verifying CORS configuration...

REM Verify configuration
gsutil cors get gs://%BUCKET_NAME%
if %errorlevel% neq 0 (
    echo ❌ Gagal verifikasi CORS configuration!
    pause
    exit /b 1
)

echo.
echo 🎉 CORS setup berhasil diselesaikan!
echo.
echo 📋 Summary:
echo    Project: %CURRENT_PROJECT%
echo    Bucket: gs://%BUCKET_NAME%
echo    CORS: Applied successfully
echo.
echo ⚠️  Note: Perubahan mungkin perlu beberapa menit untuk diterapkan.
echo    Jika masih error CORS, coba refresh browser atau tunggu beberapa menit.
echo.
pause
