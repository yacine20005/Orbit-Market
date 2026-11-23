import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  formatRemainingTime,
  resolveCyclePhase,
  warframeService,
} from '../warframe';
import {
  apiService,
  isXurActiveUtc,
  getNextXurResetUtc,
  formatXurCountdownUtc,
} from '../api';
import { getRarityColor, getCurrencyName } from '../../constants/Colors';

describe('Warframe time formatting (formatRemainingTime)', () => {
  const now = new Date('2026-11-08T12:00:00.000Z');

  it('returns SYNCING on empty or invalid ISO string', () => {
    expect(formatRemainingTime('', now)).toBe('SYNCING');
    expect(formatRemainingTime('not-a-date', now)).toBe('SYNCING');
  });

  it('returns ROTATING when target time is in the past', () => {
    expect(formatRemainingTime('2026-11-08T11:59:59.000Z', now)).toBe('ROTATING');
  });

  it('formats multi-day, hour, and minute durations accurately', () => {
    expect(formatRemainingTime('2026-11-10T15:05:00.000Z', now)).toBe('2D 03H 05M');
    expect(formatRemainingTime('2026-11-08T14:09:04.000Z', now)).toBe('02H 09M 04S');
    expect(formatRemainingTime('2026-11-08T12:07:09.000Z', now)).toBe('07M 09S');
  });
});

describe('Destiny 2 Xûr UTC schedule math (17:00 UTC Friday -> 17:00 UTC Tuesday)', () => {
  it('marks Xûr inactive on Friday before 17:00 UTC and active at 17:00 UTC', () => {
    const fridayBefore = new Date('2026-11-06T16:59:59.000Z'); // Friday
    const fridayAtReset = new Date('2026-11-06T17:00:00.000Z'); // Friday
    expect(isXurActiveUtc(fridayBefore)).toBe(false);
    expect(isXurActiveUtc(fridayAtReset)).toBe(true);
    expect(formatXurCountdownUtc(fridayBefore)).toBe('00D 00H 00M 01S');
  });

  it('marks Xûr active on Tuesday before 17:00 UTC and inactive at 17:00 UTC', () => {
    const tuesdayBefore = new Date('2026-11-10T16:59:30.000Z'); // Tuesday
    const tuesdayAtReset = new Date('2026-11-10T17:00:00.000Z'); // Tuesday
    expect(isXurActiveUtc(tuesdayBefore)).toBe(true);
    expect(isXurActiveUtc(tuesdayAtReset)).toBe(false);
    expect(getNextXurResetUtc(tuesdayAtReset).toISOString()).toBe(
      '2026-11-13T17:00:00.000Z'
    );
  });
});

describe('Destiny 2 Manifest snapshot hydration & helpers', () => {
  it('hydrates curated vendors with separated weapon vs armor stat names', async () => {
    const bansheeRes = await apiService.getVendorInventory('banshee', true);
    const items = Object.values(bansheeRes.Response.sales.saleItems);
    expect(items.length).toBeGreaterThan(0);

    const firstWeapon = items[0];
    expect(firstWeapon.stats?.some((s) => s.name === 'Impact')).toBe(true);
    expect(firstWeapon.stats?.some((s) => s.name.includes('/'))).toBe(false);
    expect(firstWeapon.rollType).toBe('curated');
    expect(firstWeapon.perks.some((p) => p.slot === 'Trait')).toBe(true);

    // Random-roll focusing weapon has rollType === 'random'
    const randomWeapon = items.find((i) => i.itemName === 'Cantata-57');
    expect(randomWeapon?.rollType).toBe('random');
    expect(
      randomWeapon?.perks.some((p) => p.slot === 'Vendor Roll')
    ).toBe(true);

    // Non-weapon / non-armor materials (Ascendant Alloy, Enhancement Prism) have ZERO stats
    const alloy = items.find((i) => i.itemName === 'Ascendant Alloy');
    expect(alloy?.stats).toEqual([]);
  });

  it('ensures shaders, bounties, and passages have zero weapon/armor stats', async () => {
    const adaRes = await apiService.getVendorInventory('ada', true);
    const adaItems = Object.values(adaRes.Response.sales.saleItems);
    const shader = adaItems.find((i) => i.itemTypeDisplayName === 'Shader');
    const bounty = adaItems.find((i) =>
      i.itemTypeDisplayName?.includes('Bounty')
    );
    expect(shader?.stats).toEqual([]);
    expect(bounty?.stats).toEqual([]);
  });

  it('maps rarity and currency hashes to Marathon tokens', () => {
    expect(getRarityColor('Exotic')).toBe('#FFB800');
    expect(getRarityColor('Legendary')).toBe('#C259FF');
    expect(getCurrencyName(800069450)).toBe('Strange Coins');
    expect(getCurrencyName(3159615086)).toBe('Glimmer');
  });
});

