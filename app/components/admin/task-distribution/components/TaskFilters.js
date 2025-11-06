import React from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';

const TaskFilters = ({ 
  search, 
  setSearch, 
  status, 
  setStatus, 
  priority, 
  setPriority, 
  loading = false 
}) => {
  const statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'assigned', label: 'Ditugaskan' },
    { value: 'in_progress', label: 'Dalam Proses' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Dibatalkan' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'Semua Prioritas' },
    { value: 'high', label: 'Tinggi' },
    { value: 'medium', label: 'Sedang' },
    { value: 'low', label: 'Rendah' }
  ];

  const SelectField = ({ 
    id, 
    value, 
    onChange, 
    options, 
    disabled = false,
    className = ''
  }) => (
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        className={`w-full h-10 pl-3 pr-8 text-sm border rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
          disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:border-slate-300'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <Filter className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
          placeholder="Cari tugas..."
          className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
            loading ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-700 hover:border-slate-300'
          }`}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField
          id="status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
          disabled={loading}
        />
        <SelectField
          id="priority-filter"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={priorityOptions}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default TaskFilters;

