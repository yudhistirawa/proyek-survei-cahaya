import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    deleteUser as deleteAuthUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Login dengan username dan password
export const loginWithUsername = async (username, password) => {
    try {
        // Validasi input
        if (!username || !password) {
            throw new Error('Username dan password harus diisi');
        }

        // Cari user berdasarkan username di Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('USERNAME_NOT_FOUND');
        }
        
        // Ambil email dari user yang ditemukan
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const email = userData.email;
        
        // Login dengan email dan password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        return {
            user,
            userData
        };
    } catch (error) {
        // Handle custom errors
        if (error.message === 'USERNAME_NOT_FOUND') {
            throw new Error('Username tidak terdaftar');
        }
        
        // Handle Firebase auth errors
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error('Password salah');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Terlalu banyak percobaan login. Coba lagi nanti.');
        } else if (error.code === 'auth/user-not-found') {
            throw new Error('User tidak terdaftar');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Format email tidak valid');
        } else if (error.code === 'auth/user-disabled') {
            throw new Error('Akun telah dinonaktifkan');
        }
        
        // Re-throw other errors
        throw error;
    }
};

// Login dengan email dan password (untuk backward compatibility)
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Ambil data user dari Firestore untuk mendapatkan role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        return {
            user,
            userData
        };
    } catch (error) {
        throw error;
    }
};

// Register user baru (hanya untuk admin)
export const registerUser = async (email, password, userData) => {
    try {
        // Simpan current user (admin) data sebelum membuat user baru
        const currentUser = auth.currentUser;
        const currentUserEmail = currentUser?.email;
        const currentUserUid = currentUser?.uid;
        
        // Cek apakah username sudah digunakan
        if (userData.username) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', userData.username));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                throw new Error('Username sudah digunakan');
            }
        }
        
        // Ambil data admin dari Firestore untuk mendapatkan password sebelum membuat user baru
        let adminPassword = null;
        if (currentUser) {
            const adminDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (adminDoc.exists()) {
                const adminData = adminDoc.data();
                adminPassword = adminData.password;
            }
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile dengan nama
        if (userData.displayName) {
            await updateProfile(user, {
                displayName: userData.displayName
            });
        }
        
        // Simpan data user ke Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            username: userData.username || '',
            displayName: userData.displayName || '',
            role: userData.role || 'petugas_pengukuran',
            password: password, // Simpan password untuk admin reference
            createdAt: new Date().toISOString(),
            createdBy: userData.createdBy || null
        });
        
        // PENTING: Logout user yang baru dibuat dan re-login admin
        await signOut(auth);
        
        // Re-authenticate admin untuk mempertahankan session admin
        if (currentUserEmail && adminPassword) {
            try {
                // Re-login admin dengan email dan password yang tersimpan
                await signInWithEmailAndPassword(auth, currentUserEmail, adminPassword);
                console.log('✅ Admin re-authenticated successfully');
            } catch (reAuthError) {
                console.error('❌ Error re-authenticating admin:', reAuthError);
                // Jika gagal re-login, throw error agar user tahu ada masalah
                throw new Error('Pengguna berhasil dibuat, tetapi gagal mempertahankan session admin. Silakan login kembali.');
            }
        } else {
            throw new Error('Pengguna berhasil dibuat, tetapi data admin tidak lengkap. Silakan login kembali.');
        }
        
        return user;
    } catch (error) {
        throw error;
    }
};

// Logout
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};

// Monitor auth state
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

// Get user role dari Firestore
export const getUserRole = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role;
        }
        return null;
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
};

// Get user data dari Firestore
export const getUserData = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

// Get all users dari Firestore
export const getAllUsers = async () => {
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({
                uid: doc.id,
                ...doc.data()
            });
        });
        
        return users;
    } catch (error) {
        console.error('Error getting all users:', error);
        throw error;
    }
};

// Delete user (hanya untuk admin)
export const deleteUser = async (uid) => {
    try {
        // Hapus data user dari Firestore
        await deleteDoc(doc(db, 'users', uid));
        
        // Note: Menghapus user dari Firebase Auth memerlukan user tersebut untuk login terlebih dahulu
        // atau menggunakan Admin SDK. Untuk sekarang kita hanya hapus dari Firestore.
        // Dalam implementasi production, sebaiknya menggunakan Cloud Functions dengan Admin SDK
        
        return true;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};
