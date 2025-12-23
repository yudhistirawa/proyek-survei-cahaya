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

const MiniMapsLeaflet = ({ currentLocation, surveyPoints, surveyorProgressPoints, taskPolygons, routePoints, isExpanded, onMapLoaded, onMapError, kmzData }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef([]);
    const surveyorProgressMarkersRef = useRef([]);
    const polygonsRef = useRef([]);
    const kmzMarkersRef = useRef([]);
    const kmzPolygonsRef = useRef([]);
    const kmzPolylinesRef = useRef([]);
    const userLocationMarker = useRef(null);
    const userLocationCircle = useRef(null);
    const routePolylineRef = useRef(null);
    // Track interaction/auto-fit state to avoid repeated auto-resets
    const hasCenteredOnUserRef = useRef(false);
    const hasFittedOnceRef = useRef(false);
    const hasAutoFocusedKmzRef = useRef(false);
    const userInteractedRef = useRef(false);
    const prevMarkerCountRef = useRef(0);
    const watchIdRef = useRef(null);
    const autoFollowRef = useRef(true); // Track if auto-follow is enabled

    // Custom icons untuk markers
    const createCustomIcon = (type) => {
        let color, icon, size, border = '2px solid white';
        
        if (type === 'existing') {
            color = '#DC2626'; // Merah untuk survey existing
            icon = '📍';
            size = 24;
        } else if (type === 'propose') {
            color = '#2563EB'; // Biru untuk survey APJ propose
            icon = '🎯';
            size = 24;
        } else if (type === 'trafo') {
            color = '#10B981'; // Hijau untuk Survey Trafo
            icon = '⚡';
            size = 24;
        } else if (type === 'preview') {
            color = '#F97316'; // Oranye untuk preview
            icon = '👁️';
            size = 22;
            border = '2px dashed white';
        } else if (type === 'progress') {
            color = '#10B981'; // Hijau untuk progress surveyor
            icon = '✓';
            size = 20;
            border = '3px solid white';
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
                    border: ${border}; 
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

    // Initialize map
    useEffect(() => {
        if (!mapRef.current) return;

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

            // Create map instance
            const map = L.map(mapRef.current, {
                center: currentLocation || [-6.2088, 106.8456], // Default to Jakarta
                zoom: 15,
                zoomControl: true,
                attributionControl: false,
                dragging: true,
                touchZoom: true,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: true,
                tap: true
            });

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                minZoom: 3
            }).addTo(map);

            mapInstance.current = map;

            // Listen to user interactions to stop auto-fitting after the user moves the map
            map.on('dragstart zoomstart pinchstart', () => {
                userInteractedRef.current = true;
                autoFollowRef.current = false; // Disable auto-follow when user interacts
                console.log('🚫 MiniMapsLeaflet: Auto-follow disabled due to user interaction');
            });

            // Listen for KMZ data loaded event to trigger auto-focus
            const handleKmzDataLoaded = (event) => {
                console.log('🎯 MiniMapsLeaflet: Received kmzDataLoaded event:', event.detail);
                if (event.detail.autoFocus) {
                    // Reset fitted flag to allow auto-focus
                    hasFittedOnceRef.current = false;
                    hasAutoFocusedKmzRef.current = false;
                    userInteractedRef.current = false;
                    console.log('🎯 MiniMapsLeaflet: Reset flags for KMZ auto-focus');
                    
                    // Force immediate re-evaluation of bounds fitting
                    setTimeout(() => {
                        if (mapInstance.current && event.detail.data) {
                            console.log('🎯 MiniMapsLeaflet: Force triggering bounds fit for KMZ data');
                            // Trigger a re-render by updating a dummy state or force bounds calculation
                            const kmzHasContent = event.detail.data.coordinates?.length > 0 || 
                                                event.detail.data.polygons?.length > 0 || 
                                                event.detail.data.lines?.length > 0;
                            if (kmzHasContent) {
                                // Set auto-focus flag to ensure next useEffect triggers
                                sessionStorage.setItem('miniMapsAutoFocus', 'true');
                            }
                        }
                    }, 100);
                }
            };

            // Listen for user location focus event
            const handleFocusUserLocation = (event) => {
                console.log('🎯 MiniMapsLeaflet: Received focusUserLocation event:', event.detail);
                if (event.detail.location && mapInstance.current) {
                    const { lat, lng } = event.detail.location;
                    console.log('🎯 MiniMapsLeaflet: Focusing on user location:', lat, lng);
                    
                    // Re-enable auto-follow when user manually focuses
                    autoFollowRef.current = true;
                    userInteractedRef.current = false;
                    console.log('✅ MiniMapsLeaflet: Auto-follow re-enabled');
                    
                    // Center map on user location with smooth animation
                    mapInstance.current.setView([lat, lng], 16, {
                        animate: true,
                        duration: 1.0
                    });
                    
                    console.log('✅ MiniMapsLeaflet: Successfully focused on user location');
                }
            };

            // Listen for fit surveyor points event
            const handleFitSurveyorPoints = (event) => {
                console.log('🎯 MiniMapsLeaflet: Received fitSurveyorPoints event:', event.detail);
                if (event.detail.points && Array.isArray(event.detail.points) && event.detail.points.length > 0 && mapInstance.current) {
                    const bounds = [];
                    event.detail.points.forEach(point => {
                        if (point.lat && point.lng) {
                            bounds.push([point.lat, point.lng]);
                        }
                    });
                    
                    if (bounds.length > 0) {
                        console.log('🎯 MiniMapsLeaflet: Fitting map to', bounds.length, 'surveyor points');
                        try {
                            mapInstance.current.fitBounds(bounds, {
                                padding: [30, 30],
                                maxZoom: 16,
                                animate: true
                            });
                            console.log('✅ MiniMapsLeaflet: Successfully fitted bounds to surveyor points');
                        } catch (e) {
                            console.warn('Error fitting bounds to surveyor points:', e);
                        }
                    }
                }
            };

            window.addEventListener('kmzDataLoaded', handleKmzDataLoaded);
            window.addEventListener('focusUserLocation', handleFocusUserLocation);
            window.addEventListener('fitSurveyorPoints', handleFitSurveyorPoints);

            // Trigger map loaded callback
            if (onMapLoaded) {
                onMapLoaded();
            }

            // Store cleanup functions for event listeners
            mapInstance.current._kmzDataLoadedHandler = handleKmzDataLoaded;
            mapInstance.current._focusUserLocationHandler = handleFocusUserLocation;
            mapInstance.current._fitSurveyorPointsHandler = handleFitSurveyorPoints;

            // Cleanup function
            return () => {
                // Stop watching location
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                    watchIdRef.current = null;
                    console.log('🛑 MiniMapsLeaflet: Stopped watching location');
                }
                
                // Remove event listeners
                if (mapInstance.current && mapInstance.current._kmzDataLoadedHandler) {
                    window.removeEventListener('kmzDataLoaded', mapInstance.current._kmzDataLoadedHandler);
                }
                if (mapInstance.current && mapInstance.current._focusUserLocationHandler) {
                    window.removeEventListener('focusUserLocation', mapInstance.current._focusUserLocationHandler);
                }
                if (mapInstance.current && mapInstance.current._fitSurveyorPointsHandler) {
                    window.removeEventListener('fitSurveyorPoints', mapInstance.current._fitSurveyorPointsHandler);
                }
                
                if (mapInstance.current) {
                    try {
                        mapInstance.current.remove();
                    } catch (e) {
                        console.warn('Error removing map during cleanup:', e);
                    }
                    mapInstance.current = null;
                }
            };
        } catch (error) {
            console.error('Error initializing Leaflet map:', error);
            if (onMapError) {
                onMapError('Gagal memuat peta: ' + error.message);
            }
        }
    }, []);

    // Update user location
    useEffect(() => {
        if (!mapInstance.current || !currentLocation) return;

        const { lat, lng } = currentLocation;

        // Remove existing user location markers
        if (userLocationMarker.current) {
            try {
                mapInstance.current.removeLayer(userLocationMarker.current);
            } catch (e) {
                console.warn('Error removing user location marker:', e);
            }
            userLocationMarker.current = null;
        }
        if (userLocationCircle.current) {
            try {
                mapInstance.current.removeLayer(userLocationCircle.current);
            } catch (e) {
                console.warn('Error removing user location circle:', e);
            }
            userLocationCircle.current = null;
        }

        // Create user location marker
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div style="
                    width: 24px; 
                    height: 24px; 
                    background-color: #4285F4; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">
                    <div style="
                        width: 8px; 
                        height: 8px; 
                        background-color: white; 
                        border-radius: 50%;
                    "></div>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        userLocationMarker.current = L.marker([lat, lng], {
            icon: userIcon,
            title: 'Lokasi Anda'
        }).addTo(mapInstance.current);

        // Add accuracy circle
        userLocationCircle.current = L.circle([lat, lng], {
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.1,
            radius: 50 // 50 meter radius
        }).addTo(mapInstance.current);

        // Center map on user location if auto-follow is enabled
        if (autoFollowRef.current) {
            mapInstance.current.setView([lat, lng], mapInstance.current.getZoom(), {
                animate: true,
                duration: 0.5
            });
            console.log('📍 MiniMapsLeaflet: Auto-following user to:', lat, lng);
        } else if (!hasCenteredOnUserRef.current) {
            // Initial center only
            mapInstance.current.setView([lat, lng], 15);
            hasCenteredOnUserRef.current = true;
        }

    }, [currentLocation]);

    // Update survey points
    useEffect(() => {
        if (!mapInstance.current) return;

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
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Nama Jalan:</strong> ${details.namaJalan || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Kepemilikan:</strong> ${details.kepemilikan || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Jenis Tiang:</strong> ${details.jenisTiang || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Trafo:</strong> ${details.trafo || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Lampu:</strong> ${details.lampu || 'Tidak tersedia'}</p>
                        ${details.jumlahLampu ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Jumlah Lampu:</strong> ${details.jumlahLampu}</p>` : ''}
                        ${details.jenisLampu ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Jenis Lampu:</strong> ${details.jenisLampu}</p>` : ''}
                        ${details.tinggiARM ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Tinggi ARM:</strong> ${details.tinggiARM}</p>` : ''}
                        ${details.keterangan && details.keterangan !== 'Tidak ada keterangan' ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Keterangan:</strong> ${details.keterangan}</p>` : ''}
                    </div>
                `;
            } else if (type === 'propose' && details) {
                popupContent += `
                    <div style="margin-bottom: 8px;">
                        <p style="margin: 2px 0; font-size: 13px;"><strong>ID Titik:</strong> ${details.idTitik || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Data Daya:</strong> ${details.dataDaya || 'Tidak tersedia'}</p>
                        <p style="margin: 2px 0; font-size: 13px;"><strong>Data Tiang:</strong> ${details.dataTiang || 'Tidak tersedia'}</p>
                        ${details.namaJalan ? `<p style="margin: 2px 0; font-size: 13px;"><strong>Nama Jalan:</strong> ${details.namaJalan}</p>` : ''}
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

    }, [surveyPoints]);

    // Update surveyor progress points
    useEffect(() => {
        if (!mapInstance.current) return;

        console.log('🗺️ MiniMapsLeaflet: Updating surveyor progress points, received:', surveyorProgressPoints);

        // Remove existing progress markers
        surveyorProgressMarkersRef.current.forEach(marker => {
            try {
                mapInstance.current.removeLayer(marker);
            } catch (e) {
                console.warn('Error removing progress marker:', e);
            }
        });
        surveyorProgressMarkersRef.current = [];

        // Add new progress markers
        if (surveyorProgressPoints && Array.isArray(surveyorProgressPoints) && surveyorProgressPoints.length > 0) {
            console.log('📍 MiniMapsLeaflet: Rendering', surveyorProgressPoints.length, 'surveyor progress points');
            
            const bounds = [];
            
            surveyorProgressPoints.forEach((point, index) => {
                const { lat, lng, name, description, timestamp } = point;
                
                console.log(`  Point ${index + 1}:`, { lat, lng, name });
                
                const icon = createCustomIcon('progress');

                const marker = L.marker([lat, lng], {
                    icon: icon,
                    title: name || `Progress ${index + 1}`
                }).addTo(mapInstance.current);

                bounds.push([lat, lng]);

                // Create popup content for progress points
                const popupContent = `
                    <div style="padding: 12px; max-width: 280px; font-family: Arial, sans-serif;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div style="
                                width: 16px; 
                                height: 16px; 
                                background-color: #10B981; 
                                border-radius: 50%; 
                                margin-right: 8px;
                            "></div>
                            <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">
                                ${name || `Progress ${index + 1}`}
                            </h3>
                        </div>
                        ${description ? `<p style="margin: 4px 0; font-size: 13px; color: #666;">${description}</p>` : ''}
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                            <p style="margin: 2px 0; font-size: 12px;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                            <p style="margin: 2px 0; font-size: 12px;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
                            ${timestamp ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #666;">${new Date(timestamp).toLocaleString('id-ID')}</p>` : ''}
                        </div>
                        <div style="
                            padding: 4px 8px; 
                            background-color: #10B981; 
                            color: white; 
                            border-radius: 4px; 
                            font-size: 11px; 
                            font-weight: bold;
                            text-align: center;
                            margin-top: 8px;
                        ">
                            ✓ Progress Tersimpan
                        </div>
                    </div>
                `;

                marker.bindPopup(popupContent);
                surveyorProgressMarkersRef.current.push(marker);
            });

            console.log('✅ MiniMapsLeaflet: Rendered', surveyorProgressPoints.length, 'progress points');
            
            // Auto-fit map to show all progress points
            if (bounds.length > 0 && !userInteractedRef.current) {
                try {
                    console.log('🎯 MiniMapsLeaflet: Auto-fitting map to show all progress points');
                    mapInstance.current.fitBounds(bounds, {
                        padding: [30, 30],
                        maxZoom: 16
                    });
                } catch (e) {
                    console.warn('Error fitting bounds to progress points:', e);
                }
            }
        } else {
            console.log('⚠️ MiniMapsLeaflet: No surveyor progress points to render');
        }

    }, [surveyorProgressPoints]);

    // Update task polygons (same format as KMZMapComponent)
    useEffect(() => {
        if (!mapInstance.current || !taskPolygons) return;

        // Remove existing polygons
        polygonsRef.current.forEach(polygon => {
            try {
                mapInstance.current.removeLayer(polygon);
            } catch (e) {
                console.warn('Error removing polygon:', e);
            }
        });
        polygonsRef.current = [];

        console.log('Rendering task polygons:', taskPolygons);
        
        // Log style information from KMZ
        if (taskPolygons.coordinates && taskPolygons.coordinates.length > 0) {
            console.log('📌 KMZ Coordinates styles:', taskPolygons.coordinates.map(c => c.style));
        }
        if (taskPolygons.polygons && taskPolygons.polygons.length > 0) {
            console.log('📐 KMZ Polygons styles:', taskPolygons.polygons.map(p => p.style));
        }
        if (taskPolygons.lines && taskPolygons.lines.length > 0) {
            console.log('📏 KMZ Lines styles:', taskPolygons.lines.map(l => l.style));
        }

        // Handle coordinates (same as KMZMapComponent)
        if (taskPolygons.coordinates && taskPolygons.coordinates.length > 0) {
            console.log('Adding coordinates as markers:', taskPolygons.coordinates.length);
            
            taskPolygons.coordinates.forEach((coord, index) => {
                try {
                    // PRIORITAS: Gunakan warna dari KMZ file
                    const markerColor = coord.style?.fillColor || coord.style?.strokeColor || '#3B82F6';
                    const markerBorder = coord.style?.strokeColor || '#ffffff';
                    
                    const marker = L.marker([coord.lat, coord.lng], {
                        icon: L.divIcon({
                            className: 'task-coordinate-marker',
                            html: `
                                <div style="
                                    width: 20px; 
                                    height: 20px; 
                                    background-color: ${markerColor}; 
                                    border: 2px solid ${markerBorder}; 
                                    border-radius: 50%; 
                                    display: flex; 
                                    align-items: center; 
                                    justify-content: center; 
                                    color: white; 
                                    font-weight: bold; 
                                    font-size: 10px;
                                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                ">
                                    ${index + 1}
                                </div>
                            `,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(mapInstance.current);

                    // Add popup with detailed info from KMZ
                    const popupContent = `
                        <div style="padding: 10px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
                            <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: ${markerColor}; border-bottom: 2px solid ${markerColor}; padding-bottom: 4px;">
                                📍 ${coord.name || `Titik Koordinat ${index + 1}`}
                            </h3>
                            ${coord.description ? `<p style="margin: 6px 0; font-size: 12px; color: #666; line-height: 1.4;">${coord.description}</p>` : ''}
                            <div style="margin: 8px 0; padding: 6px; background: #F3F4F6; border-radius: 4px;">
                                <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Latitude:</strong> ${coord.lat.toFixed(6)}</p>
                                <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Longitude:</strong> ${coord.lng.toFixed(6)}</p>
                                ${coord.alt ? `<p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Altitude:</strong> ${coord.alt}m</p>` : ''}
                            </div>
                            <a href="https://www.google.com/maps?q=${coord.lat},${coord.lng}" 
                               target="_blank" 
                               style="display: inline-block; margin-top: 6px; padding: 4px 8px; background: ${markerColor}; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                🗺️ Buka di Google Maps
                            </a>
                        </div>
                    `;

                    marker.bindPopup(popupContent);
                    polygonsRef.current.push(marker);
                } catch (error) {
                    console.error('Error adding coordinate marker:', error);
                }
            });
        }

        // Handle polygons (same as KMZMapComponent)
        if (taskPolygons.polygons && taskPolygons.polygons.length > 0) {
            console.log('Adding polygons:', taskPolygons.polygons.length);
            
            taskPolygons.polygons.forEach((polygon, index) => {
                try {
                    if (polygon.coordinates && polygon.coordinates.length > 0) {
                        // Convert coordinates to Leaflet format
                        const coordinates = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
                        
                        // PRIORITAS: Gunakan style dari KMZ file
                        const style = polygon.style || {};
                        // Gunakan warna dari KMZ, jika tidak ada gunakan warna semi-transparan
                        const fillColor = style.fillColor || '#3B82F6';
                        const strokeColor = style.strokeColor || '#2563EB';
                        const fillOpacity = style.fillOpacity !== undefined ? style.fillOpacity : 0.2;
                        const strokeOpacity = style.strokeOpacity !== undefined ? style.strokeOpacity : 0.9;
                        const weight = style.strokeWidth || 3;
                        
                        const leafletPolygon = L.polygon(coordinates, {
                            color: strokeColor,
                            fillColor: fillColor,
                            weight: weight,
                            opacity: strokeOpacity,
                            fillOpacity: fillOpacity
                        }).addTo(mapInstance.current);

                        // Add popup
                        const centerLat = coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length;
                        const centerLng = coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length;
                        
                        const popupContent = `
                            <div style="padding: 10px; max-width: 260px; font-family: system-ui, -apple-system, sans-serif;">
                                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #059669; border-bottom: 2px solid #059669; padding-bottom: 4px;">
                                    🗺️ ${polygon.name || `Area Tugas ${index + 1}`}
                                </h3>
                                ${polygon.description ? `<p style="margin: 6px 0; font-size: 12px; color: #666; font-style: italic;">${polygon.description}</p>` : ''}
                                <div style="margin: 8px 0; padding: 6px; background: #F3F4F6; border-radius: 4px;">
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Titik Koordinat:</strong> ${coordinates.length}</p>
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;">
                                        <strong>Warna:</strong> 
                                        <span style="display: inline-block; width: 14px; height: 14px; background: ${fillColor}; border: 2px solid ${strokeColor}; vertical-align: middle; margin-left: 4px; border-radius: 2px;"></span>
                                    </p>
                                </div>
                                <a href="https://www.google.com/maps?q=${centerLat},${centerLng}" 
                                   target="_blank" 
                                   style="display: inline-block; margin-top: 6px; padding: 4px 8px; background: #059669; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                    🗺️ Buka di Google Maps
                                </a>
                            </div>
                        `;

                        leafletPolygon.bindPopup(popupContent);
                        polygonsRef.current.push(leafletPolygon);
                    }
                } catch (error) {
                    console.error('Error adding polygon:', error);
                }
            });
        }

        // Handle lines (same as KMZMapComponent)
        if (taskPolygons.lines && taskPolygons.lines.length > 0) {
            console.log('Adding lines:', taskPolygons.lines.length);
            
            taskPolygons.lines.forEach((line, index) => {
                try {
                    if (line.coordinates && line.coordinates.length > 0) {
                        // Convert coordinates to Leaflet format
                        const coordinates = line.coordinates.map(coord => [coord.lat, coord.lng]);
                        
                        // PRIORITAS: Gunakan style dari KMZ file
                        const style = line.style || {};
                        // Gunakan warna dari KMZ file
                        const color = style.strokeColor || '#3B82F6';
                        const weight = style.strokeWidth || 3;
                        const opacity = style.strokeOpacity !== undefined ? style.strokeOpacity : 0.9;
                        
                        const polyline = L.polyline(coordinates, {
                            color: color,
                            weight: weight,
                            opacity: opacity
                        }).addTo(mapInstance.current);

                        // Add popup
                        const midIndex = Math.floor(coordinates.length / 2);
                        const midLat = coordinates[midIndex][0];
                        const midLng = coordinates[midIndex][1];
                        
                        const popupContent = `
                            <div style="padding: 10px; max-width: 260px; font-family: system-ui, -apple-system, sans-serif;">
                                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 4px;">
                                    📏 ${line.name || `Garis Tugas ${index + 1}`}
                                </h3>
                                ${line.description ? `<p style="margin: 6px 0; font-size: 12px; color: #666; font-style: italic;">${line.description}</p>` : ''}
                                <div style="margin: 8px 0; padding: 6px; background: #F3F4F6; border-radius: 4px;">
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Titik Koordinat:</strong> ${coordinates.length}</p>
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;">
                                        <strong>Warna:</strong> 
                                        <span style="display: inline-block; width: 20px; height: 3px; background: ${color}; vertical-align: middle; margin-left: 4px; border-radius: 1px;"></span>
                                    </p>
                                </div>
                                <a href="https://www.google.com/maps?q=${midLat},${midLng}" 
                                   target="_blank" 
                                   style="display: inline-block; margin-top: 6px; padding: 4px 8px; background: #7C3AED; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                    🗺️ Buka di Google Maps
                                </a>
                            </div>
                        `;

                        polyline.bindPopup(popupContent);
                        polygonsRef.current.push(polyline);
                    }
                } catch (error) {
                    console.error('Error adding line:', error);
                }
            });
        }

        // Handle GeoJSON format (fallback)
        if (Array.isArray(taskPolygons)) {
            taskPolygons.forEach((polygonData, index) => {
                try {
                    if (polygonData.type === 'Polygon' && polygonData.coordinates) {
                        // Convert GeoJSON coordinates to Leaflet format
                        const coordinates = polygonData.coordinates[0].map(coord => [coord[1], coord[0]]);
                        
                        const polygon = L.polygon(coordinates, {
                            color: '#8B5CF6',
                            weight: 2,
                            opacity: 0.8,
                            fillColor: '#8B5CF6',
                            fillOpacity: 0.1
                        }).addTo(mapInstance.current);

                        const popupContent = `
                            <div style="padding: 8px; max-width: 200px;">
                                <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">Area Tugas</h3>
                                <p style="margin: 0; font-size: 12px; color: #666;">
                                    ${polygonData.name || `Area ${index + 1}`}
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">
                                    Koordinat: ${coordinates.length} titik
                                </p>
                            </div>
                        `;

                        polygon.bindPopup(popupContent);
                        polygonsRef.current.push(polygon);
                    } else if (polygonData.type === 'Point' && polygonData.coordinates) {
                        const [lng, lat] = polygonData.coordinates;
                        
                        const pointMarker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'task-point-marker',
                                html: `
                                    <div style="
                                        width: 16px; 
                                        height: 16px; 
                                        background-color: #8B5CF6; 
                                        border: 2px solid white; 
                                        border-radius: 50%; 
                                        display: flex; 
                                        align-items: center; 
                                        justify-content: center; 
                                        color: white; 
                                        font-weight: bold; 
                                        font-size: 8px;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                                    ">
                                        T
                                    </div>
                                `,
                                iconSize: [16, 16],
                                iconAnchor: [8, 8]
                            })
                        }).addTo(mapInstance.current);

                        const popupContent = `
                            <div style="padding: 10px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
                                <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600; color: #8B5CF6; border-bottom: 2px solid #8B5CF6; padding-bottom: 4px;">
                                    📍 ${polygonData.name || `Titik Tugas ${index + 1}`}
                                </h3>
                                ${polygonData.description ? `<p style="margin: 6px 0; font-size: 12px; color: #666; font-style: italic;">${polygonData.description}</p>` : ''}
                                <div style="margin: 8px 0; padding: 6px; background: #F3F4F6; border-radius: 4px;">
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                                    <p style="margin: 2px 0; font-size: 12px; color: #374151;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
                                </div>
                                <a href="https://www.google.com/maps?q=${lat},${lng}" 
                                   target="_blank" 
                                   style="display: inline-block; margin-top: 6px; padding: 4px 8px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 500;">
                                    🗺️ Buka di Google Maps
                                </a>
                            </div>
                        `;

                        pointMarker.bindPopup(popupContent);
                        polygonsRef.current.push(pointMarker);
                    }
                } catch (error) {
                    console.error('Error adding polygon/point:', error);
                }
            });
        }
    }, [taskPolygons]);

    // Update route tracking
    useEffect(() => {
        if (!mapInstance.current || !routePoints || routePoints.length === 0) return;

        // Remove existing route polyline
        if (routePolylineRef.current) {
            try {
                mapInstance.current.removeLayer(routePolylineRef.current);
            } catch (e) {
                console.warn('Error removing route polyline:', e);
            }
            routePolylineRef.current = null;
        }

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

            // Add popup with route info
            const totalDistance = routePoints.reduce((total, point, index) => {
                if (index > 0) {
                    const prevPoint = routePoints[index - 1];
                    const distance = calculateDistance(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
                    return total + distance;
                }
                return total;
            }, 0);

            const popupContent = `
                <div style="padding: 8px; max-width: 200px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">Jejak Surveyor</h3>
                    <p style="margin: 2px 0; font-size: 12px;">Total Jarak: ${totalDistance.toFixed(2)} km</p>
                    <p style="margin: 2px 0; font-size: 12px;">Jumlah Titik: ${routePoints.length}</p>
                    <p style="margin: 2px 0; font-size: 12px;">Durasi: ${getDurationText(routePoints[0]?.timestamp, routePoints[routePoints.length - 1]?.timestamp)}</p>
                    <div style="margin-top: 6px; padding: 4px; background-color: #E3F2FD; border-radius: 4px;">
                        <p style="margin: 0; font-size: 10px; color: #1976D2; font-weight: bold;">📊 Maps_Surveyor Collection</p>
                    </div>
                </div>
            `;

            routePolylineRef.current.bindPopup(popupContent);
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
        };
    }, [routePoints]);

    // Helper function to calculate distance
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Helper function to format duration
    const getDurationText = (startTime, endTime) => {
        if (!startTime || !endTime) return 'Tidak tersedia';
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        if (diffHours > 0) {
            return `${diffHours}j ${remainingMins}m`;
        } else {
            return `${diffMins}m`;
        }
    };

    // Fit bounds when points or polygons change
    useEffect(() => {
        if (!mapInstance.current) return;

        const allLayers = [...markersRef.current, ...polygonsRef.current];
        if (userLocationMarker.current) {
            allLayers.push(userLocationMarker.current);
        }

        const markersCount = markersRef.current.length;
        const prevCount = prevMarkerCountRef.current;
        const hasTaskPolygons = taskPolygons && (
            (taskPolygons.coordinates && taskPolygons.coordinates.length > 0) ||
            (taskPolygons.polygons && taskPolygons.polygons.length > 0) ||
            (taskPolygons.lines && taskPolygons.lines.length > 0)
        );

        // Check for auto-focus flag from task start
        const autoFocusFlag = sessionStorage.getItem('miniMapsAutoFocus');
        const shouldAutoFocus = autoFocusFlag === 'true' || (!userInteractedRef.current && !hasFittedOnceRef.current);

        // Priority 1: Auto-focus on KMZ content when it's first loaded or when auto-focus is requested
        if (hasTaskPolygons && shouldAutoFocus) {
            console.log('🎯 MiniMapsLeaflet: Auto-focusing on KMZ content', { 
                autoFocusFlag, 
                userInteracted: userInteractedRef.current,
                polygonCount: polygonsRef.current.length,
                kmzMarkersCount: kmzMarkersRef.current.length,
                kmzPolylinesCount: kmzPolylinesRef.current.length,
                hasFittedOnce: hasFittedOnceRef.current
            });
            
            try {
                // Collect all KMZ layers for bounds calculation
                const allKmzLayers = [
                    ...polygonsRef.current,
                    ...kmzMarkersRef.current,
                    ...kmzPolylinesRef.current
                ];
                
                if (allKmzLayers.length > 0) {
                    const group = new L.featureGroup(allKmzLayers);
                    const bounds = group.getBounds();
                    
                    if (bounds.isValid()) {
                        // Force fit bounds with enhanced options for better visibility
                        setTimeout(() => {
                            if (mapInstance.current) {
                                mapInstance.current.fitBounds(bounds, {
                                    padding: [15, 15],
                                    maxZoom: 16,
                                    animate: true,
                                    duration: 1.2
                                });
                                console.log('✅ MiniMapsLeaflet: Successfully focused on KMZ bounds with', allKmzLayers.length, 'layers');
                                
                                // Show success notification
                                if (autoFocusFlag === 'true') {
                                    console.log('🎯 MiniMapsLeaflet: KMZ auto-focus completed for task start');
                                }
                            }
                        }, 300);
                        
                        hasFittedOnceRef.current = true;
                        hasAutoFocusedKmzRef.current = true;
                        
                        // Clear auto-focus flag after successful focus
                        if (autoFocusFlag === 'true') {
                            sessionStorage.removeItem('miniMapsAutoFocus');
                            console.log('✅ MiniMapsLeaflet: Cleared auto-focus flag after KMZ focus');
                        }
                    } else {
                        console.warn('⚠️ MiniMapsLeaflet: Invalid bounds for KMZ content');
                    }
                } else {
                    console.warn('⚠️ MiniMapsLeaflet: No KMZ layers available for auto-focus');
                }
            } catch (error) {
                console.error('❌ MiniMapsLeaflet: Error fitting KMZ bounds:', error);
            }
        }
        // Priority 2: Fit when new survey markers have been added, and user hasn't interacted yet
        else if (allLayers.length > 0 && (!userInteractedRef.current) && (!hasFittedOnceRef.current || markersCount > prevCount)) {
            console.log('🗺️ MiniMapsLeaflet: Auto-fitting to show all survey points');
            
            try {
                const group = new L.featureGroup(allLayers);
                const bounds = group.getBounds();
                
                if (bounds.isValid()) {
                    mapInstance.current.fitBounds(bounds, {
                        padding: [20, 20],
                        maxZoom: 16
                    });
                    hasFittedOnceRef.current = true;
                } else {
                    console.warn('⚠️ MiniMapsLeaflet: Invalid bounds for survey points');
                }
            } catch (error) {
                console.error('❌ MiniMapsLeaflet: Error fitting survey bounds:', error);
            }
        }

        // Update previous markers count after fitting calculation
        prevMarkerCountRef.current = markersCount;
    }, [surveyPoints, taskPolygons, currentLocation]);

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

            // Cleanup polygons
            polygonsRef.current.forEach(polygon => {
                try {
                    if (mapInstance.current) {
                        mapInstance.current.removeLayer(polygon);
                    }
                } catch (e) {
                    console.warn('Error cleaning up polygon:', e);
                }
            });
            polygonsRef.current = [];

            // Cleanup user location
            if (userLocationMarker.current && mapInstance.current) {
                try {
                    mapInstance.current.removeLayer(userLocationMarker.current);
                } catch (e) {
                    console.warn('Error cleaning up user location marker:', e);
                }
                userLocationMarker.current = null;
            }

            if (userLocationCircle.current && mapInstance.current) {
                try {
                    mapInstance.current.removeLayer(userLocationCircle.current);
                } catch (e) {
                    console.warn('Error cleaning up user location circle:', e);
                }
                userLocationCircle.current = null;
            }

            // Cleanup event listener
            if (mapInstance.current && mapInstance.current._kmzDataLoadedHandler) {
                try {
                    window.removeEventListener('kmzDataLoaded', mapInstance.current._kmzDataLoadedHandler);
                } catch (e) {
                    console.warn('Error cleaning up kmzDataLoaded listener:', e);
                }
            }

            // Cleanup map
            if (mapInstance.current) {
                try {
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
                height: isExpanded ? '280px' : '180px',
                zIndex: 1
            }}
        />
    );
};

export default MiniMapsLeaflet;
