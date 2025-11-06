import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, Calendar, FileText, FolderOpen } from 'lucide-react';

const KmzFileManager = () => {
  const [kmzFiles, setKmzFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load KMZ files
  const loadKmzFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/kmz-files');
      const data = await response.json();
      
      if (data.success) {
        setKmzFiles(data.files);
      } else {
        setError(data.message || 'Gagal memuat daftar file KMZ');
      }
    } catch (error) {
      console.error('Error loading KMZ files:', error);
      setError('Gagal memuat daftar file KMZ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKmzFiles();
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extract folder path from file path
  const getFolderPath = (filePath) => {
    const parts = filePath.split('/');
    if (parts.length >= 4) {
      return `${parts[1]}/${parts[2]}/${parts[3]}`; // year/month/day
    }
    return 'Unknown';
  };

  // Handle download file
  const handleDownload = (file) => {
    window.open(file.url, '_blank');
  };

  // Handle delete file
  const handleDelete = async (file) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus file "${file.originalName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/delete-kmz-file`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath: file.path })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('File berhasil dihapus');
        loadKmzFiles(); // Reload list
      } else {
        alert(data.error || 'Gagal menghapus file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Gagal menghapus file');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">KMZ File Manager</h2>
            <p className="text-gray-600 mt-1">Kelola file KMZ yang tersimpan di Firebase Storage</p>
          </div>
          <button
            onClick={loadKmzFiles}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <FolderOpen size={20} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat daftar file KMZ...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadKmzFiles}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : kmzFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Belum ada file KMZ yang tersimpan</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total File: {kmzFiles.length}
                </h3>
                <p className="text-sm text-gray-500">
                  Total Size: {formatFileSize(kmzFiles.reduce((sum, file) => sum + file.size, 0))}
                </p>
              </div>

              <div className="grid gap-4">
                {kmzFiles.map((file, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <FileText size={20} className="text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">{file.originalName}</h4>
                            <p className="text-sm text-gray-500">
                              Path: {file.path}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar size={14} />
                            <span>{formatDate(file.uploadedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FolderOpen size={14} />
                            <span>Folder: {getFolderPath(file.path)}</span>
                          </div>
                          <span>Size: {formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title="Download file"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => window.open(file.url, '_blank')}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200"
                          title="Lihat file"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                          title="Hapus file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KmzFileManager; 