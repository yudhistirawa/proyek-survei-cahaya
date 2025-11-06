import { NextResponse } from 'next/server';
import { adminStorage } from '../../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper: limit concurrency for async tasks
async function mapLimit(arr, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = new Array(Math.min(limit, arr.length)).fill(0).map(async () => {
    while (i < arr.length) {
      const cur = i++;
      ret[cur] = await fn(arr[cur], cur);
    }
  });
  await Promise.all(workers);
  return ret;
}

// GET /api/admin/progress-tracking
// query:
//   list = 'days' | 'surveyors' | 'files' (default: 'days')
//   day  = 'YYYY-MM-DD_Hari' (required when list=surveyors or files)
//   surveyor = 'nama_surveyor' (optional for files)
//   pageToken (optional)
//   limit (optional, default 12 for files)
// Prepare bucket candidates (default + ENV + alternate domain)
function resolveBucketCandidates() {
  const candidates = [];
  try {
    const def = adminStorage.bucket();
    if (def && def.name) candidates.push({ bucket: def, label: 'default' });
  } catch (_) {}
  const envName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (envName) {
    try {
      const envB = adminStorage.bucket(envName);
      candidates.push({ bucket: envB, label: 'env' });
    } catch (_) {}
    // Alternate domain format for safety
    try {
      const altName = envName.endsWith('.appspot.com')
        ? envName.replace('.appspot.com', '.firebasestorage.app')
        : envName.endsWith('.firebasestorage.app')
          ? envName.replace('.firebasestorage.app', '.appspot.com')
          : null;
      if (altName) {
        const altB = adminStorage.bucket(altName);
        candidates.push({ bucket: altB, label: 'env-alt' });
      }
    } catch (_) {}
  }
  // Deduplicate by name
  const uniq = [];
  const seen = new Set();
  for (const c of candidates) {
    const n = c.bucket?.name;
    if (n && !seen.has(n)) { seen.add(n); uniq.push(c); }
  }
  return uniq;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const listType = (searchParams.get('list') || 'days').toLowerCase();
    const pageToken = searchParams.get('pageToken') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10) || 12)) : (listType === 'files' ? 12 : 100);

    const candidates = resolveBucketCandidates();

    if (listType === 'days') {
      // List folder level under surveyor_tracking/
      const options = { prefix: 'surveyor_tracking/', delimiter: '/' };
      if (pageToken) options.pageToken = pageToken;

      let prefixes = [];
      let nextToken = null;
      let lastErr = null;
      for (const c of candidates) {
        try {
          const [files, nextQuery, apiResponse] = await c.bucket.getFiles(options);
          prefixes = apiResponse?.prefixes || [];
          nextToken = nextQuery?.pageToken || null;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          // Try fallback derivation for this candidate
          try {
            const [files, nextQuery] = await c.bucket.getFiles({ prefix: 'surveyor_tracking/', maxResults: limit, pageToken });
            nextToken = nextQuery?.pageToken || null;
            const set = new Set();
            for (const f of files) {
              const parts = (f.name || '').split('/').filter(Boolean);
              if (parts.length >= 2) set.add(`surveyor_tracking/${parts[1]}/`);
            }
            prefixes = Array.from(set);
            lastErr = null;
            break;
          } catch (e2) {
            lastErr = e2;
          }
        }
      }
      if (lastErr) {
        // As a last resort, return empty list but 200 to avoid UI HTTP 500 toast
        return NextResponse.json({ success: true, days: [], nextPageToken: null, hint: lastErr.message || String(lastErr) });
      }
      // Extract folder names from 'surveyor_tracking/{YYYY-MM-DD_Hari}/'
      let names = prefixes
        .map((p) => {
          const parts = p.split('/').filter(Boolean);
          return parts.length >= 2 ? parts[1] : null;
        })
        .filter(Boolean);
      // Sort by date (desc) if prefix begins with YYYY-MM-DD
      names.sort((a, b) => {
        const ad = a?.slice(0, 10);
        const bd = b?.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(ad) && /^\d{4}-\d{2}-\d{2}$/.test(bd)) {
          return bd.localeCompare(ad);
        }
        return a.localeCompare(b);
      });

      return NextResponse.json({ success: true, days: names, nextPageToken: nextToken });
    }

    if (listType === 'surveyors') {
      const day = searchParams.get('day');
      if (!day) {
        return NextResponse.json({ success: false, error: 'Parameter "day" diperlukan' }, { status: 400 });
      }
      const prefix = `surveyor_tracking/${day}/`;
      const options = { prefix, delimiter: '/' };
      if (pageToken) options.pageToken = pageToken;

      let prefixes = [];
      let nextToken = null;
      let lastErr = null;
      for (const c of candidates) {
        try {
          const [files, nextQuery, apiResponse] = await c.bucket.getFiles(options);
          prefixes = apiResponse?.prefixes || [];
          nextToken = nextQuery?.pageToken || null;
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          // Fallback: derive subfolder names from paths
          try {
            const [files, nextQuery] = await c.bucket.getFiles({ prefix, maxResults: limit, pageToken });
            nextToken = nextQuery?.pageToken || null;
            const set = new Set();
            for (const f of files) {
              const parts = (f.name || '').split('/').filter(Boolean);
              if (parts.length >= 3) set.add(`surveyor_tracking/${parts[1]}/${parts[2]}/`);
            }
            prefixes = Array.from(set);
            lastErr = null;
            break;
          } catch (e2) {
            lastErr = e2;
          }
        }
      }
      if (lastErr) {
        return NextResponse.json({ success: true, surveyors: [], nextPageToken: null, day, hint: lastErr.message || String(lastErr) });
      }

      const surveyors = prefixes
        .map((p) => {
          const parts = p.split('/').filter(Boolean);
          return parts.length >= 3 ? parts[2] : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      return NextResponse.json({ success: true, surveyors, nextPageToken: nextToken, day });
    }

    if (listType === 'files') {
      const day = searchParams.get('day');
      const surveyor = searchParams.get('surveyor');
      if (!day) {
        return NextResponse.json({ success: false, error: 'Parameter "day" diperlukan' }, { status: 400 });
      }
      const prefix = `surveyor_tracking/${day}/${surveyor ? `${surveyor}/` : ''}`;
      const options = { prefix, maxResults: limit };
      if (pageToken) options.pageToken = pageToken;

      let files = [];
      let nextQuery = null;
      let lastErr = null;
      for (const c of candidates) {
        try {
          const [f, nq] = await c.bucket.getFiles(options);
          files = f; nextQuery = nq; lastErr = null; break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (lastErr) {
        return NextResponse.json({ success: true, items: [], nextPageToken: null, day, surveyor, hint: lastErr.message || String(lastErr) });
      }
      // Limit URL generation concurrency to avoid quota spikes
      const items = await mapLimit(files, 6, async (f) => {
        try {
          const name = f.name.split('/').pop();
          // Signed URL with long expiry
          const [url] = await f.getSignedUrl({ action: 'read', expires: '03-01-2500' });
          return { name, path: f.name, url };
        } catch (e) {
          return { name: f.name.split('/').pop(), path: f.name, url: null, error: e?.message };
        }
      });

      // Sort by timestamp embedded in filename if present: *_{ts}.webp
      const extractTs = (n) => {
        try { const b = n.replace(/\.[^.]+$/, ''); const i = b.lastIndexOf('_'); const v = parseInt(b.slice(i+1), 10); return Number.isFinite(v) ? v : 0; } catch { return 0; }
      };
      items.sort((a, b) => extractTs(b.name) - extractTs(a.name));

      return NextResponse.json({ success: true, items, nextPageToken: nextQuery?.pageToken || null, day, surveyor });
    }

    return NextResponse.json({ success: false, error: 'Invalid list type' }, { status: 400 });
  } catch (error) {
    console.error('Progress tracking API error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 });
  }
}
