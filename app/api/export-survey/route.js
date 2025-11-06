import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { adminDb, adminStorage } from '../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure local folder exists
async function ensureFolder(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {}
}

// Auto width helper
function autoSizeColumns(worksheet, min = 12, max = 60) {
  worksheet.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      let text = '';
      if (v == null) text = '';
      else if (typeof v === 'object' && v.text) text = String(v.text);
      else text = String(v);
      maxLen = Math.max(maxLen, text.length);
    });
    col.width = Math.min(Math.max(maxLen + 2, min), max);
  });
}

export async function GET() {
  try {
    const [{ default: ExcelJS }, { default: fetch }] = await Promise.all([
      import('exceljs'),
      import('node-fetch')
    ]);

    // 1) Fetch data from Firestore (firebase-admin)
    const snap = await adminDb.collection('Survey_Existing_Report').get();
    const items = [];
    snap.forEach((doc) => items.push({ id: doc.id, ...(doc.data() || {}) }));

    // 2) Prepare local folder for downloaded photos
    const publicDir = path.join(process.cwd(), 'public');
    const fotoDir = path.join(publicDir, 'foto-survey');
    await ensureFolder(fotoDir);

    // 3) Create workbook & worksheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Survey Existing');

    ws.columns = [
      { header: 'Nama Jalan', key: 'nama_jalan' },
      { header: 'Jenis Lampu', key: 'jenis_lampu' },
      { header: 'Jumlah Lampu', key: 'jumlah_lampu' },
      { header: 'Tinggi ARM', key: 'tinggi_arm' },
      { header: 'Titik Koordinat', key: 'titik_koordinat' },
      { header: 'Surveyor', key: 'surveyor' },
      { header: 'Tanggal', key: 'tanggal' },
      { header: 'Foto Titik Aktual', key: 'foto_titik_aktual' },
      { header: 'Foto Tinggi ARM', key: 'foto_tinggi_arm' }
    ];

    // 4) Helper to download and save photo if URL exists
    async function downloadPhotoIfAny(url, fallbackName) {
      if (!url || typeof url !== 'string') return null;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `${fallbackName}.webp`; // keep .webp as requested
        const absPath = path.join(fotoDir, fileName);
        await fs.writeFile(absPath, buffer);
        return `/foto-survey/${fileName}`; // public path (not used in Excel, but useful if needed)
      } catch (e) {
        console.warn('Failed to download photo:', url, e.message);
        return null;
      }
    }

    // 5) Fill rows, add hyperlinks for photos (not embedded)
    for (const it of items) {
      const {
        id,
        namaJalan = '',
        jenisLampu = '',
        jumlahLampu = '',
        tinggiARM = '',
        titikKordinat = '',
        surveyorName = '',
        projectDate = ''
      } = it;

      const fotoTitikAktualUrl = it.fotoTitikAktual || it.foto_titik_aktual || '';
      const fotoTinggiARMUrl = it.fotoTinggiARM || it.foto_tinggi_arm || '';

      // Download to public folder if exists (requested behavior)
      await Promise.all([
        downloadPhotoIfAny(fotoTitikAktualUrl, `fotoTitikAktual_${id}`),
        downloadPhotoIfAny(fotoTinggiARMUrl, `fotoTinggiARM_${id}`)
      ]);

      const rowValues = {
        nama_jalan: namaJalan,
        jenis_lampu: jenisLampu,
        jumlah_lampu: jumlahLampu,
        tinggi_arm: String(tinggiARM ?? ''),
        titik_koordinat: titikKordinat,
        surveyor: surveyorName,
        tanggal: projectDate,
        foto_titik_aktual: fotoTitikAktualUrl
          ? { text: 'Lihat Foto', hyperlink: fotoTitikAktualUrl }
          : '',
        foto_tinggi_arm: fotoTinggiARMUrl
          ? { text: 'Lihat Foto', hyperlink: fotoTinggiARMUrl }
          : ''
      };

      ws.addRow(rowValues);
    }

    // Style header
    ws.getRow(1).font = { bold: true };

    // Auto size columns
    autoSizeColumns(ws);

    // 6) Create buffer and return response
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="survey_existing.xlsx"'
      }
    });
  } catch (err) {
    console.error('Export survey error:', err);
    return NextResponse.json({ error: err.message || 'Failed to export' }, { status: 500 });
  }
}
