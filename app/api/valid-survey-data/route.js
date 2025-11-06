import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyType = searchParams.get('type'); // 'survey_existing' | 'survey_apj_propose' | 'all' | null

    const collectionRef = adminDb.collection('Valid_Survey_Data');

    let queryRef = collectionRef.where('validationStatus', '==', 'validated');
    // Optional filter by category
    if (surveyType && surveyType !== 'all') {
      queryRef = queryRef.where('surveyCategory', '==', surveyType);
    }

    // Order by createdAt if available; fall back gracefully if index missing
    let snapshot;
    try {
      snapshot = await queryRef.orderBy('createdAt', 'desc').limit(500).get();
    } catch (err) {
      console.log('OrderBy(createdAt) failed, fallback to simple where only:', err.message);
      snapshot = await queryRef.limit(500).get();
    }

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const data = snapshot.docs.map((doc) => {
      const d = doc.data();
      const validatedAt = d.validatedAt?.toDate ? d.validatedAt.toDate() : (d.validatedAt ? new Date(d.validatedAt) : null);
      const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null);
      const projectDate = d.projectDate?.toDate ? d.projectDate.toDate() : (d.projectDate ? new Date(d.projectDate) : null);

      // Normalize fields used by UI components
      return {
        id: doc.id,
        // Spread ALL original fields so the UI has access to complete detail (e.g., jenisTiang, jenisLampu, trafo, dll.)
        ...d,
        // Normalized/derived fields for list/table
        projectTitle: d.projectTitle || d.namaJalan || d.idTitik || 'Tidak ada judul',
        projectLocation: d.projectLocation || d.titikKordinat || d.namaJalan || 'Lokasi tidak diketahui',
        surveyorName: d.surveyorName || 'Surveyor tidak diketahui',
        surveyCategory: d.surveyCategory || (d.idTitik ? 'survey_apj_propose' : 'survey_existing'),
        surveyZone: d.surveyZone || (d.surveyCategory === 'survey_apj_propose' ? 'propose' : 'existing'),
        surveyType: d.surveyType || 'Survey Umum',
        validationStatus: d.validationStatus || 'validated',
        validatedAt: validatedAt ? validatedAt.toISOString() : null,
        validatedBy: d.validatedBy || null,
        createdAt: createdAt ? createdAt.toISOString() : null,
        hasPhoto: !!(d.fotoTinggiARM || d.fotoTitikAktual || d.documentationPhotos || d.gridData),
        projectDate: projectDate ? projectDate.toISOString() : null,

        // Ensure photo fields are plain URLs if objects
        fotoTinggiARM: (typeof d.fotoTinggiARM === 'object' && d.fotoTinggiARM?.url) ? d.fotoTinggiARM.url : (d.fotoTinggiARM || null),
        fotoTitikAktual: (typeof d.fotoTitikAktual === 'object' && d.fotoTitikAktual?.url) ? d.fotoTitikAktual.url : (d.fotoTitikAktual || null),
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching valid survey data:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data survey yang divalidasi', details: error.message },
      { status: 500 }
    );
  }
}
