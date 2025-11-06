#!/bin/bash

# Firebase Storage CORS Setup Script
# Script ini akan membantu setup CORS untuk Firebase Storage

echo "🔧 Firebase Storage CORS Setup"
echo "================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK (gcloud) tidak ditemukan!"
    echo "📥 Silakan install Google Cloud SDK terlebih dahulu:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil tidak ditemukan!"
    echo "📥 Pastikan Google Cloud SDK sudah terinstall dengan benar"
    exit 1
fi

echo "✅ Google Cloud SDK terdeteksi"

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ File cors.json tidak ditemukan!"
    echo "📁 Pastikan file cors.json ada di direktori yang sama"
    exit 1
fi

echo "✅ File cors.json terdeteksi"

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Anda belum login ke Google Cloud"
    echo "📝 Silakan login terlebih dahulu..."
    gcloud auth login
fi

echo "✅ Login status: OK"

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ Tidak ada project yang aktif"
    echo "📝 Silakan set project Firebase Anda..."
    read -p "Enter your Firebase Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
    CURRENT_PROJECT=$PROJECT_ID
else
    echo "✅ Current project: $CURRENT_PROJECT"
fi

# List available buckets
echo ""
echo "📦 Available buckets:"
gsutil ls

echo ""
echo "📝 Masukkan nama bucket Firebase Storage Anda:"
echo "   Format: gs://your-project-id.appspot.com"
read -p "Bucket name: " BUCKET_NAME

# Remove gs:// prefix if user includes it
BUCKET_NAME=$(echo $BUCKET_NAME | sed 's|^gs://||')

# Validate bucket name
if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Nama bucket tidak boleh kosong!"
    exit 1
fi

echo ""
echo "🔧 Uploading CORS configuration..."
echo "   Bucket: gs://$BUCKET_NAME"

# Upload CORS configuration
if gsutil cors set cors.json gs://$BUCKET_NAME; then
    echo "✅ CORS configuration berhasil diupload!"
else
    echo "❌ Gagal upload CORS configuration!"
    exit 1
fi

echo ""
echo "🔍 Verifying CORS configuration..."

# Verify configuration
if gsutil cors get gs://$BUCKET_NAME; then
    echo ""
    echo "🎉 CORS setup berhasil diselesaikan!"
    echo ""
    echo "📋 Summary:"
    echo "   Project: $CURRENT_PROJECT"
    echo "   Bucket: gs://$BUCKET_NAME"
    echo "   CORS: Applied successfully"
    echo ""
    echo "⚠️  Note: Perubahan mungkin perlu beberapa menit untuk diterapkan."
    echo "   Jika masih error CORS, coba refresh browser atau tunggu beberapa menit."
else
    echo "❌ Gagal verifikasi CORS configuration!"
    exit 1
fi
