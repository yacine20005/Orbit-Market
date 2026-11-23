// Autonomous Bungie.net Platform API + Manifest Entity Resolver Service
// Supports Xûr, Banshee-44, Ada-1, Saint-14, and Valus Saladin with in-memory caching & offline snapshot fallback

import manifestSnapshot from '../constants/ManifestSnapshot.json';

const DEFAULT_BUNGIE_API_KEY = process.env.EXPO_PUBLIC_BUNGIE_API_KEY || '';
const BUNGIE_BASE = 'https://www.bungie.net/Platform';
const SNAPSHOT_MAP: Record<string, any> = manifestSnapshot as any;
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (controller && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller?.signal,
    });
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

// Bungie global reset is 17:00 UTC every Friday (arrival) and Tuesday (departure)
const XUR_RESET_UTC_HOUR = 17;

export function isXurActiveUtc(now = new Date()): boolean {
  const day = now.getUTCDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ..., 5 = Fri, 6 = Sat
  const hour = now.getUTCHours();
  return (
    (day === 5 && hour >= XUR_RESET_UTC_HOUR) ||
    day === 6 ||
    day === 0 ||
    day === 1 ||
    (day === 2 && hour < XUR_RESET_UTC_HOUR)
  );
}

export function getNextXurResetUtc(now = new Date()): Date {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const targetDay = isXurActiveUtc(now) ? 2 : 5;

  let daysToAdd = (targetDay - day + 7) % 7;
  if (daysToAdd === 0 && hour >= XUR_RESET_UTC_HOUR) {
    daysToAdd = 7;
  }

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysToAdd,
      XUR_RESET_UTC_HOUR,
      0,
      0,
      0
    )
  );
}

export function formatXurCountdownUtc(now = new Date()): string {
  const targetDate = getNextXurResetUtc(now);
  const timeDiff = targetDate.getTime() - now.getTime();
  if (timeDiff <= 0) return '00D 00H 00M 00S';

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return `${String(days).padStart(2, '0')}D ${String(hours).padStart(
    2,
    '0'
  )}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(
    2,
    '0'
  )}S`;
}

export type DestinyVendorId = 'xur' | 'banshee' | 'ada' | 'saint' | 'saladin';

export interface ItemPerk {
  hash: number;
  name: string;
  slot?: string;
  description: string;
  icon: string;
  isDefault?: boolean;
  isEquipped?: boolean;
  isExotic?: boolean;
}

export interface ItemStat {
  hash: number;
  name: string;
  value: number;
  maximum: number;
}

export interface XurInventoryItem {
  vendorItemIndex: number;
  itemHash: number;
  quantity: number;
  costs: Array<{
    itemHash: number;
    quantity: number;
    hasConditionalVisibility: boolean;
  }>;
  itemName: string;
  itemDescription: string;
  itemTypeDisplayName?: string;
  itemIcon: string;
  rarity: string;
  classType: number;
  supportedClasses: string[];
  flavorText: string;
  perks: ItemPerk[];
  stats?: ItemStat[];
  rollType?: 'curated' | 'random';
  categoryLabel?: string;
}

export interface XurData {
  vendor: {
    vendorHash: number;
    nextRefreshDate: string;
    enabled: boolean;
    name: string;
    subtitle?: string;
    description: string;
    location?: string;
    icon?: string;
    largeIcon?: string;
  };
  sales: {
    saleItems: { [key: string]: XurInventoryItem };
  };
  isAvailable: boolean;
  isLiveApi?: boolean;
  message?: string;
}

export interface ApiResponse<T> {
  Response: T;
  ErrorCode: number;
  ThrottleSeconds: number;
}

export interface VendorMeta {
  id: DestinyVendorId;
  hash: string;
  code: string;
  name: string;
  subtitle: string;
  location: string;
  accentColor: string;
  description: string;
  icon: string;
  curatedHashes: Array<{
    hash: number;
    category: string;
    costHash: number;
    costQty: number;
  }>;
}

