import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyorName = searchParams.get('surveyorName') || 'kadek';
    const deleteAll = searchParams.get('deleteAll') === 'true';
    const streetNames = (searchParams.get('streetNames') || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    console.log('Deleting survey validation data for:', { surveyorName, deleteAll, streetNames });

    // Collections that store survey validation data
    const collections = [
      'survey_validations',
      'Survey_Existing_Report', 
      'Tiang_APJ_Propose_Report',
      'Valid_Survey_Data',
      'admin_notifications'
    ];

    let totalDeleted = 0;
    const deletionResults = {};

    for (const collectionName of collections) {
      let deletedInCollection = 0;
      
      try {
        if (deleteAll) {
          // Delete all documents in collection
          const allQuery = await adminDb
            .collection(collectionName)
            .limit(500)
            .get();

          if (!allQuery.empty) {
            const batch = adminDb.batch();
            allQuery.docs.forEach(doc => {
              batch.delete(doc.ref);
              deletedInCollection++;
            });
            await batch.commit();
          }
        } else {
          // Delete by surveyor name
          const surveyorQuery = await adminDb
            .collection(collectionName)
            .where('surveyorName', '==', surveyorName)
            .get();

          if (!surveyorQuery.empty) {
            const batch = adminDb.batch();
            surveyorQuery.docs.forEach(doc => {
              batch.delete(doc.ref);
              deletedInCollection++;
            });
            await batch.commit();
          }

          // Additionally delete by streetNames across common fields
          if (streetNames.length > 0) {
            const fieldVariations = [
              'namaJalan',
              'nama_jalan',
              'projectTitle',
              'projectLocation',
              'NamaJalan',
              'title',
              'location',
            ];

            for (const name of streetNames) {
              for (const field of fieldVariations) {
                try {
                  const q = await adminDb
                    .collection(collectionName)
                    .where(field, '==', name)
                    .get();
                  if (!q.empty) {
                    const batch = adminDb.batch();
                    q.docs.forEach(doc => { batch.delete(doc.ref); deletedInCollection++; });
                    await batch.commit();
                  }
                } catch (e) {
                  // ignore if field is not indexed/exists
                }
              }
            }
          }

          // For admin_notifications, also delete by survey type and fuzzy title/message match
          if (collectionName === 'admin_notifications') {
            const notificationQuery = await adminDb
              .collection(collectionName)
              .where('type', '==', 'survey_validation')
              .get();

            if (!notificationQuery.empty) {
              const batch = adminDb.batch();
              notificationQuery.docs.forEach(doc => {
                const data = doc.data();
                const hasNameMatch = data.surveyorName === surveyorName;
                const hasStreetMatch = streetNames.length > 0 && (
                  typeof data.title === 'string' && streetNames.some(n => data.title?.toLowerCase().includes(n.toLowerCase())) ||
                  typeof data.message === 'string' && streetNames.some(n => data.message?.toLowerCase().includes(n.toLowerCase())) ||
                  typeof data.location === 'string' && streetNames.some(n => data.location?.toLowerCase().includes(n.toLowerCase()))
                );
                if (hasNameMatch || hasStreetMatch) {
                  batch.delete(doc.ref);
                  deletedInCollection++;
                }
              });
              await batch.commit();
            }
          }
        }

        deletionResults[collectionName] = deletedInCollection;
        totalDeleted += deletedInCollection;

      } catch (collectionError) {
        console.error(`Error processing collection ${collectionName}:`, collectionError);
        deletionResults[collectionName] = `Error: ${collectionError.message}`;
      }
    }

    console.log('Deletion completed:', { totalDeleted, deletionResults });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} survey validation entries`,
      totalDeleted,
      deletionResults,
      surveyorName,
      deleteAll
    });

  } catch (error) {
    console.error('Error deleting survey validation data:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to delete survey validation data'
    }, { status: 500 });
  }
}
