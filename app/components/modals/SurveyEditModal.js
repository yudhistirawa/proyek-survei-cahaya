// app/components/modals/SurveyEditModal.js
'use client';

import React, {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useCallback,
  memo,
} from 'react';
import { X, Save, AlertTriangle, Edit2, Camera, Database } from 'lucide-react';
import { useGeolocationWatch } from '../../lib/useGeolocationWatch';

/* ---------------- Reducer ---------------- */
function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': {
      const next = action.value ?? '';
      if (state[action.name] === next) return state;
      return { ...state, [action.name]: next };
    }
    case 'RESET':
      return { ...action.payload };
    default:
      return state;
  }
}

function buildInitialState(sd = {}) {
  return {
    // APJ Propose
    statusIdTitik:
      sd.idTitik && String(sd.idTitik).trim() !== '' ? 'Ada' : 'Tidak Ada',
    idTitik: sd.idTitik || '',
    dataLampu: sd.dataLampu || sd.dataDaya || '',
    dataTiang: sd.dataTiang || '',
    dataRuas: sd.dataRuas || sd.ruas || '',
    dataRuasDetail: sd.dataRuasDetail || '', // baru: detail saat Kolektor
    median: sd.median || '',
    tinggiMedian: sd.tinggiMedian || '',
    lebarMedian: sd.lebarMedian || '',
    namaJalan: sd.namaJalan || '',
    lebarJalan:
      sd.lebarJalan ?? sd.lebarJalan1 ?? sd.lebarJalan2 ?? '',
    jarakAntarTiang: sd.jarakAntarTiang || '',
    lebarBahuBertiang: sd.lebarBahuBertiang || '',
    lebarTrotoarBertiang: sd.lebarTrotoarBertiang || '',
    lainnyaBertiang: sd.lainnyaBertiang || '',
    keterangan: sd.keterangan || '',

    // Survey Existing
    namaGang: sd.namaGang || '',
    lebarJalan1: sd.lebarJalan1 || '',
    lebarJalan2: sd.lebarJalan2 || '',
    kepemilikanTiang: sd.kepemilikanTiang || '',
    jenisTiang: sd.jenisTiang || '',
    trafo: sd.trafo || '',
    jenisTrafo: sd.jenisTrafo || '',
    tinggiBatasBawah: sd.tinggiBatasBawah || sd.tinggiBawahTrafo || '',
    lampu: sd.lampu || '',
    tinggiARM: sd.tinggiARM || '',

    // Admin
    titikKordinatBaru: sd.titikKordinatBaru || '',
    namaJalanBaru: sd.namaJalanBaru || '',

    // Foto
    fotoTitikAktual: sd.fotoTitikAktual || '',
    fotoTinggiARM: sd.fotoTinggiARM || sd.fotoKemerataan || '',
    fotoLampu: sd.fotoLampu || '',
    fotoTrafo: sd.fotoTrafo || '',
  };
}

