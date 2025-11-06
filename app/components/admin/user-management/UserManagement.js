import React, { useEffect } from 'react';
import { UserPlus, Eye, Trash2, ChevronDown, EyeOff, Users, Shield, Search, Filter, MoreVertical, Star, Clock, Mail, Phone } from 'lucide-react';
import { roleOptionsForForm, roleOptions } from '../constants/adminConstants';
import UserDetailModal from './UserDetailModal';
import DeleteConfirmModal from './DeleteConfirmModal';

const UserManagement = ({
  users,
  loadingUsers,
  loadUsers,
  showAddUserForm,
  setShowAddUserForm,
  formData,
  setFormData,
  showPassword,
  setShowPassword,
  showRoleDropdown,
  setShowRoleDropdown,
  isSubmitting,
  submitMessage,
  handleSubmitUser,
  selectedUser,
  setSelectedUser,
  showUserDetail,
  setShowUserDetail,
  showDeleteConfirm,
  setShowDeleteConfirm,
  userToDelete,
  setUserToDelete,
  confirmDeleteUser
}) => {
  // Load users when component mounts - hanya sekali saat mount
  useEffect(() => {
    if (typeof loadUsers === 'function' && !loadingUsers && (!users || users.length === 0)) {
      console.log('🔄 UserManagement: Loading users on mount...');
      loadUsers();
    }
  }, []); // Empty dependency array - hanya run sekali saat mount

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (roleValue) => {
    setFormData(prev => ({
      ...prev,
      role: roleValue
    }));
    setShowRoleDropdown(false);
  };

  // Prevent scroll jump when selecting options
  const handleSelectChange = (field, value, event) => {
    event.preventDefault();
    const scrollContainer = event.target.closest('.overflow-y-auto');
    const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Restore scroll position after state update
    if (scrollContainer) {
      setTimeout(() => {
        scrollContainer.scrollTop = currentScrollTop;
      }, 0);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  if (showAddUserForm) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Tambah Pengguna Baru</h2>
                  <p className="text-indigo-100 text-sm">Buat akun pengguna baru untuk sistem survey</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserForm(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitUser} className="p-8 space-y-6 overflow-y-auto scroll-smooth max-h-[70vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white text-gray-900 transition-all duration-200"
                    placeholder="Masukkan nama lengkap"
                    required
                  />
                  <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white text-gray-900 transition-all duration-200"
                    placeholder="Masukkan email"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Role Pengguna
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 flex items-center justify-between bg-gray-50 hover:bg-white transition-all duration-200"
                >
                  <span className="text-gray-900">
                    {roleOptionsForForm.find(option => option.value === formData.role)?.label || 'Pilih Role'}
                  </span>
                  <ChevronDown size={20} className="text-gray-400" />
                </button>
                <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                
                {showRoleDropdown && (
                  <div className="absolute z-[9999] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                    {roleOptionsForForm.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleRoleSelect(option.value)}
                        className="w-full px-4 py-3 text-left text-gray-900 hover:bg-indigo-50 hover:text-indigo-700 first:rounded-t-xl last:rounded-b-xl transition-all duration-200"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white text-gray-900 transition-all duration-200"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {submitMessage && (
              <div className={`p-4 rounded-xl border ${
                submitMessage.includes('berhasil') 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      submitMessage.includes('berhasil') ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="font-medium">{submitMessage}</span>
                  </div>
                  {submitMessage.includes('berhasil') && (
                    <button
                      onClick={() => {
                        setShowAddUserForm(false);
                        setSubmitMessage('');
                      }}
                      className="text-green-600 hover:text-green-800 font-medium text-sm underline"
                    >
                      Tutup
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setShowAddUserForm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Mendaftarkan...</span>
                  </div>
                ) : (
                  'Daftarkan Pengguna'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Manajemen Pengguna</h2>
                <p className="text-indigo-100 text-sm">Kelola dan pantau aktivitas pengguna sistem</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddUserForm(true)}
              className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20"
            >
              <UserPlus size={20} />
              <span className="font-medium">Tambah Pengguna</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-8">
        {loadingUsers ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Memuat data pengguna...</p>
            </div>
          </div>
        ) : !users || users.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Pengguna</h3>
              <p className="text-gray-600 mb-6">Mulai dengan menambahkan pengguna pertama ke sistem</p>
              <button
                onClick={() => setShowAddUserForm(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
              >
                <UserPlus className="w-5 h-5 inline mr-2" />
                Tambah Pengguna Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Admin Section */}
            {(() => {
              const adminUsers = Array.isArray(users) ? users.filter(user => 
                user.role === 'admin_survey'
              ) : [];
              return adminUsers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Administrator</h3>
                        <p className="text-purple-100 text-sm">{adminUsers.length} pengguna terdaftar</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {adminUsers.map((user) => (
                        <div key={user.uid} className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 hover:shadow-lg transition-all duration-200 group">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="p-2 text-purple-600 hover:bg-purple-200 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Hapus Pengguna"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {user.displayName || user.username || 'Nama tidak tersedia'}
                            </h4>
                            <p className="text-purple-600 text-sm font-medium">@{user.username}</p>
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="pt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-200 text-purple-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin Survey
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Petugas Section */}
            {(() => {
              const petugasUsers = Array.isArray(users) ? users.filter(user => 
                user.role === 'petugas_surveyor'
              ) : [];
              return petugasUsers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Petugas Surveyor</h3>
                        <p className="text-blue-100 text-sm">{petugasUsers.length} pengguna terdaftar</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {petugasUsers.map((user) => (
                        <div key={user.uid} className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all duration-200 group">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="p-2 text-blue-600 hover:bg-blue-200 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Lihat Detail"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                title="Hapus Pengguna"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 text-lg">
                              {user.displayName || user.username || 'Nama tidak tersedia'}
                            </h4>
                            <p className="text-blue-600 text-sm font-medium">@{user.username || 'No username'}</p>
                            <div className="flex items-center space-x-2 text-gray-600 text-sm">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="pt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                                <Users className="w-3 h-3 mr-1" />
                                Petugas Surveyor
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Empty state jika tidak ada user di kedua kategori */}
            {Array.isArray(users) && users.filter(user => 
              user.role === 'admin_survey' || user.role === 'petugas_surveyor'
            ).length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Pengguna Sistem</h3>
                  <p className="text-gray-600">Belum ada pengguna Admin Survey atau Petugas Surveyor terdaftar</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showUserDetail && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowUserDetail(false);
            setSelectedUser(null);
          }}
          roleOptions={roleOptions}
        />
      )}

      {showDeleteConfirm && userToDelete && (
        <DeleteConfirmModal
          user={userToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDeleteUser}
        />
      )}
    </div>
  );
};

export default UserManagement;
