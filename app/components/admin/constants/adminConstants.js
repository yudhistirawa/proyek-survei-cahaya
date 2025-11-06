import { LayoutDashboard, Home, ClipboardList, Users, CheckCircle, Folder, MapPin } from 'lucide-react';

export const menuItems = [
  { label: 'Home', icon: <Home size={20} /> },
  { label: 'Distribusi Tugas', icon: <ClipboardList size={20} /> },
  { label: 'Manajemen Pengguna', icon: <Users size={20} /> },
  { label: 'Validasi Data Survey', icon: <CheckCircle size={20} /> },
  { label: 'Data Survey Valid', icon: <Folder size={20} /> },
  { label: 'Data Tugas', icon: <ClipboardList size={20} /> },
  { label: 'Maps Validasi', icon: <MapPin size={20} /> },
  { label: 'Progress Surveyor', icon: <MapPin size={20} /> },
];

export const mainButtons = [
  { label: 'Distribusi Tugas', icon: <ClipboardList size={48} className="text-yellow-500" /> },
  { label: 'Manajemen Pengguna', icon: <Users size={48} className="text-purple-600" /> },
  { label: 'Validasi Data Survey', icon: <CheckCircle size={48} className="text-green-500" /> },
  { label: 'Data Survey Valid', icon: <Folder size={48} className="text-pink-500" /> },
  { label: 'Maps Validasi', icon: <MapPin size={48} className="text-indigo-500" /> },
  { label: 'Progress Surveyor', icon: <MapPin size={48} className="text-blue-500" /> },
];

// Role options untuk form pendaftaran - hanya admin_survey dan petugas_surveyor
export const roleOptionsForForm = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin_survey', label: 'Admin Survey' },
  { value: 'petugas_surveyor', label: 'Petugas Surveyor' }
];

// Role options lengkap untuk display detail user
export const roleOptions = [
  { value: 'petugas_pengukuran', label: 'Petugas Pengukuran' },
  { value: 'petugas_surveyor', label: 'Petugas Surveyor' },
  { value: 'petugas_kemerataan_sinar', label: 'Petugas Kemerataan Sinar' },
  { value: 'admin', label: 'Admin' },
  { value: 'admin_survey', label: 'Admin Survey' }
];

export const statusConfig = {
  'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Menunggu Validasi' },
  'validated': { color: 'bg-green-100 text-green-800', text: 'Tervalidasi' },
  'rejected': { color: 'bg-red-100 text-red-800', text: 'Ditolak' }
};
