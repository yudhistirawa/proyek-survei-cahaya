import { NextResponse } from 'next/server';
import { adminStorage } from '../../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
POST /api/maps-surveyor/save
Body (application/json):
{
  userId: string,
  taskId: string,
  kmz?: {
    url?: string,                 // optional: direct URL to KMZ
    dataBase64?: string,          // optional: base64 string (no data: prefix), or full data URL
    fileName?: string             // optional: default 'map.kmz'
  },
  parsed?: object,                // optional: parsed KMZ data JSON
  tracking?: array|object,        // optional: tracking activity data
  meta?: object                   // optional: extra metadata
}
Saves files to: maps_surveyor/{userId}/{taskId}/
- original KMZ -> {timestamp}_map.kmz
- parsed JSON  -> {timestamp}_parsed.json
- tracking     -> {timestamp}_tracking.json
- metadata     -> {timestamp}_meta.json (only if provided)
Returns download URLs and storage paths for each artifact saved.
*/
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, taskId, kmz = {}, parsed, tracking, meta } = body || {};

    if (!userId || !taskId) {
      return NextResponse.json({ error: 'userId and taskId are required' }, { status: 400 });
    }

    if (!adminStorage) {
      return NextResponse.json({ error: 'Firebase Admin Storage not available' }, { status: 500 });
    }

    const basePath = `maps_surveyor/${userId}/${taskId}`;
    const timestamp = Date.now();

    const artifacts = [];

    // Helper: upload buffer/string/object to storage
    const uploadToStorage = async ({ path, contentType, data, metadata = {} }) => {
      const bucket = adminStorage.bucket();
      const file = bucket.file(path);

      // Convert data to Buffer if it's a string (JSON or base64)
      let payload;
      if (data instanceof Buffer) {
        payload = data;
      } else if (typeof data === 'string') {
        payload = Buffer.from(data);
      } else if (data instanceof Uint8Array) {
        payload = Buffer.from(data);
      } else {
        // Assume object -> JSON
        const json = JSON.stringify(data, null, 2);
        payload = Buffer.from(json, 'utf-8');
        contentType = contentType || 'application/json; charset=utf-8';
      }

      await file.save(payload, {
        metadata: {
          contentType: contentType || 'application/octet-stream',
          metadata: {
            uploadedVia: 'maps_surveyor_api',
            uploadedAt: new Date().toISOString(),
            ...metadata,
          },
        },
      });

      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
      return { path, url: signedUrl };
    };

    // 1) Save original KMZ if provided
    if (kmz && (kmz.url || kmz.dataBase64)) {
      let kmzBuffer = null;

      if (kmz.url) {
        // Fetch KMZ from URL (with timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          const res = await fetch(kmz.url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`Fetch KMZ failed: ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          kmzBuffer = Buffer.from(arrayBuf);
        } catch (err) {
          clearTimeout(timeoutId);
          throw new Error(`Unable to download KMZ from url: ${err.message}`);
        }
      } else if (kmz.dataBase64) {
        // Support both raw base64 and data URL
        const dataUrlMatch = /^data:.*;base64,(.*)$/.exec(kmz.dataBase64);
        const b64 = dataUrlMatch ? dataUrlMatch[1] : kmz.dataBase64;
        try {
          kmzBuffer = Buffer.from(b64, 'base64');
        } catch (err) {
          throw new Error('Invalid base64 for KMZ');
        }
      }

      const kmzName = kmz.fileName?.replace(/[^a-zA-Z0-9_.-]/g, '') || 'map.kmz';
      const kmzPath = `${basePath}/${timestamp}_${kmzName}`;
      const kmzUploaded = await uploadToStorage({
        path: kmzPath,
        contentType: 'application/vnd.google-earth.kmz',
        data: kmzBuffer,
        metadata: { artifact: 'original_kmz' },
      });
      artifacts.push({ type: 'kmz', ...kmzUploaded });
    }

    // 2) Save parsed JSON if provided
    if (parsed) {
      const parsedPath = `${basePath}/${timestamp}_parsed.json`;
      const parsedUploaded = await uploadToStorage({
        path: parsedPath,
        contentType: 'application/json; charset=utf-8',
        data: parsed,
        metadata: { artifact: 'parsed_kmz' },
      });
      artifacts.push({ type: 'parsed', ...parsedUploaded });
    }

    // 3) Save tracking data if provided
    if (tracking) {
      const trackingPath = `${basePath}/${timestamp}_tracking.json`;
      const trackingUploaded = await uploadToStorage({
        path: trackingPath,
        contentType: 'application/json; charset=utf-8',
        data: tracking,
        metadata: { artifact: 'tracking' },
      });
      artifacts.push({ type: 'tracking', ...trackingUploaded });
    }

    // 4) Save metadata if provided
    if (meta) {
      const metaPath = `${basePath}/${timestamp}_meta.json`;
      const metaUploaded = await uploadToStorage({
        path: metaPath,
        contentType: 'application/json; charset=utf-8',
        data: meta,
        metadata: { artifact: 'metadata' },
      });
      artifacts.push({ type: 'meta', ...metaUploaded });
    }

    if (artifacts.length === 0) {
      return NextResponse.json({ error: 'Nothing to save. Provide kmz, parsed, tracking, or meta.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      basePath,
      artifacts,
    });
  } catch (error) {
    console.error('❌ maps_surveyor save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
