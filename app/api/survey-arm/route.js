import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

/**
 * POST - Menyimpan data Survey ARM ke Firebase
 */
export async function POST(request) {
  try {
    const surveyData = await request.json();

    // Validasi data yang diperlukan
    if (!surveyData.surveyorName) {
      return NextResponse.json({ message: 'Nama surveyor diperlukan' }, { status: 400 });
    }

    // Import admin untuk FieldValue dan Timestamp
    const admin = (await import('firebase-admin')).default;

    // Siapkan data untuk disimpan
    const surveyDocument = {
      // Data Survey ARM
      kepemilikanTiang: surveyData.kepemilikanTiang || '',
      jenisTiang: surveyData.jenisTiang || '',
      trafo: surveyData.trafo || '',
      jenisTrafo: surveyData.jenisTrafo || '',
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
      titikKordinatBaruDariAdmin: surveyData.titikKordinatBaruDariAdmin || '',

      // Metadata survey
      surveyType: 'Survey ARM',
      surveyCategory: 'arm',
      surveyZone: 'existing',
      surveyorName: surveyData.surveyorName,
      projectTitle: `Survey ARM - ${surveyData.titikKordinat || 'Lokasi Tidak Diketahui'}`,
      projectLocation: surveyData.titikKordinat || 'Koordinat tidak tersedia',
      projectDate: admin.firestore.Timestamp.now(),

      // Status validasi
      validationStatus: 'pending',
      validatedBy: null,
      validatedAt: null,
      validationNotes: '',

      // Timestamp
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Untuk kompatibilitas dengan sistem yang ada
      lampPower: 'N/A', // Survey ARM tidak memiliki data daya lampu
      poleHeight: surveyData.tinggiARM ? `${surveyData.tinggiARM}m` : 'N/A',
      initialVoltage: 'N/A',
      
      // Flag untuk menandai ini adalah data Survey ARM
      isARMSurvey: true,
    };

    // Simpan ke collection 'surveys' yang terpisah khusus untuk data survey
            const docRef = await adminDb.collection('surveys').add(surveyDocument);

    // Buat notifikasi untuk admin bahwa ada data survey baru masuk
    try {
      // Ambil semua admin untuk dikirim notifikasi
              const usersSnapshot = await adminDb.collection('users')
        .where('role', '==', 'admin_survey')
        .get();

      // Kirim notifikasi ke setiap admin
      const notificationPromises = usersSnapshot.docs.map(async (adminDoc) => {
        const adminData = adminDoc.data();
        
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: adminDoc.id,
            type: 'survey',
            title: 'Data Survey Baru Masuk',
            message: `Survey ARM baru dari ${surveyData.surveyorName} di lokasi ${surveyData.titikKordinat || 'Lokasi tidak diketahui'} telah masuk dan menunggu validasi`,
            relatedId: docRef.id,
            status: 'pending',
            metadata: {
              surveyType: 'Survey ARM',
              surveyCategory: 'arm',
              surveyorName: surveyData.surveyorName,
              location: surveyData.titikKordinat,
              projectTitle: surveyDocument.projectTitle
            }
          })
        });

        if (!notificationResponse.ok) {
          console.warn(`Failed to create notification for admin ${adminData.username || adminDoc.id}`);
        }
      });

      await Promise.all(notificationPromises);
      console.log('✅ Notifications sent to all admins for new survey data');
    } catch (error) {
      console.error('❌ Error creating notifications for new survey:', error);
      // Don't fail the survey creation if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Data Survey ARM berhasil disimpan',
      surveyId: docRef.id,
      surveyType: 'Survey ARM'
    });

  } catch (error) {
    console.error('Error saving Survey ARM data:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Gagal menyimpan data Survey ARM', 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * GET - Mengambil data Survey ARM
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get('id');

    if (surveyId) {
      // Ambil survey ARM spesifik
              const doc = await adminDb.collection('surveys').doc(surveyId).get();
      
      if (!doc.exists) {
        return NextResponse.json({ message: 'Survey ARM tidak ditemukan' }, { status: 404 });
      }

      const data = doc.data();
      
      // Pastikan ini adalah Survey ARM
      if (data.surveyType !== 'Survey ARM' && !data.isARMSurvey) {
        return NextResponse.json({ message: 'Data bukan Survey ARM' }, { status: 400 });
      }

      return NextResponse.json({
        id: doc.id,
        ...data,
        projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : data.projectDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        validatedAt: data.validatedAt?.toDate ? data.validatedAt.toDate().toISOString() : null,
      });
    }

    // Ambil semua Survey ARM
            const snapshot = await adminDb.collection('surveys')
      .where('surveyType', '==', 'Survey ARM')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const surveys = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : data.projectDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        validatedAt: data.validatedAt?.toDate ? data.validatedAt.toDate().toISOString() : null,
      };
    });

    return NextResponse.json(surveys);

  } catch (error) {
    console.error('Error fetching Survey ARM data:', error);
    return NextResponse.json({ 
      message: 'Gagal mengambil data Survey ARM', 
      error: error.message 
    }, { status: 500 });
  }
}