/* ---------------- UI primitives (memo) ---------------- */
const Input = memo(function Input({
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  rightAddon,
}) {
  const handleChange = (e) => {
    const inputValue = e.target.value;
    // Allow empty value, numbers, and decimal point for numeric inputs
    if (type === 'number' && inputValue !== '' && !/^\d*\.?\d*$/.test(inputValue)) {
      return;
    }
    onChange(e);
  };

  const handleKeyDown = (e) => {
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if (type === 'number' && !(
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      /^\d$/.test(e.key) ||
      (e.key === '.' && !value?.includes('.'))
    )) {
      e.preventDefault();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        autoComplete="off"
        spellCheck={false}
        type={type}
        name={name}
        id={name}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={
          'flex-1 min-w-0 h-10 px-3 py-2 rounded-lg border text-sm ' +
          (disabled
            ? 'bg-slate-50 text-slate-500 border-slate-200'
            : 'bg-white text-slate-900 border-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500')
        }
        placeholder={placeholder}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        min="0"
        step="0.01"
      />
      {rightAddon ? <div className="shrink-0 flex gap-2">{rightAddon}</div> : null}
    </div>
  );
});

const Select = memo(function Select({
  name,
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi',
}) {
  return (
    <select
      name={name}
      id={name}
      value={value ?? ''}
      onChange={onChange}
      className="w-full h-10 px-3 py-2 rounded-lg border text-sm bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
});

const TextArea = memo(function TextArea({
  name,
  value,
  onChange,
  placeholder,
}) {
  return (
    <textarea
      name={name}
      id={name}
      rows={3}
      value={value ?? ''}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-lg border text-sm bg-white text-slate-900 border-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
      placeholder={placeholder}
    />
  );
});

const MiniLabel = ({ children, right }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Edit2 size={14} className="text-slate-400 shrink-0" />
      <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
        {children}
      </span>
    </div>
    {right ? <span className="text-xs text-slate-500">{right}</span> : null}
  </div>
);

/* ---------------- Main ---------------- */
export default function SurveyEditModal({ isOpen, onClose, surveyData, onSave }) {
  const [formData, dispatch] = useReducer(formReducer, {});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  // koordinat realtime pisah
  const [liveCoord, setLiveCoord] = useState('');
  const { coords, status: geoStatus, error: geoError, refresh: refreshGeo } =
    useGeolocationWatch();

  // Init hanya saat ID berubah / modal dibuka
  const currentId = surveyData?.id ?? '';
  const initForIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !surveyData) return;
    if (initForIdRef.current !== currentId) {
      dispatch({ type: 'RESET', payload: buildInitialState(surveyData) });
      setLiveCoord(surveyData.titikKordinat || '');
      setHasChanges(false);
      initForIdRef.current = currentId;
    }
  }, [isOpen, currentId, surveyData]);

  useEffect(() => {
    if (!isOpen) initForIdRef.current = null;
  }, [isOpen]);

  // koordinat realtime → tidak menyentuh formData
  useEffect(() => {
    if (!isOpen) return;
    if (coords?.lat && coords?.lng) {
      const v = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      setLiveCoord((prev) => (prev === v ? prev : v));
    }
  }, [coords, isOpen]);

  // handler global stabil
  const onFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_FIELD', name, value });
    setHasChanges(true);
  }, []);

  const copyToClipboard = async (text) => {
    try {
      if (!text) return;
      await (navigator?.clipboard?.writeText
        ? navigator.clipboard.writeText(text)
        : new Promise((res, rej) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? res() : rej();
          }));
      setToast({ show: true, message: 'Koordinat disalin', type: 'success' });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 1200);
    } catch {
      setToast({ show: true, message: 'Gagal menyalin', type: 'error' });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 1400);
    }
  };

  const openInGoogleMaps = (coordStr) => {
    const [a, b] = String(coordStr || '').split(',').map((s) => s.trim());
    const lat = Number(a),
      lng = Number(b);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert('Koordinat tidak valid. Format: "-6.2, 106.8"');
      return;
    }
    window?.open(
      `https://www.google.com/maps?q=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const isAPJPropose = useMemo(() => {
    const raw = String(surveyData?.collectionName || '').toLowerCase();
    const norm = raw.replace(/[^a-z0-9]+/g, ' ');
    return norm.includes('apj') && norm.includes('propose');
  }, [surveyData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasChanges) {
      alert('Tidak ada perubahan yang dibuat');
      return;
    }
    if (
      formData.statusIdTitik === 'Ada' &&
      !String(formData.idTitik || '').trim()
    ) {
      alert('Mohon isi ID Titik (Status: Ada).');
      return;
    }

    const payload = {
      ...formData,
      idTitik: formData.statusIdTitik === 'Ada' ? formData.idTitik : '',
      titikKordinat: liveCoord || surveyData?.titikKordinat || '',
    };

    setIsSubmitting(true);
    try {
      await onSave(currentId, payload);
      onClose();
      setHasChanges(false);
    } catch (err) {
      alert('Gagal memperbarui survey: ' + (err?.message || 'Unknown'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasChanges && !isSubmitting) {
      if (confirm('Ada perubahan yang belum disimpan. Yakin ingin menutup?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  /* ---------------- Bagian Form ---------------- */

  const APJForm = (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Informasi APJ Propose
      </h3>

      {/* Status ID Titik + ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <MiniLabel>Status ID Titik</MiniLabel>
          <Select
            name="statusIdTitik"
            value={formData.statusIdTitik}
            onChange={(e) => {
              onFieldChange(e);
              if (e.target.value === 'Tidak Ada') {
                dispatch({ type: 'SET_FIELD', name: 'idTitik', value: '' });
              }
            }}
            options={['Ada', 'Tidak Ada']}
          />
        </div>
        {formData.statusIdTitik === 'Ada' && (
          <div>
            <MiniLabel>ID Titik</MiniLabel>
            <Input
              name="idTitik"
              value={formData.idTitik}
              onChange={onFieldChange}
              placeholder="Masukkan ID Titik"
            />
          </div>
        )}
      </div>

      {/* Data Lampu (select tetap) */}
      <div className="mb-3">
        <MiniLabel>Data Lampu</MiniLabel>
        <Select
          name="dataLampu"
          value={formData.dataLampu}
          onChange={onFieldChange}
          options={['120W', '90W', '60W', '40W']}
          placeholder="Pilih daya lampu"
        />
      </div>

      {/* Data Tiang (select tetap) */}
      <div className="mb-3">
        <MiniLabel>Data Tiang</MiniLabel>
        <Select
          name="dataTiang"
          value={formData.dataTiang}
          onChange={onFieldChange}
          options={['7S', '7D', '7SG', '9S', '9D', '9SG']}
          placeholder="Pilih tipe tiang"
        />
      </div>

      {/* Data Ruas (Arteri/Kolektor + detail Kolektor) */}
      <div className="mb-4">
        <MiniLabel>Data Ruas</MiniLabel>
        <Select
          name="dataRuas"
          value={formData.dataRuas}
          onChange={(e) => {
            onFieldChange(e);
            if (e.target.value !== 'Kolektor') {
              dispatch({ type: 'SET_FIELD', name: 'dataRuasDetail', value: '' });
            }
          }}
          options={['Arteri', 'Kolektor']}
          placeholder="Pilih ruas"
        />
        {formData.dataRuas === 'Kolektor' && (
          <div className="mt-3">
            <MiniLabel>Detail Kolektor</MiniLabel>
            <Select
              name="dataRuasDetail"
              value={formData.dataRuasDetail}
              onChange={onFieldChange}
              options={['Titik Nol', 'Kolektor A', 'Kolektor B', 'Wisata']}
              placeholder="Pilih detail"
            />
          </div>
        )}
      </div>

      {/* Median + Nama Jalan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniLabel>Median</MiniLabel>
          <Select
            name="median"
            value={formData.median}
            onChange={onFieldChange}
            options={['Ada', 'Tidak Ada']}
            placeholder="Pilih median"
          />
        </div>
        <div>
          <MiniLabel>Nama Jalan</MiniLabel>
          <Input
            name="namaJalan"
            value={formData.namaJalan}
            onChange={onFieldChange}
            placeholder="Nama jalan"
          />
        </div>
      </div>

      {formData.median === 'Ada' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <MiniLabel right="(m)">Tinggi Median</MiniLabel>
            <Input
              name="tinggiMedian"
              type="number"
              value={formData.tinggiMedian}
              onChange={onFieldChange}
              placeholder="0"
            />
          </div>
          <div>
            <MiniLabel right="(m)">Lebar Median</MiniLabel>
            <Input
              name="lebarMedian"
              type="number"
              value={formData.lebarMedian}
              onChange={onFieldChange}
              placeholder="0"
            />
          </div>
        </div>
      )}

      {/* Titik koordinat read-only */}
      <div className="mb-4">
        <MiniLabel>Titik Koordinat (Petugas)</MiniLabel>
        <Input
          name="titikKordinat"
          value={liveCoord}
          onChange={() => {}}
          disabled
          placeholder="-6.200000, 106.800000"
          rightAddon={
            <>
              <button
                type="button"
                onClick={() => copyToClipboard(liveCoord)}
                className="h-10 px-3 text-xs rounded-md border border-emerald-300 text-slate-800 bg-white hover:bg-emerald-50"
              >
                Salin
              </button>
              <button
                type="button"
                onClick={() => openInGoogleMaps(liveCoord)}
                className="h-10 px-3 text-xs rounded-md border border-blue-300 text-slate-800 bg-white hover:bg-blue-50"
              >
                Maps
              </button>
            </>
          }
        />
      </div>

      {/* Ukuran jalan/tiang */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <MiniLabel right="(m)">Lebar Jalan</MiniLabel>
          <Input
            name="lebarJalan"
            type="number"
            value={formData.lebarJalan}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel right="(m)">Jarak Antar Tiang</MiniLabel>
          <Input
            name="jarakAntarTiang"
            type="number"
            value={formData.jarakAntarTiang}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel right="(m)">Lebar Bahu Bertiang</MiniLabel>
          <Input
            name="lebarBahuBertiang"
            type="number"
            value={formData.lebarBahuBertiang}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniLabel right="(m)">Lebar Trotoar Bertiang</MiniLabel>
          <Input
            name="lebarTrotoarBertiang"
            type="number"
            value={formData.lebarTrotoarBertiang}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel>Lainnya Bertiang</MiniLabel>
          <Input
            name="lainnyaBertiang"
            value={formData.lainnyaBertiang}
            onChange={onFieldChange}
            placeholder="Keterangan lainnya"
          />
        </div>
      </div>

      <div className="mb-4">
        <MiniLabel>Keterangan</MiniLabel>
        <TextArea
          name="keterangan"
          value={formData.keterangan}
          onChange={onFieldChange}
          placeholder="Catatan umum..."
        />
      </div>

      {/* Admin */}
      <div className="pt-4 mt-4 border-t border-slate-200">
        <h4 className="text-md font-semibold text-slate-900 mb-2">
          Field Baru (Admin)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <MiniLabel>Titik Koordinat Baru</MiniLabel>
            <Input
              name="titikKordinatBaru"
              value={formData.titikKordinatBaru}
              onChange={onFieldChange}
              placeholder="-6.2, 106.8"
            />
          </div>
          <div>
            <MiniLabel>Nama Jalan Baru</MiniLabel>
            <Input
              name="namaJalanBaru"
              value={formData.namaJalanBaru}
              onChange={onFieldChange}
              placeholder="Nama jalan baru"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ExistingForm = (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Informasi Existing
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniLabel>Nama Jalan</MiniLabel>
          <Input
            name="namaJalan"
            value={formData.namaJalan}
            onChange={onFieldChange}
            placeholder="Nama jalan"
          />
        </div>
        <div>
          <MiniLabel>Nama Gang</MiniLabel>
          <Input
            name="namaGang"
            value={formData.namaGang}
            onChange={onFieldChange}
            placeholder="Nama gang"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <MiniLabel right="(m)">Lebar Jalan 1</MiniLabel>
          <Input
            name="lebarJalan1"
            type="number"
            value={formData.lebarJalan1}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel right="(m)">Lebar Jalan 2</MiniLabel>
          <Input
            name="lebarJalan2"
            type="number"
            value={formData.lebarJalan2}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
      </div>

      <div className="mb-4">
        <MiniLabel>Kepemilikan Tiang</MiniLabel>
        <Select
          name="kepemilikanTiang"
          value={formData.kepemilikanTiang}
          onChange={onFieldChange}
          options={['PLN', 'Pemko', 'Swadaya']}
        />
      </div>

      <div className="mb-4">
        <MiniLabel>Jenis Tiang</MiniLabel>
        <Select
          name="jenisTiang"
          value={formData.jenisTiang}
          onChange={onFieldChange}
          options={['Beton', 'Besi', 'Kayu', 'Lainnya']}
        />
      </div>

      <div className="mb-4">
        <MiniLabel>Trafo</MiniLabel>
        <Select
          name="trafo"
          value={formData.trafo}
          onChange={(e) => {
            onFieldChange(e);
            if (e.target.value !== 'Ada') {
              dispatch({ type: 'SET_FIELD', name: 'jenisTrafo', value: '' });
              dispatch({
                type: 'SET_FIELD',
                name: 'tinggiBatasBawah',
                value: '',
              });
            }
          }}
          options={['Ada', 'Tidak Ada']}
        />
        {formData.trafo === 'Ada' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <MiniLabel>Jenis Trafo</MiniLabel>
              <Select
                name="jenisTrafo"
                value={formData.jenisTrafo}
                onChange={onFieldChange}
                options={['Single', 'Double']}
                placeholder="Pilih jenis trafo"
              />
            </div>
            <div>
              <MiniLabel right="(m)">Tinggi Batas Bawah</MiniLabel>
              <Input
                name="tinggiBatasBawah"
                type="number"
                value={formData.tinggiBatasBawah}
                onChange={onFieldChange}
                placeholder="0"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <MiniLabel>Lampu</MiniLabel>
        <Select
          name="lampu"
          value={formData.lampu}
          onChange={onFieldChange}
          options={['Ada', 'Tidak Ada']}
        />
      </div>

      <div className="mb-4">
        <MiniLabel>Titik Koordinat (Petugas)</MiniLabel>
        <Input
          name="titikKordinat"
          value={liveCoord}
          onChange={() => {}}
          placeholder="-6.2, 106.8"
          disabled
          rightAddon={
            <>
              <button
                type="button"
                onClick={() => copyToClipboard(liveCoord)}
                className="h-10 px-3 text-xs rounded-md border border-emerald-300 text-slate-800 bg-white hover:bg-emerald-50"
              >
                Salin
              </button>
              <button
                type="button"
                onClick={() => openInGoogleMaps(liveCoord)}
                className="h-10 px-3 text-xs rounded-md border border-blue-300 text-slate-800 bg-white hover:bg-blue-50"
              >
                Maps
              </button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <MiniLabel right="(m)">Lebar Bahu Bertiang</MiniLabel>
          <Input
            name="lebarBahuBertiang"
            type="number"
            value={formData.lebarBahuBertiang}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel right="(m)">Lebar Trotoar Bertiang</MiniLabel>
          <Input
            name="lebarTrotoarBertiang"
            type="number"
            value={formData.lebarTrotoarBertiang}
            onChange={onFieldChange}
            placeholder="0"
          />
        </div>
        <div>
          <MiniLabel>Lainnya Bertiang</MiniLabel>
          <Input
            name="lainnyaBertiang"
            value={formData.lainnyaBertiang}
            onChange={onFieldChange}
            placeholder="Keterangan"
          />
        </div>
      </div>

      <div className="mb-4">
        <MiniLabel>Tinggi ARM</MiniLabel>
        <Input
          name="tinggiARM"
          type="number"
          value={formData.tinggiARM}
          onChange={onFieldChange}
          placeholder="0"
        />
      </div>

      <div className="mb-4">
        <MiniLabel>Keterangan</MiniLabel>
        <TextArea
          name="keterangan"
          value={formData.keterangan}
          onChange={onFieldChange}
          placeholder="Catatan umum..."
        />
      </div>

      {/* Admin */}
      <div className="pt-4 mt-4 border-t border-slate-200">
        <h4 className="text-md font-semibold text-slate-900 mb-2">
          Field Baru (Admin)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <MiniLabel>Titik Koordinat Baru</MiniLabel>
            <Input
              name="titikKordinatBaru"
              value={formData.titikKordinatBaru}
              onChange={onFieldChange}
              placeholder="-6.2, 106.8"
            />
          </div>
          <div>
            <MiniLabel>Nama Jalan Baru</MiniLabel>
            <Input
              name="namaJalanBaru"
              value={formData.namaJalanBaru}
              onChange={onFieldChange}
              placeholder="Nama jalan baru"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const DokumentasiFoto = (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-slate-200/70 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Camera size={20} />
        Dokumentasi Foto
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Foto Titik Aktual
          </label>
          {formData.fotoTitikAktual ? (
            <a
              href={formData.fotoTitikAktual}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={formData.fotoTitikAktual}
                alt="Foto Titik Aktual"
                className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="mt-2 inline-block text-xs text-emerald-700 underline">
                Buka gambar di tab baru
              </span>
            </a>
          ) : (
            <p className="text-sm text-slate-600">Tidak ada foto.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Foto Tinggi ARM
          </label>
          {formData.fotoTinggiARM ? (
            <a
              href={formData.fotoTinggiARM}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={formData.fotoTinggiARM}
                alt="Foto Tinggi ARM"
                className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="mt-2 inline-block text-xs text-emerald-700 underline">
                Buka gambar di tab baru
              </span>
            </a>
          ) : (
            <p className="text-sm text-slate-600">Tidak ada foto.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Foto Lampu
          </label>
          {formData.fotoLampu ? (
            <a
              href={formData.fotoLampu}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={formData.fotoLampu}
                alt="Foto Lampu"
                className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="mt-2 inline-block text-xs text-emerald-700 underline">
                Buka gambar di tab baru
              </span>
            </a>
          ) : (
            <p className="text-sm text-slate-600">Tidak ada foto.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Foto Trafo
          </label>
          {formData.fotoTrafo ? (
            <a
              href={formData.fotoTrafo}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={formData.fotoTrafo}
                alt="Foto Trafo"
                className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="mt-2 inline-block text-xs text-emerald-700 underline">
                Buka gambar di tab baru
              </span>
            </a>
          ) : (
            <p className="text-sm text-slate-600">Tidak ada foto.</p>
          )}
        </div>
      </div>
    </div>
  );

  if (!isOpen || !surveyData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2001]">
          <div
            className={`px-4 py-2 rounded-xl shadow-lg text-white text-sm ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 text-white flex-shrink-0">
          <div className="relative z-10 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Edit2 size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-extrabold">Edit Survey</div>
                <div className="mt-1">
                  <span className="px-3 py-1 bg-white/25 rounded-full text-sm font-semibold border border-white/40">
                    {isAPJPropose ? 'Survey APJ Propose' : 'Survey Existing'}
                  </span>
                  {hasChanges && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/30 rounded-full text-xs font-semibold border border-yellow-300/60">
                      Ada Perubahan
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="group w-10 h-10 bg-white/15 hover:bg-white/25 rounded-xl border border-white/30"
            >
              <X size={20} className="text-white m-auto" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Status lokasi realtime */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Titik Koordinat (Realtime)
                </div>
                <div className="text-sm font-mono text-emerald-900 mt-0.5">
                  {liveCoord ||
                    (geoStatus === 'denied'
                      ? 'Izin lokasi ditolak'
                      : 'Mengambil lokasi…')}
                </div>
                <div className="text-xs text-emerald-800 mt-1">
                  {geoStatus === 'success' && 'Lokasi berhasil didapatkan'}
                  {geoStatus === 'watching' && 'Mengambil lokasi…'}
                  {geoStatus === 'denied' && 'Izin lokasi ditolak'}
                  {geoStatus === 'error' &&
                    (geoError?.message || 'Gagal mendapatkan lokasi')}
                  {coords?.accuracy
                    ? ` • Akurasi ±${Math.round(coords.accuracy)}m`
                    : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshGeo}
                  className="px-3 py-1.5 text-sm rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50"
                >
                  ↻ Refresh
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(liveCoord)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50"
                >
                  ⧉ Salin
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {isAPJPropose ? APJForm : ExistingForm}
                {DokumentasiFoto}
              </div>

              {hasChanges && (
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={20}
                      className="text-yellow-700 mt-0.5"
                    />
                    <div>
                      <h4 className="font-semibold text-yellow-800">
                        Perubahan Belum Disimpan
                      </h4>
                      <p className="text-sm text-yellow-800/90 mt-1">
                        Klik "Simpan Perubahan" untuk menyimpan atau "Batal"
                        untuk membatalkan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Database size={16} className="text-emerald-700" />
            </div>
            <div className="text-sm text-slate-700">
              <div className="font-semibold text-slate-800">
                ID: {surveyData?.id}
              </div>
              <div className="text-xs text-slate-600">
                Collection: {surveyData?.collectionName}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-slate-700 text-white px-5 py-2 rounded-xl disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasChanges}
              className="bg-emerald-600 text-white px-5 py-2 rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
