import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyType = searchParams.get('type');

    // Prefer Firebase Admin for server-side access; fall back to client SDK if needed
    let adminDb = null;
    try {
      const admin = await import('../../lib/firebase-admin.js');
      adminDb = admin?.adminDb || null;
    } catch (_e) {
      // ignore, fallback to client db
    }

    const validSurveys = [];

    if (adminDb) {
      // Admin SDK path: avoid composite index by querying single equality and filtering in memory
      const snap = await adminDb
        .collection('survey-reports')
        .where('validationStatus', '==', 'validated')
        .get();

      snap.forEach((doc) => {
        const data = doc.data() || {};
        validSurveys.push({ id: doc.id, ...data });
      });
    } else {
      // Client SDK fallback: single-filter query to avoid composite index
      const q = query(
        collection(db, 'survey-reports'),
        where('validationStatus', '==', 'validated')
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const data = doc.data() || {};
        validSurveys.push({ id: doc.id, ...data });
      });
    }

    // Filter by surveyType in memory if requested
    let filtered = validSurveys;
    if (surveyType && surveyType !== 'all') {
      filtered = filtered.filter((v) => (v.surveyType || '') === surveyType);
    }

    // Normalize timestamps and sort by validatedAt desc in memory
    const toDate = (val) => {
      if (!val) return null;
      // Firestore Timestamp (Admin: has toDate, Client: has seconds/nanoseconds)
      if (typeof val?.toDate === 'function') return val.toDate();
      if (typeof val === 'string') return new Date(val);
      if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000);
      return null;
    };

    filtered.sort((a, b) => {
      const da = toDate(a.validatedAt) || new Date(0);
      const dbb = toDate(b.validatedAt) || new Date(0);
      return dbb - da;
    });

    // Map to export rows
    const rows = filtered.map((data) => ({
      'ID Survey': data.id,
      'Tipe Survey': data.surveyType || '',
      'Judul Proyek': data.projectTitle || '',
      'Nama Surveyor': data.surveyorName || '',
      'Email Surveyor': data.surveyorEmail || '',
      'Lokasi': data.location || '',
      'Koordinat': data.coordinates || '',
      'Deskripsi': data.description || '',
      'Status Validasi': data.validationStatus || '',
      'Validator': data.validatorName || '',
      'Catatan Validasi': data.validationNotes || '',
      'Tanggal Survey': data.surveyDate || '',
      'Tanggal Validasi': (() => { const d = toDate(data.validatedAt); return d ? d.toISOString() : ''; })(),
      'Tanggal Dibuat': (() => { const d = toDate(data.createdAt); return d ? d.toISOString() : ''; })(),
    }));

    // Buat workbook dan worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // ID Survey
      { wch: 20 }, // Tipe Survey
      { wch: 30 }, // Judul Proyek
      { wch: 20 }, // Nama Surveyor
      { wch: 25 }, // Email Surveyor
      { wch: 30 }, // Lokasi
      { wch: 20 }, // Koordinat
      { wch: 40 }, // Deskripsi
      { wch: 15 }, // Status Validasi
      { wch: 20 }, // Validator
      { wch: 40 }, // Catatan Validasi
      { wch: 15 }, // Tanggal Survey
      { wch: 15 }, // Tanggal Validasi
      { wch: 15 }  // Tanggal Dibuat
    ];
    worksheet['!cols'] = columnWidths;

    // Tambahkan worksheet ke workbook
    const sheetName = surveyType && surveyType !== 'all' ? surveyType : 'All_Valid_Surveys';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers untuk download
    const fileName = `Data_Survey_Valid_${surveyType || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting surveys:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Gagal mengekspor data survey', details: error?.message },
      { status: 500 }
    );
  }
}
