@echo off
echo 🚀 Deploying Firebase Storage Rules...
echo.

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found. Please install it first:
    echo npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

echo ✅ Firebase CLI found
echo.

REM Login check
echo 🔐 Checking Firebase authentication...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Firebase. Please login first:
    echo firebase login
    echo.
    pause
    exit /b 1
)

echo ✅ Firebase authentication OK
echo.

REM Deploy storage rules
echo 📋 Deploying Firebase Storage rules...
firebase deploy --only storage

if %errorlevel% equ 0 (
    echo.
    echo ✅ Firebase Storage rules deployed successfully!
    echo.
    echo 📋 Rules deployed:
    echo - Survey_Existing folder: ✅ Read/Write permissions
    echo - Alternative path patterns: ✅ Supported
    echo - User authentication: ✅ Required for uploads
    echo.
) else (
    echo.
    echo ❌ Failed to deploy Firebase Storage rules
    echo Please check your Firebase project configuration
    echo.
)

pause
