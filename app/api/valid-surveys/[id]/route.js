import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('Valid_Survey_Data').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    await docRef.delete();

    return NextResponse.json(
      { message: 'Data survey berhasil dihapus' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting valid survey:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data survey', details: error.message },
      { status: 500 }
    );
  }
}