export const DESTINY_VENDORS: VendorMeta[] = [
  {
    id: 'xur',
    hash: '2190858386',
    code: 'VND-09 // XUR',
    name: 'Xûr',
    subtitle: 'Agent of the Nine',
    location: 'Tower Bazaar',
    accentColor: '#C8FF00',
    description:
      'A peddler of strange curios, Xûr’s motives are not his own. He bows to his distant masters, the Nine.',
    icon: '/common/destiny2_content/icons/801c07dc080b79c7da99ac4f59db1f66.jpg',
    curatedHashes: [
      { hash: 3158812152, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 97 },
      { hash: 3721047650, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 796577360, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 507400048, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 3793245444, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 2109877638, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 4157369212, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 2362430352, category: 'EXOTIC GEAR', costHash: 800069450, costQty: 41 },
      { hash: 903043774, category: 'STRANGE OFFERS', costHash: 800069450, costQty: 23 },
      { hash: 2125848607, category: 'STRANGE OFFERS', costHash: 0, costQty: 0 },
    ],
  },
  {
    id: 'banshee',
    hash: '672118013',
    code: 'VND-44 // GUNSMITH',
    name: 'Banshee-44',
    subtitle: 'Tower Master Gunsmith',
    location: 'Tower Courtyard',
    accentColor: '#00F0FF',
    description:
      'Veteran Exo weaponsmith who has forgotten more about firearms than most Guardians will ever know.',
    icon: '/common/destiny2_content/icons/3142923bc72bcd5a769badc26bd8b508.jpg',
    curatedHashes: [
      { hash: 882778888, category: 'FEATURED ARSENAL', costHash: 3159615086, costQty: 7000 },
      { hash: 3211624072, category: 'FEATURED ARSENAL', costHash: 3159615086, costQty: 7000 },
      { hash: 3381450498, category: 'FEATURED ARSENAL', costHash: 3159615086, costQty: 7000 },
      { hash: 1762785662, category: 'FEATURED ARSENAL', costHash: 3159615086, costQty: 7000 },
      { hash: 1866778462, category: 'FEATURED ARSENAL', costHash: 3159615086, costQty: 7000 },
      { hash: 1401276266, category: 'FOUNDRY FOCUSING', costHash: 3159615086, costQty: 10000 },
      { hash: 3618831903, category: 'FOUNDRY FOCUSING', costHash: 3159615086, costQty: 10000 },
      { hash: 220944791, category: 'FOUNDRY FOCUSING', costHash: 3159615086, costQty: 10000 },
      { hash: 38855301, category: 'FOUNDRY FOCUSING', costHash: 3159615086, costQty: 10000 },
      { hash: 2144437236, category: 'FOUNDRY FOCUSING', costHash: 3159615086, costQty: 10000 },
      { hash: 353704689, category: 'MASTERWORK MATERIALS', costHash: 3159615086, costQty: 50000 },
      { hash: 4257549984, category: 'MASTERWORK MATERIALS', costHash: 3159615086, costQty: 10000 },
    ],
  },
  {
    id: 'ada',
    hash: '350061650',
    code: 'VND-01 // LOOM',
    name: 'Ada-1',
    subtitle: 'Armor Synthesis & Black Armory',
    location: 'Tower Annex',
    accentColor: '#FF3B00',
    description:
      'Caretaker of the Black Armory and operator of the Loom, turning Synthweave into universal ornaments.',
    icon: '/common/destiny2_content/icons/f2af0324ed9aed5186fef3d3e6873b62.jpg',
    curatedHashes: [
      { hash: 3650581584, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 3650581589, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 3650581587, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 3650581588, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 737170669, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 3286479728, category: 'ROTATING SHADERS', costHash: 3159615086, costQty: 10000 },
      { hash: 477057676, category: 'ARMOR SYNTHESIS', costHash: 3159615086, costQty: 5000 },
      { hash: 3967899461, category: 'ARMOR SYNTHESIS', costHash: 3159615086, costQty: 5000 },
      { hash: 2392018715, category: 'ARMOR SYNTHESIS', costHash: 3159615086, costQty: 5000 },
      { hash: 3950721485, category: 'SYNTHWEAVE CONTRACTS', costHash: 3159615086, costQty: 10000 },
      { hash: 540971012, category: 'SYNTHWEAVE CONTRACTS', costHash: 3159615086, costQty: 10000 },
      { hash: 171866827, category: 'SYNTHWEAVE CONTRACTS', costHash: 3159615086, costQty: 10000 },
    ],
  },
  {
    id: 'saint',
    hash: '765357505',
    code: 'VND-14 // TRIALS',
    name: 'Saint-14',
    subtitle: 'Trials of Osiris Overseer',
    location: 'Tower Hangar',
    accentColor: '#FFB800',
    description:
      'The greatest Titan who ever lived. Oversees the Trials of Osiris and rewards the worthy who reach the Lighthouse.',
    icon: '/common/destiny2_content/icons/d1b03d37c680a09753ceb9f49a37891c.jpg',
    curatedHashes: [
      { hash: 3519141316, category: 'TRIALS ARSENAL', costHash: 3159615086, costQty: 25000 },
      { hash: 2206205138, category: 'TRIALS ARSENAL', costHash: 3159615086, costQty: 25000 },
      { hash: 1751871147, category: 'TRIALS ARSENAL', costHash: 3159615086, costQty: 25000 },
      { hash: 4248774254, category: 'TRIALS ARSENAL', costHash: 3159615086, costQty: 25000 },
      { hash: 2653171213, category: 'TRIALS ARSENAL', costHash: 3159615086, costQty: 25000 },
      { hash: 2854025240, category: 'EXILE ARMOR', costHash: 3159615086, costQty: 20000 },
      { hash: 2059601679, category: 'EXILE ARMOR', costHash: 3159615086, costQty: 20000 },
      { hash: 1629007932, category: 'EXILE ARMOR', costHash: 3159615086, costQty: 20000 },
      { hash: 583402086, category: 'TRIALS PASSAGES', costHash: 3159615086, costQty: 5000 },
      { hash: 46532100, category: 'TRIALS PASSAGES', costHash: 3159615086, costQty: 5000 },
    ],
  },
  {
    id: 'saladin',
    hash: '895295461',
    code: 'VND-IB // IRON BANNER',
    name: 'Valus Saladin',
    subtitle: 'Iron Lord & Cabal War Council',
    location: 'Tower Courtyard',
    accentColor: '#00E676',
    description:
      'The last surviving Iron Lord, forging Guardians in the fires of the Iron Banner with no level advantages.',
    icon: '/img/destiny_content/vendor/override_large_icons/lord_saladin.jpg',
    curatedHashes: [
      { hash: 3276449741, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 2605845438, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 3998696856, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 1961110335, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 2277616134, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 2413746134, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 1578915183, category: 'IRON BANNER WEAPONS', costHash: 3159615086, costQty: 25000 },
      { hash: 3387359462, category: 'IRON BATTALION ARMOR', costHash: 3159615086, costQty: 20000 },
      { hash: 220835462, category: 'IRON ENGRAMS', costHash: 0, costQty: 0 },
    ],
  },
];