function mockJsonResponse(body: any, ok = true, status = ok ? 200 : 500): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

function createFetchMock() {
  const mock = jest.fn<FetchFn>();
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('Destiny 2 ApiService reliability, filters & stats', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    apiService.clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    apiService.clearCache();
    jest.restoreAllMocks();
  });

  it('preserves The Xûrfboard (index 0) and reports offline snapshot metadata without sticky caching', async () => {
    const fetchMock = createFetchMock().mockRejectedValueOnce(
      new Error('Network offline')
    );

    const offlineRes = await apiService.getVendorInventory('xur');
    expect(offlineRes.Response.isLiveApi).toBe(false);
    expect(offlineRes.Response.isAvailable).toBe(isXurActiveUtc());
    expect(offlineRes.Response.sales.saleItems['0']?.itemName).toBe(
      'The Xûrfboard'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Offline fallback must NOT be cached: next call retries live API
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        Response: {
          vendors: {
            data: {
              '2190858386': {
                nextRefreshDate: '2026-11-24T17:00:00.000Z',
              },
            },
          },
          sales: {
            data: {
              '2190858386': {
                saleItems: {
                  '0': {
                    itemHash: 3158812152,
                    vendorItemIndex: 0,
                    costs: [
                      {
                        itemHash: 800069450,
                        quantity: 97,
                        hasConditionalVisibility: false,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      })
    );

    const liveRes = await apiService.getVendorInventory('xur');
    expect(liveRes.Response.isLiveApi).toBe(true);
    expect(liveRes.Response.isAvailable).toBe(true);
    expect(liveRes.Response.sales.saleItems['0']?.itemName).toBe(
      'The Xûrfboard'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Live response IS cached within TTL
    const cachedRes = await apiService.getVendorInventory('xur');
    expect(cachedRes.Response.isLiveApi).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('filters exact nav placeholders while keeping Gunsmith Engram and never fabricating armor stats', async () => {
    const fetchMock = createFetchMock().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/Destiny2/Vendors/')) {
        return mockJsonResponse({
          Response: {
            vendors: { data: { '2190858386': { nextRefreshDate: '2026-11-24T17:00:00.000Z' } } },
            sales: {
              data: {
                '2190858386': {
                  saleItems: {
                    '0': { itemHash: 900001, vendorItemIndex: 0, costs: [] }, // Nav: "Xûr"
                    '1': { itemHash: 900002, vendorItemIndex: 1, costs: [] }, // Nav: "More Strange Offers"
                    '2': { itemHash: 900003, vendorItemIndex: 2, costs: [] }, // Legit: "Gunsmith Engram"
                    '3': { itemHash: 900004, vendorItemIndex: 3, costs: [] }, // Armor w/ empty stats
                  },
                },
              },
            },
          },
        });
      }
      if (url.includes('/900001/')) {
        return mockJsonResponse({
          Response: { displayProperties: { name: 'Xûr' } },
        });
      }
      if (url.includes('/900002/')) {
        return mockJsonResponse({
          Response: { displayProperties: { name: 'More Strange Offers' } },
        });
      }
      if (url.includes('/900003/')) {
        return mockJsonResponse({
          Response: {
            hash: 900003,
            displayProperties: { name: 'Gunsmith Engram', description: 'Engram', icon: '' },
            inventory: { tierType: 5, tierTypeName: 'Legendary' },
            itemType: 8,
            itemSubType: 0,
            itemTypeDisplayName: 'Engram',
            classType: 3,
          },
        });
      }
      if (url.includes('/900004/')) {
        return mockJsonResponse({
          Response: {
            hash: 900004,
            displayProperties: { name: 'Test Exotic Helmet', description: 'Helmet', icon: '' },
            inventory: { tierType: 6, tierTypeName: 'Exotic' },
            itemType: 2,
            itemSubType: 26,
            itemTypeDisplayName: 'Helmet',
            classType: 0,
            stats: { stats: {} },
            sockets: { socketEntries: [] },
          },
        });
      }
      return mockJsonResponse({}, false, 404);
    });

    const res = await apiService.getVendorInventory('xur', true);
    const items = Object.values(res.Response.sales.saleItems);
    const names = items.map((i) => i.itemName);

    expect(names).not.toContain('Xûr');
    expect(names).not.toContain('More Strange Offers');
    expect(names).toContain('Gunsmith Engram');

    const helmet = items.find((i) => i.itemName === 'Test Exotic Helmet');
    expect(helmet).toBeDefined();
    expect(helmet?.stats).toEqual([]);
  });

  it('keeps bungieOk true in testConnection() when Warframe fails', async () => {
    createFetchMock().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('bungie.net')) {
        return mockJsonResponse({ Response: { version: '1.0' } });
      }
      throw new Error('WarframeStat.us unreachable');
    });

    const diag = await apiService.testConnection();
    expect(diag.bungieOk).toBe(true);
    expect(diag.warframeOk).toBe(false);
    expect(diag.success).toBe(true);
  });

  it('notifies cache-invalidation subscribers on setApiKey and clearCache', () => {
    const listener = jest.fn();
    const unsubscribe = apiService.subscribeCacheInvalidation(listener);

    apiService.setApiKey('test-key-123');
    expect(apiService.getApiKey()).toBe('test-key-123');
    expect(listener).toHaveBeenCalledTimes(1);

    apiService.clearCache();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    apiService.clearCache();
    expect(listener).toHaveBeenCalledTimes(2);

    apiService.setApiKey('');
  });

  it('prevents an older slow request from overwriting newer forceRefresh cache', async () => {
    let resolveSlow!: (res: Response) => void;
    const slowPromise = new Promise<Response>((resolve) => {
      resolveSlow = resolve;
    });

    const fetchMock = createFetchMock()
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce(
        mockJsonResponse({
          Response: {
            vendors: { data: { '2190858386': { nextRefreshDate: '2026-11-24T17:00:00.000Z' } } },
            sales: {
              data: {
                '2190858386': {
                  saleItems: {
                    '0': { itemHash: 3158812152, vendorItemIndex: 0, costs: [] },
                  },
                },
              },
            },
          },
        })
      );

    const slowCall = apiService.getVendorInventory('xur', false);
    const fastCall = apiService.getVendorInventory('xur', true);

    const fastRes = await fastCall;
    expect(fastRes.Response.sales.saleItems['0']?.itemName).toBe('The Xûrfboard');

    // Now resolve the older slow call with a different item
    resolveSlow(
      mockJsonResponse({
        Response: {
          vendors: { data: { '2190858386': { nextRefreshDate: '2026-11-24T17:00:00.000Z' } } },
          sales: {
            data: {
              '2190858386': {
                saleItems: {
                  '0': { itemHash: 3721047650, vendorItemIndex: 0, costs: [] },
                },
              },
            },
          },
        },
      })
    );
    await slowCall;

    // Cache must still hold the newer fastCall result, NOT the stale slowCall
    const cachedRes = await apiService.getVendorInventory('xur', false);
    expect(cachedRes.Response.sales.saleItems['0']?.itemName).toBe('The Xûrfboard');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('strips fabricated/negative armor stats from ManifestSnapshot while preserving positive weapon stats', async () => {
    createFetchMock().mockRejectedValueOnce(new Error('Offline'));

    const xurRes = await apiService.getVendorInventory('xur', true);
    const xurItems = Object.values(xurRes.Response.sales.saleItems);

    const wormhusk = xurItems.find((i) => i.itemName === 'Wormhusk Crown');
    const renewal = xurItems.find((i) => i.itemName === 'Renewal Grasps');
    const aeonSafe = xurItems.find((i) => i.itemName === 'Aeon Safe');
    expect(wormhusk?.stats).toEqual([]);
    expect(renewal?.stats).toEqual([]);
    expect(aeonSafe?.stats).toEqual([]);

    // No item in snapshot should ever emit negative stats
    for (const item of xurItems) {
      expect(item.stats?.every((s) => s.value > 0)).toBe(true);
    }

    // Weapon stats in snapshot remain intact and positive
    const bansheeRes = await apiService.getVendorInventory('banshee', true);
    const rose = Object.values(bansheeRes.Response.sales.saleItems).find(
      (i) => i.itemName === 'Rose'
    );
    expect(rose?.stats && rose.stats.length > 0).toBe(true);
    expect(rose?.stats?.every((s) => s.value > 0)).toBe(true);
  });
});

describe('WarframeService single-endpoint parsing, cycle math & cache invalidation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    warframeService.clearCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    warframeService.clearCache();
    jest.restoreAllMocks();
  });

  it('fetches single worldstate endpoint once and maps Baro, Cambion, Invasions, and Alerts accurately', async () => {
    const futureExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const baroActivation = new Date(Date.now() + 4 * 86400_000).toISOString();
    const baroExpiry = new Date(Date.now() + 6 * 86400_000).toISOString();

    const fetchMock = createFetchMock().mockResolvedValueOnce(
      mockJsonResponse({
        cetusCycle: {
          state: 'day',
          isDay: true,
          expiry: futureExpiry,
          timeLeft: '30m',
        },
        cambionCycle: {
          active: 'fass',
          expiry: futureExpiry,
        },
        voidTrader: {
          id: 'baro-test',
          location: 'Strata Relay (Earth)',
          active: false,
          activation: baroActivation,
          expiry: baroExpiry,
          inventory: [],
        },
        alerts: [
          {
            id: 'alert-zero-cr',
            expiry: futureExpiry,
            mission: {
              node: 'Cinxia (Ceres)',
              type: 'Interception',
              faction: 'Grineer',
              reward: {
                countedItems: [{ count: 2, type: 'Forma' }],
                items: ['Orokin Catalyst Blueprint'],
                credits: 0,
              },
            },
          },
        ],
        fissures: [
          {
            id: 'f1',
            node: 'Hepit (Void)',
            missionType: 'Capture',
            enemy: 'Orokin',
            tier: 'Lith',
            tierNum: 1,
            expiry: futureExpiry,
            isStorm: false,
            isHard: false,
          },
        ],
        invasions: [
          {
            id: 'inv-infested',
            node: 'Akkad (Eris)',
            desc: 'Infested Outbreak',
            vsInfestation: true,
            completed: false,
            completion: 42,
            attacker: { faction: 'Infested', reward: {} },
            defender: {
              faction: 'Corpus',
              reward: { asString: '3x Mutagen Mass' },
            },
          },
        ],
      })
    );

    const telemetry = await warframeService.getTelemetry(true);

    // Single HTTP call to /pc/?language=en
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.warframestat.us/pc/?language=en'
    );
    expect(telemetry.isLive).toBe(true);

    // Partial worldstate: only returned cycles exist, missing Sortie/Archon are null (not fabricated)
    expect(telemetry.cycles.map((c) => c.id)).toEqual(['cetus', 'cambion']);
    expect(telemetry.sortie).toBeNull();
    expect(telemetry.archonHunt).toBeNull();

    // Cambion reads `active` when `state` is absent
    const cambion = telemetry.cycles.find((c) => c.id === 'cambion');
    expect(cambion?.state).toBe('FASS');
    expect(cambion?.isPositiveState).toBe(true);
    expect(cambion?.accentColor).toBe('#FF3B00');

    // Baro away -> empty inventory (never fake fallback items)
    expect(telemetry.voidTrader?.active).toBe(false);
    expect(telemetry.voidTrader?.inventory).toEqual([]);

    // Alert joins countedItems + items and preserves 0 credits
    expect(telemetry.alerts[0].rewardText).toBe(
      '2x Forma + Orokin Catalyst Blueprint'
    );
    expect(telemetry.alerts[0].credits).toBe(0);

    // Infestation invasion uses 'None' for attacker reward
    expect(telemetry.invasions[0].vsInfestation).toBe(true);
    expect(telemetry.invasions[0].attackerReward).toBe('None');
    expect(telemetry.invasions[0].defenderReward).toBe('3x Mutagen Mass');

    // Subsequent call within 60s TTL hits cache
    const cached = await warframeService.getTelemetry();
    expect(cached).toBe(telemetry);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('extrapolates lagged Warframe cycle expiry timestamps instead of showing stale ROTATING', () => {
    const nowMs = new Date('2026-11-22T23:36:00.000Z').getTime();
    const resolved = resolveCyclePhase(
      'night',
      '2026-11-22T22:06:00.000Z',
      [
        { state: 'DAY', durationMs: 100 * 60 * 1000 },
        { state: 'NIGHT', durationMs: 50 * 60 * 1000 },
      ],
      nowMs
    );
    expect(resolved.extrapolated).toBe(true);
    expect(resolved.state).toBe('DAY');
    expect(resolved.expiry).toBe('2026-11-22T23:46:00.000Z');
    expect(formatRemainingTime(resolved.expiry, new Date(nowMs))).toBe('10M 00S');
  });

  it('does not cache offline fallback and notifies subscribers on clearCache', async () => {
    const listener = jest.fn();
    const unsubscribe = warframeService.subscribeCacheInvalidation(listener);

    const fetchMock = createFetchMock().mockRejectedValueOnce(
      new Error('Offline')
    );

    const fallback = await warframeService.getTelemetry();
    expect(fallback.isLive).toBe(false);
    expect(fallback.voidTrader?.inventory).toEqual([]);

    // Next call retries because offline fallback is not cached
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        cetusCycle: {
          state: 'night',
          isDay: false,
          expiry: new Date(Date.now() + 600_000).toISOString(),
        },
      })
    );
    const recovered = await warframeService.getTelemetry();
    expect(recovered.isLive).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    warframeService.clearCache();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    warframeService.clearCache();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('formats live invasion rewards from countedItems/items when asString is omitted', async () => {
    createFetchMock().mockResolvedValueOnce(
      mockJsonResponse({
        invasions: [
          {
            id: 'inv-counted',
            node: 'Ananke (Jupiter)',
            desc: 'Grineer Offensive',
            vsInfestation: false,
            completed: false,
            completion: 62,
            attacker: {
              faction: 'Grineer',
              reward: {
                items: [],
                countedItems: [{ count: 3, type: 'Detonite Injector' }],
                credits: 0,
              },
            },
            defender: {
              faction: 'Corpus',
              reward: {
                items: ['Orokin Reactor Blueprint'],
                countedItems: [{ count: 1, type: 'Fieldron' }],
                credits: 0,
              },
            },
          },
          {
            id: 'inv-infest-counted',
            node: 'Cypress (Pluto)',
            desc: 'Infested Outbreak',
            vsInfestation: true,
            completed: false,
            completion: 30,
            attacker: { faction: 'Infested' },
            defender: {
              faction: 'Corpus',
              reward: {
                items: [],
                countedItems: [
                  { count: 1, type: 'Mutalist Alad V Nav Coordinate' },
                ],
                credits: 0,
              },
            },
          },
        ],
      })
    );

    const telemetry = await warframeService.getTelemetry(true);
    expect(telemetry.invasions).toHaveLength(2);
    expect(telemetry.invasions[0].attackerReward).toBe('3x Detonite Injector');
    expect(telemetry.invasions[0].defenderReward).toBe(
      'Fieldron + Orokin Reactor Blueprint'
    );
    expect(telemetry.invasions[1].attackerReward).toBe('None');
    expect(telemetry.invasions[1].defenderReward).toBe(
      'Mutalist Alad V Nav Coordinate'
    );
  });
});
