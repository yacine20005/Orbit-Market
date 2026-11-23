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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radii = {
  pill: 4,
  control: 6,
  card: 8,
} as const;

/**
 * Convert a 6-digit hex color to an rgba() string for subtle semantic tints.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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

export type CycleIconName =
  | 'white-balance-sunny'
  | 'weather-night'
  | 'fire'
  | 'snowflake'
  | 'shield-outline'
  | 'cog-outline'
  | 'orbit'
  | 'clock-outline';

export function getCycleVisual(state?: string): {
  color: string;
  icon: CycleIconName;
  label: string;
} {
  const raw = (state || '').trim();
  const key = raw.toLowerCase();
  const titleLabel = raw
    ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    : 'Syncing';

  switch (key) {
    case 'day':
      return { color: marathon.amber, icon: 'white-balance-sunny', label: 'Day' };
    case 'night':
      return { color: marathon.cyan, icon: 'weather-night', label: 'Night' };
    case 'warm':
      return { color: marathon.vermilion, icon: 'fire', label: 'Warm' };
    case 'cold':
      return { color: marathon.cyan, icon: 'snowflake', label: 'Cold' };
    case 'fass':
      return { color: marathon.vermilion, icon: 'white-balance-sunny', label: 'Fass' };
    case 'vome':
      return { color: marathon.cyan, icon: 'weather-night', label: 'Vome' };
    case 'corpus':
      return { color: marathon.cyan, icon: 'shield-outline', label: 'Corpus' };
    case 'grineer':
      return { color: marathon.vermilion, icon: 'cog-outline', label: 'Grineer' };
    case 'joy':
    case 'anger':
    case 'envy':
    case 'sorrow':
    case 'fear':
      return { color: marathon.violet, icon: 'orbit', label: titleLabel };
    default:
      return { color: marathon.acid, icon: 'clock-outline', label: titleLabel };
  }
}

export function getFissureTierColor(tier?: string): string {
  switch ((tier || '').toLowerCase()) {
    case 'lith':
      return marathon.emerald;
    case 'meso':
      return marathon.cyan;
    case 'neo':
      return marathon.violet;
    case 'axi':
      return marathon.amber;
    case 'requiem':
      return marathon.vermilion;
    case 'omnia':
      return marathon.acid;
    default:
      return marathon.bone;
  }
}

const KNOWN_BUNGIE_SUBSTITUTIONS: Record<string, string> = {
  ui_player_action_vehicle_honk_button: 'the horn button',
  ui_player_action_vehicle_boost: 'the boost button',
  ui_player_action_vehicle_brake: 'the brake button',
  ui_player_action_primary_fire: 'the fire button',
  ui_player_action_reload: 'the reload button',
  ui_player_action_jump: 'the jump button',
  ui_player_action_crouch: 'the crouch button',
  ui_player_action_melee: 'the melee button',
  ui_player_action_grenade: 'the grenade button',
  ui_player_action_super: 'the Super button',
  ui_player_action_class_ability: 'the class ability button',
  ui_player_action_air_move: 'the air move button',
};

function humanizeBungieSubstitution(rawToken: string): string {
  const token = rawToken.includes('.')
    ? rawToken.slice(rawToken.lastIndexOf('.') + 1)
    : rawToken;
  const key = token.trim().toLowerCase();
  if (KNOWN_BUNGIE_SUBSTITUTIONS[key]) {
    return KNOWN_BUNGIE_SUBSTITUTIONS[key];
  }
  const stripped = key
    .replace(/^ui_player_action_(?:vehicle_)?/, '')
    .replace(/^ui_/, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return 'the action button';
  if (/(button|key|trigger)$/i.test(stripped)) {
    return `the ${stripped}`;
  }
  return stripped;
}

/**
 * Clean Bungie Manifest inline icon markup & placeholder tokens such as
 * `[Solar]Solar`, `[Void]`, `[Shield-Piercing] Barrier`,
 * `[###DestinyNamedSubstitutions.ui_player_action_vehicle_honk_button###]`, and `{var:123}`.
 */
export function cleanBungieText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\[###([^#\]]+)###\]/g, (_, token: string) =>
      humanizeBungieSubstitution(token)
    )
    .replace(/\{var:[^}]+\}/gi, '—')
    .replace(/\[Shield-Piercing\]\s*(?=Barrier)/gi, '')
    .replace(/\[Disruption\]\s*(?=Overload)/gi, '')
    .replace(/\[Stagger\]\s*(?=Unstoppable)/gi, '')
    .replace(/\[([A-Za-z][A-Za-z0-9\s-]*)\]\s*\1\b/gi, '$1')
    .replace(/\[([A-Za-z][A-Za-z0-9\s-]*)\]/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default {
  marathon,
  spacing,
  radii,
};
