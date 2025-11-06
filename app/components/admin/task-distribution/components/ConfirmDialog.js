import React from 'react';

const ConfirmDialog = ({
  isOpen,
  title = 'Konfirmasi',
  message = 'Yakin ingin melanjutkan?',
  confirmText = 'Hapus',
  cancelText = 'Batal',
  variant = 'danger', // 'danger' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const color = variant === 'danger'
    ? {
        btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-700',
      }
    : {
        btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${color.badge} flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${color.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-700">{message}</p>
          </div>
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${color.btn}`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Memproses...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
