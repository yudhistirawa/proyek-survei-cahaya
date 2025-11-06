import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Eye, Trash2 } from 'lucide-react';

const getStatusProps = (status) => {
  try {
    switch (status) {
      case 'completed':
        return { color: 'green', icon: CheckCircle };
      case 'in_progress':
        return { color: 'blue', icon: Clock };
      case 'assigned':
        return { color: 'yellow', icon: Clock };
      case 'pending':
        return { color: 'yellow', icon: AlertCircle };
      case 'cancelled':
        return { color: 'red', icon: XCircle };
      default:
        return { color: 'slate', icon: Clock };
    }
  } catch (error) {
    console.error('Error in getStatusProps:', error);
    return { color: 'slate', icon: Clock };
  }
};

const TaskCard = ({ task, onView, onDelete }) => {
  try {
    if (!task) {
      return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-500">Data tugas tidak valid</p>
          </div>
        </div>
      );
    }

    const { color, icon: Icon } = getStatusProps(task.status || 'assigned');
    const statusText = (task.status || 'assigned').replace('_', ' ');

    const handleDeleteClick = async () => {
      if (typeof onDelete === 'function') {
        return onDelete(task);
      }
      // Fallback delete handler if onDelete not provided
      if (!task?.id) return;
      const ok = window.confirm('Hapus tugas ini? Tindakan ini tidak dapat dibatalkan.');
      if (!ok) return;
      try {
        const res = await fetch(`/api/task-assignments?id=${encodeURIComponent(task.id)}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || `Gagal menghapus tugas (HTTP ${res.status})`);
        // Inform parent via event; parent can refetch
        window.dispatchEvent(new CustomEvent('task-deleted', { detail: { id: task.id } }));
      } catch (e) {
        console.error('Gagal menghapus tugas:', e);
        alert(e.message || 'Gagal menghapus tugas');
      }
    };
    
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
        <div className="p-6 space-y-3">
          <h3 className="font-semibold text-slate-800 line-clamp-1">{task.title || task.surveyorName || 'Surveyor tidak ditentukan'}</h3>
          <p className="text-sm text-slate-600 line-clamp-2">{task.description || 'Tidak ada deskripsi'}</p>
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col gap-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-${color}-100 text-${color}-800`}>
                <Icon className="w-4 h-4" /> {statusText}
              </span>
              {task.priority && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {task.priority}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onView(task)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                title="Lihat detail"
                aria-label="Lihat detail"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteClick}
                className="p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
                title="Hapus tugas"
                aria-label="Hapus tugas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {task.deadline && (
            <p className="text-xs text-slate-500">
              Deadline: {new Date(task.deadline).toLocaleDateString('id-ID')}
            </p>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering TaskCard:', error);
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-3">
          <p className="text-sm text-red-500">Error rendering task card</p>
        </div>
      </div>
    );
  }
};

const TaskGrid = ({ tasks = [], onView, onDelete, loading = false }) => {
  try {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
              <div className="p-6 space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-3 bg-slate-200 rounded"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 rounded w-6"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-600 mb-2">Tidak ada tugas</h3>
          <p className="text-slate-500">Belum ada tugas yang dibuat atau ditugaskan.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((t, index) => (
          <TaskCard key={t?.id || index} task={t} onView={onView} onDelete={onDelete} />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error in TaskGrid:', error);
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-600 mb-2">Error</h3>
        <p className="text-red-500">Terjadi kesalahan saat menampilkan data tugas.</p>
      </div>
    );
  }
};

export default TaskGrid;

