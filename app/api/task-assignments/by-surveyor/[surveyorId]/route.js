import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin.js';

export async function GET(request, { params }) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin not initialized' },
        { status: 503 }
      );
    }

    const { surveyorId } = params;
    
    if (!surveyorId) {
      return NextResponse.json(
        { success: false, error: 'surveyorId parameter is required' },
        { status: 400 }
      );
    }

    // Query task_assignments collection for the given surveyorId
    const snapshot = await adminDb
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