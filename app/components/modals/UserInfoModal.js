import React, { useState, useEffect } from 'react';
import { X, User, Trash2, Shield, Eye, EyeOff, Calendar, Mail, UserCheck, AlertTriangle, RotateCw, Search, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { AlertModal } from './AlertModal';

export const UserInfoModal = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'warning' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showPasswords, setShowPasswords] = useState({});
    const [expandedUsers, setExpandedUsers] = useState({});

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 10);
            fetchUsers();
            // Prevent background scrolling when modal is open
            document.body.style.overflow = 'hidden';
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
            // Restore background scrolling when modal is closed
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Gagal mengambil data pengguna');
            }
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
            setAlertModal({ 
                isOpen: true, 
                message: 'Gagal memuat data pengguna. Silakan coba lagi.', 
                type: 'error' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`/api/users?uid=${userToDelete.uid}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Gagal menghapus pengguna');
            }

            setUsers(prev => prev.filter(user => user.uid !== userToDelete.uid));
            setAlertModal({ 
                isOpen: true, 
                message: `Pengguna ${userToDelete.displayName || userToDelete.email} berhasil dihapus.`, 
                type: 'success' 
            });
        } catch (error) {
            console.error('Error deleting user:', error);
            setAlertModal({ 
                isOpen: true, 
                message: 'Gagal menghapus pengguna. Silakan coba lagi.', 
                type: 'error' 
            });
        } finally {
            setUserToDelete(null);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'petugas_pengukuran':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'petugas_kemerataan':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'super_admin':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin':
                return <Shield size={14} />;
            case 'petugas_pengukuran':
                return <UserCheck size={14} />;
            case 'petugas_kemerataan':
                return <Eye size={14} />;
            case 'super_admin':
                return <Shield size={14} className="text-purple-700" />;
            default:
                return <User size={14} />;
        }
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'admin':
                return 'Admin';
            case 'petugas_pengukuran':
                return 'Petugas Pengukuran';
            case 'petugas_kemerataan':
                return 'Petugas Kemerataan';
            case 'super_admin':
                return 'Super Admin';
            default:
                return role || 'No Role';
        }
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const toggleUserExpansion = (userId) => {
        setExpandedUsers(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const filteredUsers = users.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group users by role
    const groupedUsers = filteredUsers.reduce((groups, user) => {
        const role = user.role || 'no_role';
        if (!groups[role]) {
            groups[role] = [];
        }
        groups[role].push(user);
        return groups;
    }, {});

    // Sort groups by role priority and users within each group
    const roleOrder = ['super_admin', 'admin', 'petugas_pengukuran', 'petugas_kemerataan', 'no_role'];
    const sortedGroups = roleOrder.reduce((result, role) => {
        if (groupedUsers[role]) {
            result[role] = groupedUsers[role].sort((a, b) => 
                (a.displayName || a.username || '').localeCompare(b.displayName || b.username || '')
            );
        }
        return result;
    }, {});

    if (!isOpen && !isVisible) return null;

    return (
        <>
            <div className={`fixed inset-0 flex justify-center items-center z-[90] p-4 transition-all duration-300 ease-out ${isOpen && isVisible ? 'opacity-100 backdrop-blur-sm bg-black/30' : 'opacity-0 pointer-events-none'}`}>
                <div 
                    onClick={e => e.stopPropagation()} 
                    className={`bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-6 text-white relative">
                        <button 
                            onClick={handleClose} 
                            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-full">
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Manajemen Pengguna</h2>
                                <p className="text-purple-100 mt-1">Kelola akses dan hak pengguna sistem</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cari pengguna berdasarkan nama, email, atau role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <RotateCw className="animate-spin h-12 w-12 text-purple-600" />
                                <p className="mt-4 text-gray-600">Memuat data pengguna...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Users className="w-16 h-16 text-gray-400" />
                                <p className="mt-4 text-xl font-semibold text-gray-600">
                                    {searchTerm ? 'Tidak ada pengguna yang ditemukan' : 'Belum ada pengguna terdaftar'}
                                </p>
                                <p className="text-gray-500 mt-2">
                                    {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Daftarkan pengguna baru untuk memulai'}
                                </p>
                            </div>
                        ) : (
                            <div>
                                {Object.entries(sortedGroups).map(([role, users]) => (
                                    <div key={role} className="mb-6">
                                        {/* Role Header */}
                                        <div className="px-6 py-3 bg-gray-100 border-b border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${getRoleColor(role)}`}>
                                                    {getRoleIcon(role)}
                                                    <span>{getRoleLabel(role)}</span>
                                                </div>
                                                <span className="text-sm text-gray-500">({users.length} pengguna)</span>
                                            </div>
                                        </div>

                                        {/* Users in this role */}
                                        <div className="divide-y divide-gray-200">
                                            {users.map((user, index) => (
                                                <div key={user.uid} className="hover:bg-gray-50 transition-colors">
                                                    {/* User Row */}
                                                    <div 
                                                        className="flex items-center justify-between p-4 cursor-pointer"
                                                        onClick={() => toggleUserExpansion(user.uid)}
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            {/* Expand/Collapse Icon */}
                                                            <div className="flex-shrink-0">
                                                                {expandedUsers[user.uid] ? 
                                                                    <ChevronDown size={20} className="text-gray-400" /> : 
                                                                    <ChevronRight size={20} className="text-gray-400" />
                                                                }
                                                            </div>

                                                            {/* Avatar */}
                                                            <div className="relative flex-shrink-0">
                                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
                                                                    <User size={16} className="text-white" />
                                                                </div>
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                                            </div>

                                                            {/* User Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                                        {user.displayName || user.username || 'Nama tidak tersedia'}
                                                                    </h3>
                                                                </div>
                                                                <p className="text-sm text-gray-500 truncate mt-1">{user.email}</p>
                                                            </div>

                                                            {/* Registration Date */}
                                                            <div className="hidden md:block text-sm text-gray-500">
                                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    year: 'numeric'
                                                                }) : 'Tidak diketahui'}
                                                            </div>
                                                        </div>

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUserToDelete(user);
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                                            title="Hapus pengguna"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {expandedUsers[user.uid] && (
                                                        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                                                            <div className="ml-8 space-y-3 pt-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <Mail size={16} className="text-gray-400 flex-shrink-0" />
                                                                            <span className="text-sm text-gray-600">Email:</span>
                                                                            <span className="text-sm font-medium text-gray-800">{user.email}</span>
                                                                        </div>

                                                                        {user.username && (
                                                                            <div className="flex items-center gap-2">
                                                                                <User size={16} className="text-gray-400 flex-shrink-0" />
                                                                                <span className="text-sm text-gray-600">Username:</span>
                                                                                <span className="text-sm font-medium text-gray-800">{user.username}</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-2">
                                                                            <Shield size={16} className="text-gray-400 flex-shrink-0" />
                                                                            <span className="text-sm text-gray-600">Password:</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-sm font-mono text-gray-800">
                                                                                    {showPasswords[user.uid] ? (user.password || 'Tidak tersedia') : '••••••••'}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => togglePasswordVisibility(user.uid)}
                                                                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                                                >
                                                                                    {showPasswords[user.uid] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                                                                            <span className="text-sm text-gray-600">Terdaftar:</span>
                                                                            <span className="text-sm font-medium text-gray-800">
                                                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                                                                                    day: '2-digit',
                                                                                    month: 'long',
                                                                                    year: 'numeric'
                                                                                }) : 'Tidak diketahui'}
                                                                            </span>
                                                                        </div>

                                                                        {user.createdBy && (
                                                                            <div className="flex items-center gap-2">
                                                                                <UserCheck size={16} className="text-gray-400 flex-shrink-0" />
                                                                                <span className="text-sm text-gray-600">Dibuat oleh:</span>
                                                                                <span className="text-sm font-medium text-gray-800">{user.createdBy}</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="pt-2 border-t border-gray-200">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs text-gray-500">User ID:</span>
                                                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 break-all">
                                                                                    {user.uid}
                                                                                </code>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Total: <span className="font-semibold">{filteredUsers.length}</span> pengguna
                                {searchTerm && ` (dari ${users.length} total)`}
                            </div>
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDeleteUser}
                title="Hapus Pengguna?"
                message={`Anda yakin ingin menghapus pengguna "${userToDelete?.displayName || userToDelete?.email}"? Aksi ini akan menghapus pengguna dari Firebase Authentication dan tidak dapat dibatalkan.`}
                confirmText="Ya, Hapus Pengguna"
            />

            {/* Alert Modal */}
            <AlertModal 
                isOpen={alertModal.isOpen} 
                onClose={() => setAlertModal({isOpen: false, message: '', type: 'warning'})} 
                message={alertModal.message} 
                type={alertModal.type} 
            />
        </>
    );
};
