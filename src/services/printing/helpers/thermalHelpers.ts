// ESC/POS Command Constants
export const ESC = '\x1b';
export const GS = '\x1d';

export const thermalCommands = {
    reset: `${ESC}@`,
    center: `${ESC}a\x01`,
    left: `${ESC}a\x00`,
    right: `${ESC}a\x02`,
    boldOn: `${ESC}E\x01`,
    boldOff: `${ESC}E\x00`,
    doubleOn: `${GS}!\x11`, // Double height and width
    doubleOff: `${GS}!\x00`,
    smallOn: `${ESC}M\x01`, // Font B (Small)
    smallOff: `${ESC}M\x00`, // Font A (Normal)
    divider: (width: number) => '-'.repeat(width) + '\x0a',
    line: (width: number) => '='.repeat(width) + '\x0a',
};

// String Padding Utilities
export const padR = (s: string, w: number) => {
    s = s || '';
    if (s.length >= w) return s.substring(0, w);
    return s + ' '.repeat(w - s.length);
};

export const padL = (s: string, w: number) => {
    s = s || '';
    if (s.length >= w) return s.substring(0, w);
    return ' '.repeat(w - s.length) + s;
};

export const chunkString = (str: string, length: number): string[] => {
    if (!str) return [''];
    const chunks = [];
    for (let i = 0; i < str.length; i += length) {
        chunks.push(str.substring(i, i + length));
    }
    return chunks;
};

// Formatting helpers
export const formatCurrency = (amount: number): string => {
    return Math.round(amount).toLocaleString('en-IN');
};

// Shared row formatting for thermal
export const thermalRow = (label: string, value: string, width: number) => {
    const spaceForValue = value.length + 1;
    const spaceForLabel = width - spaceForValue;
    return padR(label, spaceForLabel) + ' ' + value + '\x0a';
};

export const getCharWidth = (paperWidth: string = '58mm') => {
    if (paperWidth === '80mm') return 48;
    if (paperWidth === '112mm') return 64;
    return 32;
};

export const getColumnConfig = (paperWidth: string = '58mm') => {
    switch (paperWidth) {
        case '80mm':
            return { name: 16, pcs: 4, wt: 8, wst: 6, mc: 6, amt: 8 };
        case '112mm':
            return { name: 24, pcs: 6, wt: 10, wst: 8, mc: 8, amt: 8 };
        case '58mm':
        default:
            return { name: 8, pcs: 3, wt: 7, wst: 5, mc: 4, amt: 5 };
    }
};

export const cleanThermalPayload = (payload: string) => {
    return payload
        .replace(/\x1b@/g, '') // Reset
        .replace(/\x1ba\x01/g, '') // Center
        .replace(/\x1ba\x00/g, '') // Left
        .replace(/\x1ba\x02/g, '') // Right
        .replace(/\x1bE\x01/g, '') // Bold On
        .replace(/\x1bE\x00/g, '') // Bold Off
        .replace(/\x1d!\x11/g, '') // Double On
        .replace(/\x1d!\x00/g, '') // Double Off
        .replace(/\x1bM\x01/g, '') // Small On
        .replace(/\x1bM\x00/g, '') // Small Off
        .replace(/\x0a/g, '\n') // Newline
        .replace(/\x00/g, ''); // Null
};
