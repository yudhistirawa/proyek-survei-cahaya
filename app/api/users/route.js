import { NextResponse } from 'next/server';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

export const dynamic = 'force-dynamic';

const db = getFirestore(firebaseApp);

// GET - Fetch all users from Firestore
export async function GET() {
    try {
        console.log('🔄 Fetching users from Firestore...');
        
        // Get users from Firestore users collection using client SDK
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const users = [];

        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            console.log('📄 User data:', { id: doc.id, ...userData });
            
            users.push({
                uid: doc.id,
                username: userData.username || null,
                email: userData.email || null,
                displayName: userData.displayName || null,
                role: userData.role || 'user',
                createdAt: userData.createdAt || null,
                lastSignIn: userData.lastSignIn || null,
                createdBy: userData.createdBy || null,
                password: userData.password || null,
                phone: userData.phone || null,
                status: userData.status || 'active',
                isDemo: userData.isDemo || false
            });
        });

        console.log(`✅ Fetched ${users.length} users from Firestore`);
        console.log('📊 All users:', users);
        
        return NextResponse.json(users);
    } catch (error) {
        console.error('❌ Error fetching users:', error);
        
        // Return error details for debugging
        return NextResponse.json({ 
            error: 'Failed to fetch users', 
            details: error.message,
            users: [] 
        }, { status: 500 });
    }
}

// DELETE - Delete a user
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');

        if (!uid) {
            return NextResponse.json(
                { error: 'User ID diperlukan' },
                { status: 400 }
            );
        }

        // Delete user data from Firestore using client SDK
        try {
            const { deleteDoc, doc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'users', uid));
        } catch (firestoreError) {
            console.warn(`Warning: Could not delete Firestore document for user ${uid}:`, firestoreError);
            return NextResponse.json(
                { error: 'Gagal menghapus data pengguna dari database' },
                { status: 500 }
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Pengguna berhasil dihapus' 
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        
        return NextResponse.json(
            { error: 'Gagal menghapus pengguna', details: error.message },
            { status: 500 }
        );
    }
}
