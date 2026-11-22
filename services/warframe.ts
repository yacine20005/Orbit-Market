// Autonomous Warframe WorldState Telemetry Service (api.warframestat.us/pc)
// Covers Open World Cycles, Baro Ki'Teer (Void Trader), Alerts, Void Fissures, Invasions, Sortie, Archon Hunt, and Nightwave

const WF_API_BASE = 'https://api.warframestat.us/pc';

export interface WorldCycleInfo {
  id: string;
  name: string;
  zone: string;
  code: string;
  state: string;
  isPositiveState: boolean;
  expiry: string;
  timeLeft: string;
  accentColor: string;
}

export interface VoidTraderItem {
  uniqueName?: string;
  item: string;
  ducats: number;
  credits: number;
}

export interface VoidTraderInfo {
  id: string;
  character: string;
  location: string;
  active: boolean;
  activation: string;
  expiry: string;
  inventory: VoidTraderItem[];
}

export interface WarframeAlertInfo {
  id: string;
  node: string;
  missionType: string;
  faction: string;
  rewardText: string;
  credits: number;
  expiry: string;
  thumbnail?: string;
}

export interface WarframeFissureInfo {
  id: string;
  node: string;
  missionType: string;
  enemy: string;
  tier: string;
  tierNum: number;
  expiry: string;
  isStorm: boolean;
  isHard: boolean;
}

export interface WarframeInvasionInfo {
  id: string;
  node: string;
  desc: string;
  attackerFaction: string;
  attackerReward: string;
  defenderFaction: string;
  defenderReward: string;
  completion: number;
  vsInfestation: boolean;
}

export interface WarframeSortieVariant {
  missionType: string;
  modifier: string;
  node: string;
}

export interface WarframeSortieInfo {
  id: string;
  boss: string;
  faction: string;
  expiry: string;
  variants: WarframeSortieVariant[];
}

export interface WarframeArchonInfo {
  id: string;
  boss: string;
  faction: string;
  expiry: string;
  missions: Array<{
    node: string;
    type: string;
  }>;
}

export interface NightwaveChallenge {
  id: string;
  title: string;
  desc: string;
  reputation: number;
  isDaily: boolean;
  isElite: boolean;
}

export interface WarframeTelemetryState {
  isLive: boolean;
  lastUpdated: string;
  cycles: WorldCycleInfo[];
  voidTrader: VoidTraderInfo;
  alerts: WarframeAlertInfo[];
  fissures: WarframeFissureInfo[];
  invasions: WarframeInvasionInfo[];
  sortie: WarframeSortieInfo;
  archonHunt: WarframeArchonInfo;
  nightwave: {
    season: number;
    phase: number;
    challenges: NightwaveChallenge[];
  };
}

export function formatRemainingTime(expiryIso: string, now = new Date()): string {
  if (!expiryIso) return 'SYNCING';
  const target = new Date(expiryIso).getTime();
  if (Number.isNaN(target)) return 'SYNCING';
  const diff = target - now.getTime();
  if (diff <= 0) return 'ROTATING';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}D ${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}H ${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
  }
  return `${String(minutes).padStart(2, '0')}M ${String(seconds).padStart(2, '0')}S`;
}

class WarframeService {
  private cachedState: WarframeTelemetryState | null = null;
  private pendingPromise: Promise<WarframeTelemetryState> | null = null;

