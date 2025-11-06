import React, { useState } from 'react';
import { MapPin, FileText, ChevronLeft, Send } from 'lucide-react';
import { MapPreviewModal } from '../../modals/MapPreviewModal';

const taskTypes = [
  { id: 'zona-existing', title: 'Tugas Zona Existing', icon: MapPin },
  { id: 'tugas-propose', title: 'Tugas Propose', icon: FileText },
];

const CreateTaskForm = ({ onCancel, onCreate }) => {
  const [step, setStep] = useState('select');
  const [selectedType, setSelectedType] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    link: '',
    description: '',
    streets: '',
    kmzUrl: '',
    startDate: '',
    deadline: '',
    location: '',
    priority: 'medium',
  });

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const handleSubmit = () => {
    onCreate({ ...form, type: selectedType.id, id: Date.now().toString(), status: 'pending' });
    onCancel();
  };

  return (
    <div className="bg-white border rounded-2xl shadow p-8 space-y-6">
      {step === 'select' ? (
        <>
          <h3 className="text-xl font-bold mb-4">Pilih Jenis Tugas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {taskTypes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedType(t);
                    setStep('form');
                  }}
                  className="p-6 rounded-xl border hover:shadow-lg text-left space-y-3 w-full"
                >
                  <Icon className="w-8 h-8 text-indigo-600" />
                  <h4 className="font-semibold text-slate-800">{t.title}</h4>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setStep('select')} className="p-1 rounded hover:bg-slate-100">
              <ChevronLeft />
            </button>
            <h3 className="text-xl font-bold">Penugasan {selectedType.title.replace('Tugas ', '')}</h3>
          </div>

          {selectedType.id === 'tugas-propose' && (
            <div>
              <label className="block text-sm font-medium mb-1">Daftar Nama Jalan</label>
              <textarea
                rows={3}
                value={form.streets}
                onChange={handleChange('streets')}
                className="w-full border px-3 py-2 rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Link MyMaps</label>
            <input
              type="url"
              value={form.link}
              onChange={handleChange('link')}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={handleChange('description')}
              className="w-full border px-3 py-2 rounded-lg"
            />
          </div>
          {selectedType.id === 'tugas-propose' && (
            <div>
              <label className="block text-sm font-medium mb-1">URL KMZ (opsional)</label>
              <input
                type="url"
                value={form.kmzUrl}
                onChange={handleChange('kmzUrl')}
                className="w-full border px-3 py-2 rounded-lg"
              />
              {form.kmzUrl && (
                <button onClick={() => setShowPreview(true)} className="text-sm text-blue-600 underline mt-2">
                  Preview Peta
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
              <input type="date" value={form.startDate} onChange={handleChange('startDate')} className="w-full border px-3 py-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={handleChange('deadline')} className="w-full border px-3 py-2 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lokasi (singkat)</label>
            <input type="text" value={form.location} onChange={handleChange('location')} className="w-full border px-3 py-2 rounded-lg" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 text-slate-700">Batal</button>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-green-600 text-white flex items-center gap-2">
              <Send className="w-4 h-4" /> Kirim
            </button>
          </div>

          {showPreview && (
            <MapPreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} kmzUrl={form.kmzUrl} />
          )}
        </>
      )}
    </div>
  );
};

export default CreateTaskForm;

