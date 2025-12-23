"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import TaskStats from './components/TaskStats';
import TaskFilters from './components/TaskFilters';
import TaskGrid from './components/TaskGrid';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import ConfirmDialog from './components/ConfirmDialog';

const TaskDistribution = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [taskType, setTaskType] = useState(''); // 'existing' or 'propose'
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('task-type-dropdown');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        const button = event.target.closest('button');
        if (!button || !button.textContent.includes('Buat Tugas Baru')) {
          dropdown.classList.add('hidden');
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch tasks from API with error handling and retry logic
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!adminId) {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        setAdminId(user.uid);
      }

      const response = await fetch('/api/task-assignments', {
        headers: adminId ? { 'x-admin-id': adminId } : {},
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Gagal memuat data (${response.status} ${response.statusText})`
        );
      }
      
      const result = await response.json();
      if (result.success) {
        setTasks(Array.isArray(result.data) ? result.data : []);
      } else {
        throw new Error(result.error || 'Gagal mengambil data tugas');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      // Handle different types of errors
      let errorMessage = 'Gagal mengambil data tugas';
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (err.name === 'AbortError') {
        errorMessage = 'Permintaan dibatalkan';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  // Setup auth listener once, then fetch when ready
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        setAdminId(user.uid);
      } else {
        setAdminId(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Fetch tasks when auth is ready and adminId available
  useEffect(() => {
    if (!authReady) return;
    
    if (adminId) {
      fetchTasks();
    } else {
      // Jika tidak ada adminId setelah auth siap, berarti user tidak login
      setTasks([]);
      setLoading(false);
      setError('Anda belum login atau sesi telah berakhir.');
    }
  }, [authReady, adminId, fetchTasks]);

  // Filter tasks based on search, status, and priority
  const filteredTasks = React.useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    return tasks.filter(task => {
      const matchesSearch = !search || 
        (task.title?.toLowerCase().includes(search.toLowerCase())) ||
        (task.description?.toLowerCase().includes(search.toLowerCase()));
      
      const matchesStatus = status === 'all' || 
        (status === 'pending' && ['pending', 'cancelled'].includes(task.status)) ||
        (status === 'in_progress' && ['in_progress', 'assigned'].includes(task.status)) ||
        task.status === status;
      
      const matchesPriority = priority === 'all' || task.priority === priority;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, status, priority]);

  // Handle task actions
  const handleViewTask = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setModalType('edit');
    setShowModal(true);
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setConfirmOpen(true);
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8 max-w-7xl">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Manajemen Tugas Survey</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pantau dan kelola distribusi tugas untuk tim surveyor
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
            
            {/* Dropdown Button untuk Pilih Tipe Tugas */}
            <div className="relative inline-block text-left">
              <button
                onClick={() => {
                  // Toggle dropdown - bisa gunakan state jika perlu
                  const dropdown = document.getElementById('task-type-dropdown');
                  dropdown.classList.toggle('hidden');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Tugas Baru
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div
                id="task-type-dropdown"
                className="hidden absolute right-0 mt-2 w-64 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setModalType('create');
                      setTaskType('propose');
                      setShowModal(true);
                      document.getElementById('task-type-dropdown').classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Tugas APJ Propose</div>
                      <div className="text-xs text-gray-500 mt-0.5">Survey area baru dengan titik koordinat</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setModalType('create');
                      setTaskType('existing');
                      setShowModal(true);
                      document.getElementById('task-type-dropdown').classList.add('hidden');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-start gap-3 transition-colors border-t border-gray-100"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">Tugas Zona Existing</div>
                      <div className="text-xs text-gray-500 mt-0.5">Survey area terpasang dengan zona polygon</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="mb-8">
        <TaskStats tasks={tasks} loading={loading} />
      </div>
      
      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Daftar Tugas</h2>
              <p className="text-sm text-slate-500 mt-1">
                {loading ? 'Memuat...' : `${filteredTasks.length} tugas ditemukan`}
              </p>
            </div>
            
            <div className="w-full md:w-auto">
              <TaskFilters
                search={search}
                setSearch={setSearch}
                status={status}
                setStatus={setStatus}
                priority={priority}
                setPriority={setPriority}
                loading={loading}
              />
            </div>
          </div>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={fetchTasks}
                  className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
                >
                  Coba Lagi <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Task Grid */}
        <div className="overflow-hidden">
          <TaskGrid
            tasks={filteredTasks}
            loading={loading}
            onView={handleViewTask}
            onDelete={handleDeleteClick}
          />
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onDelete={handleDeleteClick}
      />

      {/* Create/Edit Task Modal */}
      <CreateTaskModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTask(null);
        }}
        taskType={taskType}
        onTaskCreated={() => {
          setShowModal(false);
          fetchTasks();
        }}
        task={modalType === 'edit' ? selectedTask : null}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!taskToDelete) return;
          
          setConfirmLoading(true);
          try {
            const response = await fetch(`/api/task-assignments/${taskToDelete.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-id': adminId
              }
            });

            if (!response.ok) {
              throw new Error('Gagal menghapus tugas');
            }

            await fetchTasks();
            setConfirmOpen(false);
            setTaskToDelete(null);
          } catch (err) {
            console.error('Error deleting task:', err);
            setError(err.message || 'Terjadi kesalahan saat menghapus tugas');
          } finally {
            setConfirmLoading(false);
          }
        }}
        title="Hapus Tugas"
        message="Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        loading={confirmLoading}
      />
    </div>
  );
};

export default TaskDistribution;
