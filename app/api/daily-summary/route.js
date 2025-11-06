import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');

    if (!taskId || !userId) {
      return NextResponse.json({ 
        message: 'Task ID dan User ID diperlukan' 
      }, { status: 400 });
    }

    // Check if Firebase admin is available
    if (!db) {
      console.warn('Firebase admin not available, returning mock data');
      // Return mock data for development
      const mockSummary = {
        taskInfo: {
          id: taskId,
          judul: 'Tugas Survey (Mock)',
          tipe: 'existing',
          status: 'assigned',
          prioritas: 'medium',
          deadline: null,
          assignedBy: 'Admin',
          createdAt: new Date().toISOString()
        },
        statistikHariIni: {
          surveyHariIni: 0,
          surveySelesai: 0,
          surveyPending: 0,
          totalSurveyTugas: 0,
          progressPersentase: 0
        },
        surveyHariIniDetail: [],
        aktivitasTerbaru: [],
        ringkasanLokasi: [],
        lastUpdated: new Date().toISOString()
      };
      return NextResponse.json(mockSummary);
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    let taskData = null;
    
    try {
      // Get task details
              const taskDoc = await adminDb.collection('task-assignments').doc(taskId).get();
      
      if (!taskDoc.exists) {
        return NextResponse.json({ 
          message: 'Tugas tidak ditemukan' 
        }, { status: 404 });
      }

      taskData = taskDoc.data();
      
      // Verify task belongs to user
      if (taskData.surveyorId !== userId) {
        return NextResponse.json({ 
          message: 'Akses tidak diizinkan untuk tugas ini' 
        }, { status: 403 });
      }
    } catch (taskError) {
      console.warn('Error fetching task data:', taskError.message);
      // Return fallback task data
      taskData = {
        id: taskId,
        description: 'Tugas Survey',
        taskType: 'existing',
        status: 'assigned',
        priority: 'medium',
        deadline: null,
        createdByName: 'Admin',
        createdAt: new Date().toISOString(),
        proposeData: []
      };
    }

    let surveyHariIni = 0;
    let surveySelesai = 0;
    let surveyPending = 0;
    let surveyHariIniDetail = [];
    let aktivitasTerbaru = [];
    let totalSurveyTugas = 0;

    try {
      // Collections references
          const surveysCollection = adminDb.collection('survey-reports');
    const notificationsCollection = adminDb.collection('notifications');

      // Get surveys related to this task created today
      const todaySurveysQuery = surveysCollection
        .where('surveyorId', '==', userId)
        .where('taskId', '==', taskId)
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<', endOfDay);

      // Get all surveys related to this task
      const allTaskSurveysQuery = surveysCollection
        .where('surveyorId', '==', userId)
        .where('taskId', '==', taskId);

      // Get notifications related to this task today
      const todayNotificationsQuery = notificationsCollection
        .where('userId', '==', userId)
        .where('relatedId', '==', taskId)
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<', endOfDay);

      // Execute queries with timeout
      const queryPromises = [
        todaySurveysQuery.get(),
        allTaskSurveysQuery.get(),
        todayNotificationsQuery.get()
      ];

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 10000); // 10 second timeout
      });

      const [todaySurveysSnapshot, allTaskSurveysSnapshot, todayNotificationsSnapshot] = await Promise.race([
        Promise.all(queryPromises),
        timeoutPromise
      ]);

      // Count today's surveys for this task
      surveyHariIni = todaySurveysSnapshot.size;
      totalSurveyTugas = allTaskSurveysSnapshot.size;

      // Count completed surveys for this task
      surveySelesai = allTaskSurveysSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'completed' || data.validationStatus === 'validated';
      }).length;

      // Count pending surveys for this task
      surveyPending = allTaskSurveysSnapshot.docs.filter(doc => {
        const data = doc.data();
        return !data.validationStatus || data.validationStatus === 'pending';
      }).length;

      // Get survey details for today
      todaySurveysSnapshot.forEach(doc => {
        const data = doc.data();
        surveyHariIniDetail.push({
          id: doc.id,
          jenisSurvey: data.surveyType || 'Survey',
          lokasi: data.location || data.alamat || 'Lokasi tidak tersedia',
          waktu: data.createdAt,
          status: data.validationStatus || 'pending',
          koordinat: data.coordinates || null
        });
      });

      // Get recent activities for this task
      // Add survey activities
      todaySurveysSnapshot.forEach(doc => {
        const data = doc.data();
        aktivitasTerbaru.push({
          waktu: data.createdAt,
          aktivitas: `Survey ${data.surveyType || 'baru'} dibuat`,
          detail: data.location || data.alamat || 'Lokasi tidak tersedia',
          tipe: 'survey'
        });
      });

      // Add notification activities
      todayNotificationsSnapshot.forEach(doc => {
        const data = doc.data();
        aktivitasTerbaru.push({
          waktu: data.createdAt,
          aktivitas: data.title || 'Notifikasi',
          detail: data.message || '',
          tipe: 'notifikasi'
        });
      });

      // Sort activities by time (newest first)
      aktivitasTerbaru.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));

    } catch (queryError) {
      console.warn('Error executing Firestore queries for daily summary:', queryError.message);
      // Use default values if queries fail
    }

    // Get task progress percentage
    const totalTarget = taskData.proposeData?.length || 1;
    const progressPersentase = Math.round((surveySelesai / totalTarget) * 100);

    const summary = {
      taskInfo: {
        id: taskId,
        judul: taskData.description || 'Tugas Survey',
        tipe: taskData.taskType || 'existing',
        status: taskData.status || 'assigned',
        prioritas: taskData.priority || 'medium',
        deadline: taskData.deadline || null,
        assignedBy: taskData.createdByName || 'Admin',
        createdAt: taskData.createdAt
      },
      statistikHariIni: {
        surveyHariIni,
        surveySelesai,
        surveyPending,
        totalSurveyTugas,
        progressPersentase
      },
      surveyHariIniDetail,
      aktivitasTerbaru: aktivitasTerbaru.slice(0, 10), // Limit to 10 recent activities
      ringkasanLokasi: taskData.proposeData?.map((data, index) => ({
        id: index + 1,
        nama: data.name || data,
        status: 'belum_survey' // This could be enhanced to check actual survey status
      })) || [],
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil ringkasan harian', details: error.message },
      { status: 500 }
    );
  }
}
