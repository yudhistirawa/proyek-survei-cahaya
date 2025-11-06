import React from 'react';

const KMZTextFallback = ({ mapData }) => {
  if (!mapData) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center rounded-xl">
        <div className="text-center">
          <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
          </svg>
          <p className="text-gray-900 font-medium mb-2">Tidak Ada Data Peta</p>
          <p className="text-gray-500 text-sm">Upload file KMZ untuk melihat preview peta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 p-4 overflow-y-auto rounded-xl">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview Data Koordinat</h3>
        <p className="text-gray-600 text-sm">Map tidak tersedia, menampilkan data sebagai teks</p>
      </div>
      
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {mapData.coordinates?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-800">{mapData.coordinates.length}</div>
              <div className="text-sm text-gray-600">Koordinat</div>
            </div>
          )}
          
          {mapData.polygons?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-800">{mapData.polygons.length}</div>
              <div className="text-sm text-gray-600">Polygon</div>
            </div>
          )}
          
          {mapData.lines?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-800">{mapData.lines.length}</div>
              <div className="text-sm text-gray-600">Garis</div>
            </div>
          )}
        </div>
        
        {/* Coordinates */}
        {mapData.coordinates?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">Koordinat ({mapData.coordinates.length})</h4>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {mapData.coordinates.map((coord, index) => (
                  <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                      <span className="text-xs text-gray-500">Alt: {coord.alt}m</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div>Lat: {coord.lat.toFixed(6)}</div>
                      <div>Lng: {coord.lng.toFixed(6)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Polygons */}
        {mapData.polygons?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">Polygon ({mapData.polygons.length})</h4>
            </div>
            {mapData.polygons.map((polygon, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
                <h5 className="font-medium text-gray-700 mb-1">{polygon.name}</h5>
                <p className="text-sm text-gray-600 mb-2">{polygon.description}</p>
                <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 inline-block">
                  {polygon.coordinates.length} koordinat
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Sample: {polygon.coordinates.slice(0, 2).map(coord => 
                    `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`
                  ).join(' → ')}
                  {polygon.coordinates.length > 2 && ' ...'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lines */}
        {mapData.lines?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800">Garis ({mapData.lines.length})</h4>
            </div>
            {mapData.lines.map((line, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
                <h5 className="font-medium text-gray-700 mb-1">{line.name}</h5>
                <p className="text-sm text-gray-600 mb-2">{line.description}</p>
                <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 inline-block">
                  {line.coordinates.length} koordinat
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Sample: {line.coordinates.slice(0, 2).map(coord => 
                    `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`
                  ).join(' → ')}
                  {line.coordinates.length > 2 && ' ...'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KMZTextFallback;
