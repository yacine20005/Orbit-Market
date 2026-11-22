import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useWarframe } from '@/hooks/useWarframe';
import { formatRemainingTime } from '@/services/warframe';
import {
  SectionBarcodeHeader,
  StatusPill,
} from '@/components/MarathonPrimitives';

const M = Colors.marathon;

type WarframeSection = 'cycles' | 'baro' | 'fissures' | 'ops';

const SECTIONS: Array<{ id: WarframeSection; label: string }> = [
  { id: 'cycles', label: 'Cycles' },
  { id: 'baro', label: "Baro Ki'Teer" },
  { id: 'fissures', label: 'Fissures' },
  { id: 'ops', label: 'Sortie' },
];

export default function WarframeScreen() {
  const insets = useSafeAreaInsets();
  const { telemetry, isLoading, now, refreshTelemetry } = useWarframe();
  const [activeSection, setActiveSection] = useState<WarframeSection>('cycles');

  const cycles = telemetry?.cycles || [];
  const voidTrader = telemetry?.voidTrader;
  const alerts = telemetry?.alerts || [];
  const fissures = telemetry?.fissures || [];
  const invasions = telemetry?.invasions || [];
  const sortie = telemetry?.sortie;
  const archon = telemetry?.archonHunt;
  const nightwave = telemetry?.nightwave;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Warframe · WorldState</Text>
        <Text style={styles.topBarMeta}>
          {telemetry?.isLive ? 'Live Sync' : 'Cached'}
        </Text>
      </View>

      {/* 4 Clean Equal-Width Section Tabs */}
      <View style={styles.tabRow}>
        {SECTIONS.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <Pressable
              key={sec.id}
              style={[
                styles.tabBtn,
                active && styles.tabBtnActive,
              ]}
              onPress={() => setActiveSection(sec.id)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  active && styles.tabBtnTextActive,
                ]}
              >
                {sec.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshTelemetry}
            tintColor={M.bone}
          />
        }
      >
        {/* SECTION 1: OPEN WORLD CYCLES */}
        {activeSection === 'cycles' && (
          <View>
            <SectionBarcodeHeader
              title="Open World Cycles"
              subtitle="Live environmental rotations across 5 zones"
            />

            <View style={styles.boardCard}>
              {cycles.map((cycle, index) => {
                const liveCountdown = cycle.expiry
                  ? formatRemainingTime(cycle.expiry, now)
                  : cycle.timeLeft || 'LIVE';

                return (
                  <View
                    key={cycle.id}
                    style={[
                      styles.cycleRow,
                      index === cycles.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.cycleInfo}>
                      <Text style={styles.cycleTitle}>{cycle.name}</Text>
                      <Text style={styles.cycleSubtitle}>
                        {cycle.zone.replace(' // ', ' · ')}
                      </Text>
                    </View>

                    <View style={styles.cycleStatusCol}>
                      <Text style={styles.cycleStateText}>{cycle.state}</Text>
                      <Text style={styles.cycleCountdown}>{liveCountdown}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Active Tactical Alerts */}
            <View style={styles.subSection}>
              <SectionBarcodeHeader
                title="Tactical Alerts & Events"
                subtitle="High-priority Lotus directives"
                rightText={`${alerts.length} Active`}
              />

              {alerts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>
                    No Special Alerts Active
                  </Text>
                  <Text style={styles.emptyDesc}>
                    Check Fissures or Sortie tabs for active Void Relics,
                    Invasions, and daily endgame missions.
                  </Text>
                </View>
              ) : (
                <View style={styles.boardCard}>
                  {alerts.map((al, idx) => (
                    <View
                      key={al.id}
                      style={[
                        styles.alertRow,
                        idx === alerts.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View style={styles.alertLeft}>
                        <Text style={styles.alertReward}>{al.rewardText}</Text>
                        <Text style={styles.alertMeta}>
                          {al.node} · {al.missionType} ({al.faction})
                        </Text>
                      </View>
                      <View style={styles.alertRight}>
                        <Text style={styles.alertTimer}>
                          {formatRemainingTime(al.expiry, now)}
                        </Text>
                        <Text style={styles.alertCredits}>
                          +{al.credits.toLocaleString()} Cr
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* SECTION 2: BARO KI'TEER */}
        {activeSection === 'baro' && voidTrader && (
          <View>
            <SectionBarcodeHeader
              title="Baro Ki'Teer · Void Trader"
              subtitle={voidTrader.location}
              rightText={voidTrader.active ? 'Docked' : 'Inbound'}
            />

            <View style={styles.baroSummaryCard}>
              <View style={styles.baroSummaryTop}>
                <View>
                  <Text style={styles.baroLocationLabel}>Relay Destination</Text>
                  <Text style={styles.baroLocationValue}>
                    {voidTrader.location}
                  </Text>
                </View>
                <StatusPill
                  label={voidTrader.active ? 'Active Now' : 'In Transit'}
                  filled={voidTrader.active}
                />
              </View>

              <View style={styles.baroTimerBox}>
                <Text style={styles.baroTimerLabel}>
                  {voidTrader.active ? 'Departs Relay In' : 'Arrives At Relay In'}
                </Text>
                <Text style={styles.baroTimerValue}>
                  {formatRemainingTime(
                    voidTrader.active
                      ? voidTrader.expiry
                      : voidTrader.activation,
                    now
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.subSection}>
              <SectionBarcodeHeader
                title={`Void Trader Inventory (${voidTrader.inventory.length})`}
                subtitle={
                  voidTrader.active
                    ? 'Live offerings available for Ducats & Credits'
                    : 'Archived rotation manifest'
                }
              />

              <View style={styles.boardCard}>
                {voidTrader.inventory.map((item, idx) => (
                  <View
                    key={`${item.item}-${idx}`}
                    style={[
                      styles.baroItemRow,
                      idx === voidTrader.inventory.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <Text style={styles.baroItemName}>{item.item}</Text>
                    <View style={styles.baroCosts}>
                      <View style={styles.costPillDucat}>
                        <Text style={styles.ducatVal}>{item.ducats}</Text>
                        <Text style={styles.ducatUnit}>Ducats</Text>
                      </View>
                      <View style={styles.costPillCredit}>
                        <Text style={styles.creditVal}>
                          {Math.round(item.credits / 1000)}k
                        </Text>
                        <Text style={styles.creditUnit}>Cr</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* SECTION 3: VOID FISSURES & INVASIONS */}
        {activeSection === 'fissures' && (
          <View>
            <SectionBarcodeHeader
              title="Active Void Fissures"
              subtitle="Relic cracking missions sorted by tier"
              rightText={`${fissures.length} Active`}
            />

            <View style={styles.boardCard}>
              {fissures.map((f, idx) => (
                <View
                  key={f.id}
                  style={[
                    styles.fissureRow,
                    idx === fissures.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.fissureLeft}>
                    <View style={styles.fissureTitleLine}>
                      <Text style={styles.fissureType}>{f.missionType}</Text>
                      {f.isHard && (
                        <Text style={styles.modeTag}>· Steel Path</Text>
                      )}
                      {f.isStorm && (
                        <Text style={styles.modeTag}>· Void Storm</Text>
                      )}
                    </View>
                    <Text style={styles.fissureNode}>
                      {f.node} · {f.enemy}
                    </Text>
                  </View>

                  <View style={styles.fissureRight}>
                    <Text style={styles.fissureTier}>{f.tier}</Text>
                    <Text style={styles.fissureTimer}>
                      {formatRemainingTime(f.expiry, now)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Faction Invasions */}
            <View style={styles.subSection}>
              <SectionBarcodeHeader
                title="Faction Invasions"
                subtitle="Support Grineer or Corpus for Fieldron, Detonite & Mutagen"
                rightText={`${invasions.length} Sectors`}
              />

              <View style={styles.invasionList}>
                {invasions.map((inv) => (
                  <View key={inv.id} style={styles.invasionCard}>
                    <View style={styles.invasionTop}>
                      <Text style={styles.invasionNode}>{inv.node}</Text>
                      <Text style={styles.invasionPct}>{inv.completion}%</Text>
                    </View>
                    <Text style={styles.invasionDesc}>{inv.desc}</Text>

                    <View style={styles.invasionBarTrack}>
                      <View
                        style={[
                          styles.invasionBarFill,
                          { width: `${inv.completion}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.invasionRewards}>
                      <View style={styles.invSide}>
                        <Text style={styles.invFaction}>
                          {inv.attackerFaction}
                        </Text>
                        <Text style={styles.invRewardText} numberOfLines={1}>
                          {inv.attackerReward}
                        </Text>
                      </View>
                      <View style={[styles.invSide, { alignItems: 'flex-end' }]}>
                        <Text style={styles.invFaction}>
                          {inv.defenderFaction}
                        </Text>
                        <Text style={styles.invRewardText} numberOfLines={1}>
                          {inv.defenderReward}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* SECTION 4: SORTIE, ARCHON HUNT & NIGHTWAVE */}
        {activeSection === 'ops' && (
          <View>
            {sortie && (
              <View>
                <SectionBarcodeHeader
                  title={`Daily Sortie · ${sortie.boss}`}
                  subtitle={`${sortie.faction} Command`}
                  rightText={formatRemainingTime(sortie.expiry, now)}
                />

                <View style={styles.boardCard}>
                  {sortie.variants.map((v, i) => (
                    <View
                      key={`${v.node}-${i}`}
                      style={[
                        styles.sortieRow,
                        i === sortie.variants.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.sortieStageBadge}>
                        <Text style={styles.sortieStageText}>{i + 1}</Text>
                      </View>
                      <View style={styles.sortieBody}>
                        <Text style={styles.sortieType}>
                          {v.missionType} · {v.node}
                        </Text>
                        <Text style={styles.sortieMod}>{v.modifier}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {archon && (
              <View style={styles.subSection}>
                <SectionBarcodeHeader
                  title={`Archon Hunt · ${archon.boss}`}
                  subtitle="Weekly Narmer Showdown"
                  rightText={formatRemainingTime(archon.expiry, now)}
                />

                <View style={styles.boardCard}>
                  {archon.missions.map((m, i) => (
                    <View
                      key={`${m.node}-${i}`}
                      style={[
                        styles.sortieRow,
                        i === archon.missions.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.sortieStageBadge}>
                        <Text style={styles.sortieStageText}>{i + 1}</Text>
                      </View>
                      <View style={styles.sortieBody}>
                        <Text style={styles.sortieType}>{m.type}</Text>
                        <Text style={styles.sortieMod}>{m.node}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {nightwave && nightwave.challenges.length > 0 && (
              <View style={styles.subSection}>
                <SectionBarcodeHeader
                  title="Nightwave Acts"
                  subtitle={`Series ${nightwave.season} standing challenges`}
                />

                <View style={styles.boardCard}>
                  {nightwave.challenges.map((ch, idx) => (
                    <View
                      key={ch.id}
                      style={[
                        styles.nwRow,
                        idx === nightwave.challenges.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.nwLeft}>
                        <Text style={styles.nwTitle}>{ch.title}</Text>
                        <Text style={styles.nwDesc}>{ch.desc}</Text>
                      </View>
                      <View style={styles.nwRight}>
                        <Text style={styles.nwStanding}>
                          +{ch.reputation.toLocaleString()}
                        </Text>
                        <Text style={styles.nwType}>
                          {ch.isElite ? 'Elite' : ch.isDaily ? 'Daily' : 'Weekly'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: M.void,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: M.surface,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: M.bone,
    letterSpacing: -0.4,
  },
  topBarMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: M.surface,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.border,
  },
  tabBtnActive: {
    backgroundColor: M.bone,
    borderColor: M.bone,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  tabBtnTextActive: {
    color: M.void,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  subSection: {
    marginTop: 24,
  },
  boardCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  cycleInfo: {
    flex: 1,
    paddingRight: 10,
  },
  cycleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M.bone,
  },
  cycleSubtitle: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  cycleStatusCol: {
    alignItems: 'flex-end',
  },
  cycleStateText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  cycleCountdown: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  emptyDesc: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  alertLeft: {
    flex: 1,
    paddingRight: 12,
  },
  alertReward: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  alertMeta: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
  },
  alertCredits: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: M.ash,
    marginTop: 2,
  },
  baroSummaryCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    padding: 16,
    gap: 14,
  },
  baroSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  baroLocationLabel: {
    fontSize: 13,
    color: M.ash,
  },
  baroLocationValue: {
    fontSize: 18,
    fontWeight: '800',
    color: M.bone,
    marginTop: 2,
  },
  baroTimerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: M.void,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.border,
  },
  baroTimerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  baroTimerValue: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    fontWeight: '700',
    color: M.bone,
  },
  baroItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  baroItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: M.bone,
  },
  baroCosts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  costPillDucat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ducatVal: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
  },
  ducatUnit: {
    fontSize: 12,
    color: M.ash,
  },
  costPillCredit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  creditVal: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  creditUnit: {
    fontSize: 12,
    color: M.ash,
  },
  fissureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  fissureLeft: {
    flex: 1,
    paddingRight: 10,
  },
  fissureTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  fissureType: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  modeTag: {
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
  },
  fissureNode: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  fissureRight: {
    alignItems: 'flex-end',
  },
  fissureTier: {
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
  },
  fissureTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: M.ash,
    marginTop: 2,
  },
  invasionList: {
    gap: 10,
  },
  invasionCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    padding: 14,
  },
  invasionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invasionNode: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  invasionPct: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
  },
  invasionDesc: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
    marginBottom: 10,
  },
  invasionBarTrack: {
    height: 6,
    backgroundColor: M.void,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: M.border,
  },
  invasionBarFill: {
    height: '100%',
    backgroundColor: M.bone,
  },
  invasionRewards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  invSide: {
    flex: 1,
  },
  invFaction: {
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  invRewardText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
    marginTop: 2,
  },
  sortieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  sortieStageBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortieStageText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
  },
  sortieBody: {
    flex: 1,
  },
  sortieType: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  sortieMod: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  nwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  nwLeft: {
    flex: 1,
  },
  nwTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  nwDesc: {
    fontSize: 13,
    color: M.inkSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  nwRight: {
    alignItems: 'flex-end',
  },
  nwStanding: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
  },
  nwType: {
    fontSize: 12,
    color: M.ash,
    marginTop: 2,
  },
});
