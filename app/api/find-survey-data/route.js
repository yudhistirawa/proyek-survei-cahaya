import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export async function GET(request) {
  try {
    console.log('Searching for survey data...');

    // Collections that might contain survey validation data
    const collections = [
      'survey_validations',
      'Survey_Existing_Report', 
      'Tiang_APJ_Propose_Report',
      'Valid_Survey_Data',
      'admin_notifications'
    ];

    const results = {};

    for (const collectionName of collections) {
      try {
        console.log(`Checking collection: ${collectionName}`);
        
        // Get first 10 documents to see structure
        const snapshot = await adminDb
          .collection(collectionName)
          .limit(10)
          .get();

        if (!snapshot.empty) {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));
          
          results[collectionName] = {
            count: snapshot.size,
            totalInCollection: snapshot.size,
            sampleDocs: docs
          };
          
          console.log(`Found ${snapshot.size} documents in ${collectionName}`);
        } else {
          results[collectionName] = {
            count: 0,
            message: 'Collection is empty'
          };
        }
      } catch (collectionError) {
        console.error(`Error accessing collection ${collectionName}:`, collectionError);
        results[collectionName] = {
          error: collectionError.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Survey data search completed'
    });

  } catch (error) {
    console.error('Error searching survey data:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
