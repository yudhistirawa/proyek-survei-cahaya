/**
 * KMZ/KML Parser Service
 * Handles parsing of KMZ files and extracting coordinate data
 */

export class KMZParser {
  /**
   * Parse KMZ file from URL and return structured data
   * @param {string} kmzUrl - URL to the KMZ file
   * @returns {Promise<Object>} Parsed map data
   */
  static async parseFromUrl(kmzUrl) {
    try {
      console.log('KMZParser: Starting to parse KMZ from URL:', kmzUrl);
      
      let response;
      let lastError;

      // Determine if URL is local (blob/data) or remote
      const isLocal = kmzUrl.startsWith('blob:') || kmzUrl.startsWith('data:');
      
      if (isLocal) {
        // Direct fetch for local URLs
        try {
          response = await fetch(kmzUrl, {
            method: 'GET',
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          lastError = error;
        }
      } else {
        // Try direct fetch first for remote URLs
        try {
          response = await fetch(kmzUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/octet-stream, application/vnd.google-earth.kmz'
            },
            cache: 'no-store'
          });

          if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.log('KMZParser: Direct fetch failed, trying proxy:', error.message);
          lastError = error;
          
          // If direct fetch fails (likely CORS), use the proxy API
          try {
            const encodedUrl = encodeURIComponent(kmzUrl);
            const base64 = (typeof window !== 'undefined')
              ? window.btoa(encodedUrl)
              : Buffer.from(encodedUrl, 'utf-8').toString('base64');
            
            // Convert to base64url to avoid + / = in querystring
            const b64u = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
            const proxiedUrl = `/api/fetch-kmz?b64u=${b64u}`;
            
            console.log('KMZParser: Using proxy URL:', proxiedUrl);
            
            response = await fetch(proxiedUrl, {
              method: 'GET',
              cache: 'no-store'
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Proxy fetch failed: ${response.status} - ${errorText}`);
            }
          } catch (proxyError) {
            console.error('KMZParser: Proxy fetch also failed:', proxyError);
            throw proxyError;
          }
        }
      }

      if (!response) {
        throw lastError || new Error('Failed to fetch KMZ file');
      }

      const blob = await response.blob();
      console.log('KMZParser: KMZ file fetched, size:', blob.size);

      return await this.parseFromBlob(blob);
    } catch (error) {
      console.error('KMZParser: Error parsing KMZ from URL:', error);
      throw error;
    }
  }

  /**
   * Parse KMZ file from Blob
   * @param {Blob} blob - KMZ file blob
   * @returns {Promise<Object>} Parsed map data
   */
  static async parseFromBlob(blob) {
    try {
      console.log('KMZParser: Parsing KMZ blob, size:', blob.size);

      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Load the KMZ (ZIP) file
      const zipContent = await zip.loadAsync(blob);
      console.log('KMZParser: ZIP loaded, files:', Object.keys(zipContent.files));

      // Find KML file inside KMZ
      const kmlFileName = Object.keys(zipContent.files).find(name => 
        name.toLowerCase().endsWith('.kml') || name === 'doc.kml'
      );

      if (!kmlFileName) {
        throw new Error('No KML file found in KMZ archive');
      }

      console.log('KMZParser: Found KML file:', kmlFileName);

      // Extract KML content
      const kmlContent = await zipContent.files[kmlFileName].async('text');
      console.log('KMZParser: KML content extracted, length:', kmlContent.length);

      // Parse KML content
      return this.parseKMLContent(kmlContent);
    } catch (error) {
      console.error('KMZParser: Error parsing KMZ blob:', error);
      throw error;
    }
  }

  /**
   * Parse KML content and extract coordinates
   * @param {string} kmlContent - KML XML content
   * @param {string} taskType - Type of task ('existing' or 'propose')
   * @returns {Object} Parsed map data
   */
  static parseKMLContent(kmlContent, taskType = 'existing') {
    try {
      console.log('KMZParser: Parsing KML content...');

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Invalid KML format: ' + parserError.textContent);
      }

      const placemarks = xmlDoc.getElementsByTagName('Placemark');
      console.log('KMZParser: Found', placemarks.length, 'placemarks');

      // Debug: Print all geometry types found
      const allGeometries = xmlDoc.querySelectorAll('Polygon, LineString, Point');
      console.log('KMZParser: Found geometries:', {
        polygons: xmlDoc.querySelectorAll('Polygon').length,
        lines: xmlDoc.querySelectorAll('LineString').length,
        points: xmlDoc.querySelectorAll('Point').length
      });

      const coordinates = [];
      const polygons = [];
      const lines = [];
      
      // Check if this is a zone/survey area (multiple points that should form a polygon)
      // For 'existing' tasks, we treat multiple points as polygon
      // For 'propose' tasks, we treat all points as individual coordinates
      const isZoneFile = taskType === 'existing' && (
        kmlContent.toLowerCase().includes('zona') || 
        kmlContent.toLowerCase().includes('zone') || 
        kmlContent.toLowerCase().includes('area') ||
        kmlContent.toLowerCase().includes('survei') ||
        kmlContent.toLowerCase().includes('survey') ||
        placemarks.length >= 3 // If we have 3+ placemarks, likely a zone
      );
      
      console.log('KMZParser: Task type:', taskType, 'Detected zone file:', isZoneFile, 'Placemarks:', placemarks.length);

      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        const name = this.getElementText(placemark, 'name') || `Placemark ${i + 1}`;
        const description = this.getElementText(placemark, 'description') || '';
        
        // Extract style information
        const style = this.extractStyle(placemark, xmlDoc);

        console.log(`KMZParser: Processing placemark ${i + 1}: ${name}`, {
          fillColor: style.fillColor,
          strokeColor: style.strokeColor
        });

        // Handle Polygon elements specifically
        const polygonElements = placemark.getElementsByTagName('Polygon');
        if (polygonElements.length > 0) {
          console.log(`KMZParser: Found ${polygonElements.length} polygon(s) in placemark ${i + 1}`);
          
          for (let j = 0; j < polygonElements.length; j++) {
            const polygonElement = polygonElements[j];
            const polygonCoords = this.extractPolygonCoordinates(polygonElement);
            
            if (polygonCoords.length > 0) {
              console.log(`KMZParser: Adding polygon "${name}" with ${polygonCoords.length} coordinates`);
              polygons.push({
                name,
                description,
                coordinates: polygonCoords,
                style: style // Add style info
              });
            } else {
              console.warn(`KMZParser: Polygon "${name}" has no valid coordinates`);
            }
          }
          continue; // Skip other processing for this placemark
        }

        // Handle LineString elements
        const lineStringElements = placemark.getElementsByTagName('LineString');
        if (lineStringElements.length > 0) {
          console.log(`KMZParser: Found ${lineStringElements.length} lineString(s) in placemark ${i + 1}`);
          
          for (let j = 0; j < lineStringElements.length; j++) {
            const lineStringElement = lineStringElements[j];
            const coordElement = lineStringElement.getElementsByTagName('coordinates')[0];
            
            if (coordElement) {
              const coordText = coordElement.textContent.trim();
              const parsedCoords = this.parseCoordinateString(coordText);
              
              if (parsedCoords.length > 0) {
                console.log(`KMZParser: Adding line "${name}" with ${parsedCoords.length} coordinates`);
                lines.push({
                  name,
                  description,
                  coordinates: parsedCoords,
                  style: style // Add style info
                });
              }
            }
          }
          continue; // Skip other processing for this placemark
        }

        // Handle Point elements
        const pointElements = placemark.getElementsByTagName('Point');
        if (pointElements.length > 0) {
          console.log(`KMZParser: Found ${pointElements.length} point(s) in placemark ${i + 1}`);
          
          for (let j = 0; j < pointElements.length; j++) {
            const pointElement = pointElements[j];
            const coordElement = pointElement.getElementsByTagName('coordinates')[0];
            
            if (coordElement) {
              const coordText = coordElement.textContent.trim();
              const parsedCoords = this.parseCoordinateString(coordText);
              
              if (parsedCoords.length > 0) {
                console.log(`KMZParser: Adding point "${name}" with ${parsedCoords.length} coordinates`);
                // Add style info to each coordinate point
                parsedCoords.forEach(coord => {
                  coordinates.push({
                    ...coord,
                    name,
                    description,
                    style: style
                  });
                });
              }
            }
          }
          continue; // Skip other processing for this placemark
        }

        // Fallback: Look for any coordinates element
        const coordElements = placemark.getElementsByTagName('coordinates');
        if (coordElements.length > 0) {
          console.log(`KMZParser: Found ${coordElements.length} coordinate element(s) in placemark ${i + 1} (fallback)`);
          
          for (let j = 0; j < coordElements.length; j++) {
            const coordElement = coordElements[j];
            const coordText = coordElement.textContent.trim();
            
            if (!coordText) continue;

            const parsedCoords = this.parseCoordinateString(coordText);
            
            if (parsedCoords.length === 0) continue;

            // Determine geometry type based on parent element
            const parent = coordElement.parentElement;
            const geometryType = parent.tagName.toLowerCase();

            console.log(`KMZParser: Found ${geometryType} with ${parsedCoords.length} coordinates (fallback)`);

            switch (geometryType) {
              case 'polygon':
                // Handle polygon (may have outer and inner rings)
                const outerRing = this.extractOuterRing(parent);
                if (outerRing.length > 0) {
                  console.log(`KMZParser: Adding polygon "${name}" with ${outerRing.length} coordinates`);
                  polygons.push({
                    name,
                    description,
                    coordinates: outerRing
                  });
                } else {
                  console.warn(`KMZParser: Polygon "${name}" has no valid outer ring coordinates`);
                }
                break;

              case 'linestring':
                console.log(`KMZParser: Adding line "${name}" with ${parsedCoords.length} coordinates`);
                lines.push({
                  name,
                  description,
                  coordinates: parsedCoords
                });
                break;

              case 'point':
                if (parsedCoords.length > 0) {
                  console.log(`KMZParser: Adding point "${name}" with ${parsedCoords.length} coordinates`);
                  coordinates.push(...parsedCoords);
                }
                break;

              default:
                // Check if this might be a polygon by looking for polygon parent
                const polygonParent = parent.closest('Polygon');
                if (polygonParent) {
                  console.log(`KMZParser: Found coordinates within Polygon, extracting outer ring`);
                  const outerRing = this.extractOuterRing(polygonParent);
                  if (outerRing.length > 0) {
                    console.log(`KMZParser: Adding polygon "${name}" with ${outerRing.length} coordinates`);
                    polygons.push({
                      name,
                      description,
                      coordinates: outerRing
                    });
                  }
                } else {
                  // Default to points if geometry type is unclear
                  console.log(`KMZParser: Adding default point "${name}" with ${parsedCoords.length} coordinates`);
                  coordinates.push(...parsedCoords);
                }
                break;
            }
          }
        }
      }

      // If this is a zone file and we have multiple points but no polygons, convert points to polygon
      // Only for 'existing' tasks - for 'propose' tasks, keep all coordinates as individual points
      if (taskType === 'existing' && isZoneFile && coordinates.length >= 3 && polygons.length === 0) {
        console.log('KMZParser: Converting points to polygon for existing task zone file');
        console.log('KMZParser: Original coordinates count:', coordinates.length);
        
        // Always try to create polygon, even if area validation fails
        try {
          // Sort coordinates to form a proper polygon
          const sortedCoords = this.sortCoordinatesForPolygon([...coordinates]);
          console.log('KMZParser: Sorted coordinates:', sortedCoords.length);
          
          // Close the polygon by adding the first point at the end if it's not already closed
          const polygonCoords = [...sortedCoords];
          const firstCoord = polygonCoords[0];
          const lastCoord = polygonCoords[polygonCoords.length - 1];
          
          if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
            polygonCoords.push({ ...firstCoord });
          }
          
          // Check if coordinates form a valid area
          const isValid = this.isValidArea(polygonCoords);
          console.log('KMZParser: Area validation result:', isValid);
          
          if (isValid || polygonCoords.length >= 3) {
            polygons.push({
              name: 'Zona Survei',
              description: 'Area survei yang dibentuk dari koordinat-koordinat',
              coordinates: polygonCoords
            });
            
            // Clear the individual coordinates since they're now part of the polygon
            coordinates.length = 0;
            
            console.log('KMZParser: Successfully created polygon with', polygonCoords.length, 'coordinates');
          } else {
            console.log('KMZParser: Coordinates do not form a valid area, but creating polygon anyway');
            
            // Force create polygon even if validation fails
            polygons.push({
              name: 'Zona Survei',
              description: 'Area survei yang dibentuk dari koordinat-koordinat',
              coordinates: polygonCoords
            });
            
            // Clear the individual coordinates since they're now part of the polygon
            coordinates.length = 0;
            
            console.log('KMZParser: Forced polygon creation with', polygonCoords.length, 'coordinates');
          }
        } catch (error) {
          console.error('KMZParser: Error creating polygon:', error);
          console.log('KMZParser: Keeping coordinates as points due to error');
        }
      } else if (taskType === 'propose') {
        console.log('KMZParser: Propose task - keeping all coordinates as individual points');
        console.log('KMZParser: Total coordinates count:', coordinates.length);
      }

      const result = {
        coordinates,
        polygons,
        lines,
        center: this.calculateCenter(coordinates, polygons, lines),
        bounds: this.calculateBounds(coordinates, polygons, lines)
      };

      console.log('KMZParser: Parsing complete:', {
        coordinates: result.coordinates.length,
        polygons: result.polygons.length,
        lines: result.lines.length,
        center: result.center
      });

      // Final check: if we still have coordinates but no polygons, force conversion
      // Only for 'existing' tasks - for 'propose' tasks, keep all coordinates as individual points
      if (taskType === 'existing' && result.coordinates.length >= 3 && result.polygons.length === 0) {
        console.log('KMZParser: Final check - forcing polygon creation from remaining coordinates for existing task');
        
        try {
          const sortedCoords = this.sortCoordinatesForPolygon([...result.coordinates]);
          const polygonCoords = [...sortedCoords];
          
          // Close polygon
          const firstCoord = polygonCoords[0];
          const lastCoord = polygonCoords[polygonCoords.length - 1];
          if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
            polygonCoords.push({ ...firstCoord });
          }
          
          result.polygons.push({
            name: 'Zona Survei',
            description: 'Area survei yang dibentuk dari koordinat-koordinat',
            coordinates: polygonCoords
          });
          
          result.coordinates = []; // Clear coordinates
          
          console.log('KMZParser: Final polygon creation successful with', polygonCoords.length, 'coordinates');
        } catch (error) {
          console.error('KMZParser: Final polygon creation failed:', error);
        }
      } else if (taskType === 'propose') {
        console.log('KMZParser: Propose task - final check: keeping', result.coordinates.length, 'coordinates as individual points');
      }

      return result;
    } catch (error) {
      console.error('KMZParser: Error parsing KML content:', error);
      throw error;
    }
  }

  /**
   * Extract polygon coordinates from polygon element
   * @param {Element} polygonElement - Polygon XML element
   * @returns {Array} Array of coordinate objects
   */
  static extractPolygonCoordinates(polygonElement) {
    try {
      console.log('KMZParser: Extracting polygon coordinates from element:', polygonElement.tagName);
      
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
        console.log('KMZParser: Found coordinates in polygon:', outerBoundary.textContent.substring(0, 100) + '...');
        const coords = this.parseCoordinateString(outerBoundary.textContent.trim());
        console.log('KMZParser: Parsed', coords.length, 'coordinates for polygon');
        
        // Ensure polygon is closed (first and last point are the same)
        if (coords.length > 0) {
          const firstCoord = coords[0];
          const lastCoord = coords[coords.length - 1];
          
          if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
            coords.push({ ...firstCoord });
            console.log('KMZParser: Closed polygon by adding first point at the end');
          }
        }
        
        return coords;
      }

      console.warn('KMZParser: No coordinates found in polygon element');
      return [];
    } catch (error) {
      console.warn('KMZParser: Error extracting polygon coordinates:', error);
      return [];
    }
  }

  /**
   * Extract outer ring coordinates from polygon element
   * @param {Element} polygonElement - Polygon XML element
   * @returns {Array} Array of coordinate objects
   */
  static extractOuterRing(polygonElement) {
    try {
      console.log('KMZParser: Extracting outer ring from polygon element:', polygonElement.tagName);
      
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
        console.log('KMZParser: Found coordinates in outer boundary:', outerBoundary.textContent.substring(0, 100) + '...');
        const coords = this.parseCoordinateString(outerBoundary.textContent.trim());
        console.log('KMZParser: Parsed', coords.length, 'coordinates for outer ring');
        
        // Ensure polygon is closed (first and last point are the same)
        if (coords.length > 0) {
          const firstCoord = coords[0];
          const lastCoord = coords[coords.length - 1];
          
          if (firstCoord.lat !== lastCoord.lat || firstCoord.lng !== lastCoord.lng) {
            coords.push({ ...firstCoord });
            console.log('KMZParser: Closed polygon by adding first point at the end');
          }
        }
        
        return coords;
      }

      console.warn('KMZParser: No outer boundary coordinates found');
      return [];
    } catch (error) {
      console.warn('KMZParser: Error extracting outer ring:', error);
      return [];
    }
  }

  /**
   * Parse coordinate string into array of coordinate objects
   * @param {string} coordText - Coordinate string from KML
   * @returns {Array} Array of {lat, lng, alt} objects
   */
  static parseCoordinateString(coordText) {
    try {
      if (!coordText || typeof coordText !== 'string') return [];

      console.log('KMZParser: Parsing coordinate string:', coordText.substring(0, 100) + '...');

      // Split by whitespace and filter empty strings
      const coordPairs = coordText.split(/[\s\n\r\t]+/).filter(pair => pair.trim());

      console.log('KMZParser: Found', coordPairs.length, 'coordinate pairs');

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
            console.warn('KMZParser: Invalid coordinates:', { lng, lat, alt, original: pair });
          }
        } else {
          console.warn('KMZParser: Invalid coordinate pair format:', pair);
        }
      }

      console.log('KMZParser: Successfully parsed', coordinates.length, 'valid coordinates');
      return coordinates;
    } catch (error) {
      console.warn('KMZParser: Error parsing coordinate string:', error);
      return [];
    }
  }

  /**
   * Calculate center point from all coordinates
   * @param {Array} coordinates - Point coordinates
   * @param {Array} polygons - Polygon data
   * @param {Array} lines - Line data
   * @returns {Object|null} Center point {lat, lng}
   */
  static calculateCenter(coordinates, polygons, lines) {
    const allCoords = [...coordinates];

    // Add polygon coordinates
    polygons.forEach(polygon => {
      if (polygon.coordinates) {
        allCoords.push(...polygon.coordinates);
      }
    });

    // Add line coordinates
    lines.forEach(line => {
      if (line.coordinates) {
        allCoords.push(...line.coordinates);
      }
    });

    if (allCoords.length === 0) return null;

    const avgLat = allCoords.reduce((sum, coord) => sum + coord.lat, 0) / allCoords.length;
    const avgLng = allCoords.reduce((sum, coord) => sum + coord.lng, 0) / allCoords.length;

    return { lat: avgLat, lng: avgLng };
  }

  /**
   * Calculate bounds from all coordinates
   * @param {Array} coordinates - Point coordinates
   * @param {Array} polygons - Polygon data
   * @param {Array} lines - Line data
   * @returns {Object|null} Bounds {minLat, maxLat, minLng, maxLng}
   */
  static calculateBounds(coordinates, polygons, lines) {
    const allCoords = [...coordinates];

    // Add polygon coordinates
    polygons.forEach(polygon => {
      if (polygon.coordinates) {
        allCoords.push(...polygon.coordinates);
      }
    });

    // Add line coordinates
    lines.forEach(line => {
      if (line.coordinates) {
        allCoords.push(...line.coordinates);
      }
    });

    if (allCoords.length === 0) return null;

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    allCoords.forEach(coord => {
      minLat = Math.min(minLat, coord.lat);
      maxLat = Math.max(maxLat, coord.lat);
      minLng = Math.min(minLng, coord.lng);
      maxLng = Math.max(maxLng, coord.lng);
    });

    return { minLat, maxLat, minLng, maxLng };
  }

  /**
   * Get text content from XML element
   * @param {Element} parent - Parent element
   * @param {string} tagName - Tag name to find
   * @returns {string} Text content or empty string
   */
  static getElementText(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent.trim() : '';
  }

  /**
   * Extract style information from placemark
   * @param {Element} placemark - Placemark element
   * @param {Document} xmlDoc - XML document
   * @returns {Object} Style information
   */
  static extractStyle(placemark, xmlDoc) {
    const styleInfo = {
      fillColor: null,
      strokeColor: null,
      strokeWidth: 2,
      fillOpacity: 0.3,
      strokeOpacity: 1.0
    };

    try {
      // Check for styleUrl reference
      const styleUrl = this.getElementText(placemark, 'styleUrl');
      if (styleUrl) {
        const styleId = styleUrl.replace('#', '');
        const styleElement = xmlDoc.getElementById(styleId) || 
                           xmlDoc.querySelector(`Style[id="${styleId}"]`);
        
        if (styleElement) {
          this.parseStyleElement(styleElement, styleInfo);
        }
      }

      // Check for inline Style element
      const inlineStyle = placemark.getElementsByTagName('Style')[0];
      if (inlineStyle) {
        this.parseStyleElement(inlineStyle, styleInfo);
      }

    } catch (error) {
      console.warn('Error extracting style:', error);
    }

    return styleInfo;
  }

  /**
   * Parse style element and extract colors
   * @param {Element} styleElement - Style element
   * @param {Object} styleInfo - Style info object to populate
   */
  static parseStyleElement(styleElement, styleInfo) {
    // Parse PolyStyle for fill
    const polyStyle = styleElement.getElementsByTagName('PolyStyle')[0];
    if (polyStyle) {
      const color = this.getElementText(polyStyle, 'color');
      if (color) {
        styleInfo.fillColor = this.kmlColorToHex(color);
        styleInfo.fillOpacity = this.kmlColorToOpacity(color);
      }
    }

    // Parse LineStyle for stroke
    const lineStyle = styleElement.getElementsByTagName('LineStyle')[0];
    if (lineStyle) {
      const color = this.getElementText(lineStyle, 'color');
      if (color) {
        styleInfo.strokeColor = this.kmlColorToHex(color);
        styleInfo.strokeOpacity = this.kmlColorToOpacity(color);
      }
      const width = this.getElementText(lineStyle, 'width');
      if (width) {
        styleInfo.strokeWidth = parseFloat(width);
      }
    }

    // Parse IconStyle for points
    const iconStyle = styleElement.getElementsByTagName('IconStyle')[0];
    if (iconStyle) {
      const color = this.getElementText(iconStyle, 'color');
      if (color) {
        styleInfo.fillColor = this.kmlColorToHex(color);
        styleInfo.fillOpacity = this.kmlColorToOpacity(color);
      }
    }
  }

  /**
   * Convert KML color (aabbggrr) to hex color (#rrggbb)
   * @param {string} kmlColor - KML color string
   * @returns {string} Hex color
   */
  static kmlColorToHex(kmlColor) {
    if (!kmlColor || kmlColor.length < 6) return '#3388ff';
    
    // KML format: aabbggrr (alpha, blue, green, red)
    const color = kmlColor.padStart(8, 'f');
    const r = color.substring(6, 8);
    const g = color.substring(4, 6);
    const b = color.substring(2, 4);
    
    return `#${r}${g}${b}`;
  }

  /**
   * Extract opacity from KML color
   * @param {string} kmlColor - KML color string
   * @returns {number} Opacity (0-1)
   */
  static kmlColorToOpacity(kmlColor) {
    if (!kmlColor || kmlColor.length < 2) return 1.0;
    
    const alpha = kmlColor.substring(0, 2);
    return parseInt(alpha, 16) / 255;
  }

  /**
   * Check if coordinates form a valid area (not all in a straight line)
   * @param {Array} coordinates - Array of coordinate objects
   * @returns {boolean} True if coordinates form a valid area
   */
  static isValidArea(coordinates) {
    if (coordinates.length < 3) return false;
    
    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      area += coordinates[i].lng * coordinates[j].lat;
      area -= coordinates[j].lng * coordinates[i].lat;
    }
    
    area = Math.abs(area) / 2;
    
    console.log('KMZParser: Calculated area:', area);
    
    // More tolerant threshold for small areas
    return area > 0.0000001; // Much smaller minimum area threshold
  }

  /**
   * Sort coordinates to form a convex hull (simple approach)
   * @param {Array} coordinates - Array of coordinate objects
   * @returns {Array} Sorted coordinates forming a convex hull
   */
  static sortCoordinatesForPolygon(coordinates) {
    if (coordinates.length < 3) return coordinates;
    
    // Find center point
    const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;
    
    // Sort by angle from center
    return coordinates.sort((a, b) => {
      const angleA = Math.atan2(a.lat - centerLat, a.lng - centerLng);
      const angleB = Math.atan2(b.lat - centerLat, b.lng - centerLng);
      return angleA - angleB;
    });
  }
}

export default KMZParser;