import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';

// Pastikan tidak di-cache dan berjalan di server Node runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const b64u = request.nextUrl.searchParams.get('b64u');
    const b64 = request.nextUrl.searchParams.get('b64');
    let raw = request.nextUrl.searchParams.get('url');
    if (!raw && (b64u || b64)) {
      // 1) Coba decode pakai encoding "base64url" (Node >= 18)
      if (!raw && b64u) {
        try {
          raw = Buffer.from(b64u, 'base64url').toString('utf-8');
        } catch {}
      }
      // 2) Fallback: decode manual ganti karakter + padding
      if (!raw) {
        try {
          let normalizedB64 = (b64u || b64).replace(/-/g, '+').replace(/_/g, '/');
          const padLength = (4 - (normalizedB64.length % 4)) % 4;
          if (padLength) normalizedB64 += '='.repeat(padLength);
          raw = Buffer.from(normalizedB64, 'base64').toString('utf-8');
        } catch {}
      }
    }
    if (!raw) {
      // Jika b64u sebenarnya sudah berupa URL (tanpa encoding), gunakan langsung
      if (b64u && /^https?:/i.test(b64u)) {
        raw = b64u;
      } else if (b64 && /^https?:/i.test(b64)) {
        raw = b64;
      }
    }

    if (!raw) {
      console.warn('fetch-kmz: missing raw url. Params:', { b64u, b64 });
      return NextResponse.json({ error: 'Parameter url/b64u/b64 diperlukan', b64u, b64 }, { status: 400 });
    }

    // Coba beberapa kandidat (raw dan decoded) untuk menghindari masalah over/under decoding
    const candidates = [raw];
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded !== raw) candidates.push(decoded);
    } catch {}

    let lastError = null;
    let lastStatus = 500;
    for (const url of candidates) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/octet-stream' },
          cache: 'no-store',
          redirect: 'follow',
        });
        if (!response.ok) {
          lastStatus = response.status;
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.google-earth.kmz',
            'Cache-Control': 'no-store, max-age=0',
          },
        });
      } catch (e) {
        lastError = e;
      }
    }

    // Jika semua kandidat gagal, kembalikan status upstream terakhir agar mudah didiagnosa
    return NextResponse.json(
      { error: 'Upstream fetch error', details: String(lastError?.message || 'unknown') },
      { status: lastStatus || 500 }
    );
  } catch (error) {
    console.error('Error fetching KMZ:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil file KMZ', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
