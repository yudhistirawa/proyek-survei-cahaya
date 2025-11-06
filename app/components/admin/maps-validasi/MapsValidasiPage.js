'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../lib/firebase';

import { MapPin, Info, Layers, Filter, Search, Download, Eye, ZoomIn, ZoomOut, Navigation } from 'lucide-react';
import ValidSurveyDetailModal from '../../modals/ValidSurveyDetailModal';

/**
 * Unified marker colors to keep legend in sync with map markers
 * existing: merah agar kontras dan mudah dibedakan dengan biru APJ Propose
 * propose: biru tegas
 */
const MARKER_COLORS = { existing: '#EF4444', propose: '#2563EB' };
/**
 * Free zoom mode: jika true maka peta tidak akan melakukan auto-fit/auto-setView,
 * user memiliki kendali penuh atas zoom & posisi.
 */
const ALWAYS_FREE_ZOOM = true;

const MapsValidasiPage = ({ focusTarget }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const leafletRef = useRef(null); // hold Leaflet module
  const hasAutoFitRef = useRef(false); // ensure auto focus happens only once
  const hasUserMovedRef = useRef(false); // track user interactions to prevent auto reset
  const clusterGroupRef = useRef(null); // marker cluster group
  const duplicateIndexMapRef = useRef(new Map()); // prevent exact overlap
  const markerIndexRef = useRef(new Map()); // id/originalId -> marker
  const [mapLoading, setMapLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [surveyData, setSurveyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [mapCenter, setMapCenter] = useState([-6.2088, 106.8456]); // Jakarta center
  const [zoomLevel, setZoomLevel] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCollection, setFilterCollection] = useState('all');
  // Geocoding state (like Google Maps search)
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoResults, setGeoResults] = useState([]); // [{display_name, lat, lon}]
  const [showGeoDropdown, setShowGeoDropdown] = useState(false);
  const geoAbortRef = useRef(null);

  // Load data validasi dari API real
  useEffect(() => {
    const loadValidatedSurveys = async () => {
      try {
        setLoading(true);
        // Use the correct API route that returns validated surveys
        const res = await fetch('/api/valid-surveys');
        if (!res.ok) {
          throw new Error(`API /api/valid-surveys gagal: ${res.status}`);
        }
        const result = await res.json();

        // Support both array and { success, data }
        const data = Array.isArray(result)
          ? result
          : (result?.success && Array.isArray(result.data) ? result.data : []);

        const normalized = (Array.isArray(data) ? data : []).map((item) => {
          // Prefer explicit 'collection' from API, fallback to surveyCategory mapping
          let legacyCollection = item.collectionName || item.collection;
          if (!legacyCollection) {
            if (item.surveyCategory === 'survey_apj_propose') {
              legacyCollection = 'Tiang_APJ_Propose_Report';
            } else if (item.surveyCategory === 'survey_existing') {
              legacyCollection = 'Survey_Existing_Report';
            }
          }
          return { ...item, collectionName: legacyCollection };
        });

        setSurveyData(normalized);
        console.log('Peta Bersama: data valid survei dimuat', { count: normalized.length, sample: normalized.slice(0,3) });
      } catch (err) {
        console.error('Gagal memuat data validasi:', err);
        setSurveyData([]);
      } finally {
        setLoading(false);
      }
    };

    loadValidatedSurveys();
  }, []);

  // Real-time listener: Valid_Survey_Data -> update instantly when validated docs exist
  useEffect(() => {
    let unsubscribe;
    (async () => {
      try {
        if (!db || typeof window === 'undefined') return;
        const { collection, onSnapshot, query } = await import('firebase/firestore');
        const colRef = collection(db, 'Valid_Survey_Data');
        const q = query(colRef);

        unsubscribe = onSnapshot(q, (snapshot) => {
          try {
            const docs = snapshot.docs.map((doc) => {
              const raw = doc.data() || {};
              
              // Helper: pick NEW coordinates from multiple possible fields
              const pickNewCoord = (obj) => {
                const src = obj?.titikKordinatBaru || obj?.titikKoordinatBaru || obj?.koordinatBaru ||
                            obj?.titik_kordinat_baru || obj?.titik_koordinat_baru || obj?.newCoordinate || obj?.updatedCoordinate || null;
                if (!src) return null;
                if (typeof src === 'string') return src;
                if (typeof src === 'object') {
                  const nlat = src.lat ?? src.latitude;
                  const nlng = src.lng ?? src.longitude;
                  if (typeof nlat === 'number' && typeof nlng === 'number') return `${nlat}, ${nlng}`;
                }
                return null;
              };

              const data = { ...raw };

              // Normalize old coordinate alias to titikKordinat for fallback text only
              if (!data.titikKordinat && typeof data.titikKoordinat === 'string') {
                data.titikKordinat = data.titikKoordinat;
              }

              // Derive collectionName for marker color when possible
              let legacyCollection = data.collectionName || data.collection;
              if (!legacyCollection) {
                if (data.surveyCategory === 'survey_apj_propose') legacyCollection = 'Tiang_APJ_Propose_Report';
                else if (data.surveyCategory === 'survey_existing') legacyCollection = 'Survey_Existing_Report';
              }

              // Compute preferred NEW coordinate string
              const newCoordString = pickNewCoord(data);

              // Ensure projectLocation prefers NEW coordinates, then fallback to old
              let projectLocation = data.projectLocation || null;
              if (!projectLocation) {
                projectLocation = newCoordString || data.titikKordinat || '';
              }

              return {
                id: doc.id,
                ...data,
                collectionName: legacyCollection,
                titikKordinatBaru: newCoordString || data.titikKordinatBaru || data.titikKoordinatBaru || data.koordinatBaru || data.titik_kordinat_baru || data.titik_koordinat_baru || data.newCoordinate || data.updatedCoordinate || null,
                namaJalanBaru: data.namaJalanBaru || data.NamaJalanBaru || data.nama_jalan_baru || null,
                projectLocation
              };
            });

            // Merge with current state to preserve fields populated by initial API call (e.g., titikKordinatBaru) 
            // in case realtime docs don't yet include them.
            const merged = docs.map(d => {
              const prev = (Array.isArray(surveyData) ? surveyData : []).find(p => p.id === d.id) || {};
              return {
                ...d,
                titikKordinatBaru: d.titikKordinatBaru || prev.titikKordinatBaru || null,
                namaJalanBaru: d.namaJalanBaru || prev.namaJalanBaru || null,
                projectLocation: d.projectLocation || prev.projectLocation || null
              };
            });

            console.log('Maps_Validasi: Realtime snapshot size =', snapshot.size, 'sampleMerged:', merged.slice(0,1));
            setSurveyData(merged);
          } catch (mapErr) {
            console.warn('Realtime mapping error:', mapErr);
          }
        }, (error) => {
          console.error('Realtime listener error:', error);
        });
      } catch (e) {
        console.warn('Failed to init realtime listener:', e);
      }
    })();

    return () => {
      try { if (typeof unsubscribe === 'function') unsubscribe(); } catch {}
    };
  }, []);

  useEffect(() => {
    // Initialize map only after data loading finishes so the container exists
    if (loading) return;
    // Initialize map when component mounts
    if (typeof window !== 'undefined' && !mapInstanceRef.current) {
      const initMap = async () => {
        try {
          setMapLoading(true);
          setMapError(null);
          
          // Wait for DOM to be ready
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if map container exists
          const mapContainer = document.getElementById('maps-validasi');
          if (!mapContainer) {
            console.error('Map container not found');
            setMapError('Map container tidak ditemukan');
            setMapLoading(false);
            setMapReady(false);
            return;
          }

          // Store container reference
          mapRef.current = mapContainer;

          // Simple cleanup - just clear the container
          const cleanupContainer = () => {
            try {
              // Clear all content
              mapContainer.innerHTML = '';
              
              // Remove any remaining Leaflet elements
              const leafletElements = mapContainer.querySelectorAll('.leaflet-container, .leaflet-control, .leaflet-popup, .leaflet-marker');
              leafletElements.forEach(el => {
                try {
                  el.remove();
                } catch (elError) {
                  console.warn('Error removing leaflet element:', elError);
                }
              });
              
              // Reset className
              mapContainer.className = 'w-full h-[700px] rounded-b-xl';
              
            } catch (error) {
              console.warn('Error during container cleanup:', error);
              // Force clear everything
              mapContainer.innerHTML = '';
              mapContainer.className = 'w-full h-[700px] rounded-b-xl';
            }
          };

          // Perform cleanup
          cleanupContainer();
          
          // Wait a bit after cleanup
          await new Promise(resolve => setTimeout(resolve, 500));

          // Force container to be visible and set dimensions
          mapContainer.style.display = 'block';
          mapContainer.style.visibility = 'visible';
          mapContainer.style.opacity = '1';
          mapContainer.style.width = '100%';
          mapContainer.style.height = '700px';
          mapContainer.style.minHeight = '700px';

          // Wait for container to be ready
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Import Leaflet
          const L = await import('leaflet');
          await import('leaflet/dist/leaflet.css');
          // Store Leaflet reference for later marker operations
          leafletRef.current = L;

          // Import marker clustering plugin and CSS
          try {
            await import('leaflet.markercluster');
            await import('leaflet.markercluster/dist/MarkerCluster.css');
            await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
          } catch (mcErr) {
            console.warn('MarkerCluster plugin not loaded:', mcErr);
          }

          // Ensure Leaflet is properly loaded
          if (!L || !L.map) {
            throw new Error('Leaflet library tidak berhasil dimuat');
          }

          // Create map instance only if not already created
          if (!mapInstanceRef.current) {
            // Re-query/ensure container exists and matches our ref
            const containerEl = mapRef.current || document.getElementById('maps-validasi');
            if (!containerEl) {
              console.warn('Leaflet init aborted: container element not available');
              setMapLoading(false);
              setMapReady(false);
              return;
            }
            const mapInstance = L.map(containerEl, {
              center: mapCenter,
              zoom: zoomLevel,
              zoomControl: false,
              attributionControl: true,
              zoomSnap: 0,            // smooth free zoom
              zoomDelta: 0.25,        // smaller step for keyboard +/- and controls
              wheelPxPerZoomLevel: 80 // smoother wheel
            });

            // Store map instance reference
            mapInstanceRef.current = mapInstance;

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 22
            }).addTo(mapInstance);

            // Ensure all interaction handlers enabled for free zoom experience
            try {
              mapInstance.scrollWheelZoom.enable();
              mapInstance.touchZoom.enable();
              mapInstance.doubleClickZoom.enable();
              mapInstance.boxZoom.enable();
              mapInstance.keyboard.enable();
            } catch {}

            // Custom zoom controls
            L.control.zoom({
              position: 'topright'
            }).addTo(mapInstance);

            // Restore last view from sessionStorage (persisted) to prevent auto reset
            try {
              const rawView = sessionStorage.getItem('maps_validasi_view');
              if (rawView) {
                const v = JSON.parse(rawView);
                if (v && Number.isFinite(v.zoom) && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
                  mapInstance.setView([v.lat, v.lng], v.zoom);
                  hasUserMovedRef.current = true; // treat as user-defined view to avoid any auto-fit
                  try { setZoomLevel(v.zoom); } catch {}
                }
              }
            } catch (e) {
              console.warn('Failed to restore saved map view:', e);
            }

            // Listen user interactions to avoid auto reset and persist view
            try {
              mapInstance.on('zoomstart', () => { hasUserMovedRef.current = true; });
              mapInstance.on('dragstart', () => { hasUserMovedRef.current = true; });
              mapInstance.on('zoomend', () => {
                try { 
                  const z = mapInstance.getZoom();
                  setZoomLevel(z);
                  const c = mapInstance.getCenter();
                  sessionStorage.setItem('maps_validasi_view', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: z }));
                } catch {}
              });
              mapInstance.on('moveend', () => {
                try {
                  const z = mapInstance.getZoom();
                  const c = mapInstance.getCenter();
                  sessionStorage.setItem('maps_validasi_view', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: z }));
                } catch {}
              });
            } catch (_) {}

            // Initialize marker cluster group if plugin is available
            try {
              if (L && L.markerClusterGroup && !clusterGroupRef.current) {
                clusterGroupRef.current = L.markerClusterGroup({
                  showCoverageOnHover: false,
                  maxClusterRadius: 40,
                  spiderfyOnMaxZoom: true,
                  disableClusteringAtZoom: 18,
                });
                clusterGroupRef.current.addTo(mapInstance);
              }
            } catch (cgErr) {
              console.warn('Failed to create cluster group:', cgErr);
            }

            setMapLoading(false);
            setMapReady(true);
            
            // Force map to invalidate size after a short delay
            setTimeout(() => {
              if (mapInstanceRef.current) {
                try {
                  mapInstanceRef.current.invalidateSize();
                } catch (invalidateError) {
                  console.warn('Error invalidating map size:', invalidateError);
                }
              }
            }, 500);
          }
          
        } catch (error) {
          console.error('Error initializing map:', error);
          setMapError('Gagal memuat peta: ' + error.message);
          setMapLoading(false);
        }
      };

      initMap();
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (error) {
          console.error('Error removing map:', error);
        }
      }
      setMapReady(false);
      
      // Cleanup container
      if (mapRef.current) {
        try {
          mapRef.current.innerHTML = '';
          mapRef.current = null;
        } catch (error) {
          console.error('Error cleaning up container:', error);
        }
      }
    };
  }, [loading]);

  // Auto-refresh validated data periodically and when tab gains focus
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/valid-surveys');
        if (!res.ok) return;
        const result = await res.json();
        const data = Array.isArray(result) ? result : (result?.success && Array.isArray(result.data) ? result.data : []);
        const normalized = (Array.isArray(data) ? data : []).map((item) => {
          let legacyCollection = item.collectionName || item.collection;
          if (!legacyCollection) {
            if (item.surveyCategory === 'survey_apj_propose') legacyCollection = 'Tiang_APJ_Propose_Report';
            else if (item.surveyCategory === 'survey_existing') legacyCollection = 'Survey_Existing_Report';
          }
          return { ...item, collectionName: legacyCollection };
        });
        if (!cancelled) setSurveyData(normalized);
      } catch (_) {}
    };

    // Refresh every 20s
    const intervalId = setInterval(fetchData, 20000);

    // Refresh when window/tab becomes visible
    const onVis = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVis);

    // Initial quick refresh after mount
    const timeoutId = setTimeout(fetchData, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Handle map resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      const handleResize = () => {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch (error) {
          console.error('Error handling map resize:', error);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Ensure map container is ready
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ensureContainerReady = () => {
        const mapContainer = document.getElementById('maps-validasi');
        if (mapContainer) {
          mapContainer.style.display = 'block';
          mapContainer.style.visibility = 'visible';
          mapContainer.style.opacity = '1';
          mapContainer.style.width = '100%';
          mapContainer.style.height = '700px';
          mapContainer.style.minHeight = '700px';
        }
      };

      // Run immediately and after delays
      ensureContainerReady();
      setTimeout(ensureContainerReady, 100);
      setTimeout(ensureContainerReady, 500);
      setTimeout(ensureContainerReady, 1000);
      setTimeout(ensureContainerReady, 2000);
      setTimeout(ensureContainerReady, 3000);
      setTimeout(ensureContainerReady, 4000);
      setTimeout(ensureContainerReady, 5000);
    }
  }, []);

  // Force container creation if not exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const createContainerIfNotExists = () => {
        let mapContainer = document.getElementById('maps-validasi');
        
        if (!mapContainer) {
          // Create container if it doesn't exist
          mapContainer = document.createElement('div');
          mapContainer.id = 'maps-validasi';
          mapContainer.className = 'w-full h-[700px] rounded-b-xl';
          mapContainer.style.display = 'block';
          mapContainer.style.visibility = 'visible';
          mapContainer.style.opacity = '1';
          mapContainer.style.width = '100%';
          mapContainer.style.height = '700px';
          mapContainer.style.minHeight = '700px';
          
          // Find the map container wrapper and append
          const mapWrapper = document.querySelector('[data-map-wrapper]');
          if (mapWrapper) {
            mapWrapper.appendChild(mapContainer);
          }
        }
      };

      // Run after component is mounted
      setTimeout(createContainerIfNotExists, 100);
      setTimeout(createContainerIfNotExists, 500);
      setTimeout(createContainerIfNotExists, 1000);
    }
  }, []);


  // Memoize filtered data untuk menghindari re-computation yang tidak perlu
  const filteredSurveyData = React.useMemo(() => {
    if (!surveyData.length) return [];
    const q = (searchTerm || '').toLowerCase();

    // Ambil koordinat (prefer baru; fallback ke projectLocation/titikKordinat/lat,lng)
    const getAnyCoord = (survey) => {
      // Prefer field "baru"
      const srcNew =
        survey?.titikKordinatBaru || survey?.titikKoordinatBaru || survey?.koordinatBaru ||
        survey?.titik_kordinat_baru || survey?.titik_koordinat_baru || survey?.newCoordinate || survey?.updatedCoordinate;
      if (srcNew) return srcNew;

      // Fallback string (mis. "projectLocation" atau "titikKordinat")
      if (survey?.projectLocation) return survey.projectLocation;
      if (survey?.titikKordinat) return survey.titikKordinat;
      if (survey?.titikKoordinat) return survey.titikKoordinat;

      // Fallback numeric fields
      const latNum = survey?.lat ?? survey?.latitude ?? survey?.coordLat;
      const lngNum = survey?.lng ?? survey?.longitude ?? survey?.coordLng;
      if (typeof latNum === 'number' && typeof lngNum === 'number') return { lat: latNum, lng: lngNum };

      return null;
    };

    const hasCoords = (coord) => {
      if (coord == null) return false;
      if (typeof coord === 'string') {
        return coord.trim().length > 0;
      }
      if (typeof coord === 'object') {
        const lat = coord.lat ?? coord.latitude;
        const lng = coord.lng ?? coord.longitude;
        return typeof lat === 'number' && typeof lng === 'number';
      }
      return false;
    };

    return surveyData.filter((survey) => {
      const namaJalan = (
        survey?.namaJalanBaru || survey?.NamaJalanBaru || survey?.nama_jalan_baru || survey?.namaJalan || ''
      ).toLowerCase();
      const idTitik = (survey?.idTitik || '').toLowerCase();
      const surveyor = (survey?.surveyorName || '').toLowerCase();

      const matchesSearch = namaJalan.includes(q) || idTitik.includes(q) || surveyor.includes(q);
      const matchesCollection = filterCollection === 'all' || survey.collectionName === filterCollection;
      const coord = getAnyCoord(survey);

      return matchesSearch && matchesCollection && hasCoords(coord);
    });
  }, [surveyData, searchTerm, filterCollection]);

  // Handle marker creation dan update - FIXED untuk menghindari infinite loop
  useEffect(() => {
    if (mapInstanceRef.current && filteredSurveyData.length > 0 && leafletRef.current) {
      try {
        const L = leafletRef.current;
        // Clear existing markers safely
        try {
          if (clusterGroupRef.current && clusterGroupRef.current.clearLayers) {
            clusterGroupRef.current.clearLayers();
          } else {
            markers.forEach(marker => {
              try {
                if (marker && mapInstanceRef.current.hasLayer) {
                  mapInstanceRef.current.removeLayer(marker);
                }
              } catch (error) {
                console.warn('Error removing marker:', error);
              }
            });
          }
        } catch (_) {}

        const newMarkers = [];
        // Reset duplicate map and marker index for this render
        duplicateIndexMapRef.current = new Map();
        markerIndexRef.current = new Map();

        // Add markers for each filtered survey with robust coordinate parsing (prefer baru; fallback lainnya)
        filteredSurveyData.forEach((survey, index) => {
          try {
            const coordSource = (() => {
              const srcNew =
                survey.titikKordinatBaru || survey.titikKoordinatBaru || survey.koordinatBaru ||
                survey.titik_kordinat_baru || survey.titik_koordinat_baru || survey.newCoordinate || survey.updatedCoordinate;
              if (srcNew) return srcNew;
              if (survey.projectLocation) return survey.projectLocation;
              if (survey.titikKordinat || survey.titikKoordinat) return survey.titikKordinat || survey.titikKoordinat;
              const latNum = survey.lat ?? survey.latitude ?? survey.coordLat;
              const lngNum = survey.lng ?? survey.longitude ?? survey.coordLng;
              if (typeof latNum === 'number' && typeof lngNum === 'number') return { lat: latNum, lng: lngNum };
              return '';
            })();

            let lat, lng;

            // Object coordinates
            if (coordSource && typeof coordSource === 'object') {
              const o = coordSource;
              const latCandidate = o.lat ?? o.latitude;
              const lngCandidate = o.lng ?? o.longitude;
              if (typeof latCandidate === 'number' && typeof lngCandidate === 'number') {
                lat = latCandidate; lng = lngCandidate;
              }
            }
            // Numeric fields on survey (fallback)
            if ((lat === undefined || lng === undefined)) {
              const latCandidate = survey.lat ?? survey.latitude ?? survey.coordLat;
              const lngCandidate = survey.lng ?? survey.longitude ?? survey.coordLng;
              if (typeof latCandidate === 'number' && typeof lngCandidate === 'number') {
                lat = latCandidate; lng = lngCandidate;
              }
            }
            // String parsing
            if ((lat === undefined || lng === undefined) && coordSource && typeof coordSource === 'string') {
              let parts = [];
              if (coordSource.includes(',') || coordSource.includes(';')) {
                parts = coordSource.split(/[,;]+/).map(p => p.trim());
              } else {
                const matches = coordSource.match(/[-+]?\d*\.?\d+/g) || [];
                parts = matches.slice(0, 2);
              }
              const coords = parts.map(v => parseFloat(String(v).replace(/[[^0-9+\-\.]]/g, '')));
              if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                [lat, lng] = coords;
              }
            }

            if (typeof lat === 'number' && typeof lng === 'number') {
              // Validate range; if invalid, try swapping once
              const inRange = (a, b) => (a >= -90 && a <= 90 && b >= -180 && b <= 180);
              if (!inRange(lat, lng)) {
                const sLat = lng; const sLng = lat;
                if (inRange(sLat, sLng)) {
                  [lat, lng] = [sLat, sLng];
                } else {
                  console.warn('Invalid coordinates for survey (after swap check):', survey.idTitik || survey.id, [lat, lng]);
                  return;
                }
              }

              // De-duplicate exact same coordinates by applying a tiny spiral offset
              try {
                const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                const seen = duplicateIndexMapRef.current.get(key) || 0;
                if (seen > 0) {
                  const angle = (seen - 1) * (Math.PI / 6); // 30° steps
                  const baseRadius = 0.00008; // ~8-10m
                  const radius = baseRadius * (1 + Math.floor(seen / 6) * 0.8);
                  const latRad = (lat * Math.PI) / 180;
                  const dLat = radius * Math.sin(angle);
                  const dLng = (radius * Math.cos(angle)) / Math.max(0.3, Math.cos(latRad));
                  lat += dLat;
                  lng += dLng;
                }
                duplicateIndexMapRef.current.set(key, seen + 1);
              } catch (_) {}

              // Determine marker type and build flat SVG icon per spec (robust detection)
              const isProposeIcon = (
                survey.collectionName === 'Tiang_APJ_Propose_Report' ||
                survey.collection === 'Tiang_APJ_Propose_Report' ||
                survey.surveyCategory === 'survey_apj_propose' ||
                survey.surveyZone === 'propose' ||
                String(survey.projectTitle || '').toLowerCase().includes('apj') ||
                String(survey.projectTitle || '').toLowerCase().includes('propose') ||
                !!(survey.idTitik || survey.dataDaya || survey.dataTiang)
              );
              const isExistingIcon = !isProposeIcon;
              const colorCircle = isExistingIcon ? MARKER_COLORS.existing : MARKER_COLORS.propose;

              const svgExisting = `
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="15" fill="${colorCircle}" stroke="#FFFFFF" stroke-width="2" />
                  <!-- pole -->
                  <rect x="15" y="9" width="2" height="14" rx="1" fill="#FFFFFF"/>
                  <!-- lamp head -->
                  <rect x="13" y="8" width="6" height="3" rx="1.5" fill="#FFFFFF"/>
                  <!-- yellow light -->
                  <path d="M12 14 L20 14 L16 20 Z" fill="#FACC15"/>
                </svg>`;

              const svgPropose = `
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Circle for APJ Propose (distinct color) -->
                  <circle cx="16" cy="16" r="15" fill="${colorCircle}" stroke="#FFFFFF" stroke-width="2" />
                  <!-- pole (white) -->
                  <rect x="15" y="9" width="2" height="14" rx="1" fill="#FFFFFF"/>
                  <!-- lamp head (white, no yellow light) -->
                  <rect x="13" y="8" width="6" height="3" rx="1.5" fill="#FFFFFF"/>
                </svg>`;

              const customIcon = L.divIcon({
                html: isExistingIcon ? svgExisting : svgPropose,
                className: 'custom-marker-circle',
                iconSize: [22, 22],
                iconAnchor: [11, 20]
              });

              try {
                let marker;
                try {
                  marker = L.marker([lat, lng], { icon: customIcon, interactive: true, autoPan: true });
                } catch (iconErr) {
                  console.warn('Custom icon failed, using default marker:', iconErr);
                  marker = L.marker([lat, lng]);
                }
                if (clusterGroupRef.current && clusterGroupRef.current.addLayer) {
                  clusterGroupRef.current.addLayer(marker);
                } else if (mapInstanceRef.current && mapInstanceRef.current.addLayer) {
                  marker.addTo(mapInstanceRef.current);
                }
                // Index marker by id/originalId for quick focusing from other pages
                try {
                  const keyPrimary = survey.id || survey.originalId;
                  if (keyPrimary) markerIndexRef.current.set(String(keyPrimary), marker);
                  if (survey.originalId) markerIndexRef.current.set(String(survey.originalId), marker);
                } catch (_) {}

                let popupContent = `<div style="min-width: 250px;">
                  <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: bold;">
                    ${survey.namaJalanBaru || survey.NamaJalanBaru || survey.nama_jalan_baru || survey.namaJalan || survey.idTitik || survey.projectTitle || 'Detail Survey'}
                  </h3>`;

                // APJ Propose detection: match by collection/collectionName or category/zone
                let isPropose = (
                  survey.collectionName === 'Tiang_APJ_Propose_Report' ||
                  survey.collection === 'Tiang_APJ_Propose_Report' ||
                  survey.surveyCategory === 'survey_apj_propose' ||
                  survey.surveyZone === 'propose'
                );
                if (!isPropose) {
                  const title = (survey.projectTitle || '').toLowerCase();
                  if (title.includes('apj') || title.includes('propose')) isPropose = true;
                }
                if (!isPropose) {
                  if (survey.idTitik || survey.dataDaya || survey.dataTiang) isPropose = true;
                }

                // APJ Propose: only ID Titik, Data Daya, Data Tiang
                if (isPropose) {
                  const idTitik = survey.idTitik ?? '-';
                  const dataDaya = survey.dataDaya ?? '-';
                  const dataTiang = survey.dataTiang ?? '-';
                  popupContent += `
                    <div style="font-size: 13px; color: #6B7280;">
                      <p><strong>ID Titik:</strong> ${idTitik}</p>
                      <p><strong>Data Daya:</strong> ${dataDaya}</p>
                      <p><strong>Data Tiang:</strong> ${dataTiang}</p>
                    </div>
                  `;
                } else {
                  // Existing or others: keep prior lamp/trafo fields
                  popupContent += `
                    <div style="font-size: 13px; color: #6B7280;">
                      <p><strong>Jenis Lampu:</strong> ${survey.jenisLampu ?? 'N/A'}</p>
                      <p><strong>Jenis Trafo:</strong> ${survey.jenisTrafo ?? 'N/A'}</p>
                      <p><strong>Jumlah Lampu:</strong> ${survey.jumlahLampu ?? 'N/A'}</p>
                    </div>
                  `;
                }

                // Validation badge if available
                const isValidated = survey.isValidated === true || survey.validationStatus === 'validated';
                const statusColor = isValidated ? '#34A853' : '#FFA500';
                const statusText = isValidated ? 'Tervalidasi' : 'Menunggu Validasi';
                popupContent += `
                  <div style="margin-top: 8px;">
                    <span style="display:inline-block;padding:4px 8px;border-radius:12px;background:${statusColor};color:white;font-size:12px;">${statusText}</span>
                  </div>
                </div>`;
                marker.bindPopup(popupContent);
                marker.on('click', () => {
                  try { setSelectedSurvey(survey); } catch (_) {}
                });
                newMarkers.push(marker);
                console.log('Marker created at:', { lat, lng, collection: survey.collectionName, id: survey.idTitik || survey.id });
                if (!ALWAYS_FREE_ZOOM && !hasAutoFitRef.current && !hasUserMovedRef.current && index === 0 && mapInstanceRef.current.setView) {
                  const singleZoom = filteredSurveyData.length === 1 ? 16 : zoomLevel;
                  mapInstanceRef.current.setView([lat, lng], singleZoom);
                  hasAutoFitRef.current = true;
                }
              } catch (markerError) {
                console.error('Error creating marker for survey:', survey.idTitik || survey.id, markerError);
              }
            } else {
              console.warn('Skipping survey due to missing/invalid coordinates:', {
                id: survey.idTitik || survey.id,
                titikKordinat: survey.titikKordinat,
                projectLocation: survey.projectLocation,
                coordinates: survey.coordinates,
                lat: survey.lat ?? survey.latitude ?? survey.coordLat,
                lng: survey.lng ?? survey.longitude ?? survey.coordLng,
              });
            }
          } catch (surveyError) {
            console.error('Error processing survey:', survey.idTitik || survey.id, surveyError);
          }
        });

        setMarkers(newMarkers);

        // Try focus on a specific target if requested (via prop/sessionStorage)
        try {
          let target = focusTarget;
          if ((!target || Object.keys(target).length === 0) && typeof window !== 'undefined') {
            const raw = sessionStorage.getItem('maps_validasi_focus');
            if (raw) {
              target = JSON.parse(raw);
              // one-time use
              sessionStorage.removeItem('maps_validasi_focus');
            }
          }

          if (target && mapInstanceRef.current && leafletRef.current) {
            const L = leafletRef.current;
            let focused = false;

            // 1) Try by id lookup
            const tryIds = [];
            if (target.id) tryIds.push(String(target.id));
            if (target.originalId) tryIds.push(String(target.originalId));
            for (const k of tryIds) {
              const m = markerIndexRef.current.get(k);
              if (m && mapInstanceRef.current.hasLayer(m)) {
                const latLng = m.getLatLng();
                mapInstanceRef.current.setView(latLng, 17, { animate: true });
                try { m.openPopup(); } catch {}
                focused = true;
                break;
              }
            }

            // 2) Fallback: use coord string
            if (!focused && target.coord) {
              const parts = String(target.coord).split(/[,;]+/).map(s => s.trim());
              if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                  mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
                  // create a temporary focus circle
                  try {
                    const circle = L.circle([lat, lng], { radius: 5, color: '#2563eb', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.7 });
                    circle.addTo(mapInstanceRef.current);
                    setTimeout(() => {
                      try { mapInstanceRef.current.removeLayer(circle); } catch {}
                    }, 2500);
                  } catch {}
                  focused = true;
                }
              }
            }
          }
        } catch (focusErr) {
          console.warn('Peta Bersama: gagal fokus ke target:', focusErr);
        }

        if (!ALWAYS_FREE_ZOOM && !hasAutoFitRef.current && !hasUserMovedRef.current && newMarkers.length > 0 && mapInstanceRef.current.fitBounds) {
          try {
            let bounds;
            if (clusterGroupRef.current && clusterGroupRef.current.getBounds) {
              bounds = clusterGroupRef.current.getBounds();
            } else {
              const group = L.featureGroup(newMarkers);
              bounds = group.getBounds();
            }
            if (bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds.pad(0.1));
              hasAutoFitRef.current = true;
            }
          } catch (boundsError) {
            console.warn('Error fitting bounds:', boundsError);
          }
        } else if (newMarkers.length === 0) {
          console.log('Peta Bersama: tidak ada marker yang valid dari data:', {
            total: filteredSurveyData.length,
            sample: filteredSurveyData.slice(0, 3).map(d => ({
              idTitik: d.idTitik,
              titikKordinat: d.titikKordinat,
              projectLocation: d.projectLocation,
            }))
          });
        }
      } catch (error) {
        console.error('Error in marker creation useEffect:', error);
      }
    }
  }, [filteredSurveyData, zoomLevel, mapReady]); // Run when map becomes ready

  // Memoize stats untuk menghindari re-computation yang tidak perlu
  const stats = React.useMemo(() => {
    if (!surveyData) return { total: 0, existing: 0, apj: 0, filtered: 0 };
    
    const total = surveyData.length;
    const existing = surveyData.filter(s => s.collectionName === 'Survey_Existing_Report').length;
    const apj = surveyData.filter(s => s.collectionName === 'Tiang_APJ_Propose_Report').length;
    const filtered = filteredSurveyData.length;
    
    return { total, existing, apj, filtered };
  }, [surveyData, filteredSurveyData]);

  // FIXED: Zoom handlers tanpa infinite loop
  const handleZoomIn = React.useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
      setZoomLevel(prev => mapInstanceRef.current.getZoom());
    }
  }, []);

  const handleZoomOut = React.useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
      setZoomLevel(prev => mapInstanceRef.current.getZoom());
    }
  }, []);

  // Memoize handlers untuk menghindari re-render yang tidak perlu
  const handleSearchChange = React.useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  // Debounced geocoding for place names (street/area/city/country)
  useEffect(() => {
    const q = (searchTerm || '').trim();
    // only geocode for queries with at least 3 characters
    if (q.length < 3) {
      setGeoResults([]);
      setShowGeoDropdown(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // cancel previous fetch if any
        if (geoAbortRef.current) {
          try { geoAbortRef.current.abort(); } catch {}
        }
        const ctrl = new AbortController();
        geoAbortRef.current = ctrl;
        setGeoLoading(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=7`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept-Language': 'id,en' },
          signal: ctrl.signal
        });
        if (!res.ok) throw new Error(`Geocode error ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setGeoResults(Array.isArray(data) ? data : []);
          setShowGeoDropdown(true);
        }
      } catch (err) {
        if (!cancelled) {
          setGeoResults([]);
          setShowGeoDropdown(false);
        }
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }, 350); // debounce 350ms

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const panToLatLng = (lat, lng, zoom = 14) => {
    try {
      if (mapInstanceRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
        mapInstanceRef.current.setView([lat, lng], zoom, { animate: false });
        setZoomLevel(zoom);
        // persist view
        try { sessionStorage.setItem('maps_validasi_view', JSON.stringify({ lat, lng, zoom })); } catch {}
      }
    } catch (_) {}
  };

  const handleSelectGeocode = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    panToLatLng(lat, lng, 15);
    setShowGeoDropdown(false);
  };

  const handleFilterChange = React.useCallback((e) => {
    setFilterCollection(e.target.value);
  }, []);

  const handleLegendToggle = React.useCallback(() => {
    setShowLegend(prev => !prev);
  }, []);

  // FIXED: Reset view handler tanpa infinite loop
  const handleResetView = React.useCallback(() => {
    try {
      if (mapInstanceRef.current && filteredSurveyData.length > 0 && leafletRef.current) {
        // Get current markers from map instead of state to avoid dependency
        const currentMarkers = [];
        mapInstanceRef.current.eachLayer(layer => {
          const L = leafletRef.current;
          if (L && layer instanceof L.Marker) {
            currentMarkers.push(layer);
          }
        });
        
        if (currentMarkers.length > 0) {
          const group = L.featureGroup(currentMarkers);
          const bounds = group.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds.pad(0.1));
          } else {
            // Fallback to default view if bounds are invalid
            mapInstanceRef.current.setView(mapCenter, zoomLevel);
          }
        } else {
          // Fallback to default view
          mapInstanceRef.current.setView(mapCenter, zoomLevel);
        }
      } else if (mapInstanceRef.current) {
        // Fallback to default view
        mapInstanceRef.current.setView(mapCenter, zoomLevel);
      }
    } catch (error) {
      console.error('Error in handleResetView:', error);
      // Fallback to default view
      if (mapInstanceRef.current && mapInstanceRef.current.setView) {
        mapInstanceRef.current.setView(mapCenter, zoomLevel);
      }
    }
  }, [filteredSurveyData, mapCenter, zoomLevel]); // FIXED: Removed 'markers' from dependencies

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data validasi survey...</p>
        </div>
      </div>
    );
  }

     return (
     <div className="max-w-7xl mx-auto p-6">
       {/* Custom CSS untuk dropdown visibility */}
       <style jsx>{`
         select option {
           color: #111827 !important;
           background-color: white !important;
           font-weight: 500;
         }
         select option:hover {
           background-color: #f3f4f6 !important;
         }
         select option:checked {
           background-color: #3b82f6 !important;
           color: white !important;
         }
         select {
           color: #111827 !important;
           background-color: white !important;
         }
         input::placeholder {
           color: #6b7280 !important;
         }
       `}</style>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin size={28} className="text-indigo-600" />
              </div>
              Peta Bersama
            </h1>
            <p className="text-gray-600 mt-2">
              Visualisasi bersama titik koordinat survey yang telah divalidasi dalam peta interaktif
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleResetView}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Navigation size={16} />
              Reset View
            </button>
          </div>
        </div>
      </div>

             {/* Stats Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Survey Valid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Total Survey Valid</p>
              <p className="mt-1 text-3xl font-extrabold text-gray-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg"><MapPin size={22} className="text-indigo-600"/></div>
          </div>
        </div>
        {/* Data Tampil */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Data Tampil</p>
              <p className="mt-1 text-3xl font-extrabold text-green-600">{stats.filtered}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg"><Eye size={22} className="text-green-600"/></div>
          </div>
        </div>
        {/* Survey Existing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Survey Existing</p>
              <p className="mt-1 text-3xl font-extrabold text-red-600">{stats.existing}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg"><MapPin size={22} className="text-red-600"/></div>
          </div>
        </div>
        {/* Survey APJ Propose */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500">Survey APJ Propose</p>
              <p className="mt-1 text-3xl font-extrabold text-blue-600">{stats.apj}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg"><MapPin size={22} className="text-blue-600"/></div>
          </div>
        </div>
      </div>

      {/* Search and Filter removed per request to keep the page clean */}

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Peta Bersama</h2>
          <p className="text-sm text-gray-600 mt-1">Menampilkan {stats.total} titik koordinat survey tervalidasi</p>
        </div>
        
                 <div className="relative" data-map-wrapper>
           {mapLoading && (
            <div className="w-full h-[700px] rounded-b-xl bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Memuat peta...</p>
              </div>
            </div>
          )}
          
          {mapError && (
            <div className="w-full h-[700px] rounded-b-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-red-700 mb-2">Gagal memuat peta</h3>
                <p className="text-sm text-red-600 mb-4">{String(mapError)}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}
          
                     <div 
             id="maps-validasi" 
             className="w-full h-[700px] rounded-b-xl"
             style={{ 
               minHeight: '700px',
               display: 'block',
               visibility: 'visible',
               opacity: mapLoading || mapError ? '0' : '1'
             }}
           />
          
          {/* Custom Map Controls */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
              title="Zoom In"
            >
              <ZoomIn size={20} className="text-gray-700" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
              title="Zoom Out"
            >
              <ZoomOut size={20} className="text-gray-700" />
            </button>
          </div>
          
          {/* Legend */}
          {showLegend && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-4 min-w-[220px] z-[1000]">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info size={16} className="text-indigo-600" />
                Legenda
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 32 32" className="shadow-sm">
                    <circle cx="16" cy="16" r="15" fill={MARKER_COLORS.existing} stroke="#FFFFFF" strokeWidth="2" />
                    <rect x="15" y="9" width="2" height="14" rx="1" fill="#FFFFFF"/>
                    <rect x="13" y="8" width="6" height="3" rx="1.5" fill="#FFFFFF"/>
                    <path d="M12 14 L20 14 L16 20 Z" fill="#FACC15"/>
                  </svg>
                  <span className="text-gray-700">Survey Existing</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 32 32" className="shadow-sm">
                    <circle cx="16" cy="16" r="15" fill={MARKER_COLORS.propose} stroke="#FFFFFF" strokeWidth="2" />
                    <rect x="15" y="9" width="2" height="14" rx="1" fill="#FFFFFF"/>
                    <rect x="13" y="8" width="6" height="3" rx="1.5" fill="#FFFFFF"/>
                  </svg>
                  <span className="text-gray-700">Survey APJ Propose</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-gray-600">
                    Klik marker untuk melihat detail survey
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="p-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
                     <div className="text-center">
             <p className="text-sm text-gray-600">
               <span className="font-medium">Total Titik:</span> {stats.total} • 
               <span className="font-medium ml-2">Tampil:</span> {stats.filtered} • 
               <span className="font-medium ml-2">Zoom:</span> {zoomLevel} • 
               <span className="font-medium ml-2">Navigasi:</span> Drag untuk menggeser, scroll untuk zoom • 
               <span className="font-medium ml-2">Filter:</span> {filterCollection === 'all' ? 'Semua Collection' : filterCollection}
             </p>
           </div>
        </div>
      </div>

      {/* Detail Modal for marker click */}
      <ValidSurveyDetailModal
        isOpen={!!selectedSurvey}
        onClose={() => setSelectedSurvey(null)}
        surveyData={selectedSurvey}
      />
    </div>
  );
};

export default MapsValidasiPage;
