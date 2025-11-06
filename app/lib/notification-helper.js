/**
 * Helper function untuk membuat notifikasi ketika ada data survey baru masuk
 */
export const createSurveyNotification = async (surveyData, surveyType) => {
  try {
    // Ambil semua admin untuk dikirim notifikasi
    const response = await fetch('/api/users?role=admin_survey');
    
    if (!response.ok) {
      console.warn('Failed to fetch admin users for notification');
      return;
    }
    
    const admins = await response.json();
    
    // Kirim notifikasi ke setiap admin
    const notificationPromises = admins.map(async (admin) => {
      const notificationResponse = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: admin.id,
          type: 'survey',
          title: 'Data Survey Baru Masuk',
          message: `${surveyType} baru dari ${surveyData.surveyorName || 'Surveyor'} di lokasi ${surveyData.projectLocation || surveyData.namaJalan || 'Lokasi tidak diketahui'} telah masuk dan menunggu validasi`,
          relatedId: surveyData.id || null,
          status: 'pending',
          metadata: {
            surveyType: surveyType,
            surveyCategory: surveyData.surveyCategory,
            surveyorName: surveyData.surveyorName,
            location: surveyData.projectLocation || surveyData.namaJalan,
            projectTitle: surveyData.projectTitle
          }
        })
      });

      if (!notificationResponse.ok) {
        console.warn(`Failed to create notification for admin ${admin.username || admin.id}`);
      }
    });

    await Promise.all(notificationPromises);
    console.log('✅ Notifications sent to all admins for new survey data');
  } catch (error) {
    console.error('❌ Error creating notifications for new survey:', error);
    // Don't fail the survey creation if notification fails
  }
};

/**
 * Helper function untuk membuat notifikasi ketika admin memberikan tugas baru ke surveyor
 */
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const createTaskNotification = async (taskData) => {
  try {
    const notificationData = {
      userId: taskData.surveyorId,
      title: 'Tugas Baru',
      message: `Anda mendapat tugas baru: ${taskData.title || taskData.description}`,
      type: 'task_assignment',
      taskId: taskData.id,
      timestamp: serverTimestamp(),
      read: false
    };

    await addDoc(collection(db, 'notifications'), notificationData);
    return { success: true };
  } catch (error) {
    console.error('Error creating task notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Helper function untuk membuat notifikasi dari Firestore trigger
 * Digunakan ketika data survey disimpan langsung ke Firestore
 */
export const createSurveyNotificationFromFirestore = async (docId, surveyData) => {
  try {
    // Tentukan tipe survey berdasarkan surveyType atau surveyCategory
    let surveyType = surveyData.surveyType || 'Survey';
    
    if (!surveyData.surveyType && surveyData.surveyCategory) {
      switch (surveyData.surveyCategory) {
        case 'arm':
          surveyType = 'Survey ARM';
          break;
        case 'tiang_apj_propose':
          surveyType = 'Survey Tiang APJ Propose';
          break;
        case 'tiang_apj_new':
          surveyType = 'Survey Tiang APJ New';
          break;
        case 'trafo':
          surveyType = 'Survey Trafo';
          break;
        case 'fasos_fosum':
          surveyType = 'Survey Fasos Fosum';
          break;
        default:
          surveyType = 'Survey';
      }
    }
    
    // Panggil fungsi createSurveyNotification dengan data yang sudah ada ID
    await createSurveyNotification({ ...surveyData, id: docId }, surveyType);
  } catch (error) {
    console.error('❌ Error creating notifications from Firestore:', error);
  }
};
