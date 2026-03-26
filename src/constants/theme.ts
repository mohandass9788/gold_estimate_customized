export const LIGHT_COLORS = {
    primary: '#CBA135', // Refined True Gold
    secondary: '#1A1A1A',
    background: '#F4F5F7', // Slightly cooler, premium light grey
    cardBg: '#FFFFFF',
    text: '#111827', // Crisp dark for readability
    textLight: '#6B7280',
    success: '#10B981', // Emerald green
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#E5E7EB',
    white: '#FFFFFF',
    gold: '#CBA135',
    goldGradient: ['#E6C27A', '#CBA135', '#B08826'], // Richer 3-stop gold
    premiumGradient: ['#E6C27A', '#CBA135'],
    glassBg: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000000',
};

export const DARK_COLORS = {
    primary: '#D4AF37',
    secondary: '#D4AF37',
    background: '#09090B', // Deep obsidian black
    cardBg: '#18181B', // Rich dark grey
    text: '#F9FAFB',
    textLight: '#9CA3AF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#27272A',
    white: '#18181B',
    gold: '#D4AF37',
    goldGradient: ['#D4AF37', '#EDC967', '#CBA135'],
    premiumGradient: ['#D4AF37', '#B08826'],
    glassBg: 'rgba(24, 24, 27, 0.85)',
    shadowColor: '#000000',
};

// Default for now, components should use context
export let COLORS = LIGHT_COLORS;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const FONT_SIZES = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const BORDER_RADIUS = {
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    round: 9999,
};

// Reusable Shadow Styles for a Premium Look (spread where needed)
export const SHADOWS = {
    light: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 6,
    },
    heavy: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 12,
    }
};
