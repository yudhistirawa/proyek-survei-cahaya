/**
 * Task Progress Management
 * Handles saving and loading surveyor progress for tasks
 */

import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from './firebase';

const db = getFirestore(firebaseApp);

/**
 * Save progress data for a task
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {Object} progressData - Progress data to save
 */
export async function saveTaskProgress(userId, taskId, progressData) {
  try {
    const progressRef = doc(db, 'taskProgress', `${userId}_${taskId}`);
    
    const dataToSave = {
      userId,
      taskId,
      lastUpdated: new Date().toISOString(),
      ...progressData
    };
    
    await setDoc(progressRef, dataToSave, { merge: true });
    console.log('✅ Task progress saved:', { userId, taskId });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving task progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load progress data for a task
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @returns {Object|null} Progress data or null if not found
 */
export async function loadTaskProgress(userId, taskId) {
  try {
    const progressRef = doc(db, 'taskProgress', `${userId}_${taskId}`);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      console.log('✅ Task progress loaded:', { userId, taskId, data });
      return data;
    } else {
      console.log('ℹ️ No progress found for task:', { userId, taskId });
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading task progress:', error);
    return null;
  }
}

/**
 * Update specific progress data
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {Object} updates - Partial data to update
 */
export async function updateTaskProgress(userId, taskId, updates) {
  try {
    const progressRef = doc(db, 'taskProgress', `${userId}_${taskId}`);
    
    await updateDoc(progressRef, {
      ...updates,
      lastUpdated: new Date().toISOString()
    });
    
    console.log('✅ Task progress updated:', { userId, taskId, updates });
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating task progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete progress data (when task is completed)
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 */
export async function clearTaskProgress(userId, taskId) {
  try {
    const progressRef = doc(db, 'taskProgress', `${userId}_${taskId}`);
    await deleteDoc(progressRef);
    
    console.log('✅ Task progress cleared:', { userId, taskId });
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing task progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save surveyor's coordinate points
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {Array} points - Array of coordinate points
 */
export async function saveSurveyorPoints(userId, taskId, points) {
  try {
    return await saveTaskProgress(userId, taskId, {
      surveyorPoints: points,
      totalPoints: points.length
    });
  } catch (error) {
    console.error('❌ Error saving surveyor points:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a single point to surveyor's progress
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {Object} point - Single coordinate point
 */
export async function addSurveyorPoint(userId, taskId, point) {
  try {
    // Load existing progress
    const progress = await loadTaskProgress(userId, taskId);
    const existingPoints = progress?.surveyorPoints || [];
    
    // Add new point
    const updatedPoints = [...existingPoints, {
      ...point,
      timestamp: new Date().toISOString()
    }];
    
    // Save updated points
    return await saveSurveyorPoints(userId, taskId, updatedPoints);
  } catch (error) {
    console.error('❌ Error adding surveyor point:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active tasks with progress for a user
 * @param {string} userId - User ID
 * @returns {Array} Array of tasks with progress
 */
export async function getUserActiveTasksWithProgress(userId) {
  try {
    const progressCollection = collection(db, 'taskProgress');
    const q = query(progressCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${tasks.length} active tasks with progress for user:`, userId);
    return tasks;
  } catch (error) {
    console.error('❌ Error getting user active tasks:', error);
    return [];
  }
}

/**
 * Get all task progress for a user (alias for getUserActiveTasksWithProgress)
 * @param {string} userId - User ID
 * @returns {Array} Array of tasks with progress
 */
export async function getAllTaskProgress(userId) {
  return getUserActiveTasksWithProgress(userId);
}

/**
 * Save form data progress
 * @param {string} userId - User ID
 * @param {string} taskId - Task ID
 * @param {Object} formData - Form data to save
 */
export async function saveFormProgress(userId, taskId, formData) {
  try {
    return await saveTaskProgress(userId, taskId, {
      formData,
      formSavedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error saving form progress:', error);
    return { success: false, error: error.message };
  }
}