  private async fetchEndpoint<T = any>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${WF_API_BASE}/${path}?language=en`, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async getTelemetry(forceRefresh = false): Promise<WarframeTelemetryState> {
    if (!forceRefresh && this.cachedState) {
      return this.cachedState;
    }

    if (!forceRefresh && this.pendingPromise) {
      return this.pendingPromise;
    }

    this.pendingPromise = this.loadTelemetry();
    try {
      return await this.pendingPromise;
    } finally {
      this.pendingPromise = null;
    }
  }

  private async loadTelemetry(): Promise<WarframeTelemetryState> {

    try {
      const [
        cetus,
        vallis,
        cambion,
        zariman,
        duviri,
        voidTraderRaw,
        alertsRaw,
        fissuresRaw,
        invasionsRaw,
        sortieRaw,
        archonRaw,
        nightwaveRaw,
      ] = await Promise.all([
        this.fetchEndpoint('cetusCycle'),
        this.fetchEndpoint('vallisCycle'),
        this.fetchEndpoint('cambionCycle'),
        this.fetchEndpoint('zarimanCycle'),
        this.fetchEndpoint('duviriCycle'),
        this.fetchEndpoint('voidTrader'),
        this.fetchEndpoint('alerts'),
        this.fetchEndpoint('fissures'),
        this.fetchEndpoint('invasions'),
        this.fetchEndpoint('sortie'),
        this.fetchEndpoint('archonHunt'),
        this.fetchEndpoint('nightwave'),
      ]);

      if (cetus || vallis || voidTraderRaw || fissuresRaw) {
        const cycles: WorldCycleInfo[] = [
          {
            id: 'cetus',
            name: 'Plains of Eidolon',
            zone: 'EARTH // CETUS',
            code: 'CYC-01',
            state: (cetus?.state || (cetus?.isDay ? 'DAY' : 'NIGHT')).toUpperCase(),
            isPositiveState: Boolean(cetus?.isDay),
            expiry: cetus?.expiry || '',
            timeLeft: cetus?.timeLeft || '',
            accentColor: cetus?.isDay ? '#FFB800' : '#00F0FF',
          },
          {
            id: 'vallis',
            name: 'Orb Vallis',
            zone: 'VENUS // FORTUNA',
            code: 'CYC-02',
            state: (vallis?.state || (vallis?.isWarm ? 'WARM' : 'COLD')).toUpperCase(),
            isPositiveState: Boolean(vallis?.isWarm),
            expiry: vallis?.expiry || '',
            timeLeft: vallis?.timeLeft || '',
            accentColor: vallis?.isWarm ? '#FF3B00' : '#00F0FF',
          },
          {
            id: 'cambion',
            name: 'Cambion Drift',
            zone: 'DEIMOS // NECRA',
            code: 'CYC-03',
            state: (cambion?.state || cambion?.active || 'FASS').toUpperCase(),
            isPositiveState: (cambion?.state || '').toLowerCase() === 'fass',
            expiry: cambion?.expiry || '',
            timeLeft: cambion?.timeLeft || '',
            accentColor:
              (cambion?.state || '').toLowerCase() === 'fass' ? '#FF3B00' : '#00F0FF',
          },
          {
            id: 'zariman',
            name: 'Zariman Ten Zero',
            zone: 'VOID // CHRYSLITH',
            code: 'CYC-04',
            state: (zariman?.state || (zariman?.isCorpus ? 'CORPUS' : 'GRINEER')).toUpperCase(),
            isPositiveState: Boolean(zariman?.isCorpus),
            expiry: zariman?.expiry || '',
            timeLeft: zariman?.timeLeft || '',
            accentColor: '#C8FF00',
          },
          {
            id: 'duviri',
            name: 'Duviri Spiral',
            zone: 'PARADOX // SPIRAL',
            code: 'CYC-05',
            state: (duviri?.state || 'JOY').toUpperCase(),
            isPositiveState: true,
            expiry: duviri?.expiry || '',
            timeLeft: '',
            accentColor: '#B829FF',
          },
        ];

        const nowMs = Date.now();
        const vtActivation = voidTraderRaw?.activation
          ? new Date(voidTraderRaw.activation).getTime()
          : 0;
        const vtExpiry = voidTraderRaw?.expiry
          ? new Date(voidTraderRaw.expiry).getTime()
          : 0;
        const vtActive =
          Boolean(voidTraderRaw?.active) ||
          (vtActivation > 0 && vtActivation <= nowMs && vtExpiry > nowMs);

        const rawInventory: VoidTraderItem[] = Array.isArray(
          voidTraderRaw?.inventory
        )
          ? voidTraderRaw.inventory.map((it: any) => ({
              uniqueName: it.uniqueName,
              item: it.item || 'Prisma Void Artifact',
              ducats: it.ducats ?? 350,
              credits: it.credits ?? 150000,
            }))
          : [];

        const voidTrader: VoidTraderInfo = {
          id: voidTraderRaw?.id || 'baro-1',
          character: "Baro Ki'Teer // Void Trader",
          location: voidTraderRaw?.location || 'Kronia Relay (Saturn)',
          active: vtActive,
          activation: voidTraderRaw?.activation || new Date().toISOString(),
          expiry: voidTraderRaw?.expiry || new Date(nowMs + 86400000 * 4).toISOString(),
          inventory:
            rawInventory.length > 0
              ? rawInventory
              : this.getFallbackBaroInventory(),
        };

        const alerts: WarframeAlertInfo[] = Array.isArray(alertsRaw)
          ? alertsRaw.slice(0, 8).map((a: any, i: number) => {
              const m = a.mission || {};
              const r = m.reward || {};
              const counted = Array.isArray(r.countedItems)
                ? r.countedItems
                    .map((ci: any) => `${ci.count > 1 ? `${ci.count}x ` : ''}${ci.type || ci.key}`)
                    .join(' + ')
                : '';
              const items = Array.isArray(r.items) ? r.items.join(' + ') : '';
              const rewardText =
                [counted, items, r.asString].filter(Boolean)[0] ||
                'Tactical Resource Cache';

              return {
                id: a.id || `alert-${i}`,
                node: m.node || 'System Sector',
                missionType: m.type || 'Tactical Alert',
                faction: m.faction || 'Enemy Force',
                rewardText,
                credits: r.credits || 10000,
                expiry: a.expiry || '',
                thumbnail: r.thumbnail,
              };
            })
          : [];

        const fissures: WarframeFissureInfo[] = Array.isArray(fissuresRaw)
          ? fissuresRaw
              .filter((f: any) => !f.expired)
              .sort((a: any, b: any) => (a.tierNum || 1) - (b.tierNum || 1))
              .slice(0, 14)
              .map((f: any, idx: number) => ({
                id: f.id || `fissure-${idx}`,
                node: f.node || 'Void Sector',
                missionType: f.missionType || 'Exterminate',
                enemy: f.enemy || 'Corrupted',
                tier: f.tier || 'Lith',
                tierNum: f.tierNum || 1,
                expiry: f.expiry || '',
                isStorm: Boolean(f.isStorm),
                isHard: Boolean(f.isHard),
              }))
          : [];

        const invasions: WarframeInvasionInfo[] = Array.isArray(invasionsRaw)
          ? invasionsRaw
              .filter((inv: any) => !inv.completed)
              .slice(0, 8)
              .map((inv: any, idx: number) => ({
                id: inv.id || `inv-${idx}`,
                node: inv.node || 'Contested Sector',
                desc: inv.desc || 'Faction Offensive',
                attackerFaction: inv.attacker?.faction || 'Attacker',
                attackerReward:
                  inv.attacker?.reward?.asString ||
                  inv.attackerReward?.asString ||
                  'Fieldron / Detonite',
                defenderFaction: inv.defender?.faction || 'Defender',
                defenderReward:
                  inv.defender?.reward?.asString ||
                  inv.defenderReward?.asString ||
                  'Mutagen Mass / Forma',
                completion: Math.max(0, Math.min(100, Math.round(inv.completion ?? 50))),
                vsInfestation: Boolean(inv.vsInfestation),
              }))
          : [];

        const sortie: WarframeSortieInfo = {
          id: sortieRaw?.id || 'sortie-live',
          boss: sortieRaw?.boss || 'General Sargas Ruk',
          faction: sortieRaw?.faction || 'Grineer',
          expiry: sortieRaw?.expiry || '',
          variants: Array.isArray(sortieRaw?.variants)
            ? sortieRaw.variants.map((v: any) => ({
                missionType: v.missionType || 'Assault',
                modifier: v.modifier || 'Augmented Enemy Armor',
                node: v.node || 'Sector Node',
              }))
            : [],
        };

        const archonHunt: WarframeArchonInfo = {
          id: archonRaw?.id || 'archon-live',
          boss: archonRaw?.boss || 'Archon Amar',
          faction: archonRaw?.faction || 'Narmer',
          expiry: archonRaw?.expiry || '',
          missions: Array.isArray(archonRaw?.missions)
            ? archonRaw.missions.map((m: any) => ({
                node: m.node || 'Narmer Sector',
                type: m.type || 'Sabotage',
              }))
            : [],
        };

        const challenges: NightwaveChallenge[] = Array.isArray(
          nightwaveRaw?.activeChallenges
        )
          ? nightwaveRaw.activeChallenges.slice(0, 8).map((c: any, idx: number) => ({
              id: c.id || `nw-${idx}`,
              title: c.title || 'Nightwave Directive',
              desc: c.desc || 'Complete objective in Origin System.',
              reputation: c.reputation || 4500,
              isDaily: Boolean(c.isDaily),
              isElite: Boolean(c.isElite),
            }))
          : [];

        const result: WarframeTelemetryState = {
          isLive: true,
          lastUpdated: new Date().toISOString(),
          cycles,
          voidTrader,
          alerts,
          fissures,
          invasions,
          sortie,
          archonHunt,
          nightwave: {
            season: nightwaveRaw?.season ?? 12,
            phase: nightwaveRaw?.phase ?? 1,
            challenges,
          },
        };

        this.cachedState = result;
        return result;
      }
    } catch (e) {
      console.warn('Warframe telemetry fallback triggered:', e);
    }

    return this.getFallbackTelemetry();
  }

  private getFallbackBaroInventory(): VoidTraderItem[] {
    return [
      { item: 'Primed Continuity', ducats: 350, credits: 100000 },
      { item: 'Primed Flow', ducats: 350, credits: 110000 },
      { item: 'Prisma Ignis Wraith', ducats: 550, credits: 250000 },
      { item: 'Jolt', ducats: 300, credits: 150000 },
      { item: 'Voltaic Strike', ducats: 300, credits: 150000 },
      { item: "Ki'Teer Ephemera", ducats: 100, credits: 150000 },
    ];
  }

  private getFallbackTelemetry(): WarframeTelemetryState {
    const inOneHour = new Date(Date.now() + 3600000).toISOString();
    return {
      isLive: false,
      lastUpdated: new Date().toISOString(),
      cycles: [
        {
          id: 'cetus',
          name: 'Plains of Eidolon',
          zone: 'EARTH // CETUS',
          code: 'CYC-01',
          state: 'DAY',
          isPositiveState: true,
          expiry: inOneHour,
          timeLeft: '45m',
          accentColor: '#FFB800',
        },
        {
          id: 'vallis',
          name: 'Orb Vallis',
          zone: 'VENUS // FORTUNA',
          code: 'CYC-02',
          state: 'COLD',
          isPositiveState: false,
          expiry: inOneHour,
          timeLeft: '14m',
          accentColor: '#00F0FF',
        },
        {
          id: 'cambion',
          name: 'Cambion Drift',
          zone: 'DEIMOS // NECRA',
          code: 'CYC-03',
          state: 'FASS',
          isPositiveState: true,
          expiry: inOneHour,
          timeLeft: '32m',
          accentColor: '#FF3B00',
        },
        {
          id: 'zariman',
          name: 'Zariman Ten Zero',
          zone: 'VOID // CHRYSLITH',
          code: 'CYC-04',
          state: 'CORPUS',
          isPositiveState: true,
          expiry: inOneHour,
          timeLeft: '58m',
          accentColor: '#C8FF00',
        },
        {
          id: 'duviri',
          name: 'Duviri Spiral',
          zone: 'PARADOX // SPIRAL',
          code: 'CYC-05',
          state: 'JOY',
          isPositiveState: true,
          expiry: inOneHour,
          timeLeft: '1h 12m',
          accentColor: '#B829FF',
        },
      ],
      voidTrader: {
        id: 'baro-fallback',
        character: "Baro Ki'Teer // Void Trader",
        location: 'Kronia Relay (Saturn)',
        active: false,
        activation: new Date(Date.now() + 86400000 * 4).toISOString(),
        expiry: new Date(Date.now() + 86400000 * 6).toISOString(),
        inventory: this.getFallbackBaroInventory(),
      },
      alerts: [
        {
          id: 'al-1',
          node: 'Stephano (Uranus)',
          missionType: 'Defense',
          faction: 'Grineer',
          rewardText: '3x Forma + Orokin Catalyst Blueprint',
          credits: 25000,
          expiry: inOneHour,
        },
      ],
      fissures: [
        {
          id: 'fis-1',
          node: 'Hepit (Void)',
          missionType: 'Capture',
          enemy: 'Orokin',
          tier: 'Lith',
          tierNum: 1,
          expiry: inOneHour,
          isStorm: false,
          isHard: false,
        },
        {
          id: 'fis-2',
          node: 'Ukko (Void)',
          missionType: 'Capture',
          enemy: 'Orokin',
          tier: 'Meso',
          tierNum: 2,
          expiry: inOneHour,
          isStorm: false,
          isHard: true,
        },
      ],
      invasions: [
        {
          id: 'inv-1',
          node: 'Adaro (Sedna)',
          desc: 'Grineer Offensive vs Corpus',
          attackerFaction: 'Grineer',
          attackerReward: '3x Detonite Injector',
          defenderFaction: 'Corpus',
          defenderReward: '3x Fieldron',
          completion: 64,
          vsInfestation: false,
        },
      ],
      sortie: {
        id: 'sortie-fallback',
        boss: 'Councilor Vay Hek',
        faction: 'Grineer',
        expiry: inOneHour,
        variants: [
          { missionType: 'Mobile Defense', modifier: 'Eximus Stronghold', node: 'Ceres' },
          { missionType: 'Spy', modifier: 'Enemy Elemental Enhancement', node: 'Lua' },
          { missionType: 'Assassination', modifier: 'Augmented Enemy Shields', node: 'Earth' },
        ],
      },
      archonHunt: {
        id: 'archon-fallback',
        boss: 'Archon Boreal',
        faction: 'Narmer',
        expiry: inOneHour,
        missions: [
          { node: 'Sabotage (Mars)', type: 'Sabotage' },
          { node: 'Defense (Jupiter)', type: 'Defense' },
          { node: 'Showdown (Earth)', type: 'Assassination' },
        ],
      },
      nightwave: {
        season: 12,
        phase: 1,
        challenges: [
          {
            id: 'nw-1',
            title: 'Eximus Executioner',
            desc: 'Kill 30 Eximus units across any Star Chart sector.',
            reputation: 7000,
            isDaily: false,
            isElite: true,
          },
        ],
      },
    };
  }
}

export const warframeService = new WarframeService();
