# Script PowerShell untuk menginstall Capacitor Camera plugin
Write-Host "🔧 Installing Capacitor Camera plugin..." -ForegroundColor Green

# Install Capacitor Camera plugin
npm install @capacitor/camera

# Sync Capacitor
npx cap sync

# Update Android project
npx cap update android

Write-Host "✅ Capacitor Camera plugin installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Next steps:" -ForegroundColor Yellow
Write-Host "1. Open Android Studio"
Write-Host "2. Open project: android/"
Write-Host "3. Build and run on device"
Write-Host ""
Write-Host "🔍 To test the camera feature:" -ForegroundColor Yellow
Write-Host "1. Open the app on mobile device"
Write-Host "2. Go to Survey ARM or Survey Existing"
Write-Host "3. Tap 'Tap untuk ambil foto'"
Write-Host "4. Grant camera and location permissions"
Write-Host ""
Write-Host "📖 For more info, see: MOBILE_CAMERA_FEATURE.md" -ForegroundColor Cyan
