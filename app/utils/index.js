import { COLORS } from '../constants';

// Global async sleep helper
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Get timezone info based on longitude
export const getTimezoneInfo = (longitude) => {
    if (longitude >= 95.0 && longitude < 112.5) {
        return { name: 'WIB', iana: 'Asia/Jakarta' };
    } else if (longitude >= 112.5 && longitude < 127.5) {
        return { name: 'WITA', iana: 'Asia/Makassar' };
    } else if (longitude >= 127.5 && longitude <= 141.0) {
        return { name: 'WIT', iana: 'Asia/Jayapura' };
    }
    return { name: 'WIB', iana: 'Asia/Jakarta' }; // Default ke WIB jika di luar jangkauan
};

// Helper function to convert grid data to an XLSX workbook object using SheetJS with styling
export const convertGridToXLSX = (gridData, projectInfo, reportDetails) => {
    if (typeof window === 'undefined' || typeof XLSX === 'undefined') {
        console.error("SheetJS library not loaded. Please include it in your project.");
        throw new Error("Pustaka export (SheetJS) tidak termuat.");
    }

    const BORDER_STYLE = { style: 'thin', color: { auto: 1 } };
    const BORDERS = { top: BORDER_STYLE, bottom: BORDER_STYLE, left: BORDER_STYLE, right: BORDER_STYLE };

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4F81BD" } },
        alignment: { horizontal: 'center', vertical: 'center' }
    };
    const infoTitleStyle = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
    };
    const infoLabelStyle = { font: { bold: true } };

    const COLOR_HEX_MAP = {
        api: { fg: "ef4444", text: "FFFFFF" },
        level11: { fg: "581c87", text: "FFFFFF" },
        level10: { fg: "991b1b", text: "FFFFFF" },
        level9: { fg: "dc2626", text: "FFFFFF" },
        level8: { fg: "2563eb", text: "FFFFFF" },
        level7: { fg: "facc15", text: "000000" },
        level6: { fg: "fde047", text: "000000" },
        level5: { fg: "7dd3fc", text: "000000" },
        level4: { fg: "a3e635", text: "000000" },
        level3: { fg: "86efac", text: "000000" },
        level2: { fg: "ffffff", text: "000000" },
        level1: { fg: "6b7280", text: "FFFFFF" },
        zero: { fg: "e2e8f0", text: "64748b" }
    };

    const getCellStyle = (cell) => {
        let key = 'zero';
        if (cell && cell.timestamp !== null) {
            if (cell.type === 'api') key = 'api';
            else {
                const value = cell.value;
                if (value >= 80) key = 'level11';
                else if (value >= 70) key = 'level10';
                else if (value >= 60) key = 'level9';
                else if (value >= 50) key = 'level8';
                else if (value >= 40) key = 'level7';
                else if (value >= 30) key = 'level6';
                else if (value >= 20) key = 'level5';
                else if (value >= 10) key = 'level4';
                else if (value >= 5) key = 'level3';
                else if (value >= 0.5) key = 'level2';
                else if (value > 0) key = 'level1';
            }
        }
        const colors = COLOR_HEX_MAP[key];
        return {
            font: { color: { rgb: colors.text } },
            fill: { fgColor: { rgb: colors.fg } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: BORDERS
        };
    };

    const firePoints = [];
    gridData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell.type === 'api') {
                firePoints.push(`Jarak ${rowIndex + 1}m, Lebar ${colIndex + 1}m`);
            }
        });
    });

    let firePointsInfo = [
        ["TITIK API TERDETEKSI", null],
        ...firePoints.map(point => [point, null])
    ];

    if (firePoints.length === 0) {
        firePointsInfo = [["TITIK API TERDETEKSI", "Tidak ada"]];
    }
    
    firePointsInfo.push([]);

    const reportHeaderData = [
        ["INFO LAPORAN", null],
        ["Nama Lampu:", projectInfo.title],
        ["Lokasi Proyek:", projectInfo.location],
        ["Tanggal Survei:", new Date(projectInfo.date).toLocaleDateString('id-ID')],
        ["Nama Petugas:", reportDetails.surveyorName],
        ["Daya Lampu:", reportDetails.lampPower],
        ["Tinggi Tiang:", reportDetails.poleHeight],
        ["Tegangan Awal:", reportDetails.initialVoltage],
        ["L-Min:", reportDetails.stats.lmin],
        ["L-Max:", reportDetails.stats.lmax],
        ["L-Avg:", reportDetails.stats.lavg],
        [],
        ...firePointsInfo
    ];

    const gridHeaderRow = [`Jarak (m) \\ Lebar (m)`];
    for (let j = 0; j < 35; j++) gridHeaderRow.push(j + 1);
    const gridTable = [gridHeaderRow];

    gridData.forEach((row, rowIndex) => {
        const rowData = [`${rowIndex + 1}`];
        row.forEach((cell) => {
            let cellValue = null;
            if (cell.timestamp !== null) {
                if (typeof cell.value === 'string') {
                    if (cell.value.trim() === '') {
                        cellValue = null;
                    } else {
                        const parsed = parseFloat(cell.value);
                        cellValue = isNaN(parsed) ? cell.value : parsed;
                    }
                } else if (typeof cell.value === 'number') {
                    cellValue = cell.value;
                } else {
                    cellValue = null;
                }
            } else {
                cellValue = null;
            }
            rowData.push(cellValue);
        });
        gridTable.push(rowData);
    });

    const finalData = [...reportHeaderData, ...gridTable];
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    ws['A1'].s = infoTitleStyle;

    for (let i = 1; i < 11; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
        if (ws[cellRef]) ws[cellRef].s = infoLabelStyle;
    }
    
    const firePointStartRow = 12;
    const firePointTitleRef = XLSX.utils.encode_cell({ r: firePointStartRow, c: 0 });
    if(ws[firePointTitleRef]) {
        ws[firePointTitleRef].s = { font: { bold: true, sz: 12, color: { rgb: "FF0000" } }, alignment: {horizontal: 'center'} };
        ws['!merges'].push({ s: { r: firePointStartRow, c: 0 }, e: { r: firePointStartRow, c: 3 } });
    }

    const gridStartRow = reportHeaderData.length;

    for (let c = 0; c < gridHeaderRow.length; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: gridStartRow, c: c });
        if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    gridData.forEach((row, r_idx) => {
        const rowHeaderRef = XLSX.utils.encode_cell({ r: gridStartRow + 1 + r_idx, c: 0 });
        if(ws[rowHeaderRef]) ws[rowHeaderRef].s = headerStyle;

        row.forEach((cell, c_idx) => {
            const cellRef = XLSX.utils.encode_cell({ r: gridStartRow + 1 + r_idx, c: c_idx + 1 });
            if (ws[cellRef]) {
                ws[cellRef].s = getCellStyle(cell);
                if(typeof ws[cellRef].v === 'number'){
                    ws[cellRef].t = 'n';
                    ws[cellRef].z = '0.00';
                }
            }
        });
    });

    ws['!cols'] = [ { wch: 25 }, { wch: 40 }, ];
    for (let i = 0; i < 35; i++) {
        ws['!cols'][i + 1] = { wch: 10 };
    }
    ws['!cols'][0] = { wch: 20 };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Survei Lux");

    return wb;
};
