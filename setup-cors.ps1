# Firebase Storage CORS Setup Script for Windows
# Script ini akan membantu setup CORS untuk Firebase Storage

Write-Host "🔧 Firebase Storage CORS Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud not found"
    }
    Write-Host "✅ Google Cloud SDK terdeteksi" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK (gcloud) tidak ditemukan!" -ForegroundColor Red
    Write-Host "📥 Silakan install Google Cloud SDK terlebih dahulu:" -ForegroundColor Yellow
    Write-Host "   https://cloud.google.com/sdk/docs/install" -ForegroundColor Blue
    exit 1
}

# Check if gsutil is available
try {
    $gsutilVersion = gsutil version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "gsutil not found"
    }
    Write-Host "✅ gsutil terdeteksi" -ForegroundColor Green
} catch {
    Write-Host "❌ gsutil tidak ditemukan!" -ForegroundColor Red
    Write-Host "📥 Pastikan Google Cloud SDK sudah terinstall dengan benar" -ForegroundColor Yellow
    exit 1
}

# Check if cors.json exists
if (-not (Test-Path "cors.json")) {
    Write-Host "❌ File cors.json tidak ditemukan!" -ForegroundColor Red
    Write-Host "📁 Pastikan file cors.json ada di direktori yang sama" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ File cors.json terdeteksi" -ForegroundColor Green

# Check if user is logged in
try {
    $authList = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($authList)) {
        throw "Not logged in"
    }
    Write-Host "✅ Login status: OK" -ForegroundColor Green
} catch {
    Write-Host "🔐 Anda belum login ke Google Cloud" -ForegroundColor Yellow
    Write-Host "📝 Silakan login terlebih dahulu..." -ForegroundColor Yellow
    gcloud auth login
}

# Get current project
try {
    $currentProject = gcloud config get-value project 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($currentProject)) {
        Write-Host "❌ Tidak ada project yang aktif" -ForegroundColor Red
        Write-Host "📝 Silakan set project Firebase Anda..." -ForegroundColor Yellow
        $projectId = Read-Host "Enter your Firebase Project ID"
        gcloud config set project $projectId
        $currentProject = $projectId
    } else {
        Write-Host "✅ Current project: $currentProject" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error getting project configuration" -ForegroundColor Red
    exit 1
}

# List available buckets
Write-Host ""
Write-Host "📦 Available buckets:" -ForegroundColor Cyan
gsutil ls

Write-Host ""
Write-Host "📝 Masukkan nama bucket Firebase Storage Anda:" -ForegroundColor Yellow
Write-Host "   Format: gs://your-project-id.appspot.com" -ForegroundColor Gray
$bucketName = Read-Host "Bucket name"

# Remove gs:// prefix if user includes it
$bucketName = $bucketName -replace "^gs://", ""

# Validate bucket name
if ([string]::IsNullOrEmpty($bucketName)) {
    Write-Host "❌ Nama bucket tidak boleh kosong!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Uploading CORS configuration..." -ForegroundColor Cyan
Write-Host "   Bucket: gs://$bucketName" -ForegroundColor Gray

# Upload CORS configuration
try {
    gsutil cors set cors.json "gs://$bucketName"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CORS configuration berhasil diupload!" -ForegroundColor Green
    } else {
        throw "Upload failed"
    }
} catch {
    Write-Host "❌ Gagal upload CORS configuration!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Verifying CORS configuration..." -ForegroundColor Cyan

# Verify configuration
try {
    gsutil cors get "gs://$bucketName"
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "🎉 CORS setup berhasil diselesaikan!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Summary:" -ForegroundColor Cyan
        Write-Host "   Project: $currentProject" -ForegroundColor Gray
        Write-Host "   Bucket: gs://$bucketName" -ForegroundColor Gray
        Write-Host "   CORS: Applied successfully" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⚠️  Note: Perubahan mungkin perlu beberapa menit untuk diterapkan." -ForegroundColor Yellow
        Write-Host "   Jika masih error CORS, coba refresh browser atau tunggu beberapa menit." -ForegroundColor Yellow
    } else {
        throw "Verification failed"
    }
} catch {
    Write-Host "❌ Gagal verifikasi CORS configuration!" -ForegroundColor Red
    exit 1
}
