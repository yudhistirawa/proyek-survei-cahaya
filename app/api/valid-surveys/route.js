import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

// Lazy collection getters to avoid calling .collection() on null during build
const getSurveysExistingCollection = () => adminDb?.collection('Survey_Existing_Report');
const getSurveysAPJProposeCollection = () => adminDb?.collection('Tiang_APJ_Propose_Report');
const getValidSurveyCollection = () => adminDb?.collection('Valid_Survey_Data');

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 503 }
      );
    }

    const validSurveyCollection = getValidSurveyCollection();
    const { searchParams } = new URL(request.url);
    const surveyType = searchParams.get('type');

    // 1) Try reading from consolidated collection: Valid_Survey_Data
    try {
      let baseQuery = validSurveyCollection;
      // If there is a known validation status field, keep it; otherwise the collection already implies validated
      // We keep this optional filter to be safe across documents
      try {
        baseQuery = baseQuery.where('validationStatus', '==', 'validated');
      } catch (_) {
        // ignore if field not indexed or absent; proceed without it
      }

      if (surveyType && surveyType !== 'all') {
        try {
          baseQuery = baseQuery.where('surveyCategory', '==', surveyType);
        } catch (_) {
          // ignore if field not indexed; we'll filter in app layer later
        }
      }

      const validSnap = await baseQuery.limit(500).get();
      if (!validSnap.empty) {
        const items = await Promise.all(validSnap.docs.map(async (doc) => {
          const data = doc.data() || {};

          // Derive collectionName for marker color logic
          let collection = data.collection || data.collectionName;
          if (!collection) {
            if (data.surveyCategory === 'survey_apj_propose') collection = 'Tiang_APJ_Propose_Report';
            else if (data.surveyCategory === 'survey_existing') collection = 'Survey_Existing_Report';
          }

          // Derive category/zone if missing
          let surveyCategory = data.surveyCategory || (collection === 'Tiang_APJ_Propose_Report' ? 'survey_apj_propose' : 'survey_existing');
          let surveyZone = data.surveyZone || (surveyCategory === 'survey_apj_propose' ? 'propose' : 'existing');

          // Normalize OLD coordinates as fallback display text
          let coordString = data.titikKordinat || data.titikKoordinat || data.projectLocation || null;
          const latNum = data.lat ?? data.latitude ?? data.coordLat ?? (data.coordinates && (data.coordinates.lat ?? data.coordinates.latitude));
          const lngNum = data.lng ?? data.longitude ?? data.coordLng ?? (data.coordinates && (data.coordinates.lng ?? data.coordinates.longitude));
          if (!coordString && (typeof latNum === 'number' && typeof lngNum === 'number')) {
            coordString = `${latNum}, ${lngNum}`;
          }

          // Prefer NEW coordinates (admin-updated) when present
          const pickNewCoordFrom = (obj) => {
            const src = obj?.titikKordinatBaru || obj?.titikKoordinatBaru || obj?.koordinatBaru ||
                        obj?.titik_kordinat_baru || obj?.titik_koordinat_baru || obj?.newCoordinate || obj?.updatedCoordinate || null;
            if (!src) return null;
            if (typeof src === 'string') return src;
            if (typeof src === 'object') {
              const nlat = src.lat ?? src.latitude;
              const nlng = src.lng ?? src.longitude;
              if (typeof nlat === 'number' && typeof nlng === 'number') return `${nlat}, ${nlng}`;
            }
            return null;
          };

          let newCoordString = pickNewCoordFrom(data);

          // If this valid doc (older ones) does not have new coordinates, try to fetch from original document
          if (!newCoordString && data.originalCollection && data.originalId) {
            try {
              const srcSnap = await adminDb.collection(data.originalCollection).doc(String(data.originalId)).get();
              if (srcSnap.exists) {
                const srcData = srcSnap.data() || {};
                newCoordString = pickNewCoordFrom(srcData) || newCoordString;
                // Also allow overriding name if present on source
                if (!data.namaJalanBaru) {
                  data.namaJalanBaru = srcData.namaJalanBaru || srcData.NamaJalanBaru || srcData.nama_jalan_baru || data.namaJalanBaru;
                }
              }
            } catch (e) {
              console.warn('valid-surveys API: gagal fetch original doc for new coordinates', { id: data.originalId, col: data.originalCollection, err: e?.message });
            }
          }

          return {
            id: doc.id,
            collection,
            surveyCategory,
            surveyZone,
            projectTitle: data.projectTitle || 'Tidak ada judul',
            projectLocation: data.projectLocation || newCoordString || coordString || 'Lokasi tidak diketahui',
            titikKordinatBaru: newCoordString || null,
            namaJalanBaru: data.namaJalanBaru || data.NamaJalanBaru || data.nama_jalan_baru || null,
            surveyorName: data.surveyorName || data.namaSurveyor || 'Surveyor tidak diketahui',
            surveyType: data.surveyType || 'Survey Umum',
            validationStatus: data.validationStatus || 'validated',
            validatedAt: data.validatedAt?.toDate ? data.validatedAt.toDate().toISOString() : (data.validatedAt || null),
            validatedBy: data.validatedBy || null,
            validationNotes: data.validationNotes || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || null),
            lampPower: data.lampPower || data.dayaLampu || 'N/A',
            poleHeight: data.poleHeight || data.tinggiTiang || 'N/A',
            hasPhoto: !!(data.fotoTinggiARM || data.fotoTitikAktual || data.gridData || data.documentationPhotos),
            projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : (data.projectDate || null),
            gridData: data.gridData || null,
            documentationPhotos: data.documentationPhotos || null,
            // Existing-specific
            kepemilikanTiang: data.kepemilikanTiang || null,
            jenisTiang: data.jenisTiang || null,
            jenisTiangPLN: data.jenisTiangPLN || null,
            trafo: data.trafo || null,
            jenisTrafo: data.jenisTrafo || null,
            lampu: data.lampu || null,
            jumlahLampu: data.jumlahLampu || null,
            jenisLampu: data.jenisLampu || null,
            titikKordinat: coordString || null,
            lebarJalan1: data.lebarJalan1 || null,
            lebarJalan2: data.lebarJalan2 || null,
            lebarBahuBertiang: data.lebarBahuBertiang || null,
            lebarTrotoarBertiang: data.lebarTrotoarBertiang || null,
            lainnyaBertiang: data.lainnyaBertiang || null,
            // APJ Propose-specific
            idTitik: data.idTitik || null,
            dataDaya: data.dataDaya || null,
            dataTiang: data.dataTiang || null,
            dataRuas: data.dataRuas || null,
            namaJalan: data.namaJalan || null,
            jarakAntarTiang: data.jarakAntarTiang || null,
            lebarBahuBertiangAPJ: data.lebarBahuBertiang || null,
            lebarTrotoarBertiangAPJ: data.lebarTrotoarBertiang || null,
            lainnyaBertiangAPJ: data.lainnyaBertiang || null,
          };
        }));

        // Extra filter by type when we couldn't add where above
        const filtered = (surveyType && surveyType !== 'all')
          ? items.filter(it => it.surveyCategory === surveyType)
          : items;

        return NextResponse.json(filtered);
      }
    } catch (validCollectionError) {
      console.log('Read from Valid_Survey_Data failed, fallback to legacy collections:', validCollectionError.message);
    }

    // Query untuk mengambil survey yang sudah divalidasi dari kedua koleksi
    let existingSnapshot, apjProposeSnapshot;
    
    const surveysExistingCollection = getSurveysExistingCollection();
    const surveysAPJProposeCollection = getSurveysAPJProposeCollection();
    
    try {
      // Query untuk Survey Existing
      let existingQuery = surveysExistingCollection
        .where('validationStatus', '==', 'validated')
        .orderBy('createdAt', 'desc');

      // Query untuk Survey APJ Propose
      let apjProposeQuery = surveysAPJProposeCollection
        .where('validationStatus', '==', 'validated')
        .orderBy('createdAt', 'desc');

      // Jika ada filter tipe survey
      if (surveyType && surveyType !== 'all') {
        if (surveyType === 'survey_existing') {
          existingSnapshot = await existingQuery.limit(100).get();
          apjProposeSnapshot = { empty: true, docs: [] };
        } else if (surveyType === 'survey_apj_propose') {
          apjProposeSnapshot = await apjProposeQuery.limit(100).get();
          existingSnapshot = { empty: true, docs: [] };
        } else {
          // Jika tipe tidak dikenali, ambil dari kedua koleksi
          [existingSnapshot, apjProposeSnapshot] = await Promise.all([
            existingQuery.limit(100).get(),
            apjProposeQuery.limit(100).get()
          ]);
        }
      } else {
        // Jika tidak ada filter, ambil semua data yang sudah divalidasi dari kedua koleksi
        [existingSnapshot, apjProposeSnapshot] = await Promise.all([
          existingQuery.limit(100).get(),
          apjProposeQuery.limit(100).get()
        ]);
      }
    } catch (error) {
      console.log('Primary query failed, using simple fallback query:', error.message);
      
      // Fallback: hanya filter berdasarkan validationStatus
      try {
        [existingSnapshot, apjProposeSnapshot] = await Promise.all([
          surveysExistingCollection.where('validationStatus', '==', 'validated').limit(100).get(),
          surveysAPJProposeCollection.where('validationStatus', '==', 'validated').limit(100).get()
        ]);
      } catch (fallbackError) {
        console.log('Fallback query also failed:', fallbackError.message);
        existingSnapshot = { empty: true, docs: [] };
        apjProposeSnapshot = { empty: true, docs: [] };
      }
    }
    
    if (existingSnapshot.empty && apjProposeSnapshot.empty) {
      return NextResponse.json([]);
    }

    // Gabungkan data dari kedua koleksi
    const allDocs = [
              ...existingSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, collection: 'Survey_Existing_Report' })),
        ...apjProposeSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, collection: 'Tiang_APJ_Propose_Report' }))
    ];

    const validSurveys = allDocs
      .map(doc => {
        const data = doc;
        
        // Tentukan kategori survey berdasarkan koleksi dan data yang ada
        let surveyCategory = data.surveyCategory || 'survey_existing';
        let surveyZone = data.surveyZone || 'existing';
        
        // Auto-detect kategori berdasarkan koleksi
        if (data.collection === 'Survey_Existing_Report') {
          surveyCategory = 'survey_existing';
          surveyZone = 'existing';
        } else if (data.collection === 'Tiang_APJ_Propose_Report') {
          surveyCategory = 'survey_apj_propose';
          surveyZone = 'propose';
        }
        
        // Auto-detect kategori berdasarkan judul proyek jika masih belum terdeteksi
        if (data.projectTitle) {
          const title = data.projectTitle.toLowerCase();
          if (title.includes('existing')) {
            surveyCategory = 'survey_existing';
            surveyZone = 'existing';
          } else if (title.includes('apj propose') || title.includes('apj')) {
            surveyCategory = 'survey_apj_propose';
            surveyZone = 'propose';
          }
        }

        return {
          id: doc.id,
          projectTitle: data.projectTitle || 'Tidak ada judul',
          projectLocation: data.projectLocation || data.titikKordinatBaru || data.titikKoordinatBaru || data.koordinatBaru || data.titik_kordinat_baru || data.titik_koordinat_baru || data.newCoordinate || data.updatedCoordinate || data.titikKordinat || 'Lokasi tidak diketahui',
          surveyorName: data.surveyorName || 'Surveyor tidak diketahui',
          surveyCategory: surveyCategory,
          surveyZone: surveyZone,
          surveyType: data.surveyType || 'Survey Umum',
          validationStatus: data.validationStatus,
          validatedAt: data.validatedAt?.toDate ? data.validatedAt.toDate().toISOString() : null,
          validatedBy: data.validatedBy || null,
          validationNotes: data.validationNotes || '',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          lampPower: data.lampPower || 'N/A',
          poleHeight: data.poleHeight || 'N/A',
          hasPhoto: !!(data.fotoTinggiARM || data.fotoTitikAktual || data.gridData || data.documentationPhotos),
          // Data tambahan untuk ekspor
          projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : null,
          gridData: data.gridData || null,
          documentationPhotos: data.documentationPhotos || null,
          // Data spesifik Survey Existing
          kepemilikanTiang: data.kepemilikanTiang || null,
          jenisTiang: data.jenisTiang || null,
          jenisTiangPLN: data.jenisTiangPLN || null,
          trafo: data.trafo || null,
          jenisTrafo: data.jenisTrafo || null,
          lampu: data.lampu || null,
          jumlahLampu: data.jumlahLampu || null,
          jenisLampu: data.jenisLampu || null,
          titikKordinat: data.titikKordinat || null,
          titikKordinatBaru: data.titikKordinatBaru || data.titikKoordinatBaru || data.koordinatBaru || data.titik_kordinat_baru || data.titik_koordinat_baru || data.newCoordinate || data.updatedCoordinate || null,
          namaJalanBaru: data.namaJalanBaru || data.NamaJalanBaru || data.nama_jalan_baru || null,
          lebarJalan1: data.lebarJalan1 || null,
          lebarJalan2: data.lebarJalan2 || null,
          lebarBahuBertiang: data.lebarBahuBertiang || null,
          lebarTrotoarBertiang: data.lebarTrotoarBertiang || null,
          lainnyaBertiang: data.lainnyaBertiang || null,
          tinggiARM: data.tinggiARM || null,
          fotoTinggiARM: data.fotoTinggiARM || null,
          fotoTitikAktual: data.fotoTitikAktual || null,
          keterangan: data.keterangan || null,
          // Data spesifik Survey APJ Propose
          idTitik: data.idTitik || null,
          dataDaya: data.dataDaya || null,
          dataTiang: data.dataTiang || null,
          dataRuas: data.dataRuas || null,
          namaJalan: data.namaJalan || null,
          jarakAntarTiang: data.jarakAntarTiang || null,
          lebarBahuBertiangAPJ: data.lebarBahuBertiang || null,
          lebarTrotoarBertiangAPJ: data.lebarTrotoarBertiang || null,
          lainnyaBertiangAPJ: data.lainnyaBertiang || null,
        };
      })
      .filter(survey => {
        // Filter di sisi aplikasi jika ada parameter surveyType
        if (surveyType && surveyType !== 'all') {
          return survey.surveyCategory === surveyType;
        }
        return true;
      });

    return NextResponse.json(validSurveys);
  } catch (error) {
    console.error('Error fetching valid surveys:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data survey valid', details: error.message },
      { status: 500 }
    );
  }
}
