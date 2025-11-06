import React, { useMemo } from 'react';
import { COLORS } from '../../constants';

export const GridCell = React.memo(({ cellData, rowIndex, colIndex, onCellClick }) => {
    const colorClass = useMemo(() => {
        // Perbaikan: Cek apakah cellData ada dan memiliki value yang valid
        if (!cellData) return COLORS.zero;
        
        // Prioritaskan tipe khusus
        if (cellData.type === 'api') return COLORS.api;
        if (cellData.type === 'tiang') return COLORS.tiang;
        
        // Ambil nilai dari cellData
        const value = parseFloat(cellData.value) || 0;
        
        // Tentukan warna berdasarkan nilai, bukan timestamp
        if (value >= 80) return COLORS.level11; 
        if (value >= 70) return COLORS.level10; 
        if (value >= 60) return COLORS.level9; 
        if (value >= 50) return COLORS.level8; 
        if (value >= 40) return COLORS.level7; 
        if (value >= 30) return COLORS.level6; 
        if (value >= 20) return COLORS.level5; 
        if (value >= 10) return COLORS.level4; 
        if (value >= 5) return COLORS.level3; 
        if (value >= 0.5) return COLORS.level2; 
        if (value > 0) return COLORS.level1; 
        
        return COLORS.zero;
    }, [cellData]);

    // Perbaikan: Tampilkan nilai berdasarkan value, bukan timestamp
    const displayValue = useMemo(() => {
        if (!cellData) return '0';
        
        const value = parseFloat(cellData.value);
        if (isNaN(value) || value === 0) return '0';
        
        // Format nilai dengan 1 desimal jika diperlukan
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }, [cellData]);

    return (
        <div className="group relative z-0 cursor-pointer w-16 h-14" onClick={() => onCellClick(rowIndex, colIndex)}>
            <div className={`w-full h-full flex items-center justify-center text-sm font-bold transition-all duration-200 rounded-lg shadow-inner hover:shadow-lg hover:z-[1] relative z-0 overflow-hidden ${colorClass}`}>
                {displayValue}
                {/* Titik API untuk Load Data Pertama */}
                {cellData?.hasApiPoint && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm"></div>
                )}
            </div>
        </div>
    );
});

GridCell.displayName = 'GridCell';
