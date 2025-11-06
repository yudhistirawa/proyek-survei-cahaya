import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const SurveyorTaskDataPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'task-assignments'),
      where('surveyorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching tasks:', err);
      setError('Gagal mengambil data tugas');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleViewTask = (task) => {
    setSelectedTask(task);
  };

  const handleDownloadFile = async (fileData) => {
    try {
      const response = await fetch(fileData.downloadURL);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Gagal mengunduh file');
    }
  };

  const handleViewMap = (task) => {
    if (task.type === 'existing' && task.fileData?.downloadURL) {
      setSelectedTask(task);
      setShowMapModal(true);
    } else {
      alert('Tidak ada file peta untuk tugas ini');
    }
  };

  const handleMarkAsRead = async (taskId) => {
    try {
      await updateDoc(doc(db, 'task-assignments', taskId), {
        'notifications.0.read': true
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data tugas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Data Tugas Surveyor</h1>
          <p className="text-slate-600">Kelola tugas yang ditugaskan kepada Anda</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Tugas: {tasks.length}
        </div>
      </div>

      {/* Notifikasi Tugas Baru */}
      {tasks.filter(task => !task.notifications?.[0]?.read).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A4 4 0 004 6v12a4 4 0 004 4h12a4 4 0 004-4V6a4 4 0 00-4-4H8a4 4 0 00-2.81 1.19z" />
            </svg>
            <span className="text-blue-700 font-medium">
              Anda memiliki {tasks.filter(task => !task.notifications?.[0]?.read).length} tugas baru!
            </span>
          </div>
        </div>
      )}

      {/* Daftar Tugas */}
      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada tugas</h3>
            <p className="text-gray-500">Tugas yang ditugaskan kepada Anda akan muncul di sini</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                !task.notifications?.[0]?.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status === 'assigned' ? 'Ditugaskan' :
                       task.status === 'in_progress' ? 'Sedang Berjalan' :
                       task.status === 'completed' ? 'Selesai' : task.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority === 'high' ? 'Tinggi' :
                       task.priority === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Tipe:</span>
                      <p className="font-medium">
                        {task.type === 'existing' ? 'Zona Existing' : 'Propose'}
                      </p>
                    </div>
                    {task.zone && (
                      <div>
                        <span className="text-gray-500">Zona:</span>
                        <p className="font-medium">{task.zone}</p>
                      </div>
                    )}
                    {task.deadline && (
                      <div>
                        <span className="text-gray-500">Deadline:</span>
                        <p className="font-medium">
                          {new Date(task.deadline).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Dibuat:</span>
                      <p className="font-medium">
                        {task.createdAt?.toDate?.()?.toLocaleDateString('id-ID') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {task.fileData && (
                    <button
                      onClick={() => handleDownloadFile(task.fileData)}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                    >
                      Download File
                    </button>
                  )}
                  
                  {task.type === 'existing' && task.fileData && (
                    <button
                      onClick={() => handleViewMap(task)}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      Lihat Peta
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleViewTask(task);
                      if (!task.notifications?.[0]?.read) {
                        handleMarkAsRead(task.id);
                      }
                    }}
                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    Detail
                  </button>
                </div>
              </div>

              {/* Notifikasi baru */}
              {!task.notifications?.[0]?.read && (
                <div className="mt-3 p-2 bg-blue-100 rounded border-l-4 border-blue-500">
                  <p className="text-sm text-blue-700">
                    {task.notifications?.[0]?.message || 'Tugas baru ditugaskan kepada Anda'}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Detail Tugas */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Detail Tugas</h2>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedTask.title}</h3>
                <p className="text-gray-600 mt-1">{selectedTask.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 text-sm">Status:</span>
                  <p className="font-medium">{selectedTask.status}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Prioritas:</span>
                  <p className="font-medium">{selectedTask.priority}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Tipe:</span>
                  <p className="font-medium">
                    {selectedTask.type === 'existing' ? 'Zona Existing' : 'Propose'}
                  </p>
                </div>
                {selectedTask.zone && (
                  <div>
                    <span className="text-gray-500 text-sm">Zona:</span>
                    <p className="font-medium">{selectedTask.zone}</p>
                  </div>
                )}
              </div>

              {selectedTask.fileData && (
                <div>
                  <span className="text-gray-500 text-sm">File:</span>
                  <p className="font-medium">{selectedTask.fileData.fileName}</p>
                  <button
                    onClick={() => handleDownloadFile(selectedTask.fileData)}
                    className="mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                  >
                    Download File
                  </button>
                </div>
              )}

              {selectedTask.coordinates && (
                <div>
                  <span className="text-gray-500 text-sm">Koordinat:</span>
                  <p className="font-medium">{selectedTask.coordinates}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Peta */}
      {showMapModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Peta Tugas</h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                </svg>
                <p className="text-gray-500 mb-4">Peta akan ditampilkan di sini</p>
                <p className="text-sm text-gray-400">
                  File KMZ: {selectedTask.fileData.fileName}
                </p>
                <button
                  onClick={() => handleDownloadFile(selectedTask.fileData)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download File KMZ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyorTaskDataPage;
