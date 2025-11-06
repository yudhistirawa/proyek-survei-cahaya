import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'Log ID is required' },
                { status: 400 }
            );
        }

        // Import Firebase Admin
        const firebaseAdmin = await import('../../../lib/firebase-admin.js');
        const db = firebaseAdmin.adminDb;

        // Get the specific log document
        const docRef = db.collection('activity_logs').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { error: 'Log not found' },
                { status: 404 }
            );
        }

        const logData = {
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate().toISOString()
        };

        return NextResponse.json(logData);

    } catch (error) {
        console.error('Error fetching log detail:', error);
        return NextResponse.json(
            { error: 'Failed to fetch log detail', details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { error: 'Log ID is required' },
                { status: 400 }
            );
        }

        // Import Firebase Admin
        const firebaseAdmin = await import('../../../lib/firebase-admin.js');
        const db = firebaseAdmin.adminDb;
        const deleteFileFromStorage = firebaseAdmin.deleteFileFromStorage;

        const docRef = db.collection('activity_logs').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json(
                { error: 'Log not found' },
                { status: 404 }
            );
        }

        const data = doc.data();
        if (data && data.imageData) {
            // Assuming imageData contains the full URL, extract the file path
            try {
                const url = new URL(data.imageData);
                // The file path in storage is the pathname without the leading slash
                const filePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                await deleteFileFromStorage(filePath);
            } catch (err) {
                console.error('Error parsing imageData URL or deleting file:', err);
            }
        }

        await docRef.delete();

        return NextResponse.json(
            { message: 'Log berhasil dihapus' },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error deleting log:', error);
        return NextResponse.json(
            { error: 'Failed to delete log', details: error.message },
            { status: 500 }
        );
    }
}

