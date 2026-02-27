/**
 * Professional Design System inspired by Swiggy, Zomato, Rapido
 * Ensures consistent UI/UX across all admin pages
 */

export const DESIGN_SYSTEM = {
  // ============================================
  // COLOR PALETTE
  // ============================================
  colors: {
    // Primary Brand Colors
    primary: '#B85F00',        // Orange (action color)
    primaryLight: '#FFF3E8',   // Light orange (backgrounds)
    primaryDark: '#8B4500',    // Dark orange

    // Secondary Colors
    secondary: '#6366F1',      // Indigo
    secondaryLight: '#E0E7FF',
    
    // Neutral Colors
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceAlt: '#F3F4F6',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Text Colors
    text: '#1F2937',           // Dark gray (main text)
    textSecondary: '#6B7280',  // Medium gray
    textTertiary: '#9CA3AF',   // Light gray
    textOnPrimary: '#FFFFFF',

    // Status Colors
    success: '#10B981',        // Green
    successLight: '#ECFDF5',
    warning: '#F59E0B',        // Amber
    warningLight: '#FFFBEB',
    error: '#EF4444',          // Red
    errorLight: '#FEE2E2',
    info: '#3B82F6',           // Blue
    infoLight: '#EFF6FF',

    // Special
    overlay: 'rgba(0, 0, 0, 0.5)',
    transparent: 'transparent',
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    // Headings
    h1: {
      fontSize: '2rem',        // 32px
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.5rem',      // 24px
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.25rem',     // 20px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.125rem',    // 18px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    
    // Body Text
    bodyLarge: {
      fontSize: '1rem',        // 16px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodyMedium: {
      fontSize: '0.938rem',    // 15px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: '0.875rem',    // 14px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    
    // Labels & Captions
    label: {
      fontSize: '0.813rem',    // 13px
      fontWeight: 500,
      lineHeight: 1.4,
    },
    caption: {
      fontSize: '0.75rem',     // 12px
      fontWeight: 400,
      lineHeight: 1.4,
    },
  },

  // ============================================
  // SPACING SYSTEM (8px base)
  // ============================================
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem',   // 48px
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    none: '0',
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.25rem',   // 20px
    full: '9999px',
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transition: {
    fast: '150ms ease-in-out',
    base: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  },

  // ============================================
  // RESPONSIVE BREAKPOINTS
  // ============================================
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================
  // COMPONENT STYLES
  // ============================================
  components: {
    // Card
    card: {
      padding: '1.5rem',
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '1rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      transition: 'all 200ms ease-in-out',
      _hover: {
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        borderColor: '#B85F00',
      },
    },

    // Button Primary
    buttonPrimary: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#B85F00',
      color: '#FFFFFF',
      fontSize: '0.938rem',
      fontWeight: 600,
      borderRadius: '0.75rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 200ms ease-in-out',
    },

    // Button Secondary
    buttonSecondary: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#F8F9FA',
      color: '#1F2937',
      fontSize: '0.938rem',
      fontWeight: 600,
      borderRadius: '0.75rem',
      border: '1px solid #E5E7EB',
      cursor: 'pointer',
      transition: 'all 200ms ease-in-out',
    },

    // Input
    input: {
      padding: '0.75rem 1rem',
      backgroundColor: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: '0.75rem',
      fontSize: '0.938rem',
      color: '#1F2937',
      transition: 'all 200ms ease-in-out',
    },

    // Badge
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.375rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
    },
  },

  // ============================================
  // PAGE LAYOUT
  // ============================================
  layout: {
    pageMaxWidth: '100%',
    contentPadding: '2rem',
    contentPaddingMobile: '1rem',
    headerHeight: '4rem',
  },

  // ============================================
  // UTILITY CLASSES (for Tailwind/inline styles)
  // ============================================
  getCardStyle: () => ({
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
  }),

  getHeaderStyle: () => ({
    backgroundColor: '#B85F00',
    color: '#FFFFFF',
    padding: '2rem 1.5rem',
  }),

  getSubtleBackgroundStyle: () => ({
    backgroundColor: '#F8F9FA',
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #E5E7EB',
  }),

  getKPICardStyle: (bgColor: string = '#FFF3E8') => ({
    background: bgColor,
    borderRadius: '1rem',
    padding: '1.5rem',
    border: '1px solid #E5E7EB',
  }),
};

export default DESIGN_SYSTEM;
