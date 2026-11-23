// Autonomous Warframe WorldState Telemetry Service (api.warframestat.us/pc)
// Covers Open World Cycles, Baro Ki'Teer (Void Trader), Alerts, Void Fissures, Invasions, Sortie, Archon Hunt, and Nightwave

import { fetchWithTimeout } from './api';

const WF_API_BASE = 'https://api.warframestat.us/pc';
const WARFRAME_CACHE_TTL_MS = 60 * 1000;

interface CyclePhaseSpec {
  state: string;
  durationMs: number;
}

const CETUS_PHASES: CyclePhaseSpec[] = [
  { state: 'DAY', durationMs: 100 * 60 * 1000 },
  { state: 'NIGHT', durationMs: 50 * 60 * 1000 },
];

const VALLIS_PHASES: CyclePhaseSpec[] = [
  { state: 'WARM', durationMs: 400 * 1000 },
  { state: 'COLD', durationMs: 1200 * 1000 },
];

const CAMBION_PHASES: CyclePhaseSpec[] = [
  { state: 'FASS', durationMs: 100 * 60 * 1000 },
  { state: 'VOME', durationMs: 50 * 60 * 1000 },
];

const ZARIMAN_PHASES: CyclePhaseSpec[] = [
  { state: 'CORPUS', durationMs: 150 * 60 * 1000 },
  { state: 'GRINEER', durationMs: 150 * 60 * 1000 },
];

const DUVIRI_PHASES: CyclePhaseSpec[] = [
  { state: 'JOY', durationMs: 120 * 60 * 1000 },
  { state: 'ANGER', durationMs: 120 * 60 * 1000 },
  { state: 'ENVY', durationMs: 120 * 60 * 1000 },
  { state: 'SORROW', durationMs: 120 * 60 * 1000 },
  { state: 'FEAR', durationMs: 120 * 60 * 1000 },
];

export function resolveCyclePhase(
  rawState: string,
  rawExpiry: string,
  phases: CyclePhaseSpec[],
  nowMs = Date.now()
): { state: string; expiry: string; extrapolated: boolean } {
  const normalized = (rawState || '').trim().toUpperCase();
  const expiryMs = rawExpiry ? new Date(rawExpiry).getTime() : NaN;

  if (!normalized || Number.isNaN(expiryMs) || expiryMs > nowMs) {
    return {
      state: normalized || 'UNKNOWN',
      expiry: rawExpiry || '',
      extrapolated: false,
    };
  }

  const startIdx = phases.findIndex((p) => p.state === normalized);
  if (startIdx === -1) {
    return { state: normalized, expiry: rawExpiry, extrapolated: false };
  }

  const totalPeriod = phases.reduce((sum, p) => sum + p.durationMs, 0);
  let elapsed = (nowMs - expiryMs) % totalPeriod;
  let idx = (startIdx + 1) % phases.length;

  while (elapsed >= phases[idx].durationMs) {
    elapsed -= phases[idx].durationMs;
    idx = (idx + 1) % phases.length;
  }

  const remainingMs = phases[idx].durationMs - elapsed;
  return {
    state: phases[idx].state,
    expiry: new Date(nowMs + remainingMs).toISOString(),
    extrapolated: true,
  };
}

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
  voidTrader: VoidTraderInfo | null;
  alerts: WarframeAlertInfo[];
  fissures: WarframeFissureInfo[];
  invasions: WarframeInvasionInfo[];
  sortie: WarframeSortieInfo | null;
  archonHunt: WarframeArchonInfo | null;
  nightwave: {
    season: number;
    phase: number;
    challenges: NightwaveChallenge[];
  };
}

function formatRewardItems(reward: any): string {
  if (!reward || typeof reward !== 'object') return '';
  const counted = Array.isArray(reward.countedItems)
    ? reward.countedItems
        .map((ci: any) => {
          const label = ci?.type || ci?.key || '';
          if (!label) return '';
          return ci.count > 1 ? `${ci.count}x ${label}` : label;
        })
        .filter(Boolean)
        .join(' + ')
    : '';
  const items = Array.isArray(reward.items)
    ? reward.items.filter(Boolean).join(' + ')
    : '';
  return [counted, items].filter(Boolean).join(' + ');
}

