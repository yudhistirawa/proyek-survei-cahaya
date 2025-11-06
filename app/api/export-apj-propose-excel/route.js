import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    'titikKoordinat','titik_koordinat','titikKordinat','titik_kordinat',
    'koordinat','coordinates','koor','coord','latlng'
  );
  if (combined) return s(combined);
  const lat = getVal(item, 'lat','latitude','lat_new','latbaru','latitude_new');
  const lng = getVal(item, 'lng','long','longitude','lng_new','longbaru','longitude_new');
  if (lat && lng) return `${lat}, ${lng}`;
  const { direct, nested, grid } = mapBuild(item);
  const candidates = [...direct.values(), ...nested.values(), ...grid.values()].filter(v => v && typeof v === 'object');
  for (const o of candidates) {
    const la = o.lat ?? o.latitude ?? o.Latitude;
    const lo = o.lng ?? o.long ?? o.longitude ?? o.Longitude;
    if (la !== undefined && lo !== undefined) return `${la}, ${lo}`;
  }
  return '';
}

export async function GET(request) {
  try {
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Database connection not available',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.getAll('id');
    const parsedIds = new Set(
      rawIds
        .flatMap((x) => String(x || '').split(',').map((y) => y.trim()))
        .filter((x) => x)
    );

    const ExcelJSImport = await import('exceljs');
    const ExcelJS = ExcelJSImport.default || ExcelJSImport;

    // Fetch data from Valid_Survey_Data
    const items = [];
    if (parsedIds.size > 0) {
      for (const id of parsedIds) {
        try {
          const doc = await adminDb.collection('Valid_Survey_Data').doc(id).get();
          if (doc.exists) items.push({ id: doc.id, ...(doc.data() || {}) });
        } catch (_) {}
      }
    } else {
      const snap = await adminDb.collection('Valid_Survey_Data').get();
      snap.forEach((doc) => items.push({ id: doc.id, ...(doc.data() || {}) }));
    }

    // Filter only APJ Propose-like records
    const apjItems = items.filter((d) => {
      const cat = s(getVal(d, 'surveyCategory','survey_type','surveyType','category')).toLowerCase();
      return cat.includes('apj') || cat.includes('propose') ||
        Boolean(getVal(d, 'dataDaya','data_daya','dataruas','dataRuas','dataTiang'));
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Survey_Tiang_APJ_Propose');

    // Urutan kolom sesuai permintaan user
    ws.columns = [
      { header: 'ID Titik', key: 'id_titik' },
      { header: 'Data Daya', key: 'data_daya' },
      { header: 'Data Tiang', key: 'data_tiang' },
      { header: 'Data Ruas', key: 'data_ruas' },
      { header: 'Nama Jalan', key: 'nama_jalan' },
      { header: 'Nama Jalan Baru', key: 'nama_jalan_baru' },
      { header: 'Jarak Antar Tiang (M)', key: 'jarak_antar_tiang' },
      { header: 'Titik Koordinat', key: 'titik_koordinat' },
      { header: 'Titik Koordinat Baru', key: 'titik_koordinat_baru' },
      { header: 'Lebar Jalan', key: 'lebar_jalan' },
      { header: 'Lebar Bahu Bertiang', key: 'lebar_bahu_bertiang' },
      { header: 'Lebar Trotoar', key: 'lebar_trotoar' },
      { header: 'Lainnya Bertiang', key: 'lainnya_bertiang' },
      { header: 'Keterangan', key: 'keterangan' },
      { header: 'Foto Titik Aktual (hyperlink)', key: 'foto_titik_aktual' },
      { header: 'Nama Petugas', key: 'nama_petugas' },
      { header: 'Nama Admin Validasi', key: 'nama_admin_validasi' },
      { header: 'Foto Kemerataan (hyperlink)', key: 'foto_kemerataan' },
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { vertical: 'middle' };

    apjItems.forEach((d) => {
      const idTitik = s(getVal(d, 'idTitik','id_titik','idtitik')) || s(d.id);
      const dataDaya = s(getVal(d, 'dataDaya','daya'));
      const dataTiang = s(getVal(d, 'dataTiang','tiang'));
      const dataRuas = s(getVal(d, 'dataRuas','ruas','data_ruas'));
      const namaJalan = s(getVal(d, 'namaJalan','jalan','projectLocation','lokasi'));
      const namaJalanBaru = s(getVal(d, 'namaJalanBaru','nama_jalan_baru'));
      const jarakAntarTiang = s(getVal(d, 'jarakAntarTiang','jarak_tiang','jarakAntarTiangM'));
      const titikKoordinat = s(getCoords(d));
      const titikKoordinatBaru = (() => {
        const combined = getVal(d, 'titikKoordinatBaru','titik_koordinat_baru');
        if (combined) return s(combined);
        const lat = getVal(d, 'lat_new','latitude_new','latBaru','latitudeBaru');
        const lng = getVal(d, 'lng_new','longitude_new','longBaru','longitudeBaru');
        return lat && lng ? `${lat}, ${lng}` : '';
      })();
      // Lebar Jalan: support combined or sides 1 & 2
      let lebarJalan = s(getVal(d, 'lebarJalan','lebar_jalan','roadWidth'));
      if (!lebarJalan) {
        const lj1 = s(getVal(d, 'lebarJalan1','lebar_jalan_1','lebarJalan_1','lebar jalan 1','lebar_jalan1'));
        const lj2 = s(getVal(d, 'lebarJalan2','lebar_jalan_2','lebarJalan_2','lebar jalan 2','lebar_jalan2'));
        const parts = [lj1, lj2].filter((v) => v && v.trim() !== '');
        if (parts.length) lebarJalan = parts.join(' / ');
      }
      const lebarBahu = s(getVal(d, 'lebarBahuBertiang','lebar_bahu_bertiang','bahuJalan','bahu_jalan'));
      // Lebar Trotoar: support APJ Propose naming and combined or sides
      let lebarTrotoar = s(getVal(d, 'lebarTrotoarBertiang','lebar_trotoar_bertiang','lebarTrotoar','lebar_trotoar','trotoar'));
      if (!lebarTrotoar) {
        const lt1 = s(getVal(d, 'lebarTrotoar1','lebar_trotoar_1','lebarTrotoar_1','lebar trotoar 1','lebartrotoar1'));
        const lt2 = s(getVal(d, 'lebarTrotoar2','lebar_trotoar_2','lebarTrotoar_2','lebar trotoar 2','lebartrotoar2'));
        const partsT = [lt1, lt2].filter((v) => v && v.trim() !== '');
        if (partsT.length) lebarTrotoar = partsT.join(' / ');
      }
      const lainnyaBertiang = s(getVal(d, 'lainnyaBertiang','lainnya_bertiang','lainnya'));
      const keterangan = s(getVal(d, 'keterangan','deskripsi','description'));

      const row = ws.addRow({
        id_titik: idTitik,
        data_daya: dataDaya,
        data_tiang: dataTiang,
        data_ruas: dataRuas,
        nama_jalan: namaJalan,
        nama_jalan_baru: namaJalanBaru,
        jarak_antar_tiang: jarakAntarTiang,
        titik_koordinat: titikKoordinat,
        titik_koordinat_baru: titikKoordinatBaru,
        lebar_jalan: lebarJalan,
        lebar_bahu_bertiang: lebarBahu,
        lebar_trotoar: lebarTrotoar,
        lainnya_bertiang: lainnyaBertiang,
        keterangan: keterangan,
        foto_titik_aktual: '',
        nama_petugas: s(getVal(d, 'surveyorName','namaSurveyor','surveyor','userName','username','petugas','createdByName','createdBy')),
        nama_admin_validasi: s(getVal(d, 'validatedBy','validated_by','validator','adminValidator','validatedByName')),
        foto_kemerataan: '',
      });

      // Photo hyperlinks dengan URL yang dapat diakses
      const fotoTitik = s(getVal(d, 'fotoTitikAktual','foto_titik_aktual','fotoTitik','foto1'));
      const fotoKemerataan = s(getVal(d, 'fotoKemerataan','foto_kemerataan','foto2'));
      const colFotoTitik = ws.getColumn('foto_titik_aktual').number;
      const colFotoKemerataan = ws.getColumn('foto_kemerataan').number;
      
      // Convert relative URLs to absolute URLs
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      if (fotoTitik) {
        let fotoTitikUrl = fotoTitik;
        // Convert relative path to absolute URL
        if (fotoTitik.startsWith('/')) {
          fotoTitikUrl = `${baseUrl}${fotoTitik}`;
        }
        // If it's a Firebase Storage URL, use it directly
        else if (fotoTitik.includes('firebasestorage.googleapis.com') || fotoTitik.includes('storage.googleapis.com')) {
          fotoTitikUrl = fotoTitik;
        }
        // If it's already an absolute URL, use it directly
        else if (fotoTitik.startsWith('http')) {
          fotoTitikUrl = fotoTitik;
        }
        // Otherwise, treat as relative path
        else {
          fotoTitikUrl = `${baseUrl}/${fotoTitik}`;
        }
        
        row.getCell(colFotoTitik).value = { 
          text: 'Lihat Foto Titik', 
          hyperlink: fotoTitikUrl 
        };
        // Add blue color and underline to make it look like a proper link
        row.getCell(colFotoTitik).font = { 
          color: { argb: 'FF0000FF' }, 
          underline: true 
        };
      }
      
      if (fotoKemerataan) {
        let fotoKerataanUrl = fotoKemerataan;
        // Convert relative path to absolute URL
        if (fotoKemerataan.startsWith('/')) {
          fotoKerataanUrl = `${baseUrl}${fotoKemerataan}`;
        }
        // If it's a Firebase Storage URL, use it directly
        else if (fotoKemerataan.includes('firebasestorage.googleapis.com') || fotoKemerataan.includes('storage.googleapis.com')) {
          fotoKerataanUrl = fotoKemerataan;
        }
        // If it's already an absolute URL, use it directly
        else if (fotoKemerataan.startsWith('http')) {
          fotoKerataanUrl = fotoKemerataan;
        }
        // Otherwise, treat as relative path
        else {
          fotoKerataanUrl = `${baseUrl}/${fotoKemerataan}`;
        }
        
        row.getCell(colFotoKemerataan).value = { 
          text: 'Lihat Foto Kemerataan', 
          hyperlink: fotoKerataanUrl 
        };
        // Add blue color and underline to make it look like a proper link
        row.getCell(colFotoKemerataan).font = { 
          color: { argb: 'FF0000FF' }, 
          underline: true 
        };
      }
    });

    // Auto width
    ws.columns.forEach((col) => {
      const max = Math.max(
        s(col.header).length,
        ...col.values.filter((v) => v && typeof v !== 'object').map((v) => s(v).length)
      );
      col.width = Math.min(Math.max(10, max + 2), 60);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer));
    const fileName = 'Survey_Tiang_APJ_Propose.xlsx';

    return new NextResponse(nodeBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('export-apj-propose-excel error:', err);
    const msg = err?.message?.includes('exceljs')
      ? 'Dependency exceljs belum terpasang. Jalankan: npm i exceljs'
      : err?.message || 'Gagal mengekspor Excel';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
