export const palette = {
  primary: '#1F7BFF',
  bg: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#F8FAFC',
  border: '#E2E8F0', // light gray
  text: '#1e293b',
  muted: '#64748b',
} as const;

export const radii = {
  sm: 12,
  md: 16,
  pill: 999,
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

// Soft, modern elevation (avoid harsh black shadows)
export const shadows = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