function formatInvasionReward(reward: any): string {
  if (!reward || typeof reward !== 'object') return 'None';
  if (typeof reward.asString === 'string' && reward.asString.trim()) {
    return reward.asString.trim();
  }
  const combined = formatRewardItems(reward);
  if (combined) return combined;
  if (typeof reward.credits === 'number' && reward.credits > 0) {
    return `${reward.credits.toLocaleString()} Credits`;
  }
  return 'None';
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
  private cacheExpiresAt = 0;
  private pendingPromise: Promise<WarframeTelemetryState> | null = null;
  private cacheGeneration = 0;
  private cacheListeners = new Set<() => void>();

  subscribeCacheInvalidation(cb: () => void): () => void {
    this.cacheListeners.add(cb);
    return () => {
      this.cacheListeners.delete(cb);
    };
  }

  clearCache() {
    this.cacheGeneration += 1;
    this.cachedState = null;
    this.cacheExpiresAt = 0;
    this.pendingPromise = null;
    this.cacheListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Isolate subscriber errors
      }
    });
  }

  private async fetchWorldState(): Promise<Record<string, any> | null> {
    try {
      const response = await fetchWithTimeout(`${WF_API_BASE}/?language=en`, {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  }

  async getTelemetry(forceRefresh = false): Promise<WarframeTelemetryState> {
    if (!forceRefresh && this.cachedState && Date.now() < this.cacheExpiresAt) {
      return this.cachedState;
    }

    if (!forceRefresh && this.cachedState) {
      this.cachedState = null;
      this.cacheExpiresAt = 0;
    }

    if (!forceRefresh && this.pendingPromise) {
      return this.pendingPromise;
    }

    if (forceRefresh) {
      this.cacheGeneration += 1;
    }

    const generation = this.cacheGeneration;
    const promise = this.loadTelemetry(generation);
    this.pendingPromise = promise;
    try {
      return await promise;
    } finally {
      if (this.pendingPromise === promise) {
        this.pendingPromise = null;
      }
    }
  }

  private async loadTelemetry(
    generation: number
  ): Promise<WarframeTelemetryState> {
    try {
      const worldstate = await this.fetchWorldState();

      if (worldstate) {
        const cetus = worldstate.cetusCycle;
        const vallis = worldstate.vallisCycle;
        const cambion = worldstate.cambionCycle;
        const zariman = worldstate.zarimanCycle;
        const duviri = worldstate.duviriCycle;
        const voidTraderRaw = worldstate.voidTrader;
        const alertsRaw = worldstate.alerts;
        const fissuresRaw = worldstate.fissures;
        const invasionsRaw = worldstate.invasions;
        const sortieRaw = worldstate.sortie;
        const archonRaw = worldstate.archonHunt;
        const nightwaveRaw = worldstate.nightwave;

        const hasRecognizedSection = Boolean(
          cetus ||
            vallis ||
            cambion ||
            zariman ||
            duviri ||
            voidTraderRaw ||
            Array.isArray(alertsRaw) ||
            Array.isArray(fissuresRaw) ||
            Array.isArray(invasionsRaw) ||
            sortieRaw ||
            archonRaw ||
            nightwaveRaw
        );

        if (hasRecognizedSection) {
          const nowMs = Date.now();
          const nowDate = new Date(nowMs);
          const cycles: WorldCycleInfo[] = [];

          if (cetus && (cetus.state || typeof cetus.isDay === 'boolean')) {
            const rawState = cetus.state || (cetus.isDay ? 'DAY' : 'NIGHT');
            const resolved = resolveCyclePhase(
              rawState,
              cetus.expiry || '',
              CETUS_PHASES,
              nowMs
            );
            const isDay = resolved.state === 'DAY';
            cycles.push({
              id: 'cetus',
              name: 'Plains of Eidolon',
              zone: 'EARTH // CETUS',
              code: 'CYC-01',
              state: resolved.state,
              isPositiveState: isDay,
              expiry: resolved.expiry,
              timeLeft: resolved.extrapolated
                ? formatRemainingTime(resolved.expiry, nowDate)
                : cetus.timeLeft || '',
              accentColor: isDay ? '#FFB800' : '#00F0FF',
            });
          }

          if (vallis && (vallis.state || typeof vallis.isWarm === 'boolean')) {
            const rawState = vallis.state || (vallis.isWarm ? 'WARM' : 'COLD');
            const resolved = resolveCyclePhase(
              rawState,
              vallis.expiry || '',
              VALLIS_PHASES,
              nowMs
            );
            const isWarm = resolved.state === 'WARM';
            cycles.push({
              id: 'vallis',
              name: 'Orb Vallis',
              zone: 'VENUS // FORTUNA',
              code: 'CYC-02',
              state: resolved.state,
              isPositiveState: isWarm,
              expiry: resolved.expiry,
              timeLeft: resolved.extrapolated
                ? formatRemainingTime(resolved.expiry, nowDate)
                : vallis.timeLeft || '',
              accentColor: isWarm ? '#FF3B00' : '#00F0FF',
            });
          }

          if (cambion && (cambion.state || cambion.active)) {
            const rawState = cambion.state || cambion.active;
            const resolved = resolveCyclePhase(
              rawState,
              cambion.expiry || '',
              CAMBION_PHASES,
              nowMs
            );
            const isFass = resolved.state === 'FASS';
            cycles.push({
              id: 'cambion',
              name: 'Cambion Drift',
              zone: 'DEIMOS // NECRA',
              code: 'CYC-03',
              state: resolved.state,
              isPositiveState: isFass,
              expiry: resolved.expiry,
              timeLeft: resolved.extrapolated
                ? formatRemainingTime(resolved.expiry, nowDate)
                : cambion.timeLeft || '',
              accentColor: isFass ? '#FF3B00' : '#00F0FF',
            });
          }

          if (
            zariman &&
            (zariman.state || typeof zariman.isCorpus === 'boolean')
          ) {
            const rawState =
              zariman.state || (zariman.isCorpus ? 'CORPUS' : 'GRINEER');
            const resolved = resolveCyclePhase(
              rawState,
              zariman.expiry || '',
              ZARIMAN_PHASES,
              nowMs
            );
            const isCorpus = resolved.state === 'CORPUS';
            cycles.push({
              id: 'zariman',
              name: 'Zariman Ten Zero',
              zone: 'VOID // CHRYSLITH',
              code: 'CYC-04',
              state: resolved.state,
              isPositiveState: isCorpus,
              expiry: resolved.expiry,
              timeLeft: resolved.extrapolated
                ? formatRemainingTime(resolved.expiry, nowDate)
                : zariman.timeLeft || '',
              accentColor: '#C8FF00',
            });
          }

          if (duviri && duviri.state) {
            const resolved = resolveCyclePhase(
              duviri.state,
              duviri.expiry || '',
              DUVIRI_PHASES,
              nowMs
            );
            cycles.push({
              id: 'duviri',
              name: 'Duviri Spiral',
              zone: 'PARADOX // SPIRAL',
              code: 'CYC-05',
              state: resolved.state,
              isPositiveState: true,
              expiry: resolved.expiry,
              timeLeft: resolved.extrapolated
                ? formatRemainingTime(resolved.expiry, nowDate)
                : duviri.timeLeft || '',
              accentColor: '#B829FF',
            });
          }

          let voidTrader: VoidTraderInfo | null = null;
          if (voidTraderRaw) {
            const vtActivation = voidTraderRaw.activation
              ? new Date(voidTraderRaw.activation).getTime()
              : 0;
            const vtExpiry = voidTraderRaw.expiry
              ? new Date(voidTraderRaw.expiry).getTime()
              : 0;
            const vtActive =
              Boolean(voidTraderRaw.active) ||
              (vtActivation > 0 && vtActivation <= nowMs && vtExpiry > nowMs);

            const rawInventory: VoidTraderItem[] = Array.isArray(
              voidTraderRaw.inventory
            )
              ? voidTraderRaw.inventory.map((it: any) => ({
                  uniqueName: it.uniqueName,
                  item: it.item || 'Prisma Void Artifact',
                  ducats: it.ducats ?? 0,
                  credits: it.credits ?? 0,
                }))
              : [];

            voidTrader = {
              id: voidTraderRaw.id || 'baro-1',
              character: "Baro Ki'Teer // Void Trader",
              location: voidTraderRaw.location || 'Relay TBD',
              active: vtActive,
              activation: voidTraderRaw.activation || '',
              expiry: voidTraderRaw.expiry || '',
              inventory: rawInventory,
            };
          }

          const alerts: WarframeAlertInfo[] = Array.isArray(alertsRaw)
            ? alertsRaw.slice(0, 8).map((a: any, i: number) => {
                const m = a.mission || {};
                const r = m.reward || {};
                const combinedItems = formatRewardItems(r);
                const rewardText =
                  combinedItems || r.asString || 'Tactical Resource Cache';

                return {
                  id: a.id || `alert-${i}`,
                  node: m.node || 'System Sector',
                  missionType: m.type || 'Tactical Alert',
                  faction: m.faction || 'Enemy Force',
                  rewardText,
                  credits: r.credits ?? 0,
                  expiry: a.expiry || '',
                  thumbnail: r.thumbnail,
                };
              })
            : [];

          const activeFissures = Array.isArray(fissuresRaw)
            ? fissuresRaw.filter((f: any) => !f.expired)
            : [];
          const futureFissures = activeFissures.filter((f: any) => {
            const exp = f.expiry ? new Date(f.expiry).getTime() : NaN;
            return !Number.isNaN(exp) && exp > nowMs;
          });
          const fissurePool =
            futureFissures.length > 0 ? futureFissures : activeFissures;

          const fissures: WarframeFissureInfo[] = fissurePool
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
            }));

          const invasions: WarframeInvasionInfo[] = Array.isArray(invasionsRaw)
            ? invasionsRaw
                .filter((inv: any) => !inv.completed)
                .slice(0, 8)
                .map((inv: any, idx: number) => {
                  const vsInfestation = Boolean(inv.vsInfestation);
                  const attackerRewardObj =
                    inv.attacker?.reward ?? inv.attackerReward;
                  const defenderRewardObj =
                    inv.defender?.reward ?? inv.defenderReward;
                  return {
                    id: inv.id || `inv-${idx}`,
                    node: inv.node || 'Contested Sector',
                    desc: inv.desc || 'Faction Offensive',
                    attackerFaction: inv.attacker?.faction || 'Attacker',
                    attackerReward: vsInfestation
                      ? 'None'
                      : formatInvasionReward(attackerRewardObj),
                    defenderFaction: inv.defender?.faction || 'Defender',
                    defenderReward: formatInvasionReward(defenderRewardObj),
                    completion: Math.max(
                      0,
                      Math.min(100, Math.round(inv.completion ?? 50))
                    ),
                    vsInfestation,
                  };
                })
            : [];

          const sortie: WarframeSortieInfo | null =
            sortieRaw &&
            (sortieRaw.boss ||
              (Array.isArray(sortieRaw.variants) &&
                sortieRaw.variants.length > 0))
              ? {
                  id: sortieRaw.id || 'sortie-live',
                  boss: sortieRaw.boss || 'Unknown Commander',
                  faction: sortieRaw.faction || 'Unknown',
                  expiry: sortieRaw.expiry || '',
                  variants: Array.isArray(sortieRaw.variants)
                    ? sortieRaw.variants.map((v: any) => ({
                        missionType: v.missionType || 'Assault',
                        modifier: v.modifier || 'Augmented Enemy Armor',
                        node: v.node || 'Sector Node',
                      }))
                    : [],
                }
              : null;

          const archonHunt: WarframeArchonInfo | null =
            archonRaw &&
            (archonRaw.boss ||
              (Array.isArray(archonRaw.missions) &&
                archonRaw.missions.length > 0))
              ? {
                  id: archonRaw.id || 'archon-live',
                  boss: archonRaw.boss || 'Unknown Archon',
                  faction: archonRaw.faction || 'Narmer',
                  expiry: archonRaw.expiry || '',
                  missions: Array.isArray(archonRaw.missions)
                    ? archonRaw.missions.map((m: any) => ({
                        node: m.node || 'Narmer Sector',
                        type: m.type || 'Sabotage',
                      }))
                    : [],
                }
              : null;

          const challenges: NightwaveChallenge[] = Array.isArray(
            nightwaveRaw?.activeChallenges
          )
            ? nightwaveRaw.activeChallenges
                .slice(0, 8)
                .map((c: any, idx: number) => ({
                  id: c.id || `nw-${idx}`,
                  title: c.title || 'Nightwave Directive',
                  desc: c.desc || 'Complete objective in Origin System.',
                  reputation: c.reputation ?? 4500,
                  isDaily: Boolean(c.isDaily),
                  isElite: Boolean(c.isElite),
                }))
            : [];

          const result: WarframeTelemetryState = {
            isLive: true,
            lastUpdated: new Date(nowMs).toISOString(),
            cycles,
            voidTrader,
            alerts,
            fissures,
            invasions,
            sortie,
            archonHunt,
            nightwave: {
              season: nightwaveRaw?.season ?? 0,
              phase: nightwaveRaw?.phase ?? 0,
              challenges,
            },
          };

          if (this.cacheGeneration === generation) {
            this.cachedState = result;
            this.cacheExpiresAt = Date.now() + WARFRAME_CACHE_TTL_MS;
          }
          return result;
        }
      }
    } catch (e) {
      console.warn('Warframe telemetry fallback triggered:', e);
    }

    return this.getFallbackTelemetry();
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
        inventory: [],
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
