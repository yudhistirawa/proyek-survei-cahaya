// ===================================================================================
// == KONFIGURASI & KONSTANTA ==
// ===================================================================================

export const GRID_ROWS = 45;
export const GRID_COLS = 35;
export const DEFAULT_CELL_STATE = { 
    value: '', 
    description: '', 
    image: null, 
    type: 'normal', 
    timestamp: null, 
    location: null 
};

export const COLORS = {
    api: 'bg-red-500 text-white',
    tiang: 'bg-yellow-500 text-black',
    level0: 'bg-[#FFFFFF] text-black',
    level1: 'bg-[#FFFFFF] text-black',
    level2: 'bg-[#FFFFF0] text-black',
    level3: 'bg-[#FFFFE0] text-black',
    level4: 'bg-[#FFFFC0] text-black',
    level5: 'bg-[#FFFFA0] text-black',
    level6: 'bg-[#FFFF80] text-black',
    level7: 'bg-[#FFFF60] text-black',
    level8: 'bg-[#FFFF40] text-black',
    level9: 'bg-[#FFFF20] text-black',
    level10: 'bg-[#FFFF10] text-black',
    level11: 'bg-[#FFFF00] text-black',
    zero: 'bg-slate-200 text-slate-500'
};

export const COLOR_LEGEND_DATA = [
    { label: 'Titik Api', color: COLORS.api },
    { label: '90.00 - 100.90', color: COLORS.level11 },
    { label: '80.00 - 89.90', color: COLORS.level10 },
    { label: '70.00 - 79.90', color: COLORS.level9 },
    { label: '60.00 - 69.90', color: COLORS.level8 },
    { label: '50.00 - 59.90', color: COLORS.level7 },
    { label: '40.00 - 49.90', color: COLORS.level6 },
    { label: '30.00 - 39.90', color: COLORS.level5 },
    { label: '20.00 - 29.90', color: COLORS.level4 },
    { label: '10.00 - 19.90', color: COLORS.level3 },
    { label: '5.00 - 9.90', color: COLORS.level2 },
    { label: '0.10 - 4.90', color: COLORS.level1 },
    { label: '0.00 - 0.04', color: COLORS.level0 },
];

export const HEIGHT_OPTIONS = [
    '5 Meter', 
    '6 Meter', 
    '7 Meter', 
    '8 Meter', 
    '9 Meter', 
    '9.5 Meter',
    '10 Meter'
];

// Optimasi untuk loading yang lebih cepat
export const REPORTS_PER_PAGE = 15; // Meningkatkan untuk mengurangi pagination
export const INITIAL_LOAD_LIMIT = 25; // Limit awal yang lebih kecil untuk loading super cepat
export const LIGHTWEIGHT_LOAD_LIMIT = 20; // Limit untuk lightweight mode
export const CHUNK_SIZE = 8; // Ukuran chunk yang lebih kecil untuk processing cepat
export const DEBOUNCE_DELAY = 150; // Delay debounce yang lebih responsif

// Standar jalan arterial
export const ARTERIAL_ROAD_STANDARDS = {
    lAvgMin: 17.0, // Lux minimum untuk jalan arterial
    uniformityRatioMax: 2.99, // Rasio kemerataan maksimum (di atas 2.99 = NOT OK)
    description: 'Jalan Arterial - Lalu Lintas Tinggi'
};

// Standar jalan kolektor
export const COLLECTOR_ROAD_STANDARDS = {
    lAvgMin: 12.0, // Lux minimum untuk jalan kolektor
    uniformityRatioMax: 3.99, // Rasio kemerataan maksimum (3.99 = OK, di atas 3.99 = NOT OK)
    description: 'Jalan Kolektor - Lalu Lintas Sedang'
};

// Standar jalan lokal
export const LOCAL_ROAD_STANDARDS = {
    lAvgMin: 9.0, // Lux minimum untuk jalan lokal
    uniformityRatioMax: 5.99, // Rasio kemerataan maksimum
    description: 'Jalan Lokal - Lalu Lintas Rendah'
};

// Standar jalan lingkungan
export const LINGKUNGAN_ROAD_STANDARDS = {
    lAvgMin: 6.0, // Lux minimum untuk jalan lingkungan
    uniformityRatioMax: 5.99, // Rasio kemerataan maksimum
    description: 'Jalan Lingkungan - Lalu Lintas Sangat Rendah'
};
