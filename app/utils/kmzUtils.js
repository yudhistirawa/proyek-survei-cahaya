/**
 * KMZ/KML Utility Functions
 * Helper functions for parsing KMZ files and converting coordinates for Leaflet
 */

/**
 * Parse KMZ file and extract KML content
 * @param {File|Blob} kmzFile - KMZ file to parse
 * @returns {Promise<string>} KML content as string
 */
export async function extractKMLFromKMZ(kmzFile) {
  try {
    console.log('KMZUtils: Extracting KML from KMZ file...');
    
    // Import JSZip dynamically
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Load the KMZ (ZIP) file
    const zipContent = await zip.loadAsync(kmzFile);
    console.log('KMZUtils: ZIP loaded, files:', Object.keys(zipContent.files));

    // Find KML file inside KMZ
    const kmlFileName = Object.keys(zipContent.files).find(name => 
      name.toLowerCase().endsWith('.kml') || name === 'doc.kml'
    );

    if (!kmlFileName) {
      throw new Error('No KML file found in KMZ archive');
    }

    console.log('KMZUtils: Found KML file:', kmlFileName);

    // Extract KML content
    const kmlContent = await zipContent.files[kmlFileName].async('text');
    console.log('KMZUtils: KML content extracted, length:', kmlContent.length);

    return kmlContent;
  } catch (error) {
    console.error('KMZUtils: Error extracting KML from KMZ:', error);
    throw error;
  }
}

/**
 * Parse KML content and extract polygon coordinates
 * @param {string} kmlContent - KML XML content
 * @returns {Promise<Array>} Array of polygon objects with coordinates
 */
export async function parseKMLPolygons(kmlContent) {
  try {
    console.log('KMZUtils: Parsing KML polygons...');
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid KML format: ' + parserError.textContent);
    }

    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    console.log('KMZUtils: Found', placemarks.length, 'placemarks');

    const polygons = [];

    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];
      const name = getElementText(placemark, 'name') || `Placemark ${i + 1}`;
      const description = getElementText(placemark, 'description') || '';

      console.log(`KMZUtils: Processing placemark ${i + 1}: ${name}`);

      // Handle Polygon elements specifically
      const polygonElements = placemark.getElementsByTagName('Polygon');
      if (polygonElements.length > 0) {
        console.log(`KMZUtils: Found ${polygonElements.length} polygon(s) in placemark ${i + 1}`);
        
        for (let j = 0; j < polygonElements.length; j++) {
          const polygonElement = polygonElements[j];
          const polygonCoords = extractPolygonCoordinates(polygonElement);
          
          if (polygonCoords.length > 0) {
            console.log(`KMZUtils: Adding polygon "${name}" with ${polygonCoords.length} coordinates`);
            polygons.push({
              name,
              description,
              coordinates: polygonCoords
            });
          } else {
            console.warn(`KMZUtils: Polygon "${name}" has no valid coordinates`);
          }
        }
      }
    }

    console.log('KMZUtils: Parsed', polygons.length, 'polygons');
    return polygons;
  } catch (error) {
    console.error('KMZUtils: Error parsing KML polygons:', error);
    throw error;
  }
}

/**
 * Extract polygon coordinates from polygon element
 * @param {Element} polygonElement - Polygon XML element
 * @returns {Array} Array of coordinate objects {lat, lng, alt}
 */
function extractPolygonCoordinates(polygonElement) {
  try {
    console.log('KMZUtils: Extracting polygon coordinates from element:', polygonElement.tagName);
    
    // Look for outerBoundaryIs > LinearRing > coordinates
    let outerBoundary = polygonElement.querySelector('outerBoundaryIs LinearRing coordinates');
    
    if (!outerBoundary) {
      // Try alternative selectors
      outerBoundary = polygonElement.querySelector('LinearRing coordinates');
    }
    
    if (!outerBoundary) {
      // Try direct coordinates
      outerBoundary = polygonElement.querySelector('coordinates');
    }

    if (outerBoundary) {
      console.log('KMZUtils: Found coordinates in polygon:', outerBoundary.textContent.substring(0, 100) + '...');
      const coords = parseCoordinateString(outerBoundary.textContent.trim());
      console.log('KMZUtils: Parsed', coords.length, 'coordinates for polygon');
      
      // Ensure polygon is closed (first and last point are the same)
      if (coords.length > 0) {
        const firstCoord = coords[0];
        const lastCoord = coords[coords.length - 1];
        
        if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
          coords.push({ ...firstCoord });
          console.log('KMZUtils: Closed polygon by adding first point at the end');
        }
      }
      
      return coords;
    }

    console.warn('KMZUtils: No coordinates found in polygon element');
    return [];
  } catch (error) {
    console.warn('KMZUtils: Error extracting polygon coordinates:', error);
    return [];
  }
}

