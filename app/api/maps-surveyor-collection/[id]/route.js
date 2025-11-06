import { NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { firebaseApp } from '../../../lib/firebase';

// DELETE - Menghapus data di maps_surveyor_collection berdasarkan ID
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const db = getFirestore(firebaseApp);
    const ref = doc(db, 'maps_surveyor_collection', id);

    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Data maps_surveyor_collection tidak ditemukan' }, { status: 404 });
    }

    await deleteDoc(ref);

    return NextResponse.json({ success: true, message: 'Data maps_surveyor_collection berhasil dihapus', id });
  } catch (error) {
    console.error('Error deleting maps_surveyor_collection item:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data', details: error.message }, { status: 500 });
  }
}
