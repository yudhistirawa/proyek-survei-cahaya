import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { adminDb } from '../../lib/firebase-admin';

// Helper: safe get string
const s = (v) => (v === undefined || v === null ? '' : String(v));

// Flexible getter seperti di UI: cek direct fields dan nested 'data'
function buildLookupMaps(item) {
  const norm = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const direct = new Map();
  const nested = new Map();
  const grid = new Map();
  if (item && typeof item === 'object') {
    Object.entries(item).forEach(([k, v]) => direct.set(norm(k), v));
    const d = item.data;
    if (d && typeof d === 'object') {
      Object.entries(d).forEach(([k, v]) => nested.set(norm(k), v));
    }
    const g = item.gridData;
    if (g && typeof g === 'object') {
      Object.entries(g).forEach(([k, v]) => grid.set(norm(k), v));
    }
  }
  return { norm, direct, nested, grid };
}

function getValFromDoc(docItem, ...keys) {
  const { norm, direct, nested, grid } = buildLookupMaps(docItem);
  for (const rawKey of keys) {
    const k = norm(rawKey);
    if (direct.has(k)) {
      const v = direct.get(k);
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    if (nested.has(k)) {
      const v = nested.get(k);
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    if (grid.has(k)) {
      const v = grid.get(k);
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
  }
  return '';
}

function deriveCoordinates(item) {
  const fromCombined = getValFromDoc(
    item,
    'titikKoordinat',
    'titikKordinat',
    'titik_koordinat',
    'titik_kordinat',
    'koordinat',
    'coordinates'
  );
  if (fromCombined) return s(fromCombined);
  const lat = getValFromDoc(item, 'lat', 'latitude');
  const lng = getValFromDoc(item, 'lng', 'long', 'longitude');
  if (lat && lng) return `${lat}, ${lng}`;
  return '';
}

// Collect likely photo URLs from a survey object
function collectPhotoUrls(item) {
  const urls = new Set();
  const push = (u) => { if (u && typeof u === 'string') urls.add(u); else if (u && typeof u === 'object' && u.url) urls.add(u.url); };

  // Common direct fields
  push(item.fotoTitikAktual);
  push(item.fotoTinggiARM);
  push(item.photoArm);
  push(item.photoPole);
  push(item.photoLamp);

  // documentationPhotos: array of string or {url}

// Helper: ambil foto thumbnail pertama seperti di UI
function getThumbnailUrl(item) {
  if (!item) return '';
  const c1 = item.fotoTitikAktual;
  if (c1) return (typeof c1 === 'object' && c1.url) ? c1.url : s(c1);
  const c2 = item.fotoTinggiARM;
  if (c2) return (typeof c2 === 'object' && c2.url) ? c2.url : s(c2);
  const docs = item.documentationPhotos;
  if (Array.isArray(docs) && docs.length > 0) {
    const first = docs[0];
    return (typeof first === 'object' && first?.url) ? first.url : s(first);
  }
  const grid = item.gridData;
  if (grid && typeof grid === 'object') {
    const k = Object.keys(grid).find((k) => k.toLowerCase().startsWith('photo') && grid[k]);
    if (k) return s(grid[k]);
  }
  return '';
}
  if (Array.isArray(item.documentationPhotos)) {
    item.documentationPhotos.forEach(push);
  }

  // gridData with photo-like keys
  const grid = item.gridData;
  if (grid && typeof grid === 'object') {
    Object.entries(grid).forEach(([k, v]) => {
      const nk = String(k || '').toLowerCase();
      if (nk.includes('photo') || nk.includes('foto') || nk.includes('img')) push(v);
    });
  }

  // generic array of photos
  if (Array.isArray(item.photos)) item.photos.forEach(push);

  return Array.from(urls);
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyType = searchParams.get('type'); // 'survey_existing' | 'survey_apj_propose' | 'all'
    const idsParam = searchParams.get('ids'); // comma-separated IDs
    const idsFilter = idsParam ? new Set(idsParam.split(',').map((s) => s.trim()).filter(Boolean)) : null;

    // 1) Fetch VALIDATED survey-reports using Admin SDK (server-safe)
    const snap = await adminDb
      .collection('survey-reports')
      .where('validationStatus', '==', 'validated')
      .get();

    const rows = [];
    const allItems = [];
    const matchType = (d) => {
      if (!surveyType || surveyType === 'all') return true;
      const a = d.surveyType || d.type || d.category;
      const b = d.surveyCategory || d.category;
      const sval = String(surveyType).toLowerCase();
      const av = String(a || '').toLowerCase();
      const bv = String(b || '').toLowerCase();
      if (sval === 'survey_existing') {
        // be generous: match equality or substring contains "existing"
        return (
          av === 'survey_existing' ||
          bv === 'survey_existing' ||
          av === 'existing' ||
          bv === 'existing' ||
          av.includes('existing') ||
          bv.includes('existing')
        );
      }
      if (sval === 'survey_apj_propose') {
        return av === 'survey_apj_propose' || bv === 'survey_apj_propose' || av.includes('propose') || bv.includes('propose');
      }
      return av === sval || bv === sval;
    };

    snap.forEach((doc) => {
      const d = doc.data() || {};
      // Kumpulkan semua validated reports; filter pilihan dilakukan setelah merge
      allItems.push({ id: doc.id, ...d });

      // Default rekap umum (tetap disiapkan, namun untuk survey_existing kita akan override sheet pertama khusus)
      if (matchType(d)) rows.push({
        'ID Survey': doc.id,
        'Judul Proyek': s(d.projectTitle),
        'Lokasi': s(d.projectLocation || d.location),
        'Surveyor': s(d.surveyorName),
        'Kategori': s(d.surveyCategory || d.surveyType),
        'Zona': s(d.surveyZone),
        'Foto URL': getThumbnailUrl(d),
        'Divalidasi Oleh': s(d.validatedBy || d.validatorName),
        'Tanggal Validasi': s(d.validatedAt),
        'Status': 'Tervalidasi',
        'Deskripsi': s(d.description),
        'Email Surveyor': s(d.surveyorEmail),
        'Koordinat Baru': s(d.titikKoordinatBaru || d.titikKordinatBaru || d.koordinatBaru || d.coordinates),
        'Tanggal Survey': s(d.surveyDate),
        'Tanggal Dibuat': s(d.createdAt)
      });
    });

    // Sort by validatedAt desc (string or timestamp)
    const parseTime = (v) => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const t = Date.parse(v);
      return Number.isNaN(t) ? 0 : t;
    };
    allItems.sort((a, b) => parseTime(b.validatedAt) - parseTime(a.validatedAt));

    // 2) Build workbook (Excel only, no ZIP)
    const wb = XLSX.utils.book_new();

    // 3) Jika export Survey Existing, buat sheet pertama sesuai spesifikasi user
    if (!surveyType || surveyType === 'all' || surveyType === 'survey_existing') {
      let existingOnly = [];
      if (idsFilter && idsFilter.size > 0) {
        // Langsung ambil per-ID dari kedua koleksi agar pasti muncul
        const idsArr = Array.from(idsFilter);
        for (const id of idsArr) {
          try {
            const d1 = await adminDb.collection('Survey_Existing_Report').doc(id).get();
            if (d1.exists) existingOnly.push({ id: d1.id, ...(d1.data() || {}) });
          } catch {}
          try {
            const d2 = await adminDb.collection('survey-reports').doc(id).get();
            if (d2.exists) existingOnly.push({ id: d2.id, ...(d2.data() || {}) });
          } catch {}
        }
      } else {
        // Tanpa pilihan: ambil semua dari koleksi khusus Existing sebagai sumber utama
        const snapExisting = await adminDb.collection('Survey_Existing_Report').get();
        snapExisting.forEach((doc) => existingOnly.push({ id: doc.id, ...(doc.data() || {}) }));
        // Jika tetap kosong, fallback ke survey-reports yang bertipe existing
        if (existingOnly.length === 0) {
          const filtered = allItems.filter((it) => {
            const a = it.surveyType || it.type || it.category;
            const b = it.surveyCategory || it.category;
            const av = String(a || '').toLowerCase();
            const bv = String(b || '').toLowerCase();
            return av === 'survey_existing' || bv === 'survey_existing' || av === 'existing' || bv === 'existing' || av.includes('existing') || bv.includes('existing');
          });
          existingOnly = [...filtered];
        }
      }

      // Build rows and capture photo URLs for hyperlinking later
      const existingDataRows = existingOnly.map((d) => {
        // Lebar Jalan: prefer combined, else compose from 1 & 2
        const lebarCombined = getValFromDoc(d, 'lebarJalan', 'lebar_jalan');
        const l1 = getValFromDoc(d, 'lebarJalan1', 'lebar_jalan1', 'lebarJalan_1');
        const l2 = getValFromDoc(d, 'lebarJalan2', 'lebar_jalan2', 'lebarJalan_2');
        const lebarJalanVal = s(
          lebarCombined ||
          (l1 && l2 ? `Jalan 1 ${l1} M, Jalan 2 ${l2} M` : l1 ? `Jalan 1 ${l1} M` : l2 ? `Jalan 2 ${l2} M` : '')
        );

        const fotoAkt = s(getValFromDoc(d, 'fotoTitikAktual', 'foto_titik_aktual', 'photoActualPoint'));
        const fotoArm = s(getValFromDoc(d, 'fotoTinggiARM', 'foto_tinggi_arm', 'photoArm', 'photoARM'));

        const row = {
          'Lokasi': s(getValFromDoc(d, 'projectLocation', 'location', 'lokasi', 'namaJalan', 'nama_jalan')),
          'Lebar Jalan': lebarJalanVal,
          'Kepemilikan Tiang': s(getValFromDoc(d, 'kepemilikanTiang', 'kepemilikan_tiang')),
          'Jenis Tiang': s(getValFromDoc(d, 'jenisTiang', 'jenis_tiang')),
          'Trafo': s(getValFromDoc(d, 'trafo')),
          'Lampu': s(getValFromDoc(d, 'lampu')),
          'Titik Koordinat': s(deriveCoordinates(d)),
          'Lebar Bahu Bertiang (M)': s(getValFromDoc(d, 'lebarBahuBertiang', 'lebar_bahu_bertiang')),
          'Lebar Trotoar (M)': s(getValFromDoc(d, 'lebarTrotoar', 'lebar_trotoar')),
          'Lainnya Bertiang': s(getValFromDoc(d, 'lainnyaBertiang', 'lainnya_bertiang')),
          'Tinggi Arm': s(getValFromDoc(d, 'tinggiArm', 'tinggi_arm', 'tinggiARM')),
          'Keterangan': s(getValFromDoc(d, 'keterangan', 'description')),
          'Titik Koordinat Baru': s(getValFromDoc(d, 'titikKoordinatBaru', 'titik_kordinat_baru', 'koordinatBaru', 'coordinatesNew')),
          'Nama Jalan Baru': s(getValFromDoc(d, 'namaJalanBaru', 'nama_jalan_baru')),
          'Foto Titik Aktual': fotoAkt ? 'Lihat Foto' : '',
          'Foto Tinggi ARM': fotoArm ? 'Lihat Foto' : ''
        };
        return { row, fotoAkt, fotoArm };
      });

      // Pastikan header selalu terlihat meski data kosong
      const headersExisting = [
        'Lokasi',
        'Lebar Jalan',
        'Kepemilikan Tiang',
        'Jenis Tiang',
        'Trafo',
        'Lampu',
        'Titik Koordinat',
        'Lebar Bahu Bertiang (M)',
        'Lebar Trotoar (M)',
        'Lainnya Bertiang',
        'Tinggi Arm',
        'Keterangan',
        'Titik Koordinat Baru',
        'Nama Jalan Baru',
        'Foto Titik Aktual',
        'Foto Tinggi ARM'
      ];
      const wsExisting = XLSX.utils.aoa_to_sheet([headersExisting]);
      if (existingDataRows.length > 0) {
        XLSX.utils.sheet_add_json(wsExisting, existingDataRows.map((x) => x.row), { origin: 'A2', skipHeader: true });
        // set hyperlinks for the last two columns
        for (let i = 0; i < existingDataRows.length; i++) {
          const r = i + 2; // starting from row 2 due to header
          const aktCell = XLSX.utils.encode_cell({ r: r - 1, c: headersExisting.length - 2 });
          const armCell = XLSX.utils.encode_cell({ r: r - 1, c: headersExisting.length - 1 });
          const { fotoAkt, fotoArm } = existingDataRows[i];
          if (fotoAkt) {
            wsExisting[aktCell] = { t: 's', v: 'Lihat Foto', l: { Target: fotoAkt } };
          }
          if (fotoArm) {
            wsExisting[armCell] = { t: 's', v: 'Lihat Foto', l: { Target: fotoArm } };
          }
        }
      }
      wsExisting['!cols'] = [
        { wch: 28 }, // Lokasi
        { wch: 14 }, // Lebar Jalan
        { wch: 20 }, // Kepemilikan Tiang
        { wch: 16 }, // Jenis Tiang
        { wch: 10 }, // Trafo
        { wch: 12 }, // Lampu
        { wch: 26 }, // Titik Koordinat
        { wch: 22 }, // Lebar Bahu Bertiang
        { wch: 18 }, // Lebar Trotoar
        { wch: 22 }, // Lainnya Bertiang
        { wch: 12 }, // Tinggi Arm
        { wch: 24 }, // Keterangan
        { wch: 26 }, // Titik Koordinat Baru
        { wch: 26 }, // Nama Jalan Baru
        { wch: 18 }, // Foto Titik Aktual
        { wch: 18 }, // Foto Tinggi ARM
      ];
      XLSX.utils.book_append_sheet(wb, wsExisting, 'Rekap_Survey_Existing');
    }
    // Finalize: write single Excel and return as download
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `Rekap_Survey_Existing_${new Date().toISOString().split('T')[0]}.xlsx`;
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('export-surveys-zip error:', error);
    return NextResponse.json({ error: 'Gagal menyiapkan export Excel', details: error.message }, { status: 500 });
  }
}
