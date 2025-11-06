@echo off
chcp 65001 >nul
title Aggressive CORS Fix - Firebase Storage

echo 🔧 Aggressive CORS Fix untuk Firebase Storage
echo =============================================
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
echo 🔧 Step 1: Force clearing ALL CORS configurations...
echo 📤 Clearing CORS configuration (attempt 1)...
gsutil cors set [] gs://aplikasi-survei-lampu-jalan.appspot.com

echo ⏳ Waiting 10 seconds...
timeout /t 10 /nobreak >nul

echo 📤 Clearing CORS configuration (attempt 2)...
gsutil cors set [] gs://aplikasi-survei-lampu-jalan.appspot.com

echo ⏳ Waiting 10 seconds...
timeout /t 10 /nobreak >nul

echo.
echo 🔧 Step 2: Applying new CORS configuration...
echo 📤 Applying CORS configuration (attempt 1)...
gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
if %errorlevel% neq 0 (
    echo ❌ Attempt 1 failed, trying again...
    timeout /t 5 /nobreak >nul
    gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
    if %errorlevel% neq 0 (
        echo ❌ Attempt 2 failed, trying one more time...
        timeout /t 5 /nobreak >nul
        gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
        if %errorlevel% neq 0 (
            echo ❌ All attempts failed!
            echo.
            echo 🔍 Troubleshooting:
            echo    1. Pastikan Anda memiliki izin untuk bucket ini
            echo    2. Pastikan nama bucket benar: aplikasi-survei-lampu-jalan.appspot.com
            echo    3. Pastikan sudah login dengan akun yang benar
            echo    4. Pastikan project Firebase sudah benar
            pause
            exit /b 1
        )
    )
)

echo ✅ CORS configuration berhasil diapply!

echo.
echo ⏳ Waiting 15 seconds for propagation...
timeout /t 15 /nobreak >nul

echo.
echo 🔍 Step 3: Verifying CORS configuration...

REM Verify configuration multiple times
for /l %%i in (1,1,10) do (
    echo 📋 Verification attempt %%i/10...
    gsutil cors get gs://aplikasi-survei-lampu-jalan.appspot.com > cors-verification.txt 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Verification attempt %%i failed
        if %%i lss 10 (
            echo ⏳ Waiting 10 seconds before next attempt...
            timeout /t 10 /nobreak >nul
        )
    ) else (
        echo ✅ Verification successful!
        echo 📄 CORS configuration details:
        type cors-verification.txt
        goto :success
    )
)

echo ❌ All verification attempts failed!
echo 📄 Last verification output:
type cors-verification.txt
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
echo ⚠️  CRITICAL NEXT STEPS:
echo    1. RESTART Next.js dev server (npm run dev)
echo    2. Clear browser cache (Ctrl+Shift+Delete)
echo    3. Wait 30 minutes for full propagation
echo    4. Test with test-cors-simple.html
echo.
echo 🧪 Testing:
echo    • Buka file test-cors-simple.html untuk test CORS
echo    • Coba upload file di aplikasi utama
echo.
echo 📝 Emergency Commands:
echo    gsutil cors get gs://aplikasi-survei-lampu-jalan.appspot.com
echo    gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
echo.
pause
