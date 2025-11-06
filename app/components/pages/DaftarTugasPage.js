import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Eye } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import MiniMapsComponent from '../MiniMapsComponent';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

const DaftarTugasPage = ({ onBack, onDetailTugas }) => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    // Waktu server realtime (bukan waktu perangkat)
    const [serverNow, setServerNow] = useState(null);
    const [adminNames, setAdminNames] = useState({}); // uid -> name/email fallback

    useEffect(() => {
        // Auth state + realtime listener tasks
        let unsubscribeTasks = null;
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Realtime Firestore listener untuk task milik surveyor ini
                try {
                    const tasksRef = collection(db, 'task_assignments');
                    // Hanya filter by surveyorId untuk menghindari kebutuhan composite index
                    const q = query(tasksRef, where('surveyorId', '==', currentUser.uid));
                    unsubscribeTasks = onSnapshot(q, (snapshot) => {
                        const liveTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                        transformAndSetTasks(liveTasks);
                        setLoading(false);
                    }, (err) => {
                        console.error('Realtime tasks error:', err);
                        // fallback fetch bila listener gagal (mis. karena index)
                        fetchTasks(currentUser);
                    });
                } catch (e) {
                    console.error('Init realtime tasks failed:', e);
                    // fallback fetch
                    fetchTasks(currentUser);
                }
            } else {
                setTasks([]);
            }
        });

        return () => {
            if (unsubscribeTasks) unsubscribeTasks();
            unsubscribeAuth();
        };
    }, []);

    // Ambil waktu server dan update berkala agar realtime (tanpa bergantung device)
    useEffect(() => {
        let timer;
        const fetchServerTime = async () => {
            try {
                const res = await fetch('/api/server-time', { cache: 'no-store' });
                const data = await res.json();
                const now = new Date(data.now);
                if (!isNaN(now.getTime())) setServerNow(now);
            } catch (e) {
                // fallback: gunakan waktu dari Firestore via server pada panggilan berikutnya
                console.warn('Gagal mengambil waktu server, sementara gunakan waktu lokal sebagai fallback.');
                setServerNow(new Date());
            }
        };
        fetchServerTime();
        // refresh tiap 60 detik
        timer = setInterval(fetchServerTime, 60000);
        return () => clearInterval(timer);
    }, []);

    const transformAndSetTasks = (data) => {
        if (Array.isArray(data) && data.length > 0) {
            const transformed = data.map(task => ({
                id: task.id,
                judulTugas: task.title || task.description || 'Tugas Survey',
                tanggal: task.createdAt || task.assignedAt,
                description: task.description,
                status: task.status || 'pending',
                assignedBy: task.createdBy || 'Admin',
                type: task.taskType || 'existing',
                linkMymaps: task.mapsLink || '',
                deskripsi: task.description,
                jalanList: task.proposeData?.map((data, index) => ({
                    id: `Id Jalan ${index + 1}`,
                    detail: data.name || data
                })) || [],
                notes: task.notes || '',
                priority: task.priority || 'medium',
                deadline: task.deadline || '',
                createdAt: task.createdAt,
                completedAt: task.completedAt || null,
                surveyorName: task.surveyorName,
                surveyorEmail: task.surveyorEmail,
                kmzFile: task.kmzFile,
                excelFile: task.excelFile,
                mapData: task.mapData,
                createdBy: task.createdBy || null,
                createdByName: task.createdByName || ''
            }));
            setTasks(transformed);
            console.log('✅ Tugas berhasil ditransform:', transformed.length, 'tugas');

            // Fetch admin names for unique createdBy UIDs
            const uids = Array.from(new Set(transformed.map(t => t.createdBy).filter(Boolean)));
            if (uids.length > 0) fetchAdminNames(uids);
        } else {
            setTasks([]);
            console.log('ℹ️ Tidak ada tugas untuk ditampilkan');
        }
    };

    const fetchAdminNames = async (uids) => {
        try {
            const dbClient = getFirestore(firebaseApp);
            const updates = {};
            for (const uid of uids) {
                if (adminNames[uid]) continue; // already cached
                try {
                    const snap = await getDoc(doc(dbClient, 'users', uid));
                    if (snap.exists()) {
                        const u = snap.data() || {};
                        updates[uid] = u.name || u.fullName || u.username || u.displayName || u.email || uid;
                    } else {
                        updates[uid] = uid;
                    }
                } catch (e) {
                    updates[uid] = uid;
                }
            }
            if (Object.keys(updates).length > 0) {
                setAdminNames(prev => ({ ...prev, ...updates }));
            }
        } catch (e) {
            console.warn('Gagal memuat nama admin:', e?.message);
        }
    };

    const fetchTasks = async (currentUser) => {
        try {
            setLoading(true);
            
            // Menggunakan API endpoint untuk mengambil task assignments
            const response = await fetch(`/api/task-assignments?surveyorId=${currentUser.uid}`);
            const result = await response.json();
            
            if (result.success) transformAndSetTasks(result.data);
            else setTasks([]);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            // Jika ada error, tampilkan pesan kosong
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDetailTugas = (task) => {
        // Navigate to detail tugas page
        if (typeof onDetailTugas === 'function') {
            onDetailTugas(task);
        } else {
            // Fallback alert jika onDetailTugas tidak tersedia
            alert(`Detail Tugas:\n\nJudul: ${task.judulTugas}\nTanggal: ${task.tanggal}\nDeskripsi: ${task.description || 'Tidak ada deskripsi'}\nStatus: ${task.status}`);
        }
    };

    // Konversi nilai tanggal yang mungkin berupa Firestore Timestamp, object {seconds}, string, atau number
    const toDateObj = (value) => {
        try {
            if (!value) return null;
            if (typeof value?.toDate === 'function') return value.toDate();
            if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
            if (typeof value === 'number') return new Date(value);
            if (typeof value === 'string') {
                const d = new Date(value);
                if (!isNaN(d.getTime())) return d;
            }
            return null;
        } catch {
            return null;
        }
    };

    const formatDate = (value) => {
        const d = toDateObj(value);
        if (!d) return 'Tanggal tidak tersedia';
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatDeadlineOrInvalid = (deadlineValue) => {
        const d = toDateObj(deadlineValue);
        if (!d) return 'Tanggal tidak tersedia';
        if (serverNow && d.getTime() < serverNow.getTime()) {
            return 'Invalid Date';
        }
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
            {/* Ultra Modern Header */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50 sticky top-0 z-40">
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onBack}
                            className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft size={20} className="text-gray-600 group-hover:text-gray-800 transition-colors" />
                        </button>
                        
                        <div className="text-center">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                Daftar Tugas
                            </h1>
                        </div>
                        
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Calendar size={22} className="text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8 pb-24">
                <div className="max-w-md mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                            <span className="ml-3 text-gray-600">Memuat tugas...</span>
                        </div>
                    ) : tasks.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Tugas</h3>
                            <p className="text-gray-500">Tugas akan muncul di sini ketika admin memberikan penugasan</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tasks.map((task, index) => (
                                <div
                                    key={task.id}
                                    className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Judul Tugas */}
                                    <div className="mb-3">
                                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                                            {task.judulTugas || 'Judul Tugas'}
                                        </h3>
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                task.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                                task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                                task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                task.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {task.status === 'pending' ? 'Menunggu' :
                                                 task.status === 'in_progress' ? 'Sedang Dikerjakan' :
                                                 task.status === 'completed' ? 'Selesai' :
                                                 task.status === 'cancelled' ? 'Dibatalkan' :
                                                 task.status}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                task.type === 'existing' ? 'bg-orange-100 text-orange-700' :
                                                'bg-purple-100 text-purple-700'
                                            }`}>
                                                {task.type === 'existing' ? 'Zona Existing' : 'Propose'}
                                            </span>
                                        </div>
                                        
                                        {/* Completion Date for Completed Tasks */}
                                        {task.status === 'completed' && task.completedAt && (
                                            <div className="mt-2">
                                                <span className="text-xs text-green-600 font-medium">
                                                    ✅ Selesai pada: {formatDate(task.completedAt)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tanggal */}
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-500" />
                                            <span className="text-gray-600 font-medium">
                                                {formatDate(task.tanggal)}
                                            </span>
                                        </div>
                                        {/* Admin pemberi tugas */}
                                        <div className="mt-1 text-xs text-gray-600">
                                            Admin: <span className="font-semibold text-gray-800">{task.createdByName || adminNames[task.createdBy] || 'Memuat...'}</span>
                                        </div>
                                        {task.deadline && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-red-600">
                                                    Deadline: {formatDeadlineOrInvalid(task.deadline)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Priority */}
                                    {task.priority && task.priority !== 'medium' && (
                                        <div className="mb-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                task.priority === 'urgent' ? 'bg-red-200 text-red-800' :
                                                task.priority === 'low' ? 'bg-gray-100 text-gray-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                Prioritas: {
                                                    task.priority === 'high' ? 'Tinggi' :
                                                    task.priority === 'urgent' ? 'Mendesak' :
                                                    task.priority === 'low' ? 'Rendah' :
                                                    'Sedang'
                                                }
                                            </span>
                                        </div>
                                    )}

                                    {/* Detail Tugas Button */}
                                    <div className="flex justify-end">
                                        {task.status === 'completed' ? (
                                            <div className="text-center">
                                                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-medium text-sm">
                                                    ✅ Tugas Selesai
                                                </div>
                                                <button
                                                    onClick={() => handleDetailTugas(task)}
                                                    className="mt-2 bg-gray-500 text-white px-4 py-2 rounded-xl hover:bg-gray-600 transition-colors duration-200 flex items-center gap-2 font-medium text-sm"
                                                >
                                                    <Eye size={14} />
                                                    Lihat Detail
                                                </button>
                                            </div>
                                        ) : task.status === 'in_progress' ? (
                                            <div className="text-center">
                                                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-medium text-sm mb-2">
                                                    🔄 Sedang Dikerjakan
                                                </div>
                                                <button
                                                    onClick={() => handleDetailTugas(task)}
                                                    className="bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-colors duration-200 flex items-center gap-2 font-medium"
                                                >
                                                    <Eye size={16} />
                                                    Lanjutkan Tugas
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleDetailTugas(task)}
                                                className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2 font-medium"
                                            >
                                                <Eye size={16} />
                                                Mulai Tugas
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Mini Maps Component - Only show if there's an active task (in_progress) */}
            {tasks.some(task => task.status === 'in_progress') && (
                <MiniMapsComponent 
                    userId={user?.uid} 
                    taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
                />
            )}
        </div>
    );
};

export default DaftarTugasPage;
