import { NextResponse } from 'next/server';

// Ensure this API uses Node.js runtime (Firebase Admin is not compatible with Edge runtime)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Dynamic import untuk menghindari masalah module resolution
    let db;
    try {
      const firebaseAdmin = await import('../../lib/firebase-admin.js');
      db = firebaseAdmin.adminDb;
      
      // Check if Firebase Admin is properly initialized
      if (!db) {
        console.warn('⚠️ Firebase Admin DB not initialized, returning default stats');
        return NextResponse.json({
          totalUsers: 0,
          activeTasks: 0,
          pendingValidation: 0,
          databaseRecords: 0,
          totalSurveys: 0,
          completedSurveys: 0,
          surveysBaru: 0,
          tugasSelesai: 0,
          pending: 0,
          totalTasks: 0,
          validatedSurveys: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Firebase Admin tidak terinisialisasi - menggunakan data default'
        });
      }
      
      console.log('✅ Firebase Admin imported successfully');
    } catch (importError) {
      console.error('❌ Error importing firebase-admin:', importError);
      return NextResponse.json({
        totalUsers: 0,
        activeTasks: 0,
        pendingValidation: 0,
        databaseRecords: 0,
        totalSurveys: 0,
        completedSurveys: 0,
        surveysBaru: 0,
        tugasSelesai: 0,
        pending: 0,
        totalTasks: 0,
        validatedSurveys: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Gagal menginisialisasi Firebase Admin SDK'
      });
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';
    const userId = searchParams.get('userId');

    if (isAdmin) {
      // Ambil data real-time dari Firebase untuk admin dengan error handling
      let usersSnapshot, surveyExistingSnapshot, surveyAPJProposeSnapshot, taskSnapshot;
      
      try {
        [usersSnapshot, surveyExistingSnapshot, surveyAPJProposeSnapshot, taskSnapshot] = await Promise.all([
          // Total Surveyor (users)
          db.collection('users').get(),
          
          // Survey Existing
          db.collection('Survey_Existing_Report').get(),
          
          // Survey APJ Propose
          db.collection('Tiang_APJ_Propose_Report').get(),
          
          // Tasks (jika ada koleksi tasks)
          db.collection('tasks').get().catch(() => ({ empty: true, docs: [] }))
        ]);
      } catch (firebaseError) {
        console.error('Error fetching Firebase data:', firebaseError);
        // Return default stats jika Firebase error
        return NextResponse.json({
          totalUsers: 0,
          activeTasks: 0,
          pendingValidation: 0,
          databaseRecords: 0,
          totalSurveys: 0,
          completedSurveys: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Firebase connection error'
        });
      }

      // Hitung statistik - hanya petugas surveyor
      const totalUsers = usersSnapshot.docs.filter(doc => 
        doc.data().role === 'petugas_surveyor'
      ).length;
      
      // Total survey dari kedua koleksi
      const totalSurveys = surveyExistingSnapshot.size + surveyAPJProposeSnapshot.size;
      
      // Survey yang menunggu validasi
      const pendingValidation = surveyExistingSnapshot.docs.filter(doc => 
        doc.data().validationStatus !== 'validated'
      ).length + surveyAPJProposeSnapshot.docs.filter(doc => 
        doc.data().validationStatus !== 'validated'
      ).length;
      
      // Survey yang sudah divalidasi
      const completedSurveys = surveyExistingSnapshot.docs.filter(doc => 
        doc.data().validationStatus === 'validated'
      ).length + surveyAPJProposeSnapshot.docs.filter(doc => 
        doc.data().validationStatus === 'validated'
      ).length;
      
      // Tugas aktif (jika ada koleksi tasks)
      const activeTasks = taskSnapshot.empty ? 0 : taskSnapshot.docs.filter(doc => 
        doc.data().status === 'active' || doc.data().status === 'pending'
      ).length;

      const stats = {
        totalUsers,
        activeTasks,
        pendingValidation,
        databaseRecords: totalSurveys,
        totalSurveys,
        completedSurveys,
        lastUpdated: new Date().toISOString()
      };
      
      return NextResponse.json(stats);
    } else if (userId) {
      // Ambil statistik untuk user tertentu dengan error handling
      let userSurveysExisting, userSurveysAPJPropose, userTasks, taskAssignments;
      
      try {
        [userSurveysExisting, userSurveysAPJPropose, userTasks, taskAssignments] = await Promise.all([
          // Survey user dari Survey Existing
          db.collection('Survey_Existing_Report').where('userId', '==', userId).get(),
          
          // Survey user dari Survey APJ Propose
          db.collection('Tiang_APJ_Propose_Report').where('userId', '==', userId).get(),
          
          // Tasks user (jika ada)
          db.collection('tasks').where('assignedTo', '==', userId).get().catch(() => ({ empty: true, docs: [] })),
          
          // Task assignments untuk user ini
          db.collection('task_assignments').where('surveyorId', '==', userId).get().catch(() => ({ empty: true, docs: [] }))
        ]);
      } catch (firebaseError) {
        console.error('Error fetching user Firebase data:', firebaseError);
        // Return default stats jika Firebase error
        return NextResponse.json({
          surveysBaru: 0,
          tugasSelesai: 0,
          pending: 0,
          totalSurveys: 0,
          totalTasks: 0,
          validatedSurveys: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Firebase connection error'
        });
      }

      // Hitung survey yang dibuat hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const surveysToday = userSurveysExisting.docs.filter(doc => {
        const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
        return createdAt >= today;
      }).length + userSurveysAPJPropose.docs.filter(doc => {
        const createdAt = doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt);
        return createdAt >= today;
      }).length;

      // Hitung survey yang pending (belum divalidasi)
      const pending = userSurveysExisting.docs.filter(doc => 
        doc.data().validationStatus !== 'validated'
      ).length + userSurveysAPJPropose.docs.filter(doc => 
        doc.data().validationStatus !== 'validated'
      ).length;

      // Hitung survey yang sudah divalidasi
      const validatedSurveys = userSurveysExisting.docs.filter(doc => 
        doc.data().validationStatus === 'validated'
      ).length + userSurveysAPJPropose.docs.filter(doc => 
        doc.data().validationStatus === 'validated'
      ).length;

      // Hitung tugas yang selesai (dari task_assignments)
      const tugasSelesai = taskAssignments.empty ? 0 : taskAssignments.docs.filter(doc => 
        doc.data().status === 'completed' || doc.data().status === 'selesai'
      ).length;

      // Total survey
      const totalSurveys = userSurveysExisting.size + userSurveysAPJPropose.size;

      // Total tugas
      const totalTasks = taskAssignments.empty ? 0 : taskAssignments.size;

      const stats = {
        surveysBaru: surveysToday, // Survey yang dibuat hari ini
        tugasSelesai,
        pending,
        totalSurveys,
        totalTasks,
        validatedSurveys,
        lastUpdated: new Date().toISOString()
      };
      
      return NextResponse.json(stats);
    } else {
      // Return default stats dengan warning untuk parameter tidak lengkap
      return NextResponse.json({
        totalUsers: 0,
        activeTasks: 0,
        pendingValidation: 0,
        databaseRecords: 0,
        totalSurveys: 0,
        completedSurveys: 0,
        surveysBaru: 0,
        tugasSelesai: 0,
        pending: 0,
        totalTasks: 0,
        validatedSurveys: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Parameter tidak lengkap - menggunakan data default'
      });
    }
  } catch (error) {
    console.error('Error mengambil dashboard stats:', error);
    
    // Return default stats untuk mencegah crash dengan status 200
    const defaultStats = {
      totalUsers: 0,
      activeTasks: 0,
      pendingValidation: 0,
      databaseRecords: 0,
      totalSurveys: 0,
      completedSurveys: 0,
      surveysBaru: 0,
      tugasSelesai: 0,
      pending: 0,
      totalTasks: 0,
      validatedSurveys: 0,
      lastUpdated: new Date().toISOString(),
      error: 'Gagal mengambil statistik dashboard - menggunakan data default'
    };
    
    return NextResponse.json(defaultStats, { status: 200 });
  }
}
