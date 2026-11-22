import { describe, it, expect } from '@jest/globals';
import { formatRemainingTime } from '../warframe';
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
