import { NextResponse } from 'next/server';
import { getFirestore, collection, query, where, onSnapshot, orderBy, addDoc, getDocs } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

// GET - Mengambil semua data Maps Surveyor
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const surveyorId = searchParams.get('surveyorId');
        const taskId = searchParams.get('taskId');
        const status = searchParams.get('status');

        const db = getFirestore(firebaseApp);
        const mapsRef = collection(db, 'Maps_Surveyor');

        let q = query(mapsRef, orderBy('createdAt', 'desc'));

        // Add filters if provided
        if (surveyorId) {
            q = query(q, where('surveyorId', '==', surveyorId));
        }
        if (taskId) {
            q = query(q, where('taskId', '==', taskId));
        }
        if (status) {
            q = query(q, where('status', '==', status));
        }

        const snapshot = await getDocs(q);
        const mapsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
                startTime: data.startTime?.toDate?.() || new Date(data.startTime),
                endTime: data.endTime?.toDate?.() || new Date(data.endTime)
            };
        });

        return NextResponse.json({
            success: true,
            data: mapsData,
            count: mapsData.length
        });

    } catch (error) {
        console.error('Error fetching Maps Surveyor data:', error);
        return NextResponse.json({
            success: false,
            error: 'Gagal memuat data Maps Surveyor',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Menyimpan data Maps Surveyor baru
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            taskId,
            surveyorId,
            surveyorName,
            startTime,
            endTime,
            routePoints,
            totalDistance,
            surveyPoints,
            status = 'completed'
        } = body;

        // Validate required fields
        if (!taskId || !surveyorId || !startTime || !endTime) {
            return NextResponse.json({
                success: false,
                error: 'Data tidak lengkap. taskId, surveyorId, startTime, dan endTime diperlukan.'
            }, { status: 400 });
        }

        const db = getFirestore(firebaseApp);
        const mapsRef = collection(db, 'Maps_Surveyor');

        const mapsData = {
            taskId,
            surveyorId,
            surveyorName,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            routePoints: routePoints || [],
            totalDistance: totalDistance || 0,
            surveyPoints: surveyPoints || [],
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await addDoc(mapsRef, mapsData);

        return NextResponse.json({
            success: true,
            message: 'Data Maps Surveyor berhasil disimpan',
            id: docRef.id,
            data: mapsData
        });

    } catch (error) {
        console.error('Error saving Maps Surveyor data:', error);
        return NextResponse.json({
            success: false,
            error: 'Gagal menyimpan data Maps Surveyor',
            details: error.message
        }, { status: 500 });
    }
}
