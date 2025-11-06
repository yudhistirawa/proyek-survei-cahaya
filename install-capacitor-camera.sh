#!/bin/bash

# Script untuk menginstall Capacitor Camera plugin
echo "🔧 Installing Capacitor Camera plugin..."

# Install Capacitor Camera plugin
npm install @capacitor/camera

# Sync Capacitor
npx cap sync

# Update Android project
npx cap update android

echo "✅ Capacitor Camera plugin installed successfully!"
echo ""
echo "📱 Next steps:"
echo "1. Open Android Studio"
echo "2. Open project: android/"
echo "3. Build and run on device"
echo ""
echo "🔍 To test the camera feature:"
echo "1. Open the app on mobile device"
echo "2. Go to Survey ARM or Survey Existing"
echo "3. Tap 'Tap untuk ambil foto'"
echo "4. Grant camera and location permissions"
echo ""
echo "📖 For more info, see: MOBILE_CAMERA_FEATURE.md"
