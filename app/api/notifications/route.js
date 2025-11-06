import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

// Helper function to get notifications collection safely
const getNotificationsCollection = () => {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized - check environment variables');
  }
  return adminDb.collection('notifications');
};

/**
 * GET - Mengambil notifikasi berdasarkan user dan tipe
 */
export async function GET(request) {
  try {
    console.log('📥 GET /api/notifications');
    
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      // During build time, return empty array instead of error
      if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json([]);
      }
      return NextResponse.json({ 
        message: 'Database connection not available',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'tugas' atau 'survey'
    const limit = parseInt(searchParams.get('limit')) || 50;

    console.log('📋 Request params:', { userId, type, limit });

    if (!userId) {
      console.log('❌ Missing userId');
      return NextResponse.json({ message: 'User ID diperlukan' }, { status: 400 });
    }

    console.log('🔍 Querying notifications for user:', userId);
    
    const notificationsCollection = getNotificationsCollection();
    let query = notificationsCollection
      .where('userId', '==', userId)
      .limit(limit);

    // Filter berdasarkan tipe jika ada
    if (type && (type === 'tugas' || type === 'survey')) {
      console.log('🔍 Filtering by type:', type);
      query = notificationsCollection
        .where('userId', '==', userId)
        .where('type', '==', type)
        .limit(limit);
    }

    const snapshot = await query.get();
    console.log('📊 Found notifications:', snapshot.docs.length);

    if (snapshot.empty) {
      console.log('📭 No notifications found');
      return NextResponse.json([]);
    }

    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null
      };
    });

    // Sort by createdAt descending (newest first) di server-side
    const sortedNotifications = notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    console.log('✅ Returning notifications:', sortedNotifications.length);
    return NextResponse.json(sortedNotifications);
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { message: 'Gagal mengambil notifikasi', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Membuat notifikasi baru
 */
export async function POST(request) {
  try {
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Database connection not available',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }

    const data = await request.json();
    const {
      userId,
      type, // 'tugas' atau 'survey'
      title,
      message,
      relatedId, // ID tugas atau survey terkait
      status, // untuk survey: 'approved', 'rejected', 'pending'
      metadata // data tambahan
    } = data;

    // Validasi data wajib
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { message: 'Data tidak lengkap. userId, type, title, dan message diperlukan.' },
        { status: 400 }
      );
    }

    // Validasi tipe notifikasi
    if (!['tugas', 'survey'].includes(type)) {
      return NextResponse.json(
        { message: 'Tipe notifikasi harus "tugas" atau "survey"' },
        { status: 400 }
      );
    }

    const notificationData = {
      userId,
      type,
      title,
      message,
      relatedId: relatedId || null,
      status: status || null,
      metadata: metadata || {},
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const notificationsCollection = getNotificationsCollection();
    const docRef = await notificationsCollection.add(notificationData);

    return NextResponse.json({
      id: docRef.id,
      message: 'Notifikasi berhasil dibuat',
      notification: {
        id: docRef.id,
        ...notificationData,
        createdAt: notificationData.createdAt.toISOString(),
        updatedAt: notificationData.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { message: 'Gagal membuat notifikasi', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update status notifikasi (mark as read)
 */
export async function PUT(request) {
  try {
    console.log('📝 PUT /api/notifications - Mark as read');
    
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Database connection not available',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }
    
    const data = await request.json();
    const { notificationId, isRead } = data;
    console.log('📥 Request data:', { notificationId, isRead });

    if (!notificationId) {
      console.log('❌ Missing notificationId');
      return NextResponse.json(
        { message: 'Notification ID diperlukan' },
        { status: 400 }
      );
    }

    console.log('🔍 Looking for notification:', notificationId);
    const notificationsCollection = getNotificationsCollection();
    const notificationRef = notificationsCollection.doc(notificationId);
    const notificationDoc = await notificationRef.get();

    if (!notificationDoc.exists) {
      console.log('❌ Notification not found:', notificationId);
      return NextResponse.json(
        { message: 'Notifikasi tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('✅ Found notification, updating...');
    await notificationRef.update({
      isRead: isRead !== undefined ? isRead : true,
      updatedAt: new Date()
    });

    console.log('✅ Notification updated successfully');
    return NextResponse.json({
      message: 'Status notifikasi berhasil diupdate',
      notificationId: notificationId,
      isRead: isRead !== undefined ? isRead : true
    });
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { message: 'Gagal mengupdate notifikasi', error: error.message },
      { status: 500 }
    );
  }
}
