@echo off
chcp 65001 >nul
title Force Apply CORS to Firebase Storage

echo 🔧 Force Applying CORS Configuration to Firebase Storage
echo ========================================================
echo.

echo 📋 Bucket: aplikasi-survei-lampu-jalan.appspot.com
echo 📁 Config file: cors.json
echo.

REM Check if cors.json exists
if not exist "cors.json" (
    echo ❌ File cors.json tidak ditemukan!
    echo 📁 Pastikan file cors.json ada di direktori yang sama
    pause
    exit /b 1
)

echo ✅ File cors.json terdeteksi

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
echo 🔧 Force applying CORS configuration...
echo    Bucket: gs://aplikasi-survei-lampu-jalan.appspot.com

REM Clear existing CORS first
echo 📤 Clearing existing CORS configuration...
gsutil cors set [] gs://aplikasi-survei-lampu-jalan.appspot.com

REM Wait a moment
timeout /t 3 /nobreak >nul

REM Apply new CORS configuration
echo 📤 Applying new CORS configuration...
gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
if %errorlevel% neq 0 (
    echo ❌ Gagal apply CORS configuration!
    echo.
    echo 🔍 Troubleshooting:
    echo    1. Pastikan Anda memiliki izin untuk bucket ini
    echo    2. Pastikan nama bucket benar
    echo    3. Pastikan sudah login dengan akun yang benar
    pause
    exit /b 1
)

echo ✅ CORS configuration berhasil diapply!

REM Wait for propagation
echo.
echo ⏳ Waiting for CORS configuration to propagate...
timeout /t 10 /nobreak >nul

echo.
echo 🔍 Verifying CORS configuration...

REM Verify configuration multiple times
for /l %%i in (1,1,3) do (
    echo 📋 Verification attempt %%i/3...
    gsutil cors get gs://aplikasi-survei-lampu-jalan.appspot.com
    if %errorlevel% neq 0 (
        echo ❌ Verification attempt %%i failed
        if %%i lss 3 (
            echo ⏳ Waiting before next attempt...
            timeout /t 5 /nobreak >nul
        )
    ) else (
        echo ✅ Verification successful!
        goto :success
    )
)

echo ❌ All verification attempts failed!
pause
exit /b 1

:success
echo.
echo 🎉 CORS setup berhasil diselesaikan!
echo.
echo 📋 Summary:
echo    Project: %CURRENT_PROJECT%
echo    Bucket: gs://aplikasi-survei-lampu-jalan.appspot.com
echo    CORS: Applied successfully
echo.
echo ⚠️  Note: Perubahan mungkin perlu beberapa menit untuk diterapkan.
echo    Jika masih error CORS, coba refresh browser atau tunggu beberapa menit.
echo.
echo 🧪 Untuk testing CORS, lihat file test-cors.html
echo.
pause
