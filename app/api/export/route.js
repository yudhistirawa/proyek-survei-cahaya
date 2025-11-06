import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Normalize and flexible getter for nested structures (same as export-existing-excel)
const s = (v) => (v === undefined || v === null ? '' : String(v));
const norm = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function mapBuild(item) {
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
  return { direct, nested, grid };
}

function getVal(item, ...keys) {
  const { direct, nested, grid } = mapBuild(item);
  for (const rk of keys) {
    const k = norm(rk);
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

function getCoords(item) {
  const combined = getVal(
    item,
    'titikKoordinat', 'titik_koordinat', 'titikKordinat', 'titik_kordinat',
    'koordinat', 'coordinates', 'koor', 'coord', 'latlng'
  );
  if (combined) return s(combined);
  const lat = getVal(item, 'lat', 'latitude', 'lat_new', 'latbaru', 'latitude_new');
  const lng = getVal(item, 'lng', 'long', 'longitude', 'lng_new', 'longbaru', 'longitude_new');
  if (lat && lng) return `${lat}, ${lng}`;
  // Cari objek yang punya lat/long di direct, data, gridData
  const candidates = [];
  const pushObj = (o) => { if (o && typeof o === 'object') candidates.push(o); };
  const { direct, nested, grid } = mapBuild(item);
  [...direct.values(), ...nested.values(), ...grid.values()].forEach(pushObj);
  for (const o of candidates) {
    const la = o.lat ?? o.latitude ?? o.Latitude;
    const lo = o.lng ?? o.long ?? o.longitude ?? o.Longitude;
    if (la !== undefined && lo !== undefined) return `${la}, ${lo}`;
  }
  return '';
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // Ambil semua nilai id (mendukung ?id=1&id=2 atau ?id=1,2)
    const rawIds = searchParams.getAll('id');
    const parsedIds = new Set(
      rawIds
        .flatMap((x) => String(x || '').split(',').map((y) => y.trim()))
        .filter((x) => x)
    );

    const ExcelJSImport = await import('exceljs');
    const ExcelJS = ExcelJSImport.default || ExcelJSImport;

    // Ambil data dari koleksi utama: Valid_Survey_Data
    const items = [];
    if (parsedIds.size > 0) {
      // Ambil per dokumen ID yang diminta
      for (const id of parsedIds) {
        try {
          const doc = await adminDb.collection('Valid_Survey_Data').doc(id).get();
          if (doc.exists) items.push({ id: doc.id, ...(doc.data() || {}) });
        } catch (_) { /* ignore individual errors */ }
      }
    } else {
      // Tidak ada id → ambil semua
      const snap = await adminDb.collection('Valid_Survey_Data').get();
      console.log('[export] Snapshot size:', snap.size);
      if (snap.empty) {
        console.warn('[export] Tidak ada data dari Firestore (Valid_Survey_Data)');
      }
      snap.forEach((doc) => {
        const data = doc.data() || {};
        console.log('[export] doc:', doc.id, data);
        items.push({ id: doc.id, ...data });
      });
    }

    console.log('[export] Total items to export:', items.length);
    if (items.length === 0) {
      console.warn('[export] Peringatan: items kosong. Excel akan berisi header saja.');
    }

    // Workbook & worksheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rekap_Survey_Valid');

    // Kolom sesuai format survey existing yang diminta
    ws.columns = [
      { header: 'Nama Jalan', key: 'nama_jalan' },
      { header: 'Nama Jalan Baru', key: 'nama_jalan_baru' },
      { header: 'Gang', key: 'gang' },
      { header: 'Lebar Jalan 1', key: 'lebar_jalan_1' },
      { header: 'Lebar Jalan 2', key: 'lebar_jalan_2' },
      { header: 'Kepemilikan Tiang', key: 'kepemilikan_tiang' },
      { header: 'Jenis Tiang', key: 'jenis_tiang' },
      { header: 'Trafo', key: 'trafo' },
      { header: 'Lampu', key: 'lampu' },
      { header: 'Titik Koordinat', key: 'titik_koordinat' },
      { header: 'Titik Koordinat Baru', key: 'titik_koordinat_baru' },
      { header: 'Lebar Bahu Bertiang (m)', key: 'lebar_bahu_bertiang' },
      { header: 'Lebar Trotoar Bertiang (m)', key: 'lebar_trotoar' },
      { header: 'Lainnya Bertiang', key: 'lainnya_bertiang' },
      { header: 'Tinggi ARM (m)', key: 'tinggi_arm' },
      { header: 'Keterangan', key: 'keterangan' },
      { header: 'Foto ARM (hyperlink)', key: 'foto_arm' },
      { header: 'Foto Titik Aktual (hyperlink)', key: 'foto_titik_aktual' },
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle' };

    // Tambah baris data
    items.forEach((d) => {
      const namaJalan = s(getVal(d, 'namaJalan', 'nama_jalan', 'lokasi', 'location', 'projectLocation', 'alamat'));
      const namaJalanBaru = s(getVal(d, 'namaJalanBaru', 'nama_jalan_baru', 'NamaJalanBaru'));
      const gang = s(getVal(d, 'gang', 'Gang'));
      const lebarJalan1 = s(getVal(d, 'lebarJalan1', 'lebar_jalan_1', 'lebarJalan', 'lebar_jalan', 'roadWidth'));
      const lebarJalan2 = s(getVal(d, 'lebarJalan2', 'lebar_jalan_2'));
      const kepTiang = s(getVal(d, 'kepemilikanTiang', 'kepemilikan_tiang'));
      const jenisTiang = s(getVal(d, 'jenisTiang', 'jenis_tiang'));
      const trafo = s(getVal(d, 'jenisTrafo', 'trafo', 'jenis_trafo'));
      const lampu = s(getVal(d, 'jenisLampu', 'lampu', 'jenis_lampu'));
      const titikKoordinat = s(getCoords(d));
      const titikKoordinatBaru = s(getVal(d, 'titikKordinatBaru', 'titikKoordinatBaru', 'koordinatBaru', 'titik_kordinat_baru', 'titik_koordinat_baru', 'newCoordinate', 'updatedCoordinate'));
      const lebarBahu = s(getVal(d, 'lebarBahuBertiang', 'lebar_bahu_bertiang', 'bahuJalan'));
      const lebarTrotoar = s(getVal(d, 'lebarTrotoar', 'lebar_trotoar', 'lebarTrotoarBertiang', 'lebar_trotoar_bertiang'));
      const lainnyaBertiang = s(getVal(d, 'lainnyaBertiang', 'lainnya_bertiang', 'lainnya'));
      const tinggiArm = s(getVal(d, 'tinggiArm', 'tinggi_arm', 'tinggiARM'));
      const keterangan = s(getVal(d, 'keterangan', 'description', 'deskripsi'));
      const fotoArm = s(getVal(d, 'fotoTinggiARM', 'foto_tinggi_arm', 'fotoArm', 'foto2'));
      const fotoTitik = s(getVal(d, 'fotoTitikAktual', 'foto_titik_aktual', 'fotoTitik', 'foto1'));

      const row = ws.addRow({
        nama_jalan: namaJalan,
        nama_jalan_baru: namaJalanBaru,
        gang: gang,
        lebar_jalan_1: lebarJalan1,
        lebar_jalan_2: lebarJalan2,
        kepemilikan_tiang: kepTiang,
        jenis_tiang: jenisTiang,
        trafo: trafo,
        lampu: lampu,
        titik_koordinat: titikKoordinat,
        titik_koordinat_baru: titikKoordinatBaru,
        lebar_bahu_bertiang: lebarBahu,
        lebar_trotoar: lebarTrotoar,
        lainnya_bertiang: lainnyaBertiang,
        tinggi_arm: tinggiArm,
        keterangan: keterangan,
        foto_arm: '',
        foto_titik_aktual: '',
      });

      // Set hyperlink foto bila ada
      const colFotoArm = ws.getColumn('foto_arm').number;
      const colFotoTitik = ws.getColumn('foto_titik_aktual').number;
      if (fotoArm) row.getCell(colFotoArm).value = { text: 'Lihat Foto', hyperlink: fotoArm };
      if (fotoTitik) row.getCell(colFotoTitik).value = { text: 'Lihat Foto', hyperlink: fotoTitik };
    });

    // Auto width kolom
    ws.columns.forEach((col) => {
      const max = Math.max(
        s(col.header).length,
        ...col.values
          .filter((v) => v && typeof v !== 'object')
          .map((v) => s(v).length)
      );
      col.width = Math.min(Math.max(10, max + 2), 60);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const fileName = 'Survey_Valid_Report.xlsx';
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer));

    return new NextResponse(nodeBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('Export API error:', err);
    const msg = err?.message?.includes("exceljs")
      ? 'Dependency exceljs belum terpasang. Jalankan: npm i exceljs'
      : err?.message || 'Gagal mengekspor Excel';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