/**
 * Parse coordinate string into array of coordinate objects
 * @param {string} coordText - Coordinate string from KML
 * @returns {Array} Array of {lat, lng, alt} objects
 */
function parseCoordinateString(coordText) {
  try {
    if (!coordText || typeof coordText !== 'string') return [];

    console.log('KMZUtils: Parsing coordinate string:', coordText.substring(0, 100) + '...');

    // Split by whitespace and filter empty strings
    const coordPairs = coordText.split(/[\s\n\r\t]+/).filter(pair => pair.trim());

    console.log('KMZUtils: Found', coordPairs.length, 'coordinate pairs');

    const coordinates = [];

    for (const pair of coordPairs) {
      const parts = pair.split(',').map(part => part.trim());
      
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const alt = parts.length > 2 ? parseFloat(parts[2]) : 0;

        // Validate coordinates
        if (!isNaN(lat) && !isNaN(lng) && 
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180) {
          coordinates.push({ lat, lng, alt: alt || 0 });
        } else {
          console.warn('KMZUtils: Invalid coordinates:', { lng, lat, alt, original: pair });
        }
      } else {
        console.warn('KMZUtils: Invalid coordinate pair format:', pair);
      }
    }

    console.log('KMZUtils: Successfully parsed', coordinates.length, 'valid coordinates');
    return coordinates;
  } catch (error) {
    console.warn('KMZUtils: Error parsing coordinate string:', error);
    return [];
  }
}

/**
 * Convert coordinate objects to Leaflet format [lat, lng]
 * @param {Array} coordinates - Array of {lat, lng, alt} objects
 * @returns {Array} Array of [lat, lng] arrays for Leaflet
 */
export function convertToLeafletFormat(coordinates) {
  return coordinates.map(coord => [coord.lat, coord.lng]);
}

/**
 * Get text content from XML element
 * @param {Element} parent - Parent element
 * @param {string} tagName - Tag name to find
 * @returns {string} Text content or empty string
 */
function getElementText(parent, tagName) {
  const element = parent.getElementsByTagName(tagName)[0];
  return element ? element.textContent.trim() : '';
}

/**
 * Create Leaflet polygon from polygon data
 * @param {Object} polygonData - Polygon data with coordinates
 * @param {Object} options - Leaflet polygon options
 * @returns {Object} Leaflet polygon configuration
 */
export function createLeafletPolygon(polygonData, options = {}) {
  const defaultOptions = {
    color: 'blue',
    weight: 2,
    opacity: 0.8,
    fillColor: 'blue',
    fillOpacity: 0.2
  };

  const leafletCoords = convertToLeafletFormat(polygonData.coordinates);
  
  return {
    coordinates: leafletCoords,
    options: { ...defaultOptions, ...options },
    name: polygonData.name,
    description: polygonData.description
  };
}

/**
 * Parse KMZ file and return Leaflet-ready polygon data
 * @param {File|Blob} kmzFile - KMZ file to parse
 * @returns {Promise<Array>} Array of Leaflet polygon configurations
 */
export async function parseKMZForLeaflet(kmzFile) {
  try {
    console.log('KMZUtils: Parsing KMZ for Leaflet...');
    
    // Extract KML content from KMZ
    const kmlContent = await extractKMLFromKMZ(kmzFile);
    
    // Parse polygons from KML
    const polygons = await parseKMLPolygons(kmlContent);
    
    // Convert to Leaflet format
    const leafletPolygons = polygons.map(polygon => createLeafletPolygon(polygon));
    
    console.log('KMZUtils: Created', leafletPolygons.length, 'Leaflet polygons');
    return leafletPolygons;
  } catch (error) {
    console.error('KMZUtils: Error parsing KMZ for Leaflet:', error);
    throw error;
  }
}
