import { NextResponse } from 'next/server';
import { adminDb } from '../../../../lib/firebase-admin';

// POST - Update survey point status and task status
export async function POST(request, { params }) {
  try {
    const { taskId } = params;
    const { surveyPointId, status, data } = await request.json();

    if (!taskId || !surveyPointId || !status) {
      return NextResponse.json({
        success: false,
        error: 'taskId, surveyPointId, and status are required'
      }, { status: 400 });
    }

    const taskRef = adminDb.collection('task_assignments').doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 });
    }

    const taskData = taskDoc.data();
    const surveyPoints = taskData.surveyPoints || [];
    
    // Find and update the survey point
    const updatedPoints = surveyPoints.map(point => {
      if (point.id === surveyPointId) {
        return {
          ...point,
          status,
          data: data || point.data,
          completedAt: status === 'completed' ? new Date() : point.completedAt
        };
      }
      return point;
    });

    // Check if all points are completed
    const allCompleted = updatedPoints.every(point => point.status === 'completed');
    
    // Update task status
    let taskStatus = taskData.status;
    if (allCompleted && updatedPoints.length > 0) {
      taskStatus = 'completed';
    } else if (updatedPoints.some(p => p.status === 'in_progress' || p.status === 'completed')) {
      taskStatus = 'in_progress';
    }

    // Update the task document
    await taskRef.update({
      surveyPoints: updatedPoints,
      status: taskStatus,
      updatedAt: new Date(),
      ...(allCompleted && { completedAt: new Date() })
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        surveyPointId,
        status,
        taskStatus
      }
    });

  } catch (error) {
    console.error('Error updating survey point status:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
