/**
 * Palette shared by DOM, Canvas2D and WebGL. Kept as raw sRGB so shader output
 * matches CSS exactly (shaders write colours without colour-space conversion).
 */
export const palette = {
  ivory: '#F5F2EB',
  paper: '#EDE9E0',
  sand: '#DDD7CB',
  ink: '#151413',
  ink2: '#3B3935',
  muted: '#6B665D',
  accent: '#F28C28',
  night: '#0D0D0C',
  bone: '#ECE8DF',
  ash: '#8C877E',
} as const;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}
