"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, MapPin, User, Calendar, CheckCircle, Camera, FileText, Clock, Zap, Lightbulb, Settings, Info, ExternalLink, Edit } from 'lucide-react';

const ValidSurveyDetailModal = ({ isOpen, onClose, surveyData, onEdit, currentUser }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const modalRef = useRef(null);

    // Auto-focus modal when it opens
    useEffect(() => {
        if (isOpen && modalRef.current) {
            // Small delay to ensure modal is rendered
            const timer = setTimeout(() => {
                modalRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Tutup lightbox dengan ESC dan modal dengan ESC
    useEffect(() => {
        if (!isOpen) return;
        
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (selectedImage) {
                    setSelectedImage(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, selectedImage, onClose]);

    // Helpers to match unvalidated detail modal behavior
    const handleViewMap = (coordinates) => {
        if (coordinates) {
            const parts = String(coordinates).split(',').map(s => s.trim());
            if (parts.length === 2) {
                const [lat, lng] = parts;
                const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
                window.open(url, '_blank');
            }
        }
    };

    const isNonEmpty = (v) => v !== undefined && v !== null && String(v).toString().trim() !== '';
    const isAPJPropose = (
        String(surveyData?.collectionName || '').toLowerCase() === 'apj_propose_tiang' ||
        String(surveyData?.collectionName || '').toLowerCase() === 'tiang_apj_propose_report' ||
        String(surveyData?.surveyCategory || surveyData?.category || '').toLowerCase() === 'survey_apj_propose'
    );

    // Build normalized key maps for flexible lookup (case/format agnostic)
    const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const directMap = useMemo(() => {
        const m = new Map();
        if (surveyData && typeof surveyData === 'object') {
            Object.entries(surveyData).forEach(([k, v]) => m.set(normalizeKey(k), v));
        }
        return m;
    }, [surveyData]);
    const nestedMap = useMemo(() => {
        const m = new Map();
        const d = surveyData?.data;
        if (d && typeof d === 'object') {
            Object.entries(d).forEach(([k, v]) => m.set(normalizeKey(k), v));
        }
        return m;
    }, [surveyData]);

    // Helper to fetch value from multiple keys (case-insensitive, camel/snake tolerant, checks both direct and nested)
    const getVal = (...keys) => {
        for (const rawKey of keys) {
            const key = normalizeKey(rawKey);
            if (directMap.has(key)) {
                const v = directMap.get(key);
                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
            if (nestedMap.has(key)) {
                const v = nestedMap.get(key);
                if (v !== undefined && v !== null && String(v).trim() !== '') return v;
            }
        }
        return '';
    };

    // Derived values similar to unvalidated modal (with broader fallbacks)
    const vNamaJalan = getVal('NamaJalan','namaJalan');
    const vNamaGang = getVal('NamaGang','namaGang');
    const vKepemilikan = getVal('KepemilikanTiang','kepemilikanTiang','Kepemilikan','kepemilikan','kepemilikan_tiang');
    const vJenisTiangPLN = getVal('JenisTiangPLN','jenisTiangPLN','jenis_tiang_pln');
    const vJenisTiang = getVal('JenisTiang','jenisTiang','jenis_tiang');
    const vTrafo = getVal('Trafo','trafo');
    const vLampu = getVal('Lampu','lampu');
    const vJumlahLampu = getVal('JumlahLampu','jumlahLampu','jumlah_lampu');
    const vJenisLampu = getVal('JenisLampu','jenisLampu','jenis_lampu');
    const vLebar1 = getVal('LebarJalan1','lebarJalan1','lebar_jalan1','lebar_jalan_1');
    const vLebar2 = getVal('LebarJalan2','lebarJalan2','lebar_jalan2','lebar_jalan_2');
    const vBahu = getVal('LebarBahuBertiang','lebarBahuBertiang','lebar_bahu_bertiang');
    const vTrotoar = getVal('LebarTrotoarBertiang','lebarTrotoarBertiang','lebar_trotoar_bertiang');
    let vCoord = getVal(
        'ProjectLocation','projectLocation','project_location',
        'TitikKordinat','titikKordinat','titikKoordinat','titik_koordinat','koordinat','coordinate','coordinates'
    );
    if (!isNonEmpty(vCoord)) {
        const lat = getVal('latitude','lat');
        const lng = getVal('longitude','lng','lon');
        if (isNonEmpty(lat) && isNonEmpty(lng)) {
            vCoord = `${lat}, ${lng}`;
        }
    }

    const dispKepemilikan = (() => {
        if (String(vKepemilikan || '').trim().toUpperCase() === 'PLN' && isNonEmpty(vJenisTiangPLN)) {
            return `PLN - ${vJenisTiangPLN}`;
        }
        return vKepemilikan;
    })();

    const dispLampu = (() => {
        if (String(vLampu || '').trim().toLowerCase() === 'ada') {
            const parts = ['Ada'];
            if (isNonEmpty(vJumlahLampu)) parts.push(String(vJumlahLampu));
            if (isNonEmpty(vJenisLampu)) parts.push(String(vJenisLampu));
            return parts.join(' - ');
        }
        return vLampu;
    })();

    // Debug current payload shape and derived values when opened
    useEffect(() => {
        if (!isOpen || !surveyData) return;
        try {
            // Enhanced debug log untuk foto dan data
            console.debug('[ValidSurveyDetailModal] Survey Data Debug:', {
                isAPJPropose,
                surveyCategory: surveyData.surveyCategory,
                category: surveyData.category,
                collectionName: surveyData.collectionName,
                allKeys: Object.keys(surveyData || {}),
                nestedKeys: Object.keys(surveyData?.data || {}),
                gridDataKeys: surveyData.gridData ? Object.keys(surveyData.gridData) : [],
                documentationPhotos: surveyData.documentationPhotos ? surveyData.documentationPhotos.length : 0,
                photoKeys: Object.keys(surveyData || {}).filter(k => k.toLowerCase().includes('photo') || k.toLowerCase().includes('foto')),
                photoValues: Object.keys(surveyData || {})
                    .filter(k => k.toLowerCase().includes('photo') || k.toLowerCase().includes('foto'))
                    .reduce((acc, key) => {
                        acc[key] = surveyData[key];
                        return acc;
                    }, {}),
                koordinatFields: {
                    titikKordinatBaru: surveyData.titikKordinatBaru,
                    titikKoordinatBaru: surveyData.titikKoordinatBaru,
                    koordinatBaru: surveyData.koordinatBaru,
                    newCoordinate: surveyData.newCoordinate
                },
                namaJalanFields: {
                    namaJalanBaru: surveyData.namaJalanBaru,
                    nama_jalan_baru: surveyData.nama_jalan_baru,
                    newStreetName: surveyData.newStreetName
                }
            });
        } catch (e) {
            console.error('Debug error:', e);
        }
    }, [isOpen, surveyData, isAPJPropose]);

    if (!isOpen || !surveyData) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'Tidak diketahui';
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSurveyTypeLabel = (category) => {
        switch(category) {
            case 'survey_existing': return 'Survey Existing';
            case 'survey_apj_propose': return 'Survey Tiang APJ Propose';
            default: return 'Survey';
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'validated': { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Tervalidasi' },
            'pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Menunggu Validasi' },
            'rejected': { color: 'bg-red-100 text-red-800', icon: X, text: 'Ditolak' }
        };
        
        const config = statusConfig[status] || statusConfig['validated'];
        const IconComponent = config.icon;
        
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <IconComponent size={12} className="mr-1" />
                {config.text}
            </span>
        );
    };

    const renderDataField = (label, value, icon = null) => {
        if (!value) return null;
        
        return (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
                <div className="flex items-center">
                    {icon && (
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            {icon}
                        </div>
                    )}
                    <span className="text-gray-900 font-medium">{value}</span>
                </div>
            </div>
        );
    };

    const renderImageField = (label, imageData, description = null) => {
        // Enhanced photo data validation and processing
        let processedImageData = null;
        let debugInfo = '';

        if (imageData) {
            const imageStr = String(imageData).trim();
            debugInfo = `Raw: ${imageStr.substring(0, 50)}...`;
            
            // Check if it's a valid URL (http/https/data:)
            if (imageStr.startsWith('http') || imageStr.startsWith('data:')) {
                processedImageData = imageStr;
            }
            // Check if it's a Firebase Storage URL pattern
            else if (imageStr.includes('firebasestorage.googleapis.com') || imageStr.includes('storage.googleapis.com')) {
                processedImageData = imageStr.startsWith('//') ? `https:${imageStr}` : imageStr;
            }
            // Check if it's a relative path that needs to be converted to full URL
            else if (imageStr.startsWith('/') || imageStr.includes('storage/')) {
                // This might be a relative path, try to construct full URL
                processedImageData = imageStr.startsWith('http') ? imageStr : `https://firebasestorage.googleapis.com${imageStr}`;
            }
            // Handle boolean values like "Ada" or "Tidak Ada"
            else if (imageStr.toLowerCase() === 'ada' || imageStr.toLowerCase() === 'tidak ada') {
                processedImageData = null;
                debugInfo = `Boolean value: ${imageStr}`;
            }
        }

        // Debug log untuk setiap foto
        console.debug(`[ValidSurveyDetailModal] Rendering image field: ${label}`, {
            hasImageData: !!imageData,
            imageDataType: typeof imageData,
            rawImageData: imageData,
            processedImageData,
            debugInfo,
            isValidUrl: !!processedImageData
        });

        return (
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Camera size={16} className="text-blue-600" />
                    <h5 className="text-sm font-medium text-gray-700">{label}</h5>
                </div>
                {processedImageData ? (
                    <div className="relative group">
                        <button
                            type="button"
                            onClick={() => setSelectedImage({ src: processedImageData, alt: label })}
                            className="block w-full text-left focus:outline-none"
                            title="Klik untuk memperbesar"
                        >
                            <img 
                                src={processedImageData} 
                                alt={label}
                                className="w-full h-48 object-cover rounded-xl border border-gray-200 cursor-zoom-in hover:opacity-90 transition-all duration-200 shadow-sm hover:shadow-md"
                                onError={(e) => {
                                    console.error(`[ValidSurveyDetailModal] Image load error for ${label}:`, processedImageData);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                                onLoad={() => {
                                    console.debug(`[ValidSurveyDetailModal] Image loaded successfully for ${label}`);
                                }}
                            />
                            <div className="hidden w-full h-48 bg-red-50 rounded-xl border-2 border-dashed border-red-300 flex items-center justify-center">
                                <div className="text-center">
                                    <Camera size={32} className="mx-auto text-red-400 mb-2" />
                                    <p className="text-sm text-red-500">Gagal memuat foto</p>
                                    <p className="text-xs text-red-400 mt-1 break-all">URL: {processedImageData?.substring(0, 80)}...</p>
                                </div>
                            </div>
                        </button>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200 flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-800 text-sm px-3 py-1 rounded-lg font-medium transition-opacity duration-200">
                                Klik untuk memperbesar
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <div className="text-center">
                            <Camera size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Tidak ada foto</p>
                            {imageData && (
                                <p className="text-xs text-gray-400 mt-1 break-all">Debug: {debugInfo}</p>
                            )}
                            {description && (
                                <p className="text-xs text-gray-400 mt-1">{description}</p>
                            )}
                        </div>
                    </div>
                )}
                {description && processedImageData && (
                    <p className="text-xs text-gray-500 italic">{description}</p>
                )}
            </div>
        );
    };

    const renderGridPhotos = () => {
        if (!surveyData.gridData) return null;

        const photos = [];
        Object.keys(surveyData.gridData).forEach(key => {
            if (key.startsWith('photo') && surveyData.gridData[key]) {
                const photoNumber = key.replace('photo', '');
                photos.push({
                    key,
                    label: `Foto Grid ${photoNumber}`,
                    src: surveyData.gridData[key]
                });
            }
        });

        if (photos.length === 0) return null;

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Camera size={18} className="text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Foto Grid Survey</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {photos.map((photo) => (
                        <div key={photo.key}>
                            {renderImageField(photo.label, photo.src)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDocumentationPhotos = () => {
        // Normalisasi: dukung array atau object map
        let docs = surveyData.documentationPhotos;
        let normalized = [];

        if (Array.isArray(docs)) {
            normalized = docs
                .map((p) => (typeof p === 'object' ? (p.url || p.src || null) : p))
                .filter(Boolean);
        } else if (docs && typeof docs === 'object') {
            normalized = Object.values(docs)
                .map((p) => (typeof p === 'object' ? (p.url || p.src || null) : p))
                .filter(Boolean);
        }

        if (!normalized || normalized.length === 0) return null;

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Camera size={18} className="text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Foto Dokumentasi</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {normalized.map((src, index) => (
                        <div key={index}>
                            {renderImageField(`Dokumentasi ${index + 1}`, src)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderARMPhotos = () => {
        // Always render for Survey Existing to show debug info and placeholder if needed
        if (surveyData.surveyCategory !== 'survey_existing' && surveyData.category !== 'survey_existing') return null;
        
        console.debug('[ValidSurveyDetailModal] renderARMPhotos called for Survey Existing');

        // Helper ambil sumber foto dari berbagai variasi key dengan enhanced validation
        const pickPhoto = (...keys) => {
            const v = getVal(...keys);
            if (!v) return '';
            
            const vStr = String(v).trim();
            
            // Skip boolean-like values
            if (vStr.toLowerCase() === 'ada' || vStr.toLowerCase() === 'tidak ada' || 
                vStr.toLowerCase() === 'true' || vStr.toLowerCase() === 'false') {
                return '';
            }
            
            // Only return if it looks like a URL or valid image data
            if (vStr.startsWith('http') || vStr.startsWith('data:') || 
                vStr.includes('firebasestorage.googleapis.com') || 
                vStr.includes('storage.googleapis.com') ||
                vStr.startsWith('/foto-survey/') ||
                (vStr.startsWith('/') && (vStr.includes('.jpg') || vStr.includes('.jpeg') || vStr.includes('.png') || vStr.includes('.webp')))) {
                return vStr;
            }
            
            // Handle object with url/src properties
            if (typeof v === 'object' && v !== null) {
                const objUrl = v.url || v.src || '';
                if (objUrl && typeof objUrl === 'string') {
                    return objUrl.trim();
                }
            }
            
            return '';
        };

        // Ambil foto utama dari berbagai kemungkinan field (legacy/baru) - Enhanced
        let fotoArm = pickPhoto(
            'fotoTinggiARM','FotoTinggiARM','foto_tinggi_arm','photoTinggiARM','photo_tinggi_arm',
            'FotoTinggiArm','fotoTinggiArm','tinggiARM','TinggiARM','tinggi_arm'
        );
        let fotoAktual = pickPhoto(
            'fotoTitikAktual','FotoTitikAktual','foto_titik_aktual','photoTitikAktual','photo_titik_aktual',
            'FotoTitikAktual','fotoTitikAktual','titikAktual','TitikAktual','titik_aktual'
        );
        let fotoLampu = pickPhoto(
            'fotoLampu','FotoLampu','foto_lampu','photoLampu','photo_lampu',
            'lampu','Lampu','lampuPhoto','LampuPhoto'
        );
        let fotoTrafo = pickPhoto(
            'fotoTrafo','FotoTrafo','foto_trafo','photoTrafo','photo_trafo',
            'trafo','Trafo','trafoPhoto','TrafoPhoto'
        );

        // Fallback: ambil dari documentationPhotos jika field spesifik tidak ada
        const rawDocs = surveyData.documentationPhotos;
        const docs = Array.isArray(rawDocs)
            ? rawDocs.map((p) => (typeof p === 'object' ? (p.url || p.src || null) : p)).filter(Boolean)
            : (rawDocs && typeof rawDocs === 'object'
                ? Object.values(rawDocs).map((p) => (typeof p === 'object' ? (p.url || p.src || null) : p)).filter(Boolean)
                : []);

        // Enhanced fallback logic
        if (!fotoArm && docs.length > 0) {
            fotoArm = docs.find((d) => String(d).toLowerCase().includes('arm') || String(d).toLowerCase().includes('tinggi')) || docs[0] || '';
        }
        if (!fotoAktual && docs.length > 1) {
            fotoAktual = docs.find((d) => String(d).toLowerCase().includes('titik') || String(d).toLowerCase().includes('lokasi') || String(d).toLowerCase().includes('aktual')) || docs[1] || '';
        }
        if (!fotoLampu && docs.length > 2) {
            fotoLampu = docs.find((d) => String(d).toLowerCase().includes('lampu')) || docs[2] || '';
        }
        if (!fotoTrafo && docs.length > 3) {
            fotoTrafo = docs.find((d) => String(d).toLowerCase().includes('trafo')) || docs[3] || '';
        }

        // Cek semua field foto yang mungkin ada di surveyData langsung
        const allPhotoFields = [];
        if (surveyData && typeof surveyData === 'object') {
            Object.keys(surveyData).forEach(key => {
                if ((key.toLowerCase().includes('foto') || key.toLowerCase().includes('photo')) && 
                    surveyData[key] && 
                    typeof surveyData[key] === 'string' && 
                    (surveyData[key].startsWith('http') || 
                     surveyData[key].startsWith('data:') || 
                     surveyData[key].startsWith('/foto-survey/'))) {
                    allPhotoFields.push({
                        key,
                        url: surveyData[key],
                        label: key.replace(/foto|photo/gi, '').replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Survey'
                    });
                }
            });
        }

        // Kumpulkan semua foto yang tersedia
        const availablePhotos = [];
        if (fotoArm) availablePhotos.push({ label: 'Foto Tinggi ARM', src: fotoArm, type: 'arm' });
        if (fotoAktual) availablePhotos.push({ label: 'Foto Titik Aktual', src: fotoAktual, type: 'aktual' });
        if (fotoLampu) availablePhotos.push({ label: 'Foto Lampu', src: fotoLampu, type: 'lampu' });
        if (fotoTrafo) availablePhotos.push({ label: 'Foto Trafo', src: fotoTrafo, type: 'trafo' });

        // Tambahkan foto lain yang ditemukan
        allPhotoFields.forEach(photo => {
            const exists = availablePhotos.some(p => p.src === photo.url);
            if (!exists) {
                availablePhotos.push({
                    label: `Foto ${photo.label}`,
                    src: photo.url,
                    type: 'other'
                });
            }
        });

        // Jika tidak ada foto sama sekali, tampilkan placeholder
        const hasPhotos = availablePhotos.length > 0;

        // Values edited by admin (new coordinate and new street name)
        const vKoordinatBaru = getVal(
            'titikKordinatBaruDariAdmin','titikKordinatBaru','titikKoordinatBaru','titik_kordinat_baru','titik_koordinat_baru',
            'koordinatBaru','koordinat_baru','newCoordinate','updatedCoordinate'
        );
        const vNamaJalanBaru = getVal('namaJalanBaru','nama_jalan_baru','newStreetName','updatedStreetName');

        return (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Camera size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-gray-900">Foto Survey Existing</h4>
                        <p className="text-sm text-gray-600">Dokumentasi visual survey existing</p>
                    </div>
                </div>
                
                {/* Grid foto - tampilkan jika ada foto */}
                {hasPhotos && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {availablePhotos.map((photo, index) => (
                            <div key={index}>
                                {renderImageField(photo.label, photo.src)}
                            </div>
                        ))}
                    </div>
                )}

                {/* Jika tidak ada foto, tampilkan pesan */}
                {!hasPhotos && (
                    <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="text-center">
                            <Camera size={32} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600 font-medium">Belum ada foto untuk survey ini</p>
                            <p className="text-xs text-gray-500 mt-1">Foto akan muncul jika tersedia di data survey</p>
                        </div>
                    </div>
                )}

                {/* Informasi Koordinat dan Nama Jalan Baru - SELALU DITAMPILKAN */}
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Info size={14} className="text-blue-600" />
                        </div>
                        <h5 className="text-md font-semibold text-gray-900">Informasi Tambahan</h5>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Titik Koordinat Baru */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                            <label className="block text-sm font-medium text-blue-800 mb-2">Titik Koordinat Baru</label>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-6 h-6 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                                        <MapPin size={14} className="text-blue-700" />
                                    </div>
                                    <span className="text-blue-900 font-medium font-mono">
                                        {isNonEmpty(vKoordinatBaru) ? vKoordinatBaru : 'Belum ada koordinat baru'}
                                    </span>
                                </div>
                                {isNonEmpty(vKoordinatBaru) && (
                                    <button 
                                        onClick={() => handleViewMap(vKoordinatBaru)} 
                                        className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200" 
                                        title="Lihat di Google Maps"
                                    >
                                        <ExternalLink size={14} className="text-white" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Nama Jalan Baru */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-100">
                            <label className="block text-sm font-medium text-green-800 mb-2">Nama Jalan Baru</label>
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center mr-3">
                                    <FileText size={14} className="text-green-700" />
                                </div>
                                <span className="text-green-900 font-medium">
                                    {isNonEmpty(vNamaJalanBaru) ? vNamaJalanBaru : 'Belum ada nama jalan baru'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Render foto khusus untuk Survey Tiang APJ Propose
    const renderAPJProposePhotos = () => {
        if (!isAPJPropose) return null;

        // Ambil foto-foto yang mungkin ada untuk APJ Propose dengan lebih banyak variasi
        const fotoTiang = getVal('fotoTiang', 'foto_tiang', 'photoTiang', 'FotoTiang', 'Foto_Tiang');
        const fotoLokasi = getVal('fotoLokasi', 'foto_lokasi', 'photoLokasi', 'photoLocation', 'FotoLokasi', 'Foto_Lokasi');
        const fotoSurvey = getVal('fotoSurvey', 'foto_survey', 'photoSurvey', 'FotoSurvey', 'Foto_Survey');
        const fotoUtama = getVal('fotoUtama', 'foto_utama', 'mainPhoto', 'primaryPhoto', 'FotoUtama', 'Foto_Utama');
        const fotoTambahan = getVal('fotoTambahan', 'foto_tambahan', 'additionalPhoto', 'secondaryPhoto', 'FotoTambahan', 'Foto_Tambahan');
        const fotoKondisi = getVal('fotoKondisi', 'foto_kondisi', 'conditionPhoto', 'FotoKondisi', 'Foto_Kondisi');
        const fotoLingkungan = getVal('fotoLingkungan', 'foto_lingkungan', 'environmentPhoto', 'FotoLingkungan', 'Foto_Lingkungan');
        
        // Tambahan foto yang mungkin ada di APJ Propose
        const fotoPropose = getVal('fotoPropose', 'foto_propose', 'photoPropose', 'FotoPropose', 'Foto_Propose');
        const fotoAPJ = getVal('fotoAPJ', 'foto_apj', 'photoAPJ', 'FotoAPJ', 'Foto_APJ');
        const fotoDokumentasi = getVal('fotoDokumentasi', 'foto_dokumentasi', 'photoDokumentasi', 'FotoDokumentasi', 'Foto_Dokumentasi');

        // Cek foto dari berbagai sumber data
        const gridPhotos = [];
        
        // Dari gridData
        if (surveyData.gridData && typeof surveyData.gridData === 'object') {
            Object.keys(surveyData.gridData).forEach(key => {
                if (key.toLowerCase().includes('photo') || key.toLowerCase().includes('foto')) {
                    const photoData = surveyData.gridData[key];
                    if (photoData) {
                        gridPhotos.push({
                            key,
                            label: `Foto ${key.replace(/photo|foto/gi, '').replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Survey'}`,
                            src: photoData
                        });
                    }
                }
            });
        }

        // Dari documentationPhotos
        if (surveyData.documentationPhotos && Array.isArray(surveyData.documentationPhotos)) {
            surveyData.documentationPhotos.forEach((photo, index) => {
                const photoSrc = photo.url || photo;
                if (photoSrc) {
                    gridPhotos.push({
                        key: `doc_${index}`,
                        label: `Foto Dokumentasi ${index + 1}`,
                        src: photoSrc
                    });
                }
            });
        }

        // Dari data langsung (cek semua key yang mengandung foto/photo)
        if (surveyData && typeof surveyData === 'object') {
            Object.keys(surveyData).forEach(key => {
                if ((key.toLowerCase().includes('photo') || key.toLowerCase().includes('foto')) && 
                    surveyData[key] && 
                    typeof surveyData[key] === 'string' && 
                    surveyData[key].startsWith('http')) {
                    
                    // Hindari duplikasi
                    const exists = gridPhotos.some(p => p.src === surveyData[key]);
                    if (!exists) {
                        gridPhotos.push({
                            key,
                            label: `Foto ${key.replace(/photo|foto/gi, '').replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Survey'}`,
                            src: surveyData[key]
                        });
                    }
                }
            });
        }

        // Dari nested data
        if (surveyData.data && typeof surveyData.data === 'object') {
            Object.keys(surveyData.data).forEach(key => {
                if ((key.toLowerCase().includes('photo') || key.toLowerCase().includes('foto')) && 
                    surveyData.data[key] && 
                    typeof surveyData.data[key] === 'string' && 
                    surveyData.data[key].startsWith('http')) {
                    
                    // Hindari duplikasi
                    const exists = gridPhotos.some(p => p.src === surveyData.data[key]);
                    if (!exists) {
                        gridPhotos.push({
                            key: `data_${key}`,
                            label: `Foto ${key.replace(/photo|foto/gi, '').replace(/[^a-zA-Z0-9]/g, ' ').trim() || 'Survey'}`,
                            src: surveyData.data[key]
                        });
                    }
                }
            });
        }

        // Kumpulkan semua foto yang tersedia
        const availablePhotos = [];
        
        if (fotoTiang) availablePhotos.push({ label: 'Foto Tiang', src: fotoTiang });
        if (fotoLokasi) availablePhotos.push({ label: 'Foto Lokasi', src: fotoLokasi });
        if (fotoSurvey) availablePhotos.push({ label: 'Foto Survey', src: fotoSurvey });
        if (fotoUtama) availablePhotos.push({ label: 'Foto Utama', src: fotoUtama });
        if (fotoTambahan) availablePhotos.push({ label: 'Foto Tambahan', src: fotoTambahan });
        if (fotoKondisi) availablePhotos.push({ label: 'Foto Kondisi', src: fotoKondisi });
        if (fotoLingkungan) availablePhotos.push({ label: 'Foto Lingkungan', src: fotoLingkungan });
        if (fotoPropose) availablePhotos.push({ label: 'Foto Propose', src: fotoPropose });
        if (fotoAPJ) availablePhotos.push({ label: 'Foto APJ', src: fotoAPJ });
        if (fotoDokumentasi) availablePhotos.push({ label: 'Foto Dokumentasi', src: fotoDokumentasi });
        
        // Tambahkan foto dari grid
        availablePhotos.push(...gridPhotos);

        // Values untuk koordinat dan nama jalan baru dengan lebih banyak variasi
        const vKoordinatBaru = getVal(
            'titikKordinatBaru', 'titikKoordinatBaru', 'titik_kordinat_baru', 'titik_koordinat_baru',
            'koordinatBaru', 'koordinat_baru', 'newCoordinate', 'updatedCoordinate',
            'TitikKordinatBaru', 'TitikKoordinatBaru', 'Titik_Kordinat_Baru', 'Titik_Koordinat_Baru',
            'KoordinatBaru', 'Koordinat_Baru', 'NewCoordinate', 'UpdatedCoordinate'
        );
        const vNamaJalanBaru = getVal(
            'namaJalanBaru', 'nama_jalan_baru', 'newStreetName', 'updatedStreetName',
            'NamaJalanBaru', 'Nama_Jalan_Baru', 'NewStreetName', 'UpdatedStreetName',
            'jalanBaru', 'jalan_baru', 'JalanBaru', 'Jalan_Baru'
        );

        return (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Camera size={20} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-gray-900">Foto Survey Tiang APJ Propose</h4>
                        <p className="text-sm text-gray-600">Dokumentasi visual survey APJ Propose</p>
                    </div>
                </div>
                
                {/* Grid foto - tampilkan jika ada foto */}
                {availablePhotos.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {availablePhotos.map((photo, index) => (
                            <div key={index}>
                                {renderImageField(photo.label, photo.src)}
                            </div>
                        ))}
                    </div>
                )}

                {/* Jika tidak ada foto, tampilkan pesan */}
                {availablePhotos.length === 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-center">
                            <Camera size={32} className="mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Belum ada foto untuk survey ini</p>
                        </div>
                    </div>
                )}

                {/* Informasi Koordinat dan Nama Jalan Baru - SELALU DITAMPILKAN */}
                <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Info size={14} className="text-blue-600" />
                        </div>
                        <h5 className="text-md font-semibold text-gray-900">Informasi Tambahan</h5>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Titik Koordinat Baru */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                            <label className="block text-sm font-medium text-blue-800 mb-2">Titik Koordinat Baru</label>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-6 h-6 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                                        <MapPin size={14} className="text-blue-700" />
                                    </div>
                                    <span className="text-blue-900 font-medium font-mono">
                                        {isNonEmpty(vKoordinatBaru) ? vKoordinatBaru : 'Belum ada koordinat baru'}
                                    </span>
                                </div>
                                {isNonEmpty(vKoordinatBaru) && (
                                    <button 
                                        onClick={() => handleViewMap(vKoordinatBaru)} 
                                        className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200" 
                                        title="Lihat di Google Maps"
                                    >
                                        <ExternalLink size={14} className="text-white" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Nama Jalan Baru */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-100">
                            <label className="block text-sm font-medium text-green-800 mb-2">Nama Jalan Baru</label>
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-green-200 rounded-lg flex items-center justify-center mr-3">
                                    <FileText size={14} className="text-green-700" />
                                </div>
                                <span className="text-green-900 font-medium">
                                    {isNonEmpty(vNamaJalanBaru) ? vNamaJalanBaru : 'Belum ada nama jalan baru'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderLebarJalan = () => {
        if (!surveyData.lebarJalan) return null;

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText size={18} className="text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Lebar Jalan</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {surveyData.lebarJalan.map((lebar, index) => (
                        <div key={index}>
                            {renderDataField(`Lebar Jalan ${index + 1}`, lebar)}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div 
                    ref={modalRef}
                    tabIndex={-1}
                    className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden transform transition-all duration-300 ease-out scale-100 border border-gray-100 flex flex-col focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Modern Header */}
                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-teal-600/20"></div>
                        <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
                        <div className="relative z-10 p-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6">
                                    <div className="relative">
                                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <CheckCircle size={28} className="text-white" />
                                        </div>
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold text-white">✓</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 id="modal-title" className="text-3xl font-bold text-white mb-2">Detail Survey Tervalidasi</h3>
                                        <div className="flex items-center space-x-3">
                                            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30">
                                                {getSurveyTypeLabel(surveyData.surveyCategory || surveyData.category)}
                                            </span>
                                            <span className="px-4 py-1.5 bg-green-500/30 backdrop-blur-sm rounded-full text-sm font-medium border border-green-400/50">
                                                Status: Tervalidasi
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="group w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 hover:border-white/40"
                                >
                                    <X size={24} className="text-white group-hover:scale-110 transition-transform duration-200" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 pb-12 bg-gradient-to-br from-gray-50/50 to-white">
                            <div className="space-y-8">
                            {/* Status dan Info Dasar */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <FileText size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">Informasi Dasar</h4>
                                        <p className="text-sm text-gray-600">Data utama survey yang telah tervalidasi</p>
                                    </div>
                                </div>

                                {/* Mirror unvalidated detail modal structure */}
                                {isAPJPropose ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">ID Titik</span>
                                            <span className="text-sm text-gray-900 font-medium">
                                                {(() => {
                                                    const ada = String(surveyData?.adaIdTitik || surveyData?.AdaIdTitik || '').toLowerCase();
                                                    const id = surveyData?.idTitik || surveyData?.IdTitik || surveyData?.IDTitik;
                                                    if (ada && ada !== 'ada') return 'Tidak Ada';
                                                    return id || 'Tidak diisi';
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Data Daya</span>
                                            <span className="text-sm text-gray-900 font-medium">{surveyData?.dataDaya || surveyData?.DataDaya || surveyData?.daya || 'Tidak diisi'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Data Tiang</span>
                                            <span className="text-sm text-gray-900 font-medium">{surveyData?.dataTiang || surveyData?.DataTiang || surveyData?.tiang || 'Tidak diisi'}</span>
                                        </div>
                                        <div className="py-3 border-b border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-800">Data Ruas</span>
                                                <span className="text-sm text-gray-900 font-medium">{surveyData?.dataRuas || surveyData?.DataRuas || surveyData?.ruas || 'Tidak diisi'}</span>
                                            </div>
                                            {(surveyData?.dataRuasSub || surveyData?.DataRuasSub) && (
                                                <div className="text-xs text-gray-600 mt-1">Sub: {surveyData?.dataRuasSub || surveyData?.DataRuasSub}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Nama Jalan</span>
                                            <span className="text-sm text-gray-900 font-medium">{vNamaJalan || 'Tidak diisi'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Jarak Antar Tiang (m)</span>
                                            <span className="text-sm text-gray-900 font-medium">{surveyData?.jarakAntarTiang || surveyData?.JarakAntarTiang || surveyData?.jarak || 'Tidak diisi'}</span>
                                        </div>
                                        <div className="py-3 border-b border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-gray-800">Titik Koordinat</span>
                                            </div>
                                            <div className="space-y-3">
                                                {/* Koordinat Asli dari Petugas */}
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1 font-medium">Dari Petugas</div>
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between">
                                                        <span className="text-sm text-blue-800 font-mono">{vCoord || 'Tidak ada koordinat'}</span>
                                                        {vCoord && (
                                                            <button onClick={() => handleViewMap(vCoord)} className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white" title="Lihat di Google Maps">
                                                                <ExternalLink size={14} className="text-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Koordinat Baru dari Admin */}
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1 font-medium">Koordinat Baru (Admin)</div>
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                                                        <span className="text-sm text-emerald-800 font-mono">
                                                            {(() => {
                                                                const koordinatBaru = getVal(
                                                                    'titikKordinatBaruDariAdmin', 'titikKordinatBaru', 'titikKoordinatBaru', 
                                                                    'koordinatBaru', 'newCoordinate', 'updatedCoordinate',
                                                                    'TitikKordinatBaruDariAdmin', 'TitikKordinatBaru', 'TitikKoordinatBaru'
                                                                );
                                                                return koordinatBaru || 'Belum ada koordinat baru';
                                                            })()}
                                                        </span>
                                                        {(() => {
                                                            const koordinatBaru = getVal(
                                                                'titikKordinatBaruDariAdmin', 'titikKordinatBaru', 'titikKoordinatBaru', 
                                                                'koordinatBaru', 'newCoordinate', 'updatedCoordinate',
                                                                'TitikKordinatBaruDariAdmin', 'TitikKordinatBaru', 'TitikKoordinatBaru'
                                                            );
                                                            return koordinatBaru && (
                                                                <button onClick={() => handleViewMap(koordinatBaru)} className="p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white" title="Lihat Koordinat Baru di Google Maps">
                                                                    <ExternalLink size={14} className="text-white" />
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Lebar Jalan</span>
                                            <span className="text-sm text-gray-900 font-medium">{(() => {
                                                const l1 = vLebar1; const l2 = vLebar2;
                                                if (l1 && l2) return `Jalan 1 ${l1} • Jalan 2 ${l2}`;
                                                if (l1) return `Jalan 1 ${l1}`;
                                                if (l2) return `Jalan 2 ${l2}`;
                                                return 'Tidak diisi';
                                            })()}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Lebar Bahu Bertiang</span>
                                            <span className="text-sm text-gray-900 font-medium">{isNonEmpty(vBahu) ? `${vBahu} m` : 'Tidak diisi'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Lebar Trotoar</span>
                                            <span className="text-sm text-gray-900 font-medium">{isNonEmpty(vTrotoar) ? `${vTrotoar} m` : 'Tidak diisi'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                            <span className="text-sm font-medium text-gray-800">Lainnya Bertiang</span>
                                            <span className="text-sm text-gray-900 font-medium">{(surveyData?.LainnyaBertiang || surveyData?.lainnyaBertiang || '').toString().trim() || 'kosong'}</span>
                                        </div>
                                        <div className="py-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-800">Keterangan</span>
                                                <span className="text-sm text-gray-900 font-medium">{(surveyData?.Keterangan || surveyData?.keterangan || '').toString().trim() || 'kosong'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Lokasi chips */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
                                                <MapPin size={16} className="text-gray-500" />
                                                <span>Lokasi</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                                                    <span className="text-xs">Jalan</span>
                                                    <span className="font-medium">{vNamaJalan || '—'}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                                                    <span className="text-xs">Gang</span>
                                                    <span className="font-medium">{vNamaGang || '—'}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Lebar Jalan chips */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
                                                <FileText size={16} className="text-gray-500" />
                                                <span>Lebar Jalan</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                                                    <span className="text-xs">Jalan 1</span>
                                                    <span className="font-medium">{isNonEmpty(vLebar1) ? `${vLebar1} M` : '—'}</span>
                                                </span>
                                                <span className="inline-flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                                                    <span className="text-xs">Jalan 2</span>
                                                    <span className="font-medium">{isNonEmpty(vLebar2) ? `${vLebar2} M` : '—'}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Kepemilikan, Jenis, Trafo, Lampu */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Kepemilikan Tiang</div>
                                                <div className="text-sm font-medium text-gray-800">{dispKepemilikan || '—'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Jenis Tiang</div>
                                                <div className="text-sm font-medium text-gray-800">{vJenisTiang || '—'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Trafo</div>
                                                <div className="text-sm font-medium text-gray-800">{vTrafo || '—'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Lampu</div>
                                                <div className="text-sm font-medium text-gray-800">{dispLampu || '—'}</div>
                                            </div>
                                        </div>

                                        {/* Titik Koordinat with map - Enhanced untuk Survey Existing */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-2 text-gray-700 font-medium mb-3">
                                                <MapPin size={16} className="text-gray-500" />
                                                <span>Titik Koordinat</span>
                                            </div>
                                            <div className="space-y-3">
                                                {/* Koordinat Asli dari Petugas */}
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1 font-medium">Dari Petugas</div>
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between">
                                                        <span className="text-sm text-blue-800 font-mono">{vCoord || 'Tidak ada koordinat'}</span>
                                                        {vCoord && (
                                                            <button onClick={() => handleViewMap(vCoord)} className="p-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white" title="Lihat di Google Maps">
                                                                <ExternalLink size={14} className="text-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Koordinat Baru dari Admin */}
                                                <div>
                                                    <div className="text-xs text-gray-600 mb-1 font-medium">Koordinat Baru (Admin)</div>
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                                                        <span className="text-sm text-emerald-800 font-mono">
                                                            {(() => {
                                                                const koordinatBaru = getVal(
                                                                    'titikKordinatBaruDariAdmin', 'titikKordinatBaru', 'titikKoordinatBaru', 
                                                                    'koordinatBaru', 'newCoordinate', 'updatedCoordinate',
                                                                    'TitikKordinatBaruDariAdmin', 'TitikKordinatBaru', 'TitikKoordinatBaru'
                                                                );
                                                                return koordinatBaru || 'Belum ada koordinat baru';
                                                            })()}
                                                        </span>
                                                        {(() => {
                                                            const koordinatBaru = getVal(
                                                                'titikKordinatBaruDariAdmin', 'titikKordinatBaru', 'titikKoordinatBaru', 
                                                                'koordinatBaru', 'newCoordinate', 'updatedCoordinate',
                                                                'TitikKordinatBaruDariAdmin', 'TitikKordinatBaru', 'TitikKoordinatBaru'
                                                            );
                                                            return koordinatBaru && (
                                                                <button onClick={() => handleViewMap(koordinatBaru)} className="p-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white" title="Lihat Koordinat Baru di Google Maps">
                                                                    <ExternalLink size={14} className="text-white" />
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tambahan bawah koordinat */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Lebar Bahu Bertiang (m)</div>
                                                <div className="text-sm font-medium text-gray-800">{isNonEmpty(vBahu) ? `${vBahu} m` : 'kosong'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Lebar Trotoar Bertiang (m)</div>
                                                <div className="text-sm font-medium text-gray-800">{isNonEmpty(vTrotoar) ? `${vTrotoar} m` : 'kosong'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Lainnya Bertiang</div>
                                                <div className="text-sm font-medium text-gray-800">{(surveyData?.LainnyaBertiang || surveyData?.lainnyaBertiang || '').toString().trim() || 'kosong'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Tinggi ARM (m)</div>
                                                <div className="text-sm font-medium text-gray-800">{isNonEmpty(surveyData?.TinggiARM || surveyData?.tinggiARM) ? `${surveyData?.TinggiARM || surveyData?.tinggiARM} m` : 'kosong'}</div>
                                            </div>
                                            <div className="bg-white rounded-xl border border-gray-200 p-4 md:col-span-2">
                                                <div className="text-sm font-medium text-gray-500 mb-1">Keterangan</div>
                                                <div className="text-sm text-gray-800">{(surveyData?.Keterangan || surveyData?.keterangan || '').toString().trim() || 'kosong'}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Data Teknis Lengkap untuk Survey Existing */}
                            {(surveyData.surveyCategory === 'survey_existing' || surveyData.category === 'survey_existing') && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center space-x-4 mb-8">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                            <Zap size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">Data Teknis Survey Existing</h4>
                                            <p className="text-sm text-gray-600">Informasi teknis lengkap survey existing</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {renderDataField('Kepemilikan Tiang', (String(vKepemilikan).toUpperCase() === 'PLN' && isNonEmpty(vJenisTiangPLN)) ? `PLN - ${vJenisTiangPLN}` : vKepemilikan)}
                                        {renderDataField('Jenis Tiang', vJenisTiang)}
                                        {renderDataField('Trafo', vTrafo)}
                                        {renderDataField('Jenis Trafo', getVal('JenisTrafo','jenisTrafo'))}
                                        {renderDataField('Lampu', (String(vLampu).toLowerCase() === 'ada') ? ['Ada', isNonEmpty(vJumlahLampu) ? String(vJumlahLampu) : null, isNonEmpty(vJenisLampu) ? String(vJenisLampu) : null].filter(Boolean).join(' - ') : vLampu)}
                                        {renderDataField('Jumlah Lampu', vJumlahLampu)}
                                        {renderDataField('Jenis Lampu', vJenisLampu, <Lightbulb size={16} className="text-yellow-600" />)}
                                        {renderDataField('Tinggi ARM', isNonEmpty(getVal('TinggiARM','tinggiARM')) ? `${getVal('TinggiARM','tinggiARM')}m` : null)}
                                        {renderDataField('Lebar Jalan 1', isNonEmpty(vLebar1) ? `${vLebar1}m` : null)}
                                        {renderDataField('Lebar Jalan 2', isNonEmpty(vLebar2) ? `${vLebar2}m` : null)}
                                        {renderDataField('Lebar Bahu Bertiang', isNonEmpty(vBahu) ? `${vBahu}m` : null)}
                                        {renderDataField('Lebar Trotoar Bertiang', isNonEmpty(vTrotoar) ? `${vTrotoar}m` : null)}
                                        {renderDataField('Lainnya Bertiang', getVal('LainnyaBertiang','lainnyaBertiang'))}
                                        {renderDataField('Titik Koordinat Baru dari Admin', getVal('titikKordinatBaruDariAdmin','TitikKordinatBaruDariAdmin'))}
                                    </div>
                                </div>
                            )}

                            {/* Foto Survey ARM */}
                            {renderARMPhotos()}

                            {/* Foto Survey Tiang APJ Propose */}
                            {renderAPJProposePhotos()}

                            {/* Foto Grid Survey */}
                            {renderGridPhotos()}

                            {/* Foto Dokumentasi */}
                            {renderDocumentationPhotos()}

                            {/* Informasi Validasi */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <CheckCircle size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">Informasi Validasi</h4>
                                        <p className="text-sm text-gray-600">Detail proses validasi survey</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Divalidasi Oleh</label>
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 rounded-xl border border-green-100">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                                    <User size={16} className="text-green-600" />
                                                </div>
                                                <span className="text-gray-900 font-medium" title={`Divalidasi oleh: ${surveyData.validatedBy || 'Admin'}`}>
                                                    {surveyData.validatedBy || 'Admin'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Tanggal Validasi</label>
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-xl border border-blue-100">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                                    <Calendar size={16} className="text-blue-600" />
                                                </div>
                                                <span className="text-gray-900 font-medium" title={`Tanggal Validasi: ${formatDate(surveyData.validatedAt || surveyData.updatedAt)}`}>
                                                    {formatDate(surveyData.validatedAt || surveyData.updatedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {surveyData.validationNotes && (
                                    <div className="mt-6">
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Catatan Validasi</label>
                                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-4 rounded-xl border border-gray-100">
                                            <p className="text-gray-900 font-medium leading-relaxed">{surveyData.validationNotes || 'Tidak ada catatan.'}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Menampilkan siapa yang mengedit sebelum divalidasi */}
                                {surveyData.modifiedBy && (
                                    <div className="mt-6">
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Diedit Oleh</label>
                                        <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-3 rounded-xl border border-purple-100">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                                    <Edit size={16} className="text-purple-600" />
                                                </div>
                                                <span className="text-gray-900 font-medium">{surveyData.modifiedBy}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Menampilkan siapa yang mengedit sebelum divalidasi */}
                                {surveyData.modifiedBy && (
                                    <div className="mt-6">
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Diedit Oleh</label>
                                        <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-3 rounded-xl border border-purple-100">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                                    <Edit size={16} className="text-purple-600" />
                                                </div>
                                                <span className="text-gray-900 font-medium">{surveyData.modifiedBy}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Keterangan */}
                            {surveyData.keterangan && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center space-x-4 mb-8">
                                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                                            <FileText size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-900">Keterangan</h4>
                                            <p className="text-sm text-gray-600">Catatan tambahan survey</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm px-6 py-5 rounded-2xl border border-amber-200/60 shadow-sm">
                                        <p className="text-gray-900 font-medium leading-relaxed">{surveyData.keterangan}</p>
                                    </div>
                                </div>
                            )}

                            {/* Informasi Tambahan */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <Clock size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">Informasi Tambahan</h4>
                                        <p className="text-sm text-gray-600">Metadata dan timestamp survey</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Dibuat Pada</label>
                                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 rounded-xl border border-gray-100">
                                            <span className="text-gray-900 font-medium text-sm">
                                                {formatDate(surveyData.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-3">Terakhir Diupdate</label>
                                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 rounded-xl border border-gray-100">
                                            <span className="text-gray-900 font-medium text-sm">
                                                {formatDate(surveyData.updatedAt || surveyData.validatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Footer */}
                <div className="relative bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-t border-gray-200/60 flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/20 to-teal-50/30"></div>
                    <div className="relative z-10 p-6 flex justify-between items-center min-h-[80px]">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle size={16} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Survey Tervalidasi</p>
                                <p className="text-xs text-gray-500">Data telah diverifikasi dan disetujui</p>
                            </div>
                        </div>
                        {/* Tombol Edit untuk Super Admin dan Batal */}
                        <div className="flex items-center gap-3">
                            {currentUser?.role === 'super_admin' && (
                                <button onClick={() => onEdit(surveyData)} className="group bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 border border-yellow-300/20">
                                    <Edit size={18} className="group-hover:rotate-[-12deg] transition-transform duration-300" />
                                    <span className="font-medium">Edit Data Valid</span>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="group bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 border border-slate-500/20"
                            >
                                <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-medium">Tutup</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
                    <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200 z-10"
                        >
                            <X size={24} className="text-white" />
                        </button>
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.alt}
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg">
                            {selectedImage.alt}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ValidSurveyDetailModal;
