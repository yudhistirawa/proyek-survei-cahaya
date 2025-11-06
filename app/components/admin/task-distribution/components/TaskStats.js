import React from 'react';
import { ClipboardList, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const cards = [
  { 
    key: 'total', 
    label: 'Total Tugas', 
    icon: ClipboardList, 
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-100'
  },
  { 
    key: 'in_progress', 
    label: 'Sedang Berjalan', 
    icon: Clock, 
    color: 'yellow',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-100'
  },
  { 
    key: 'completed', 
    label: 'Selesai', 
    icon: CheckCircle, 
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-100'
  },
  { 
    key: 'pending', 
    label: 'Pending', 
    icon: AlertCircle, 
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-100'
  }
];

const StatCard = ({ label, value, icon: Icon, bgColor, textColor, borderColor, loading = false }) => (
  <div className={`p-5 rounded-xl border ${borderColor} ${bgColor} shadow-sm hover:shadow-md transition-shadow duration-200`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
        ) : (
          <p className="text-2xl font-bold text-slate-800">
            {value.toLocaleString('id-ID')}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-lg ${bgColor.replace('50', '100')} border ${borderColor}`}>
        {loading ? (
          <Loader2 className={`w-5 h-5 ${textColor} animate-spin`} />
        ) : (
          <Icon className={`w-5 h-5 ${textColor}`} />
        )}
      </div>
    </div>
  </div>
);

const TaskStats = ({ tasks = [], loading = false }) => {
  const getValue = (key) => {
    try {
      if (loading) return 0;
      if (!Array.isArray(tasks)) return 0;
      
      if (key === 'total') return tasks.length;
      
      const statusMap = {
        'in_progress': ['assigned', 'in_progress'],
        'completed': ['completed'],
        'pending': ['pending', 'cancelled']
      };
      
      if (statusMap[key]) {
        return tasks.filter((t) => t?.status && statusMap[key].includes(t.status)).length;
      }
      
      return tasks.filter((t) => t?.status === key).length;
    } catch (error) {
      console.error('Error in getValue:', error);
      return 0;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={getValue(card.key)}
          icon={card.icon}
          bgColor={card.bgColor}
          textColor={card.textColor}
          borderColor={card.borderColor}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default TaskStats;

