import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'Parameter url diperlukan' }, { status: 400 });
    }

    console.log('🔄 Parsing KMZ from URL:', url);

    // Fetch the KMZ file
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/octet-stream' },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch KMZ file:', response.status, response.statusText);
      return NextResponse.json({ 
        error: 'Gagal mengambil file KMZ', 
        details: `HTTP ${response.status}` 
      }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Parse KMZ file using JSZip and DOMParser
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(arrayBuffer);

    // Find KML file in the ZIP
    let kmlContent = null;
    for (const filename in zipContent.files) {
      if (filename.toLowerCase().endsWith('.kml')) {
        kmlContent = await zipContent.files[filename].async('text');
        break;
      }
    }

    if (!kmlContent) {
      return NextResponse.json({ 
        error: 'File KML tidak ditemukan dalam KMZ' 
      }, { status: 400 });
    }

    // Parse KML content
    const parser = new DOMParser();
    const kmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    const result = {
      coordinates: [],
      polygons: [],
      lines: []
    };

    // Extract Placemarks
    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const name = placemark.getElementsByTagName('name')[0]?.textContent || `Feature ${i + 1}`;
      
      // Extract Point coordinates
      const points = placemark.getElementsByTagName('Point');
      for (let j = 0; j < points.length; j++) {
        const coordinatesElement = points[j].getElementsByTagName('coordinates')[0];
        if (coordinatesElement) {
          const coordText = coordinatesElement.textContent.trim();
          const coords = coordText.split(',');
          if (coords.length >= 2) {
            const lng = parseFloat(coords[0]);
            const lat = parseFloat(coords[1]);
            const alt = coords.length > 2 ? parseFloat(coords[2]) : 0;
            
            if (!isNaN(lat) && !isNaN(lng)) {
              result.coordinates.push({
                lat,
                lng,
                alt,
                name
              });
            }
          }
        }
      }

      // Extract Polygon coordinates
      const polygons = placemark.getElementsByTagName('Polygon');
      for (let j = 0; j < polygons.length; j++) {
        const outerBoundary = polygons[j].getElementsByTagName('outerBoundaryIs')[0];
        if (outerBoundary) {
          const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
          if (linearRing) {
            const coordinatesElement = linearRing.getElementsByTagName('coordinates')[0];
            if (coordinatesElement) {
              const coordText = coordinatesElement.textContent.trim();
              const coordPairs = coordText.split(/\s+/);
              const coordinates = [];
              
              for (const pair of coordPairs) {
                const coords = pair.split(',');
                if (coords.length >= 2) {
                  const lng = parseFloat(coords[0]);
                  const lat = parseFloat(coords[1]);
                  const alt = coords.length > 2 ? parseFloat(coords[2]) : 0;
                  
                  if (!isNaN(lat) && !isNaN(lng)) {
                    coordinates.push({ lat, lng, alt });
                  }
                }
              }
              
              if (coordinates.length > 0) {
                result.polygons.push({
                  name,
                  coordinates
                });
              }
            }
          }
        }
      }

      // Extract LineString coordinates
      const lineStrings = placemark.getElementsByTagName('LineString');
      for (let j = 0; j < lineStrings.length; j++) {
        const coordinatesElement = lineStrings[j].getElementsByTagName('coordinates')[0];
        if (coordinatesElement) {
          const coordText = coordinatesElement.textContent.trim();
          const coordPairs = coordText.split(/\s+/);
          const coordinates = [];
          
          for (const pair of coordPairs) {
            const coords = pair.split(',');
            if (coords.length >= 2) {
              const lng = parseFloat(coords[0]);
              const lat = parseFloat(coords[1]);
              const alt = coords.length > 2 ? parseFloat(coords[2]) : 0;
              
              if (!isNaN(lat) && !isNaN(lng)) {
                coordinates.push({ lat, lng, alt });
              }
            }
          }
          
          if (coordinates.length > 0) {
            result.lines.push({
              name,
              coordinates
            });
          }
        }
      }
    }

    console.log('✅ KMZ parsed successfully:', {
      coordinates: result.coordinates.length,
      polygons: result.polygons.length,
      lines: result.lines.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error parsing KMZ:', error);
    return NextResponse.json({
      error: 'Gagal memparse file KMZ',
      details: error.message
    }, { status: 500 });
  }
}