// Known weapon & armor stat hash names to avoid unnecessary network calls
const STAT_NAMES: Record<number, string> = {
  4043523819: 'Impact',
  1240592695: 'Range',
  155624089: 'Stability',
  943549884: 'Handling',
  4188031367: 'Reload Speed',
  4284893193: 'RPM',
  3871231066: 'Magazine',
  3614673599: 'Blast Radius',
  2523465841: 'Velocity',
  2961396640: 'Charge Time',
  447667954: 'Draw Time',
  1345609583: 'Aim Assistance',
  3555269338: 'Zoom',
  2715839340: 'Recoil Direction',
  2996146975: 'Mobility',
  392767087: 'Resilience',
  1943323491: 'Recovery',
  1735777505: 'Discipline',
  144602215: 'Intellect',
  4244567218: 'Strength',
};

const WEAPON_SUBTYPES = new Set([
  6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 22, 23, 24, 25, 31, 33,
]);
const ARMOR_SUBTYPES = new Set([26, 27, 28, 29]); // Helmet, Gauntlets, Chest, Leg (excludes 30 Class Item)

const RARITY_BY_TIER: Record<number, string> = {
  6: 'Exotic',
  5: 'Legendary',
  4: 'Rare',
  3: 'Uncommon',
  2: 'Common',
};

const EXCLUDED_NAV_EXACT = new Set([
  'more strange offers',
  'strange gear offers',
  'more strange gear',
  'strange offers',
  'reset rank',
  'xûr',
  'gunsmith',
]);

function isExcludedNavItem(name: string): boolean {
  return EXCLUDED_NAV_EXACT.has(name.trim().toLowerCase());
}

