@echo off
chcp 65001 >nul
title Add Production Domain to CORS

echo 🌐 Add Production Domain to CORS Configuration
echo ===============================================
echo.

REM Check if cors.json exists
if not exist "cors.json" (
    echo ❌ File cors.json tidak ditemukan!
    echo 📁 Pastikan file cors.json ada di direktori yang sama
    pause
    exit /b 1
)

echo ✅ File cors.json terdeteksi

echo.
echo 📝 Masukkan domain production Anda:
echo    Contoh: mydomain.com (tanpa https://)
set /p PRODUCTION_DOMAIN="Production domain: "

REM Validate domain
if "%PRODUCTION_DOMAIN%"=="" (
    echo ❌ Domain tidak boleh kosong!
    pause
    exit /b 1
)

echo.
echo 📝 Masukkan nama bucket Firebase Storage:
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
echo 🔧 Updating CORS configuration...
echo    Domain: https://%PRODUCTION_DOMAIN%
echo    Bucket: gs://%BUCKET_NAME%

REM Create temporary cors file with production domain
echo [> temp_cors.json
echo   {> temp_cors.json
echo     "origin": [> temp_cors.json
echo       "http://localhost:3000",> temp_cors.json
echo       "http://localhost:3001",> temp_cors.json
echo       "http://127.0.0.1:3000",> temp_cors.json
echo       "http://127.0.0.1:3001",> temp_cors.json
echo       "https://%PRODUCTION_DOMAIN%",> temp_cors.json
echo       "https://www.%PRODUCTION_DOMAIN%"> temp_cors.json
echo     ],> temp_cors.json
echo     "method": [> temp_cors.json
echo       "GET",> temp_cors.json
echo       "POST",> temp_cors.json
echo       "PUT",> temp_cors.json
echo       "DELETE",> temp_cors.json
echo       "HEAD",> temp_cors.json
echo       "OPTIONS"> temp_cors.json
echo     ],> temp_cors.json
echo     "responseHeader": [> temp_cors.json
echo       "Content-Type",> temp_cors.json
echo       "Access-Control-Allow-Origin",> temp_cors.json
echo       "Access-Control-Allow-Methods",> temp_cors.json
echo       "Access-Control-Allow-Headers",> temp_cors.json
echo       "Access-Control-Max-Age",> temp_cors.json
echo       "x-goog-meta-*",> temp_cors.json
echo       "x-goog-resumable",> temp_cors.json
echo       "x-goog-*"> temp_cors.json
echo     ],> temp_cors.json
echo     "maxAgeSeconds": 3600> temp_cors.json
echo   }> temp_cors.json
echo ]> temp_cors.json

REM Upload updated CORS configuration
gsutil cors set temp_cors.json gs://%BUCKET_NAME%
if %errorlevel% neq 0 (
    echo ❌ Gagal update CORS configuration!
    del temp_cors.json
    pause
    exit /b 1
)

echo ✅ CORS configuration berhasil diupdate!

REM Clean up temporary file
del temp_cors.json

echo.
echo 🔍 Verifying updated CORS configuration...

REM Verify configuration
gsutil cors get gs://%BUCKET_NAME%
if %errorlevel% neq 0 (
    echo ❌ Gagal verifikasi CORS configuration!
    pause
    exit /b 1
)

echo.
echo 🎉 Production domain berhasil ditambahkan!
echo.
echo 📋 Summary:
echo    Domain: https://%PRODUCTION_DOMAIN%
echo    Bucket: gs://%BUCKET_NAME%
echo    Status: Added successfully
echo.
echo ⚠️  Note: Perubahan mungkin perlu beberapa menit untuk diterapkan.
echo    Jika masih error CORS, coba refresh browser atau tunggu beberapa menit.
echo.
pause
