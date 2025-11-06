import { NextResponse } from 'next/server';
import { adminDb, adminStorage as storage } from '../../lib/firebase-admin.js';

// GET - Mengambil semua tugas atau tugas berdasarkan surveyorId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyorId = searchParams.get('surveyorId');
    const adminId = request.headers.get('x-admin-id') || '';
    
    if (!adminId) {
      return NextResponse.json({
        success: false,
        error: 'Admin ID is required in headers'
      }, { status: 401 });
    }
    
    // Base query: filter by admin's createdBy field
    let query = adminDb.collection('task_assignments')
      .where('createdBy', '==', adminId);
    
    // If surveyorId is provided, add additional filter
    if (surveyorId) {
      query = query.where('surveyorId', '==', surveyorId);
    }
    // Note: Avoid orderBy here to prevent composite index requirement. We'll sort in memory.
    const snapshot = await query.get();
    
    let tasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        deadline: data.deadline?.toDate ? data.deadline.toDate().toISOString() : data.deadline
      };
    });
    // Sort tasks by createdAt desc (newest first)
    tasks = tasks.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Menghapus tugas berdasarkan id (dan file terlampir jika ada)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id wajib diisi' }, { status: 400 });
    }

    // Ambil data tugas untuk mengetahui file yang perlu dihapus
    const docRef = adminDb.collection('task_assignments').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Tugas tidak ditemukan' }, { status: 404 });
    }

    const data = docSnap.data() || {};

    // Helper: ekstrak storage path dari download URL
    const extractPathFromUrl = (url) => {
      if (!url || typeof url !== 'string') return null;
      try {
        // Format: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path-encoded>?...
        const match = url.match(/\/o\/([^?]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
        // Format gs://bucket/path or direct domain storage URL
        const gsMatch = url.startsWith('gs://') ? url.replace(/^gs:\/\/[^/]+\//, '') : null;
        if (gsMatch) return gsMatch;
      } catch (_) {}
      return null;
    };

    // Kumpulkan kemungkinan file path dari data.fileData atau fields lain
    const filePaths = [];
    const fileData = data.fileData || data.excelFile || data.kmzFile || null;
    const possibleUrls = [];
    if (fileData) {
      if (fileData.path) filePaths.push(fileData.path);
      if (fileData.storagePath) filePaths.push(fileData.storagePath);
      if (fileData.fullPath) filePaths.push(fileData.fullPath);
      if (fileData.downloadURL) possibleUrls.push(fileData.downloadURL);
      if (fileData.url) possibleUrls.push(fileData.url);
    }

    // Ekstrak path dari URL jika belum ada path
    possibleUrls.forEach((u) => {
      const p = extractPathFromUrl(u);
      if (p) filePaths.push(p);
    });

    // Hapus file di Storage (best-effort)
    if (Array.isArray(filePaths) && filePaths.length > 0) {
      const bucket = storage.bucket();
      for (const p of filePaths) {
        try {
          await bucket.file(p).delete({ ignoreNotFound: true });
        } catch (e) {
          console.warn('Gagal hapus file storage:', p, e?.message || e);
        }
      }
    }

    // Hapus dokumen tugas
    await docRef.delete();

    // Hapus notifikasi yang terkait dengan tugas ini (best-effort)
    try {
      const notifQuery = await adminDb
        .collection('notifications')
        .where('relatedId', '==', id)
        .get();
      if (!notifQuery.empty) {
        const batch = adminDb.batch();
        notifQuery.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn('Gagal menghapus notifikasi terkait tugas:', e?.message || e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Fungsi untuk membuat notifikasi tugas
const createTaskNotification = async (taskData, surveyorData) => {
  try {
    console.log('📝 Membuat notifikasi untuk surveyor:', surveyorData.name || surveyorData.username);
    
    const notificationData = {
      userId: taskData.surveyorId,
      type: 'tugas',
      title: 'Tugas Baru Diterima',
      message: `Anda mendapat tugas baru: ${taskData.title}. Tipe: ${taskData.taskType === 'existing' ? 'Zona Existing' : 'Propose'}`,
      relatedId: taskData.id,
      status: 'pending',
      metadata: {
        taskType: taskData.taskType,
        taskTitle: taskData.title,
        deadline: taskData.deadline,
        priority: taskData.priority,
        createdBy: taskData.createdBy
      },
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📤 Menyimpan notifikasi ke database...');
            const notificationRef = await adminDb.collection('notifications').add(notificationData);
    console.log('✅ Notifikasi berhasil disimpan dengan ID:', notificationRef.id);
    
    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error('❌ Error creating task notification:', error);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

// POST - Membuat tugas baru
export async function POST(request) {
  try {
    console.log('🚀 POST /api/task-assignments dipanggil');
    console.log('📥 Request headers:', Object.fromEntries(request.headers.entries()));
    
    const taskData = await request.json();
    console.log('📥 Request body:', taskData);
    
    // Ambil adminId dari header dan validasi
    const adminId = request.headers.get('x-admin-id') || '';
    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required in headers' }, { status: 401 });
    }
    
    // Validasi data yang diperlukan
    if (!taskData.title || !taskData.surveyorId || !taskData.description) {
      console.log('❌ Validasi gagal:', { 
        hasTitle: !!taskData.title, 
        hasSurveyorId: !!taskData.surveyorId, 
        hasDescription: !!taskData.description 
      });
      return NextResponse.json({
        success: false,
        error: 'Judul, surveyor, dan deskripsi tugas diperlukan'
      }, { status: 400 });
    }
    
    console.log('✅ Validasi data berhasil');

    // Ambil data surveyor
    console.log('👤 Mencari surveyor dengan ID:', taskData.surveyorId);
            const surveyorRef = adminDb.collection('users').doc(taskData.surveyorId);
    const surveyorDoc = await surveyorRef.get();
    
    if (!surveyorDoc.exists) {
      console.log('❌ Surveyor tidak ditemukan:', taskData.surveyorId);
      return NextResponse.json({
        success: false,
        error: 'Surveyor tidak ditemukan'
      }, { status: 404 });
    }

    const surveyorData = surveyorDoc.data();
    console.log('✅ Surveyor ditemukan:', surveyorData.name || surveyorData.username);

    // Ambil nama admin pembuat (untuk ditampilkan ke surveyor tanpa extra query)
    let createdByName = '';
    try {
      const adminUserSnap = await adminDb.collection('users').doc(adminId).get();
      if (adminUserSnap.exists) {
        const u = adminUserSnap.data() || {};
        createdByName = u.name || u.fullName || u.username || u.displayName || u.email || adminId;
      }
    } catch (_) {}

    // Siapkan data tugas
    const taskDocument = {
      title: taskData.title,
      description: taskData.description,
      surveyorId: taskData.surveyorId,
      surveyorName: surveyorData.name || surveyorData.username,
      surveyorEmail: surveyorData.email,
      taskType: taskData.taskType || 'existing', // existing atau propose
      status: 'pending', // pending, in_progress, completed, cancelled
      priority: taskData.priority || 'medium', // low, medium, high
      deadline: taskData.deadline ? new Date(taskData.deadline) : null,
      
      // File data
      kmzFile: taskData.kmzFile || null,
      excelFile: taskData.excelFile || null,
      mapData: taskData.mapData || null,
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
      createdByName: createdByName,
      assignedAt: new Date()
    };

    // Simpan ke database
    console.log('💾 Menyimpan tugas ke database...');
            const taskRef = await adminDb.collection('task_assignments').add(taskDocument);
    
    // Tambahkan ID tugas ke data untuk notifikasi
    const taskWithId = {
      id: taskRef.id,
      ...taskDocument
    };
    
    console.log(`✅ Tugas berhasil dibuat dengan ID: ${taskRef.id}`);

    // Kirim notifikasi ke surveyor
    try {
      console.log('📢 Mengirim notifikasi ke surveyor...');
      const notificationResult = await createTaskNotification(taskWithId, surveyorData);
      if (notificationResult.success) {
        console.log('✅ Notifikasi berhasil dibuat untuk surveyor:', surveyorData.name || surveyorData.username);
      } else {
        console.warn('⚠️ Gagal membuat notifikasi:', notificationResult.error);
      }
    } catch (notificationError) {
      console.warn('⚠️ Gagal mengirim notifikasi, tetapi tugas tetap dibuat:', notificationError);
    }

    const responseData = {
      id: taskRef.id,
      ...taskDocument,
      createdAt: taskDocument.createdAt.toISOString(),
      updatedAt: taskDocument.updatedAt.toISOString(),
      assignedAt: taskDocument.assignedAt.toISOString()
    };

    console.log('📤 Mengirim response:', responseData);
    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error creating task:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
