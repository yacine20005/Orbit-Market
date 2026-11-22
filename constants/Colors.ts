// Marathon (2025) Swiss Editorial Color System — High-Contrast Legibility Floor (WCAG AA/AAA)
const ACID_LIME = '#C8FF00';
const SIGNAL_VERMILION = '#FF4411';
const BIOMETRIC_CYAN = '#00F0FF';
const EXOTIC_AMBER = '#FFB800';
const CARBON_VOID = '#090A0F';
const PANEL_SURFACE = '#12141C';
const PANEL_ELEVATED = '#1A1D28';
const SILKSCREEN_BONE = '#F4F2EA';
const INK_SECONDARY = '#C8CACE';
const TECH_ASH = '#949AB0';
const GRID_MUTED = '#5E6478';
const GRID_BORDER = '#242836';

export const marathon = {
  void: CARBON_VOID,
  surface: PANEL_SURFACE,
  surfaceElevated: PANEL_ELEVATED,
  bone: SILKSCREEN_BONE,
  inkSecondary: INK_SECONDARY,
  ash: TECH_ASH,
  muted: GRID_MUTED,
  border: GRID_BORDER,
  borderActive: '#3D4459',
  acid: ACID_LIME,
  vermilion: SIGNAL_VERMILION,
  cyan: BIOMETRIC_CYAN,
  amber: EXOTIC_AMBER,
  violet: '#C259FF',
  emerald: '#00E676',
};

export function getRarityColor(rarity?: string): string {
  switch ((rarity || '').toLowerCase()) {
    case 'exotic':
      return marathon.amber;
    case 'legendary':
      return marathon.violet;
    case 'rare':
      return marathon.cyan;
    default:
      return marathon.acid;
  }
}

export function getCurrencyName(itemHash: number): string {
  switch (itemHash) {
    case 800069450:
      return 'Strange Coins';
    case 3159615086:
    case 2817410917:
      return 'Glimmer';
    default:
      return 'Requisition';
  }
}

export function getClassColor(className: string): string {
  switch (className.toLowerCase()) {
    case 'titan':
      return marathon.vermilion;
    case 'hunter':
      return marathon.cyan;
    case 'warlock':
      return marathon.amber;
    default:
      return marathon.bone;
  }
}

export default {
  marathon,
};
