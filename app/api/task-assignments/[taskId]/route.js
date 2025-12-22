import { NextResponse } from 'next/server';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../../lib/firebase';

export async function PATCH(request, { params }) {
    try {
        const resolvedParams = await params;
        const { taskId } = resolvedParams || {};
        const body = await request.json();
        const { status, completedAt, completedBy } = body;

        const db = getFirestore(firebaseApp);
        if (!taskId || typeof taskId !== 'string') {
            return NextResponse.json({ error: 'Invalid taskId parameter' }, { status: 400 });
        }
        const taskRef = doc(db, 'task_assignments', taskId);

        // Check if task exists
        const taskDoc = await getDoc(taskRef);
        if (!taskDoc.exists()) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Update task with new status and completion data
        const updateData = {
            status: status,
            updatedAt: new Date()
        };

        // Add started data if task is being started
        if (body.startedAt) {
            updateData.startedAt = body.startedAt;
        }
        if (body.startedBy) {
            updateData.startedBy = body.startedBy;
        }

        // Add completion data if task is being completed
        if (status === 'completed') {
            updateData.completedAt = completedAt;
            updateData.completedBy = completedBy;
        }

        try {
            await updateDoc(taskRef, updateData);
        } catch (updateError) {
            console.error('Error during updateDoc:', updateError);
            return NextResponse.json({
                error: 'Failed to update task during updateDoc',
                details: updateError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Task updated successfully',
            taskId: taskId,
            status: status
        });

    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({
            error: 'Failed to update task',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { taskId } = params || {};
        const db = getFirestore(firebaseApp);
        if (!taskId || typeof taskId !== 'string') {
            return NextResponse.json({ error: 'Invalid taskId parameter' }, { status: 400 });
        }
        const taskRef = doc(db, 'task_assignments', taskId);

        const taskDoc = await getDoc(taskRef);
        if (!taskDoc.exists()) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const taskData = {
            id: taskDoc.id,
            ...taskDoc.data()
        };

        return NextResponse.json(taskData);

    } catch (error) {
        console.error('Error fetching task:', error);
        return NextResponse.json({
            error: 'Failed to fetch task',
            details: error.message
        }, { status: 500 });
    }
}
