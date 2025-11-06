import React, { useState } from 'react';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const RegisterPage = React.memo(({ onRegister, onBack, currentAdminName }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'petugas_pengukuran'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error when user types
    };

    const validateForm = () => {
        if (!formData.username.trim()) {
            return 'Username harus diisi';
        }
        if (formData.username.length < 3) {
            return 'Username minimal 3 karakter';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            return 'Username hanya boleh mengandung huruf, angka, dan underscore';
        }
        if (!formData.email.trim()) {
            return 'Email harus diisi';
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            return 'Format email tidak valid';
        }
        if (!formData.password) {
            return 'Password harus diisi';
        }
        if (formData.password.length < 6) {
            return 'Password minimal 6 karakter';
        }
        if (formData.password !== formData.confirmPassword) {
            return 'Konfirmasi password tidak cocok';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        try {
            await onRegister({
                email: formData.email,
                password: formData.password,
                username: formData.username,
                displayName: formData.username, // Use username as displayName
                role: formData.role,
                createdBy: currentAdminName
            });
        } catch (err) {
            console.error('Registration error:', err);
            let errorMessage = 'Gagal mendaftarkan pengguna';
            
            if (err.message === 'Username sudah digunakan') {
                errorMessage = 'Username sudah digunakan';
            } else if (err.code === 'auth/email-already-in-use') {
                errorMessage = 'Email sudah terdaftar';
            } else if (err.code === 'auth/weak-password') {
                errorMessage = 'Password terlalu lemah';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Format email tidak valid';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 space-y-6 relative overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/20 to-emerald-400/20 rounded-full translate-y-12 -translate-x-12"></div>
                    
                    <div className="text-center relative z-10">
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
                                    <UserPlus className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">+</span>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Daftar Pengguna Baru
                        </h1>
                        <p className="text-gray-600 mt-2 font-medium">Tambahkan petugas atau admin baru</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div className="space-y-1">
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan username"
                                    className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan email"
                                    className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                                Role
                            </label>
                            <div className="relative">
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-4 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-gray-900 shadow-sm hover:shadow-md appearance-none cursor-pointer"
                                    disabled={isLoading}
                                >
                                    <option value="petugas_pengukuran">Petugas Pengukuran</option>
                                    <option value="petugas_surveyor">Petugas Surveyor</option>
                                    <option value="petugas_kemerataan">Petugas Kemerataan Sinar</option>
                                    <option value="admin">Admin</option>
                                    <option value="admin_survey">Admin Survey</option>
                                </select>
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan password"
                                    className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-500 hover:text-emerald-600 transition-colors p-1 rounded-lg hover:bg-emerald-50"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                                Konfirmasi Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Konfirmasi password"
                                    className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-gray-900 placeholder-gray-400 shadow-sm hover:shadow-md"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-emerald-500 hover:text-emerald-600 transition-colors p-1 rounded-lg hover:bg-emerald-50"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    {error}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-2xl disabled:from-emerald-300 disabled:to-teal-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <span className="relative z-10">
                                    {isLoading ? 'Mendaftarkan...' : 'Daftar Pengguna'}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={onBack}
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold py-4 px-6 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Kembali ke Admin
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
});

RegisterPage.displayName = 'RegisterPage';
