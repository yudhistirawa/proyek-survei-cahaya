import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'database-propose';

// GET - Mengambil semua data propose
export async function GET() {
  try {
    const proposeCollection = collection(db, COLLECTION_NAME);
    const q = query(proposeCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const proposeData = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      proposeData.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to ISO string
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      });
    });

    return NextResponse.json(proposeData);
  } catch (error) {
    console.error('Error mengambil data propose:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data propose' },
      { status: 500 }
    );
  }
}

// POST - Menambah data propose baru
export async function POST(request) {
  try {
    const body = await request.json();
    const { namaJalan, idTitik, daya, tiang, ruas, titikKordinat, kmzFileUrl } = body;

    // Validasi input
    if (!namaJalan || !idTitik || !daya || !tiang || !ruas || !titikKordinat) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Validasi KMZ file untuk data baru
    if (!kmzFileUrl) {
      return NextResponse.json(
        { error: 'File KMZ harus diupload' },
        { status: 400 }
      );
    }

    // Data yang akan disimpan
    const proposeData = {
      namaJalan: namaJalan.trim(),
      idTitik: idTitik.trim(),
      daya: daya.trim(),
      tiang: tiang.trim(),
      ruas: ruas.trim(),
      titikKordinat: titikKordinat.trim(),
      kmzFileUrl: kmzFileUrl.trim(),
      createdAt: serverTimestamp(),
      updatedAt: null
    };

    // Simpan ke Firestore
    const proposeCollection = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(proposeCollection, proposeData);

    return NextResponse.json({
      success: true,
      message: 'Data propose berhasil ditambahkan',
      id: docRef.id
    });
  } catch (error) {
    console.error('Error menambah data propose:', error);
    return NextResponse.json(
      { error: 'Gagal menambah data propose' },
      { status: 500 }
    );
  }
}

// PUT - Memperbarui data propose
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, namaJalan, idTitik, daya, tiang, ruas, titikKordinat, kmzFileUrl } = body;

    // Validasi input
    if (!id || !namaJalan || !idTitik || !daya || !tiang || !ruas || !titikKordinat) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Data yang akan diperbarui
    const updateData = {
      namaJalan: namaJalan.trim(),
      idTitik: idTitik.trim(),
      daya: daya.trim(),
      tiang: tiang.trim(),
      ruas: ruas.trim(),
      titikKordinat: titikKordinat.trim(),
      kmzFileUrl: kmzFileUrl?.trim() || null,
      updatedAt: serverTimestamp()
    };

    // Update dokumen di Firestore
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updateData);

    return NextResponse.json({
      success: true,
      message: 'Data propose berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error memperbarui data propose:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui data propose' },
      { status: 500 }
    );
  }
}

// DELETE - Menghapus data propose
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID tidak ditemukan' },
        { status: 400 }
      );
    }

    // Hapus dokumen dari Firestore
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: 'Data propose berhasil dihapus'
    });
  } catch (error) {
    console.error('Error menghapus data propose:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data propose' },
      { status: 500 }
    );
  }
}
