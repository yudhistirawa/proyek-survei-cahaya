import { NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { firebaseApp } from '../../../lib/firebase';

// GET - Mengambil data Maps Surveyor berdasarkan ID
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const db = getFirestore(firebaseApp);
        const mapsRef = doc(db, 'Maps_Surveyor', id);

        const mapsDoc = await getDoc(mapsRef);
        if (!mapsDoc.exists()) {
            return NextResponse.json({
                success: false,
                error: 'Data Maps Surveyor tidak ditemukan'
            }, { status: 404 });
        }

        const data = mapsDoc.data();
        const mapsData = {
            id: mapsDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            startTime: data.startTime?.toDate?.() || new Date(data.startTime),
            endTime: data.endTime?.toDate?.() || new Date(data.endTime),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt)
        };

        return NextResponse.json({
            success: true,
            data: mapsData
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

// PATCH - Mengupdate data Maps Surveyor
export async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        const db = getFirestore(firebaseApp);
        const mapsRef = doc(db, 'Maps_Surveyor', id);

        // Check if document exists
        const mapsDoc = await getDoc(mapsRef);
        if (!mapsDoc.exists()) {
            return NextResponse.json({
                success: false,
                error: 'Data Maps Surveyor tidak ditemukan'
            }, { status: 404 });
        }

        // Update data
        const updateData = {
            ...body,
            updatedAt: new Date()
        };

        // Convert date strings to Date objects if they exist
        if (body.startTime) {
            updateData.startTime = new Date(body.startTime);
        }
        if (body.endTime) {
            updateData.endTime = new Date(body.endTime);
        }

        await updateDoc(mapsRef, updateData);

        return NextResponse.json({
            success: true,
            message: 'Data Maps Surveyor berhasil diupdate',
            id: id
        });

    } catch (error) {
        console.error('Error updating Maps Surveyor data:', error);
        return NextResponse.json({
            success: false,
            error: 'Gagal mengupdate data Maps Surveyor',
            details: error.message
        }, { status: 500 });
    }
}

// DELETE - Menghapus data Maps Surveyor
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const db = getFirestore(firebaseApp);
        const mapsRef = doc(db, 'Maps_Surveyor', id);

        // Check if document exists
        const mapsDoc = await getDoc(mapsRef);
        if (!mapsDoc.exists()) {
            return NextResponse.json({
                success: false,
                error: 'Data Maps Surveyor tidak ditemukan'
            }, { status: 404 });
        }

        await deleteDoc(mapsRef);

        return NextResponse.json({
            success: true,
            message: 'Data Maps Surveyor berhasil dihapus',
            id: id
        });

    } catch (error) {
        console.error('Error deleting Maps Surveyor data:', error);
        return NextResponse.json({
            success: false,
            error: 'Gagal menghapus data Maps Surveyor',
            details: error.message
        }, { status: 500 });
    }
}
