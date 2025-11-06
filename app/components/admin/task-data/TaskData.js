import React, { useEffect, useState } from 'react';
import { Eye, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { logTaskView } from '../../../lib/activity-logger';

const TaskData = ({
  tasks,
  setTasks,
  loadingTasks,
  setLoadingTasks,
  selectedTask,
  setSelectedTask,
  showTaskDetail,
  setShowTaskDetail,
  taskSearchTerm
}) => {
  // Load tasks from API
  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await fetch('/api/task-assignments');
      const result = await response.json();
      
      if (result.success) {
        // Transform data untuk display
        const transformedTasks = result.data.map(task => ({
          id: task.id,
          title: task.description || `Tugas ${task.taskType === 'existing' ? 'Zona Existing' : 'Propose'}`,
          type: task.taskType,
          assignedTo: task.surveyorName,
          assignedToEmail: task.surveyorEmail,
          status: task.status || 'assigned',
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          description: task.description,
          mapsLink: task.mapsLink,
          startDate: task.startDate,
          deadline: task.deadline,
          priority: task.priority,
          notes: task.notes,
          proposeData: task.proposeData || [],
          createdBy: task.createdBy,
          createdByName: task.createdByName
        }));
        
        setTasks(transformedTasks);
        console.log('✅ Data tugas berhasil dimuat:', transformedTasks.length, 'tugas');
      } else {
        console.error('❌ Gagal memuat data tugas:', result.error);
        // Fallback ke mock data jika API gagal
        const mockTasks = [
          {
            id: 1,
            title: 'Survey Pencahayaan Jl. Sudirman',
            type: 'existing',
            assignedTo: 'John Doe',
            assignedToEmail: 'john@example.com',
            status: 'completed',
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            description: 'Survey pencahayaan jalan untuk zona existing di Jl. Sudirman'
          },
          {
            id: 2,
            title: 'Survey Propose Jl. Thamrin',
            type: 'propose',
            assignedTo: 'Jane Smith',
            assignedToEmail: 'jane@example.com',
            status: 'in_progress',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            description: 'Survey untuk zona propose baru di Jl. Thamrin'
          },
          {
            id: 3,
            title: 'Survey Kemerataan Sinar Jl. Gatot Subroto',
            type: 'existing',
            assignedTo: 'Bob Johnson',
            assignedToEmail: 'bob@example.com',
            status: 'assigned',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            description: 'Survey kemerataan sinar untuk zona existing'
          }
        ];
        setTasks(mockTasks);
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      // Fallback ke mock data
      const mockTasks = [
        {
          id: 1,
          title: 'Survey Pencahayaan Jl. Sudirman',
          type: 'existing',
          assignedTo: 'John Doe',
          assignedToEmail: 'john@example.com',
          status: 'completed',
          createdAt: new Date().toISOString(),
          description: 'Survey pencahayaan jalan untuk zona existing di Jl. Sudirman'
        }
      ];
      setTasks(mockTasks);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Load tasks when component mounts
  useEffect(() => {
    loadTasks();
  }, []);

  const handleTaskDetail = async (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    
    // Log activity untuk view task
    try {
      await logTaskView('Administrator', 'admin', task.id, task.title);
      console.log('✅ Activity log berhasil disimpan untuk view task:', task.title);
    } catch (logError) {
      console.error('⚠️ Gagal menyimpan activity log untuk view task:', logError);
      // Tidak menggagalkan proses utama jika logging gagal
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Clock, 
        text: 'Menunggu' 
      },
      'in_progress': { 
        color: 'bg-blue-100 text-blue-800', 
        icon: AlertTriangle, 
        text: 'Sedang Dikerjakan' 
      },
      'completed': { 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle, 
        text: 'Selesai' 
      }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent size={12} className="mr-1" />
        {config.text}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    const typeConfig = {
      'existing': { label: 'Zona Existing', color: 'bg-orange-100 text-orange-800' },
      'propose': { label: 'Propose', color: 'bg-purple-100 text-purple-800' }
    };
    
    const config = typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Filter tasks based on search term
  const filteredTasks = tasks.filter(task => 
    task.title?.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
    task.assignedTo?.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
    task.type?.toLowerCase().includes(taskSearchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Data Tugas</h2>
          <p className="text-gray-600 mt-1">Kelola dan pantau semua tugas yang telah didistribusikan</p>
        </div>

        <div className="p-6">
          {loadingTasks ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Memuat data tugas...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {taskSearchTerm ? 'Tidak ada tugas yang sesuai dengan pencarian' : 'Belum ada tugas yang didistribusikan'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Judul Tugas</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Jenis</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ditugaskan Kepada</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal Dibuat</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        {getTypeLabel(task.type)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{task.assignedTo}</div>
                        <div className="text-sm text-gray-600">{task.assignedToEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(task.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleTaskDetail(task)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                            title="Lihat Detail"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskData;
