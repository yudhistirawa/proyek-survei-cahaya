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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [adminId, setAdminId] = useState(null);
  const [authReady, setAuthReady] = useState(false);

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
            <button
              onClick={() => {
                setSelectedTask(null);
                setModalType('create');
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buat Tugas Baru
            </button>
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
            onViewTask={handleViewTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteClick}
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
        onSubmit={() => {
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
