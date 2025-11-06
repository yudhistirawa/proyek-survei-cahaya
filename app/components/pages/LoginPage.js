import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, User, Lock, Eye, EyeOff } from 'lucide-react';
import { loginWithUsername } from '../../lib/auth';
import usePageTitle from '../../hooks/usePageTitle';

export const LoginPage = React.memo(({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Set page title
    usePageTitle('Login - Sistem Manajemen Survey');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simple validation
        if (!username.trim() || !password.trim()) {
            setError('Username dan password harus diisi');
            setIsLoading(false);
            return;
        }

        try {
            const { user, userData } = await loginWithUsername(username, password);
            
            // Redirect based on role immediately without delay
            const role = userData?.role;
            
            switch (role) {
                case 'admin_survey':
                    window.location.href = '/panel-admin-survey-lapangan';
                    break;
                case 'admin':
                    window.location.href = '/admin';
                    break;
                case 'petugas_pengukuran':
                    window.location.href = '/';
                    break;
                case 'petugas_surveyor':
                    window.location.href = '/';
                    break;
                case 'petugas_kemerataan_sinar':
                    window.location.href = '/';
                    break;
                default:
                    // Fallback untuk role yang tidak dikenali
                    onLogin(user, userData);
                    break;
            }
        } catch (err) {
            console.error('Login error:', err);
            let errorMessage = 'Login gagal. Silakan coba lagi.';
            
            // Handle specific error messages
            if (err.message === 'Username tidak terdaftar') {
                errorMessage = 'Username tidak terdaftar dalam sistem';
            } else if (err.message === 'Password salah') {
                errorMessage = 'Password yang Anda masukkan salah';
            } else if (err.message === 'User tidak terdaftar') {
                errorMessage = 'User tidak terdaftar dalam sistem';
            } else if (err.message === 'Username dan password harus diisi') {
                errorMessage = 'Username dan password harus diisi';
            } else if (err.message === 'Terlalu banyak percobaan login. Coba lagi nanti.') {
                errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti.';
            } else if (err.message === 'Format email tidak valid') {
                errorMessage = 'Format email tidak valid';
            } else if (err.message === 'Akun telah dinonaktifkan') {
                errorMessage = 'Akun Anda telah dinonaktifkan. Hubungi administrator.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-200 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-8 space-y-6">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <Shield className="w-12 h-12 text-blue-600" />
                        </div>
                    <h1 className="text-3xl font-bold text-gray-900">Login Sistem Manajemen</h1>
                    <p className="text-gray-700 mt-2">Masuk untuk mengakses dashboard sistem</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan username"
                                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Masukkan password"
                                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl disabled:bg-blue-300 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
                        >
                            {isLoading ? 'Memproses...' : 'Login'}
                        </button>

                        {/* Public access to Peta Bersama */}
                        <Link
                            href="/peta-bersama"
                            className="mt-3 w-full inline-flex items-center justify-center border border-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                            prefetch={true}
                        >
                            Lihat Peta Bersama (Publik)
                        </Link>
                    </form>
                </div>
            </div>
        </div>
    );
});

LoginPage.displayName = 'LoginPage';
