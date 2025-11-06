import { NextResponse } from 'next/server';
import archiver from 'archiver';
import sharp from 'sharp';
import { PassThrough } from 'stream';
import { adminStorage as storage } from '../../lib/firebase-admin.js';

export async function POST(request) {
  // Get bucket from Firebase Admin
  if (!storage) {
    return NextResponse.json({ error: 'Firebase Storage tidak tersedia' }, { status: 500 });
  }

  const bucket = storage.bucket();

  try {
    const { imageUrls } = await request.json();

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'imageUrls must be a non-empty array' }, { status: 400 });
    }

    // Create a PassThrough stream to pipe archiver output
    const zipStream = new PassThrough();

    // Create archiver instance for ZIP with faster compression (level 1 instead of 9)
    const archive = archiver('zip', {
      zlib: { level: 1 }, // Much faster compression
      store: true // Store without compression for very fast processing
    });

    // Pipe archive data to zipStream
    archive.pipe(zipStream);

    // Prepare response headers for streaming ZIP with caching
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="exported_photos.zip"',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Connection': 'keep-alive',
    });

    // Start streaming response
    const response = new Response(zipStream, { headers });

    // Function to process each image URL with optimizations
    const processImage = async (url, index) => {
      // Extract file path from URL (assuming gs:// or https URL)
      let filePath = null;

      if (url.startsWith('gs://')) {
        // gs://bucket/path
        const parts = url.replace('gs://', '').split('/');
        parts.shift(); // remove bucket name
        filePath = parts.join('/');
      } else {
        // https URL, extract path after bucket name
        const match = url.match(/https:\/\/[^\/]+\/(.+)/);
        if (match) {
          filePath = decodeURIComponent(match[1]);
        }
      }

      if (!filePath) {
        throw new Error(`Cannot parse file path from URL: ${url}`);
      }

      const file = bucket.file(filePath);

      // Get file metadata to check content type
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || '';

      // Create read stream from file with larger buffer for faster reading
      const readStream = file.createReadStream({
        validation: false, // Skip validation for speed
      });

      // Prepare output stream
      let outputStream = readStream;

      // Only convert to webp if not already webp AND if it's a large image
      if (!contentType.includes('webp') && metadata.size > 50000) { // Only convert files > 50KB
        const transformer = sharp()
          .webp({ 
            quality: 80, // Slightly lower quality for speed
            effort: 1    // Fastest encoding effort
          })
          .resize(1920, 1920, { 
            fit: 'inside', 
            withoutEnlargement: true 
          }); // Limit max size for speed
        outputStream = readStream.pipe(transformer);
      }

      // Append to archive with a safe filename
      const filename = `photo_${index + 1}.webp`;
      archive.append(outputStream, { name: filename });
    };

    // Process images in batches for better memory management and speed
    const BATCH_SIZE = 5; // Process 5 images at a time
    const batches = [];
    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      batches.push(imageUrls.slice(i, i + BATCH_SIZE));
    }

    // Process batches sequentially but images within batch in parallel
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map((url, localIndex) => {
          const globalIndex = batches.indexOf(batch) * BATCH_SIZE + localIndex;
          return processImage(url, globalIndex);
        })
      );
    }

    // Finalize the archive (no more files)
    archive.finalize();

    return response;

  } catch (error) {
    console.error('Error in export-photos:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
