import React, { useRef, useEffect, useState } from 'react';
import MapDisplay from '../MapDisplay';
import { X, Calendar, User, MapPin, FileText, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

const TaskDetailModal = ({ isOpen, onClose, task }) => {
    // Referensi untuk container modal yang scrollable
    const modalRef = useRef(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [activeElementId, setActiveElementId] = useState(null);

    // Mencegah scrolling body saat modal terbuka
    useEffect(() => {
        if (isOpen) {
            // Simpan posisi scroll body saat ini
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';

            return () => {
                // Kembalikan scrolling body saat modal ditutup
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    // Menangani perubahan scroll pada modal
    const handleScroll = () => {
        if (modalRef.current) {
            setScrollPosition(modalRef.current.scrollTop);
        }
    };

    // Mengembalikan scroll position setelah interaksi
    useEffect(() => {
        const modalElement = modalRef.current;
        if (modalElement && scrollPosition > 0) {
            modalElement.scrollTop = scrollPosition;
        }
    }, [scrollPosition]);

    // Menangani focus pada form elements
    useEffect(() => {
        const handleFocus = (e) => {
            // Simpan ID dari elemen yang sedang fokus
            if (e.target.id) {
                setActiveElementId(e.target.id);
            }

            // Simpan posisi scroll saat ini
            if (modalRef.current) {
                setScrollPosition(modalRef.current.scrollTop);
            }
        };

            // Event listener untuk mencegah bubbling
            const preventBubbling = (e) => {
                e.stopPropagation();
            };

            // Tambahkan event listener ke semua input, select, dan textarea dalam modal
            if (modalRef.current) {
                const inputElements = modalRef.current.querySelectorAll('input, select, textarea, button');

                inputElements.forEach(element => {
                    // Pastikan setiap elemen memiliki ID
                    if (!element.id) {
                        element.id = `modal-input-${Math.random().toString(36).substr(2, 9)}`;
                    }

                    element.addEventListener('focus', handleFocus);
                    // Aktifkan event listener stopPropagation untuk mencegah event bubbling yang hilangkan fokus
                    element.addEventListener('click', preventBubbling);
                    element.addEventListener('keydown', preventBubbling);
                    element.addEventListener('input', preventBubbling);
                });

                // Tambahkan event listener untuk scroll
                modalRef.current.addEventListener('scroll', handleScroll);

                return () => {
                    // Cleanup event listeners
                    inputElements.forEach(element => {
                        element.removeEventListener('focus', handleFocus);
                        element.removeEventListener('click', preventBubbling);
                        element.removeEventListener('keydown', preventBubbling);
                        element.removeEventListener('input', preventBubbling);
                    });

                    if (modalRef.current) {
                        modalRef.current.removeEventListener('scroll', handleScroll);
                    }
                };
            }
    }, [isOpen]);

    // Kembalikan fokus ke elemen aktif setelah rendering
    useEffect(() => {
        if (activeElementId) {
            const activeElement = document.getElementById(activeElementId);
            if (activeElement) {
                setTimeout(() => {
                    activeElement.focus();

                    // Jika elemen adalah input, kembalikan juga posisi cursor
                    if (activeElement.tagName === 'INPUT' && activeElement.selectionStart !== undefined) {
                        const position = activeElement.value.length;
                        activeElement.setSelectionRange(position, position);
                    }

                    // Kembalikan scroll position
                    if (modalRef.current) {
                        modalRef.current.scrollTop = scrollPosition;
                    }
                }, 0);
            }
        }
    }, [activeElementId, scrollPosition]);
    if (!isOpen || !task) return null;

    // Flexible getter for task fields (handles variant keys)
    const getVal = (...keys) => {
        for (const k of keys) {
            const v = task?.[k];
            if (v !== undefined && v !== null && String(v).toString().trim() !== '') return v;
        }
        return '';
    };

    const isAPJPropose = (
        getVal('collectionName') === 'APJ_Propose_Tiang' ||
        String(getVal('surveyZone')).toLowerCase() === 'apj_propose_tiang' ||
        String(getVal('surveyCategory')).toLowerCase() === 'survey_apj_propose'
    );

    const getStatusIcon = (status) => {
        switch (status) {
            case 'assigned':
                return <Clock className="w-4 h-4 text-blue-500" />;
            case 'in_progress':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'assigned':
                return 'Ditugaskan';
            case 'in_progress':
                return 'Sedang Dikerjakan';
            case 'completed':
                return 'Selesai';
            case 'cancelled':
                return 'Dibatalkan';
            default:
                return 'Tidak Diketahui';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'assigned':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTaskTypeText = (taskType) => {
        return taskType === 'existing' ? 'Zona Existing' : 'Propose';
    };

    if (!isOpen || !task) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                // Tutup modal hanya jika klik pada background (bukan pada konten modal)
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            style={{ backdropFilter: 'blur(2px)' }}
        >
            <div 
                ref={modalRef} 
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content"
                onClick={(e) => e.stopPropagation()} // Mencegah event bubbling
            >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Detail Tugas</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">Status Tugas</h4>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {getStatusText(task.status)}
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Surveyor</p>
                                    <p className="text-gray-900">{task.surveyorName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Jenis Tugas</p>
                                    <p className="text-gray-900">{getTaskTypeText(task.taskType)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Tanggal Mulai</p>
                                    <p className="text-gray-900">{formatDate(task.startDate)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Dibuat</p>
                                    <p className="text-gray-900">{formatDate(task.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Deskripsi Tugas</h5>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
                        </div>
                    </div>

                    {/* Maps Link */}
                    {task.mapsLink && (
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Link My Maps</h5>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <a 
                                    href={task.mapsLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline break-all"
                                >
                                    {task.mapsLink}
                                </a>
                                <button
                                  onClick={() => {
                                    // Navigate to /task-map with kmz query param
                                    const kmz = encodeURIComponent(task.kmzFileUrl || '');
                                    const sname = encodeURIComponent(task.surveyorName || '');
                                    const tid = encodeURIComponent(task.id || task.taskId || '');
                                    window.open(`/task-map?kmz=${kmz}&surveyorName=${sname}&taskId=${tid}` , '_blank');
                                  }}
                                  className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Mulai Tugas
                                </button>
                            </div>
                        </div>
                    )}

                    {/* APJ Propose - Informasi Dasar (requested order) */}
                    {isAPJPropose && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Informasi Dasar - APJ Propose</h5>
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* LEFT: fields in order */}
                            <div className="space-y-3 text-sm">
                              {/* ID Titik */}
                              <div>
                                <p className="text-gray-700 font-medium">ID Titik</p>
                                <p className="text-gray-900 font-semibold">
                                  {(() => {
                                    const ada = String(getVal('adaIdTitik','AdaIdTitik')).toLowerCase();
                                    const id = getVal('idTitik','IdTitik','IDTitik');
                                    if (ada && ada !== 'ada') return 'Tidak Ada';
                                    return id || '';
                                  })()}
                                </p>
                              </div>
                              {/* Data Daya */}
                              <div>
                                <p className="text-gray-700 font-medium">Data Daya</p>
                                <p className="text-gray-900 font-semibold">{getVal('dataDaya','DataDaya','daya')}</p>
                              </div>
                              {/* Data Tiang */}
                              <div>
                                <p className="text-gray-700 font-medium">Data Tiang</p>
                                <p className="text-gray-900 font-semibold">{getVal('dataTiang','DataTiang','tiang')}</p>
                              </div>
                              {/* Data Ruas (+Sub) */}
                              <div>
                                <p className="text-gray-700 font-medium">Data Ruas</p>
                                <p className="text-gray-900 font-semibold">{getVal('dataRuas','DataRuas','ruas')}</p>
                                {getVal('dataRuasSub','DataRuasSub') && (
                                  <p className="text-xs text-gray-600 mt-1">Sub: {getVal('dataRuasSub','DataRuasSub')}</p>
                                )}
                              </div>
                              {/* Nama Jalan */}
                              <div>
                                <p className="text-gray-700 font-medium">Nama Jalan</p>
                                <p className="text-gray-900 font-semibold">{getVal('namaJalan','NamaJalan')}</p>
                              </div>
                              {/* Jarak Antar Tiang */}
                              <div>
                                <p className="text-gray-700 font-medium">Jarak Antar Tiang (m)</p>
                                <p className="text-gray-900 font-semibold">{getVal('jarakAntarTiang','JarakAntarTiang','jarak')}</p>
                              </div>
                              {/* Titik Koordinat */}
                              <div>
                                <p className="text-gray-700 font-medium">Titik Koordinat</p>
                                <p className="text-gray-900 font-semibold font-mono">{getVal('titikKordinat','TitikKordinat','projectLocation','ProjectLocation')}</p>
                              </div>
                              {/* Lebar Jalan (gabungan) */}
                              <div>
                                <p className="text-gray-700 font-medium">Lebar Jalan</p>
                                <p className="text-gray-900 font-semibold">
                                  {(() => {
                                    const l1 = getVal('lebarJalan1','LebarJalan1');
                                    const l2 = getVal('lebarJalan2','LebarJalan2');
                                    if (l1 && l2) return `Jalan 1 ${l1} • Jalan 2 ${l2}`;
                                    if (l1) return `Jalan 1 ${l1}`;
                                    if (l2) return `Jalan 2 ${l2}`;
                                    return '';
                                  })()}
                                </p>
                              </div>
                              {/* Lebar Bahu Bertiang */}
                              <div>
                                <p className="text-gray-700 font-medium">Lebar Bahu Bertiang</p>
                                <p className="text-gray-900 font-semibold">{getVal('lebarBahuBertiang','LebarBahuBertiang')}</p>
                              </div>
                              {/* Lebar Trotoar */}
                              <div>
                                <p className="text-gray-700 font-medium">Lebar Trotoar</p>
                                <p className="text-gray-900 font-semibold">{getVal('lebarTrotoarBertiang','LebarTrotoarBertiang')}</p>
                              </div>
                              {/* Lainnya Bertiang */}
                              <div>
                                <p className="text-gray-700 font-medium">Lainnya Bertiang</p>
                                <p className="text-gray-900 font-semibold">{getVal('lainnyaBertiang','LainnyaBertiang')}</p>
                              </div>
                              {/* Keterangan */}
                              <div>
                                <p className="text-gray-700 font-medium">Keterangan</p>
                                <p className="text-gray-900 font-semibold">{getVal('keterangan','Keterangan')}</p>
                              </div>
                            </div>

                            {/* RIGHT: photos */}
                            <div className="space-y-4">
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Foto Titik Aktual</p>
                                {getVal('fotoTitikAktual') ? (
                                  <img src={getVal('fotoTitikAktual')} alt="Foto Titik Aktual" className="w-full h-56 object-cover rounded-lg border" />
                                ) : (
                                  <div className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">Tidak ada foto</div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Foto Kemerataan</p>
                                {getVal('fotoKemerataan') ? (
                                  <img src={getVal('fotoKemerataan')} alt="Foto Kemerataan" className="w-full h-56 object-cover rounded-lg border" />
                                ) : (
                                  <div className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">Tidak ada foto</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Propose Data */}
                    {task.taskType === 'propose' && task.proposeData && task.proposeData.length > 0 && (
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Data Propose</h5>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <ul className="space-y-1">
                                    {task.proposeData.map((item, index) => (
                                        <li key={index} className="text-gray-900 flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* KMZ Map Preview */}
                    {task.taskType === 'tugas-propose' && task.kmzFileUrl && (
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Peta KMZ</h5>
                        <div className="h-64 border border-gray-300 rounded-lg overflow-hidden">
                          <MapDisplay kmzUrl={task.kmzFileUrl} />
                        </div>
                      </div>
                    )}

                    {/* Admin Info */}
                    <div className="border-t border-gray-200 pt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Informasi Admin</h5>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-900">
                                <span className="font-medium">Dibuat oleh:</span> {task.createdByName}
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                                {formatDate(task.createdAt)}
                            </p>
                            {task.updatedAt !== task.createdAt && (
                                <p className="text-gray-600 text-sm">
                                    <span className="font-medium">Terakhir diupdate:</span> {formatDate(task.updatedAt)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {task.notes && (
                        <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Catatan</h5>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-gray-900 whitespace-pre-wrap">{task.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );

    // Gunakan createPortal untuk render modal di luar hirarki React normal
    // Ini membantu mencegah masalah event bubbling
    return typeof document !== 'undefined' 
        ? createPortal(modalContent, document.body)
        : null;
};

export default TaskDetailModal;
