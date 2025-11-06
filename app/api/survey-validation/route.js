// app/api/survey-validation/route.js
import { NextResponse } from 'next/server';
import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

const db = getFirestore(firebaseApp);

export async function POST(request) {
    try {
        const { surveyData, surveyType } = await request.json();
        
        console.log('Received survey data for validation:', { surveyType, surveyData });

        // Add validation status and admin notification
        const validationData = {
            ...surveyData,
            validationStatus: 'pending',
            submittedForValidation: true,
            submittedAt: serverTimestamp(),
            adminNotified: false
        };

        // Save to validation collection
        const validationRef = await addDoc(collection(db, 'survey_validations'), validationData);

        // Create notification for admin
        const notificationData = {
            type: 'survey_validation',
            title: `Survey ${surveyType} Baru`,
            message: `Survey ${surveyType} baru telah diajukan untuk validasi oleh ${surveyData.surveyorName || 'Surveyor'}`,
            surveyId: surveyData.id || validationRef.id,
            surveyType: surveyType,
            surveyorId: surveyData.userId,
            surveyorName: surveyData.surveyorName,
            surveyorEmail: surveyData.surveyorEmail,
            location: surveyData.titikKordinat,
            isRead: false,
            createdAt: serverTimestamp(),
            priority: 'medium'
        };

        // Send notification to all admins
        const adminNotificationRef = await addDoc(collection(db, 'admin_notifications'), notificationData);

        // Update the original survey document to mark as submitted for validation
        if (surveyData.id) {
            await updateDoc(doc(db, surveyType === 'existing' ? 'Survey_Existing_Report' : 'Tiang_APJ_Propose_Report', surveyData.id), {
                validationStatus: 'pending',
                submittedForValidation: true,
                submittedAt: serverTimestamp(),
                adminNotificationId: adminNotificationRef.id
            });
        }

        console.log('Survey validation request processed successfully');

        return NextResponse.json({
            success: true,
            message: 'Survey data submitted for validation successfully',
            validationId: validationRef.id,
            notificationId: adminNotificationRef.id
        });

    } catch (error) {
        console.error('Error processing survey validation:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to submit survey for validation',
            error: error.message
        }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const surveyorId = searchParams.get('surveyorId');
        const status = searchParams.get('status');

        let query = collection(db, 'survey_validations');
        
        // Add filters if provided
        if (surveyorId) {
            query = query.where('userId', '==', surveyorId);
        }
        if (status) {
            query = query.where('validationStatus', '==', status);
        }

        // For now, return basic info
        return NextResponse.json({
            success: true,
            message: 'Survey validation endpoint ready'
        });

    } catch (error) {
        console.error('Error fetching survey validations:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch survey validations',
            error: error.message
        }, { status: 500 });
    }
}
