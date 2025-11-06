import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST - Menyimpan data Survey Existing ke Firebase
 */
export async function POST(request) {
  try {
    const surveyData = await request.json();

    // Validasi data yang diperlukan
    if (!surveyData.surveyorName) {
      return NextResponse.json({ message: 'Nama surveyor diperlukan' }, { status: 400 });
    }

    // Import initialized Firestore (adminDb) and Timestamp class
    const { adminDb } = await import('../../lib/firebase-admin.js');
    const admin = (await import('firebase-admin')).default; // for Timestamp only

    // Siapkan data untuk disimpan
    const surveyDocument = {
      // Survey Existing fields
      namaJalan: surveyData.namaJalan || '',
      namaGang: surveyData.namaGang || '',
      kepemilikanTiang: surveyData.kepemilikanTiang || '',
      jenisTiang: surveyData.jenisTiang || '',
      jenisTiangPLN: surveyData.jenisTiangPLN || '',
      trafo: surveyData.trafo || '',
      jenisTrafo: surveyData.jenisTrafo || '',
      tinggiBawahTrafo: surveyData.tinggiBawahTrafo || '',
      tinggiBatasR: surveyData.tinggiBatasR || '',
      lampu: surveyData.lampu || '',
      jumlahLampu: surveyData.jumlahLampu || '',
      jenisLampu: surveyData.jenisLampu || '',
      titikKordinat: surveyData.titikKordinat || '',
      lebarJalan1: surveyData.lebarJalan1 || '',
      lebarJalan2: surveyData.lebarJalan2 || '',
      lebarBahuBertiang: surveyData.lebarBahuBertiang || '',
      lebarTrotoarBertiang: surveyData.lebarTrotoarBertiang || '',
      lainnyaBertiang: surveyData.lainnyaBertiang || '',
      tinggiARM: surveyData.tinggiARM || '',
      fotoTinggiARM: surveyData.fotoTinggiARM || null,
      fotoTitikAktual: surveyData.fotoTitikAktual || null,
      keterangan: surveyData.keterangan || '',

      // Metadata survey
      surveyType: 'Survey Existing',
      surveyCategory: 'survey_existing',
      surveyZone: 'existing',
      surveyorName: surveyData.surveyorName,
      surveyorId: surveyData.surveyorId,
      projectTitle: `Survey Existing - ${surveyData.namaJalan || surveyData.namaGang || 'Lokasi Tidak Diketahui'}`,
      projectLocation: surveyData.titikKordinat || 'Koordinat tidak tersedia',
      projectDate: admin.firestore.Timestamp.now(),

      // Timestamps
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),

      // Status validasi
      validationStatus: 'pending',
      validatedBy: null,
      validatedAt: null,
      validationNotes: ''
    };

    // Simpan ke Firestore
    const db = adminDb;
    const docRef = await db.collection('Survey_Existing_Report').add(surveyDocument);

    console.log('✅ Survey Existing berhasil disimpan dengan ID:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Survey Existing berhasil disimpan',
      surveyId: docRef.id
    });

  } catch (error) {
    console.error('❌ Error menyimpan survey existing:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal menyimpan survey existing: ' + error.message 
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET - Mengambil data Survey Existing dari Firebase
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('id');
    const surveyorId = searchParams.get('surveyorId');
    const limit = parseInt(searchParams.get('limit')) || 50;

    // Import admin
    const admin = (await import('firebase-admin')).default;
    const db = admin.firestore();

    let query = db.collection('Survey_Existing_Report');

    // Filter berdasarkan surveyor jika ada
    if (surveyorId) {
      query = query.where('surveyorId', '==', surveyorId);
    }

    // Ambil data dengan limit
    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();
    const surveys = [];

    snapshot.forEach(doc => {
      surveys.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        projectDate: doc.data().projectDate?.toDate?.() || doc.data().projectDate
      });
    });

    return NextResponse.json({
      success: true,
      data: surveys,
      total: surveys.length
    });

  } catch (error) {
    console.error('❌ Error mengambil data survey existing:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Gagal mengambil data survey existing: ' + error.message 
      }, 
      { status: 500 }
    );
  }
}
