import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64, 'base64').toString('utf8')
    );
    
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  return getFirestore();
};

// Initialize Firebase Admin
const adminDb = initializeFirebaseAdmin();

export async function GET(request, { params }) {
  try {
    const { surveyorId } = params;
    
    if (!surveyorId) {
      return NextResponse.json(
        { success: false, error: 'surveyorId parameter is required' },
        { status: 400 }
      );
    }

    // Query task_assignments collection for the given surveyorId
    const snapshot = await getFirestore()
      .collection('task_assignments')
      .where('surveyorId', '==', surveyorId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      );
    }

    // Map documents to include their IDs
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(
      { success: true, data: tasks },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task assignments' },
      { status: 500 }
    );
  }
}