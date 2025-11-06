import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix untuk marker icons Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SurveyorMapsLeaflet = ({ routeData, surveyPoints }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const routePolylineRef = useRef(null);
    const startMarkerRef = useRef(null);
    const endMarkerRef = useRef(null);

    // Custom icons untuk markers
    const createCustomIcon = (type) => {
        let color, icon, size;
        
        if (type === 'existing') {
            color = '#DC2626'; // Merah untuk survey existing
            icon = '📍';
            size = 24;
        } else if (type === 'propose') {
            color = '#2563EB'; // Biru untuk survey APJ propose
            icon = '🎯';
            size = 24;
        } else {
            color = '#34A853'; // Default hijau
            icon = '📌';
            size = 20;
        }

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    width: ${size}px; 
                    height: ${size}px; 
                    background-color: ${color}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    color: white; 
                    font-weight: bold; 
                    font-size: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                ">
                    ${icon}
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });
    };

    // Helper: check if map is ready (pane positioned by Leaflet)
    const isMapReady = () => {
        const m = mapInstance.current;
        return !!(m && m._mapPane && m._mapPane._leaflet_pos !== undefined);
    };

    // Helper: safely fit bounds when map is ready
    const safeFitBounds = (bounds, options = { padding: [20, 20] }) => {
        let tries = 0;
        const attempt = () => {
            const m = mapInstance.current;
            if (!m || !m._mapPane) return false;
            if (m._mapPane._leaflet_pos === undefined) return false;
            try {
                m.fitBounds(bounds, options);
                return true;
            } catch (_) {
                return false;
            }
        };
        if (attempt()) return;
        // Retry a few times while layout settles
        const retry = () => {
            if (tries >= 5) return;
            tries += 1;
            if (!attempt()) setTimeout(retry, 50 * tries);
        };
        setTimeout(retry, 50);
    };

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !routeData) return;

        try {
            // Cleanup existing map if any
            if (mapInstance.current) {
                try {
                    mapInstance.current.remove();
                } catch (e) {
                    console.warn('Error removing existing map:', e);
                }
                mapInstance.current = null;
            }

            // Get center from route data or survey points (fallback)
            const routePoints = routeData.routePoints || [];
            let center;
            if (routePoints.length > 0) {
                center = [routePoints[0].lat, routePoints[0].lng];
            } else if (Array.isArray(surveyPoints) && surveyPoints.length > 0) {
                center = [surveyPoints[0].lat, surveyPoints[0].lng];
            } else {
                center = [-6.2088, 106.8456]; // Default to Jakarta
            }

            // Create map instance
            const map = L.map(mapRef.current, {
                center: center,
                zoom: 15,
                zoomControl: true,
                attributionControl: false,
                dragging: true,
                touchZoom: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: true,
                tap: true,
                zoomAnimation: false,
                markerZoomAnimation: false,
                fadeAnimation: false
            });

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);

            mapInstance.current = map;
            // Ensure size is correct after first paint
            setTimeout(() => {
                try { map.invalidateSize?.(); } catch (_) {}
            }, 0);

            // Cleanup function
            return () => {
                if (mapInstance.current) {
                    try {
                        // Stop ongoing animations or transitions before removing
                        mapInstance.current.stop?.();
                        mapInstance.current.remove();
                    } catch (e) {
                        console.warn('Error removing map during cleanup:', e);
                    }
                    mapInstance.current = null;
                }
            };
        } catch (error) {
            console.error('Error initializing Leaflet map:', error);
        }
    }, [routeData, surveyPoints]);

    // Update route polyline
    useEffect(() => {
        if (!mapInstance.current || !routeData?.routePoints) return;

        // Remove existing route polyline
        if (routePolylineRef.current) {
            try {
                mapInstance.current.removeLayer(routePolylineRef.current);
            } catch (e) {
                console.warn('Error removing route polyline:', e);
            }
            routePolylineRef.current = null;
        }

        // Remove existing start/end markers
        if (startMarkerRef.current) {
            try {
                mapInstance.current.removeLayer(startMarkerRef.current);
            } catch (e) {
                console.warn('Error removing start marker:', e);
            }
            startMarkerRef.current = null;
        }

        if (endMarkerRef.current) {
            try {
                mapInstance.current.removeLayer(endMarkerRef.current);
            } catch (e) {
                console.warn('Error removing end marker:', e);
            }
            endMarkerRef.current = null;
        }

        const routePoints = routeData.routePoints;
        
        // Create route polyline with orange color
        if (routePoints.length > 1) {
            const routeCoordinates = routePoints.map(point => [point.lat, point.lng]);
            
            routePolylineRef.current = L.polyline(routeCoordinates, {
                color: '#F97316', // Orange color for route tracking
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(mapInstance.current);

            // Add start marker
            if (routePoints[0]) {
                const startIcon = L.divIcon({
                    className: 'start-marker',
                    html: `
                        <div style="
                            width: 24px; 
                            height: 24px; 
                            background-color: #10B981; 
                            border: 3px solid white; 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            font-weight: bold;
                            color: white;
                            font-size: 12px;
                        ">
                            S
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                startMarkerRef.current = L.marker([routePoints[0].lat, routePoints[0].lng], {
                    icon: startIcon,
                    title: 'Start Point'
                }).addTo(mapInstance.current);

                startMarkerRef.current.bindPopup(`
                    <div style="padding: 8px; max-width: 200px;">
                        <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">Titik Mulai</h3>
                        <p style="margin: 2px 0; font-size: 12px;">Waktu: ${new Date(routeData.startTime).toLocaleString('id-ID')}</p>
                        <p style="margin: 2px 0; font-size: 12px;">Surveyor: ${routeData.surveyorName}</p>
                    </div>
                `);
            }

            // Add end marker
            if (routePoints[routePoints.length - 1]) {
                const endIcon = L.divIcon({
                    className: 'end-marker',
                    html: `
                        <div style="
                            width: 24px; 
                            height: 24px; 
                            background-color: #EF4444; 
                            border: 3px solid white; 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            font-weight: bold;
                            color: white;
                            font-size: 12px;
                        ">
                            E
                        </div>
                    `,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                endMarkerRef.current = L.marker([routePoints[routePoints.length - 1].lat, routePoints[routePoints.length - 1].lng], {
                    icon: endIcon,
                    title: 'End Point'
                }).addTo(mapInstance.current);

                endMarkerRef.current.bindPopup(`
                    <div style="padding: 8px; max-width: 200px;">
                        <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">Titik Selesai</h3>
                        <p style="margin: 2px 0; font-size: 12px;">Waktu: ${new Date(routeData.endTime).toLocaleString('id-ID')}</p>
                        <p style="margin: 2px 0; font-size: 12px;">Total Jarak: ${routeData.totalDistance?.toFixed(2)} km</p>
                        <p style="margin: 2px 0; font-size: 12px;">Total Titik: ${routePoints.length}</p>
                    </div>
                `);
            }

            // Add route info popup
            const totalDistance = routeData.totalDistance || 0;
            const duration = routeData.startTime && routeData.endTime 
                ? Math.floor((new Date(routeData.endTime) - new Date(routeData.startTime)) / 60000)
                : 0;

            const popupContent = `
                <div style="padding: 8px; max-width: 200px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">Jejak Surveyor</h3>
                    <p style="margin: 2px 0; font-size: 12px;">Surveyor: ${routeData.surveyorName}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Total Jarak: ${totalDistance.toFixed(2)} km</p>
                    <p style="margin: 2px 0; font-size: 12px;">Jumlah Titik: ${routePoints.length}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Durasi: ${formatDuration(duration)}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Status: ${routeData.status === 'completed' ? 'Selesai' : 'Berjalan'}</p>
                    <div style="margin-top: 6px; padding: 4px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="margin: 0; font-size: 10px; color: #1976D2; font-weight: bold;">📊 Maps_Surveyor Collection</p>
                    </div>
                </div>
            `;

            routePolylineRef.current.bindPopup(popupContent);

            // Fit bounds to show entire route (safely)
            const bounds = L.latLngBounds(routeCoordinates);
            safeFitBounds(bounds, { padding: [20, 20] });
        }

        // Cleanup function
        return () => {
            if (routePolylineRef.current) {
                try {
                    mapInstance.current.removeLayer(routePolylineRef.current);
                } catch (e) {
                    console.warn('Error removing route polyline during cleanup:', e);
                }
                routePolylineRef.current = null;
            }
            if (startMarkerRef.current) {
                try {
                    mapInstance.current.removeLayer(startMarkerRef.current);
                } catch (e) {
                    console.warn('Error removing start marker during cleanup:', e);
                }
                startMarkerRef.current = null;
            }
            if (endMarkerRef.current) {
                try {
                    mapInstance.current.removeLayer(endMarkerRef.current);
                } catch (e) {
                    console.warn('Error removing end marker during cleanup:', e);
                }
                endMarkerRef.current = null;
            }
        };
    }, [routeData]);

    // Update survey points
    useEffect(() => {
        if (!mapInstance.current || !surveyPoints) return;

        // Remove existing survey markers
        markersRef.current.forEach(marker => {
            try {
                mapInstance.current.removeLayer(marker);
            } catch (e) {
                console.warn('Error removing survey marker:', e);
            }
        });
        markersRef.current = [];

        // Add new survey markers
        surveyPoints.forEach((point) => {
            const { lat, lng, type, title, timestamp, details } = point;
            
            const icon = createCustomIcon(type);

            const marker = L.marker([lat, lng], {
                icon: icon,
                title: title
            }).addTo(mapInstance.current);

            // Create detailed popup content
            let popupContent = `
                <div style="padding: 12px; max-width: 280px; font-family: Arial, sans-serif;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <div style="
                            width: 16px; 
                            height: 16px; 
                            background-color: ${type === 'existing' ? '#DC2626' : '#2563EB'}; 
                            border-radius: 50%; 
                            margin-right: 8px;
                        "></div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                            ${type === 'existing' ? 'Survey Existing' : 'Survey APJ Propose'}
                        </h3>
                    </div>
            `;

            if (type === 'existing' && details) {
                popupContent += `
                    <div style="margin-bottom: 8px;">
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Nama Jalan:</strong> ${details.namaJalan}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Kepemilikan:</strong> ${details.kepemilikan}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Jenis Tiang:</strong> ${details.jenisTiang}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Trafo:</strong> ${details.trafo}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Lampu:</strong> ${details.lampu}</p>
                    </div>
                `;
            } else if (type === 'propose' && details) {
                popupContent += `
                    <div style="margin-bottom: 8px;">
                        <p style="margin: 2px 0; font-size: 13px;"><strong>ID Titik:</strong> ${details.idTitik}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Data Daya:</strong> ${details.dataDaya}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Data Tiang:</strong> ${details.dataTiang}</p>
                    </div>
                `;
            }

            // Add status and validation info
            if (details) {
                const statusColor = details.isValidated ? '#34A853' : '#FFA500';
                const statusText = details.isValidated ? 'Tervalidasi' : 'Menunggu Validasi';
                
                popupContent += `
                    <div style="
                        padding: 4px 8px; 
                        background-color: ${statusColor}; 
                        color: white; 
                        border-radius: 4px; 
                        font-size: 11px; 
                        font-weight: bold;
                        text-align: center;
                        margin-bottom: 8px;
                    ">
                        ${statusText}
                    </div>
                `;
            }

            popupContent += `
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #666; border-top: 1px solid #eee; padding-top: 8px;">
                        ${timestamp ? new Date(timestamp.seconds * 1000).toLocaleString('id-ID') : 'Waktu tidak tersedia'}
                    </p>
                </div>
            `;

            marker.bindPopup(popupContent);
            markersRef.current.push(marker);
        });

        // Auto focus to latest marker when available (open popup and fit bounds)
        if (markersRef.current.length > 0) {
            try {
                const latlngs = markersRef.current.map(m => m.getLatLng());
                const bounds = L.latLngBounds(latlngs);
                safeFitBounds(bounds, { padding: [20, 20] });
                // Open the last marker's popup (latest point)
                const lastMarker = markersRef.current[markersRef.current.length - 1];
                if (lastMarker && mapInstance.current) {
                    try { lastMarker.openPopup(); } catch (_) {}
                }
            } catch (e) {
                console.warn('Error auto-focusing to markers:', e);
            }
        }
    }, [surveyPoints]);

    // Helper function to format duration
    const formatDuration = (minutes) => {
        if (!minutes) return 'Tidak tersedia';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cleanup markers
            markersRef.current.forEach(marker => {
                try {
                    if (mapInstance.current) {
                        mapInstance.current.removeLayer(marker);
                    }
                } catch (e) {
                    console.warn('Error cleaning up marker:', e);
                }
            });
            markersRef.current = [];

            // Cleanup map
            if (mapInstance.current) {
                try {
                    mapInstance.current.stop?.();
                    mapInstance.current.remove();
                } catch (e) {
                    console.warn('Error cleaning up map:', e);
                }
                mapInstance.current = null;
            }
        };
    }, []);

    return (
        <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ 
                height: '100%',
                zIndex: 1
            }}
        />
    );
};

export default SurveyorMapsLeaflet;
