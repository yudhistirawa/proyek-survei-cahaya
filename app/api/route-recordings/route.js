import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { points, userId, taskId } = body;

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: 'Data titik kosong' }, { status: 400 });
    }

    const doc = {
      userId: userId || null,
      taskId: taskId || null,
      points,
      createdAt: new Date(),
    };

            const ref = await adminDb.collection('surveyRoutes').add(doc);

    return NextResponse.json({ id: ref.id });
  } catch (e) {
    console.error('Error saving route recording:', e);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}