const VENDOR_CACHE_TTL_MS = 5 * 60 * 1000;
const PERK_FETCH_BATCH_SIZE = 6;

class ApiService {
  private itemCache = new Map<number, any>();
  private vendorCache = new Map<
    DestinyVendorId,
    { data: XurData; expiresAt: number }
  >();
  private pendingVendor = new Map<
    DestinyVendorId,
    Promise<ApiResponse<XurData>>
  >();
  private cacheGeneration = 0;
  private vendorGenerations = new Map<DestinyVendorId, number>();
  private cacheListeners = new Set<() => void>();
  private customApiKey: string | null = null;

  subscribeCacheInvalidation(cb: () => void): () => void {
    this.cacheListeners.add(cb);
    return () => {
      this.cacheListeners.delete(cb);
    };
  }

  private notifyCacheInvalidation() {
    this.cacheListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Isolate subscriber errors
      }
    });
  }

  clearCache() {
    this.cacheGeneration += 1;
    this.vendorCache.clear();
    this.pendingVendor.clear();
    this.notifyCacheInvalidation();
  }

  setApiKey(key: string) {
    this.customApiKey = key.trim() || null;
    this.clearCache();
  }

  getApiKey(): string {
    return this.customApiKey || DEFAULT_BUNGIE_API_KEY;
  }

  private async fetchBungie<T = any>(endpoint: string): Promise<T | null> {
    const url = `${BUNGIE_BASE}${endpoint}`;
    try {
      const response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.getApiKey(),
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data?.Response ?? null;
    } catch {
      return null;
    }
  }

  private async getItemDefinition(itemHash: number): Promise<any | null> {
    if (this.itemCache.has(itemHash)) {
      return this.itemCache.get(itemHash);
    }
    const def = await this.fetchBungie(
      `/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`
    );
    if (def) {
      this.itemCache.set(itemHash, def);
    }
    return def;
  }

  private getSupportedClasses(classType: number): string[] {
    if (classType === 0) return ['Titan'];
    if (classType === 1) return ['Hunter'];
    if (classType === 2) return ['Warlock'];
    return ['Titan', 'Hunter', 'Warlock'];
  }

  private isWeaponDef(itemDef: any): boolean {
    const itemType = itemDef?.itemType ?? 0;
    const itemSubType = itemDef?.itemSubType ?? 0;
    return (
      itemType === 3 || (itemType === 0 && WEAPON_SUBTYPES.has(itemSubType))
    );
  }

  private isStatArmorDef(itemDef: any): boolean {
    const itemType = itemDef?.itemType ?? 0;
    const itemSubType = itemDef?.itemSubType ?? 0;
    const typeName = itemDef?.itemTypeDisplayName || '';
    return (
      (itemType === 2 && ARMOR_SUBTYPES.has(itemSubType)) ||
      /^(helmet|gauntlets|chest armor|leg armor)$/i.test(typeName)
    );
  }

  private extractStats(itemDef: any): ItemStat[] {
    const isWeapon = this.isWeaponDef(itemDef);
    const isStatArmor = this.isStatArmorDef(itemDef);

    // Non-weapon and non-stat-armor items (Engrams, Materials, Shaders, Bounties, Passages, Vehicles, Class Items) have NO combat/armor stats
    if (!isWeapon && !isStatArmor) {
      return [];
    }

    const rawStats = itemDef?.stats?.stats || {};
    const stats: ItemStat[] = [];
    for (const [key, statObj] of Object.entries<any>(rawStats)) {
      const hash = Number(key);
      const name = STAT_NAMES[hash];
      const val = statObj?.value;
      if (name && typeof val === 'number' && Number.isFinite(val) && val > 0) {
        stats.push({
          hash,
          name,
          value: val,
          maximum: hash === 4284893193 ? 1000 : 100,
        });
      }
    }

    return stats.slice(0, 6);
  }

  private async extractPerks(
    itemDef: any
  ): Promise<{ perks: ItemPerk[]; rollType?: 'curated' | 'random' }> {
    const socketEntries: any[] = itemDef?.sockets?.socketEntries || [];
    const perks: ItemPerk[] = [];
    let rollType: 'curated' | 'random' | undefined;
    const isWeapon = this.isWeaponDef(itemDef);

    const plugHashes: number[] = [];
    const seenPlugHashes = new Set<number>();
    for (const entry of socketEntries) {
      const plugHash = entry?.singleInitialItemHash;
      if (plugHash && !seenPlugHashes.has(plugHash)) {
        seenPlugHashes.add(plugHash);
        plugHashes.push(plugHash);
      }
    }

    for (
      let i = 0;
      i < plugHashes.length && perks.length < 6;
      i += PERK_FETCH_BATCH_SIZE
    ) {
      const batch = plugHashes.slice(i, i + PERK_FETCH_BATCH_SIZE);
      const defs = await Promise.all(
        batch.map((hash) => this.getItemDefinition(hash))
      );

      for (let j = 0; j < batch.length && perks.length < 6; j++) {
        const plugHash = batch[j];
        const plugDef = defs[j];
        if (!plugDef) continue;

        const name: string = plugDef?.displayProperties?.name || '';
        const desc: string = plugDef?.displayProperties?.description || '';
        const tierType: number = plugDef?.inventory?.tierType || 0;
        const itemTypeDisplayName: string = plugDef?.itemTypeDisplayName || '';
        const plugCat: string = plugDef?.plug?.plugCategoryIdentifier || '';

        if (
          !name ||
          name.includes('Empty') ||
          name.includes('Default') ||
          name.includes('Upgrade') ||
          name.includes('Tracker') ||
          name.includes('Socket') ||
          name.includes('Tier ')
        ) {
          continue;
        }

        if (name === 'Randomized Perks') {
          rollType = 'random';
          perks.push({
            hash: plugHash,
            name: 'Random Roll on Purchase',
            slot: 'Vendor Roll',
            description:
              'Weapon traits, barrel, and magazine are rolled randomly when acquired or focused from this vendor.',
            icon: plugDef?.displayProperties?.icon || '',
            isExotic: false,
          });
          continue;
        }

        const isWeaponPerkSocket =
          isWeapon &&
          (plugCat.includes('intrinsics') ||
            plugCat.includes('barrels') ||
            plugCat.includes('tubes') ||
            plugCat.includes('bowstrings') ||
            plugCat.includes('blades') ||
            plugCat.includes('scopes') ||
            plugCat.includes('magazines') ||
            plugCat.includes('batteries') ||
            plugCat.includes('arrows') ||
            plugCat.includes('guards') ||
            plugCat.includes('frames') ||
            plugCat.includes('origins') ||
            plugCat.includes('grips') ||
            plugCat.includes('stocks') ||
            itemTypeDisplayName.includes('Trait') ||
            itemTypeDisplayName.includes('Intrinsic'));

        const isExoticOrArmorPerk =
          !isWeapon &&
          (tierType === 6 ||
            itemTypeDisplayName.includes('Intrinsic') ||
            desc.length > 25);

        if (isWeaponPerkSocket || isExoticOrArmorPerk) {
          if (
            isWeapon &&
            (itemTypeDisplayName === 'Trait' ||
              plugCat.includes('barrels') ||
              plugCat.includes('tubes') ||
              plugCat.includes('magazines'))
          ) {
            rollType = 'curated';
          }
          perks.push({
            hash: plugHash,
            name,
            slot: itemTypeDisplayName || 'Intrinsic',
            description: desc,
            icon: plugDef?.displayProperties?.icon || '',
            isExotic:
              tierType === 6 || itemTypeDisplayName.includes('Intrinsic'),
            isEquipped: true,
          });
        }
      }
    }
    return { perks, rollType };
  }

  private async hydrateSaleItem(
    itemHash: number,
    vendorItemIndex: number,
    costs: Array<{ itemHash: number; quantity: number; hasConditionalVisibility: boolean }>,
    categoryLabel?: string
  ): Promise<XurInventoryItem | null> {
    const snap = SNAPSHOT_MAP[String(itemHash)];
    if (snap) {
      if (isExcludedNavItem(snap.name || '')) {
        return null;
      }
      const classType = snap.classType ?? 3;
      const stats: ItemStat[] = this.isStatArmorDef(snap)
        ? []
        : Array.isArray(snap.stats)
        ? snap.stats.filter(
            (s: any) =>
              s &&
              typeof s.value === 'number' &&
              Number.isFinite(s.value) &&
              s.value > 0
          )
        : [];
      return {
        vendorItemIndex,
        itemHash,
        quantity: 1,
        costs,
        itemName: snap.name,
        itemDescription: snap.description || '',
        itemTypeDisplayName: snap.itemTypeDisplayName || snap.rarity,
        itemIcon: snap.icon || '/common/destiny2_content/icons/9c2eda96877ed53dceb90568ebb27f11.png',
        rarity: snap.rarity || 'Legendary',
        classType,
        supportedClasses: this.getSupportedClasses(classType),
        flavorText: snap.flavorText || '',
        perks: snap.perks || [],
        stats,
        rollType: snap.rollType,
        categoryLabel,
      };
    }

    const def = await this.getItemDefinition(itemHash);
    if (!def) return null;

    const dp = def.displayProperties || {};
    const name: string = dp.name || '';
    if (!name) return null;

    if (isExcludedNavItem(name)) {
      return null;
    }

    const tierType = def?.inventory?.tierType || 0;
    const rarity =
      def?.inventory?.tierTypeName || RARITY_BY_TIER[tierType] || 'Legendary';
    const classType = def?.classType ?? 3;
    const itemTypeDisplayName = def?.itemTypeDisplayName || rarity;
    const stats = this.extractStats(def);
    const { perks, rollType } =
      rarity === 'Exotic' || this.isWeaponDef(def)
        ? await this.extractPerks(def)
        : { perks: [], rollType: undefined };

    return {
      vendorItemIndex,
      itemHash,
      quantity: 1,
      costs,
      itemName: name,
      itemDescription: dp.description || '',
      itemTypeDisplayName,
      itemIcon: dp.icon || '/common/destiny2_content/icons/9c2eda96877ed53dceb90568ebb27f11.png',
      rarity,
      classType,
      supportedClasses: this.getSupportedClasses(classType),
      flavorText: def.flavorText || '',
      perks,
      stats,
      rollType,
      categoryLabel,
    };
  }

  async getVendorInventory(
    vendorId: DestinyVendorId = 'xur',
    forceRefresh = false
  ): Promise<ApiResponse<XurData>> {
    if (!forceRefresh) {
      const cached = this.vendorCache.get(vendorId);
      if (cached && Date.now() < cached.expiresAt) {
        return {
          Response: cached.data,
          ErrorCode: 0,
          ThrottleSeconds: 0,
        };
      }
      if (cached) {
        this.vendorCache.delete(vendorId);
      }

      const existingPending = this.pendingVendor.get(vendorId);
      if (existingPending) {
        return existingPending;
      }
    } else {
      const nextVendorGen = (this.vendorGenerations.get(vendorId) ?? 0) + 1;
      this.vendorGenerations.set(vendorId, nextVendorGen);
    }

    const globalGen = this.cacheGeneration;
    const vendorGen = this.vendorGenerations.get(vendorId) ?? 0;

    const promise = this.loadVendorInventory(vendorId, globalGen, vendorGen);
    this.pendingVendor.set(vendorId, promise);
    try {
      return await promise;
    } finally {
      if (this.pendingVendor.get(vendorId) === promise) {
        this.pendingVendor.delete(vendorId);
      }
    }
  }

  private async loadVendorInventory(
    vendorId: DestinyVendorId,
    globalGen: number,
    vendorGen: number
  ): Promise<ApiResponse<XurData>> {
    const meta =
      DESTINY_VENDORS.find((v) => v.id === vendorId) || DESTINY_VENDORS[0];

    try {
      if (vendorId === 'xur') {
        const publicVendors = await this.fetchBungie(
          '/Destiny2/Vendors/?components=400,402'
        );
        const rawSales =
          publicVendors?.sales?.data?.[meta.hash]?.saleItems || null;
        const vendorInfo =
          publicVendors?.vendors?.data?.[meta.hash] || null;

        if (rawSales && Object.keys(rawSales).length > 0) {
          const entries = Object.entries<any>(rawSales);
          const hydratedList = await Promise.all(
            entries.map(([key, sale]) =>
              this.hydrateSaleItem(
                sale.itemHash,
                sale.vendorItemIndex ?? Number(key),
                sale.costs || []
              )
            )
          );

          const saleItems: Record<string, XurInventoryItem> = {};
          const seenNames = new Set<string>();
          hydratedList.forEach((item, idx) => {
            if (!item) return;
            const dedupKey = `${item.itemName}-${item.classType}`;
            if (seenNames.has(dedupKey)) return;
            seenNames.add(dedupKey);
            saleItems[String(idx)] = item;
          });

          if (Object.keys(saleItems).length > 0) {
            const xurData: XurData = {
              vendor: {
                vendorHash: Number(meta.hash),
                nextRefreshDate:
                  vendorInfo?.nextRefreshDate ||
                  getNextXurResetUtc().toISOString(),
                enabled: true,
                name: meta.name,
                subtitle: meta.subtitle,
                description: meta.description,
                location: meta.location,
                icon: meta.icon,
              },
              sales: { saleItems },
              isAvailable: true,
              isLiveApi: true,
              message: 'LIVE TELEMETRY // BUNGIE.NET PLATFORM',
            };
            if (
              this.cacheGeneration === globalGen &&
              (this.vendorGenerations.get(vendorId) ?? 0) === vendorGen
            ) {
              this.vendorCache.set(vendorId, {
                data: xurData,
                expiresAt: Date.now() + VENDOR_CACHE_TTL_MS,
              });
            }
            return { Response: xurData, ErrorCode: 0, ThrottleSeconds: 0 };
          }
        }
      }

      // Curated local manifest snapshot fallback (do not permanently cache offline fallback results)
      const hydratedCurated = await Promise.all(
        meta.curatedHashes.map((entry, idx) =>
          this.hydrateSaleItem(
            entry.hash,
            idx,
            entry.costQty > 0
              ? [
                  {
                    itemHash: entry.costHash,
                    quantity: entry.costQty,
                    hasConditionalVisibility: false,
                  },
                ]
              : [],
            entry.category
          )
        )
      );

      const saleItems: Record<string, XurInventoryItem> = {};
      hydratedCurated.forEach((item, idx) => {
        if (item) {
          saleItems[String(idx)] = item;
        }
      });

      const snapshotData: XurData = {
        vendor: {
          vendorHash: Number(meta.hash),
          nextRefreshDate:
            vendorId === 'xur'
              ? getNextXurResetUtc().toISOString()
              : new Date().toISOString(),
          enabled: true,
          name: meta.name,
          subtitle: meta.subtitle,
          description: meta.description,
          location: meta.location,
          icon: meta.icon,
        },
        sales: { saleItems },
        isAvailable: vendorId === 'xur' ? isXurActiveUtc() : true,
        isLiveApi: false,
        message:
          vendorId === 'xur'
            ? 'OFFLINE SNAPSHOT // LOCAL MANIFEST ARCHIVE'
            : 'LOCAL SNAPSHOT // CURATED MANIFEST ARCHIVE',
      };
      return { Response: snapshotData, ErrorCode: 0, ThrottleSeconds: 0 };
    } catch (e) {
      console.warn('Bungie API fallback triggered:', e);
    }

    return {
      Response: {
        vendor: {
          vendorHash: Number(meta.hash),
          nextRefreshDate:
            vendorId === 'xur'
              ? getNextXurResetUtc().toISOString()
              : new Date().toISOString(),
          enabled: true,
          name: meta.name,
          subtitle: meta.subtitle,
          description: meta.description,
          location: meta.location,
          icon: meta.icon,
        },
        sales: { saleItems: {} },
        isAvailable: vendorId === 'xur' ? isXurActiveUtc() : false,
        isLiveApi: false,
        message: 'OFFLINE SNAPSHOT // TELEMETRY UNAVAILABLE',
      },
      ErrorCode: 0,
      ThrottleSeconds: 0,
    };
  }

  async testConnection(): Promise<{
    success: boolean;
    bungieOk: boolean;
    warframeOk: boolean;
    latencyMs: number;
  }> {
    const start = Date.now();
    const [bungieRes, wfRes] = await Promise.all([
      this.fetchBungie('/Destiny2/Manifest/').catch(() => null),
      fetchWithTimeout('https://api.warframestat.us/pc/cetusCycle', {
        headers: { Accept: 'application/json' },
      })
        .then((r) => r.ok)
        .catch(() => false),
    ]);
    const bungieOk = Boolean(bungieRes);
    const warframeOk = Boolean(wfRes);
    return {
      success: bungieOk || warframeOk,
      bungieOk,
      warframeOk,
      latencyMs: Date.now() - start,
    };
  }
}

export const apiService = new ApiService();
