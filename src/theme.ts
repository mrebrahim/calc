export const colors = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF2F5',
  primary: '#0B5D51',
  primarySoft: '#E3F0ED',
  text: '#12181F',
  textMuted: '#6B7683',
  textFaint: '#9AA4AF',
  border: '#E2E6EB',
  danger: '#C0392B',
  dangerSoft: '#FBE9E7',
  warn: '#B8860B',
  success: '#17795E',
  income: '#17795E',
} as const;

export const spacing = (n: number) => n * 4;

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

export const shadow = {
  shadowColor: '#0B1B2B',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
