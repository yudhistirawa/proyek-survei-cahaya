"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

// Capture a photo using native camera (Android: ACTION_IMAGE_CAPTURE, iOS: UIImagePickerController)
// Then convert it to WebP in-browser and return a blob entry compatible with sync.js
export async function capturePhotoAsWebP(fieldKey = "fotoTitik") {
  if (typeof window === "undefined") throw new Error("Only available on client");

  // Ensure we are running in a Capacitor native context
  if (!Capacitor?.isNativePlatform?.()) {
    throw new Error("Fitur kamera native hanya tersedia di aplikasi mobile (Capacitor)");
  }
  // Ask permissions and take the photo
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.Uri, // get webPath/path for best quality
    quality: 90,
    saveToGallery: false,
  });

  // Prefer webPath for easy fetching
  const webPath = photo.webPath || (photo.path ? `file://${photo.path}` : null);
  if (!webPath) throw new Error("Gagal mendapatkan path foto dari kamera");

  // Fetch original image data
  const originalResp = await fetch(webPath);
  const originalBlob = await originalResp.blob();

  // Convert to WebP via canvas
  const webpBlob = await convertImageBlobToWebP(originalBlob).catch(() => null);
  const finalBlob = webpBlob || originalBlob; // fallback if WebP unsupported
  const isWebp = !!webpBlob;

  const nameBase = `photo_${Date.now()}`;
  const name = isWebp ? `${nameBase}.webp` : `${nameBase}.${mimeToExt(originalBlob.type) || "jpg"}`;

  return {
    name,
    blob: finalBlob,
    fieldKey,
    meta: {
      originalMime: originalBlob.type,
      convertedToWebP: isWebp,
    },
  };
}

// Pick a photo from gallery (Photos) and convert to WebP
export async function pickGalleryAsWebP(fieldKey = "fotoKemerataan") {
  if (typeof window === "undefined") throw new Error("Only available on client");
  if (!Capacitor?.isNativePlatform?.()) {
    throw new Error("Fitur galeri native hanya tersedia di aplikasi mobile (Capacitor)");
  }

  const photo = await Camera.getPhoto({
    source: CameraSource.Photos,
    resultType: CameraResultType.Uri,
    quality: 90,
    saveToGallery: false,
    correctOrientation: true,
  });

  const webPath = photo.webPath || (photo.path ? `file://${photo.path}` : null);
  if (!webPath) throw new Error("Gagal mendapatkan path foto dari galeri");

  const originalResp = await fetch(webPath);
  const originalBlob = await originalResp.blob();
  const webpBlob = await convertImageBlobToWebP(originalBlob).catch(() => null);
  const finalBlob = webpBlob || originalBlob;
  const isWebp = !!webpBlob;
  const nameBase = `gallery_${Date.now()}`;
  const name = isWebp ? `${nameBase}.webp` : `${nameBase}.${mimeToExt(originalBlob.type) || "jpg"}`;

  return {
    name,
    blob: finalBlob,
    fieldKey,
    meta: {
      originalMime: originalBlob.type,
      convertedToWebP: isWebp,
      source: 'gallery'
    },
  };
}

function mimeToExt(mime) {
  if (!mime) return null;
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return null;
}

async function convertImageBlobToWebP(blob, quality = 0.8) {
  const bitmap = await createImageBitmap(blob).catch(() => null);
  if (!bitmap) {
    // Fallback via HTMLImageElement if createImageBitmap not available
    const img = await loadImageFromBlob(blob);
    return drawToWebPBlob(img, quality);
  }
  return drawBitmapToWebPBlob(bitmap, quality);
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawBitmapToWebPBlob(bitmap, quality) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob WebP menghasilkan null"));
      }, "image/webp", quality);
    } catch (e) {
      reject(e);
    }
  });
}

function drawToWebPBlob(img, quality) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("toBlob WebP menghasilkan null"));
      }, "image/webp", quality);
    } catch (e) {
      reject(e);
    }
  });
}
