import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Debug: Checking survey-reports collection...');
    
    const reportsCollection = adminDb.collection('survey-reports');
    const snapshot = await reportsCollection.get();
    
    console.log(`Debug: Found ${snapshot.docs.length} documents in survey-reports collection`);
    
    if (snapshot.empty) {
      console.log('Debug: No documents found in survey-reports collection');
      return NextResponse.json({ 
        message: 'No documents found in survey-reports collection',
        count: 0,
        documents: []
      });
    }

    const documents = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        projectTitle: data.projectTitle || 'No title',
        surveyorName: data.surveyorName || 'No surveyor',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        hasGridData: !!data.gridData,
        hasDocumentationPhotos: !!(data.documentationPhotos && Object.keys(data.documentationPhotos).length > 0)
      };
    });

    console.log('Debug: Documents processed successfully');
    
    return NextResponse.json({
      message: 'Debug data retrieved successfully',
      count: documents.length,
      documents: documents
    });

  } catch (error) {
    console.error('Debug Error:', error);
    return NextResponse.json({ 
      message: 'Debug error occurred', 
      error: error.message 
    }, { status: 500 });
  }
}

