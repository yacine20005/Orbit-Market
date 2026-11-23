import React, { useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  View,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors, {
  radii,
  spacing,
  withAlpha,
  getCycleVisual,
  getFissureTierColor,
} from '@/constants/Colors';
import { useWarframe } from '@/hooks/useWarframe';
import { formatRemainingTime } from '@/services/warframe';
import {
  ScreenHeader,
  SectionBarcodeHeader,
  StatusPill,
  SkeletonBlock,
  ErrorBanner,
  EmptyStateCard,
} from '@/components/MarathonPrimitives';

const M = Colors.marathon;

type WarframeSection = 'cycles' | 'baro' | 'fissures' | 'ops';
type FissureModeFilter = 'all' | 'standard' | 'steel' | 'storm';

const SECTIONS: Array<{ id: WarframeSection; label: string }> = [
  { id: 'cycles', label: 'Cycles' },
  { id: 'baro', label: 'Baro' },
  { id: 'fissures', label: 'Fissures' },
  { id: 'ops', label: 'Endgame' },
];

const FISSURE_MODES: Array<{
  id: FissureModeFilter;
  label: string;
  dotColor?: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'standard', label: 'Standard', dotColor: M.cyan },
  { id: 'steel', label: 'Steel Path', dotColor: M.vermilion },
  { id: 'storm', label: 'Void Storm', dotColor: M.violet },
];

function getCountdownDisplay(
  expiry: string | undefined,
  now: Date
): { text: string; isUpdating: boolean } {
  if (!expiry) {
    return { text: 'Updating', isUpdating: true };
  }
  const formatted = formatRemainingTime(expiry, now);
  if (formatted === 'ROTATING' || formatted === 'SYNCING') {
    return { text: 'Updating', isUpdating: true };
  }
  return { text: formatted, isUpdating: false };
}

function formatZoneLabel(zone: string): string {
  return zone
    .split('//')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      return trimmed
        .toLowerCase()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
    })
    .filter(Boolean)
    .join(' · ');
}

function getFactionColor(faction?: string): string {
  const key = (faction || '').toLowerCase();
  if (key.includes('grineer')) return M.vermilion;
  if (key.includes('corpus')) return M.cyan;
  if (key.includes('infest')) return M.emerald;
  if (key.includes('orokin') || key.includes('corrupted') || key.includes('narmer')) {
    return M.amber;
  }
  return M.violet;
}

export default function WarframeScreen() {
  const insets = useSafeAreaInsets();
  const { telemetry, isLoading, error, now, refreshTelemetry } = useWarframe();
  const [activeSection, setActiveSection] = useState<WarframeSection>('cycles');
  const [fissureMode, setFissureMode] = useState<FissureModeFilter>('all');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const cycles = telemetry?.cycles || [];
  const voidTrader = telemetry?.voidTrader;
  const alerts = telemetry?.alerts || [];
  const fissures = telemetry?.fissures || [];
  const invasions = telemetry?.invasions || [];
  const sortie = telemetry?.sortie;
  const archon = telemetry?.archonHunt;
  const nightwave = telemetry?.nightwave;

  const handleSelectSection = (section: WarframeSection) => {
    setActiveSection(section);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const fissureCounts = useMemo(() => {
    let standard = 0;
    let steel = 0;
    let storm = 0;
    for (const f of fissures) {
      if (f.isHard) steel += 1;
      if (f.isStorm) storm += 1;
      if (!f.isHard && !f.isStorm) standard += 1;
    }
    return {
      all: fissures.length,
      standard,
      steel,
      storm,
    };
  }, [fissures]);

  const filteredFissures = useMemo(() => {
    switch (fissureMode) {
      case 'standard':
        return fissures.filter((f) => !f.isHard && !f.isStorm);
      case 'steel':
        return fissures.filter((f) => f.isHard);
      case 'storm':
        return fissures.filter((f) => f.isStorm);
      default:
        return fissures;
    }
  }, [fissures, fissureMode]);

  const activeModeLabel =
    FISSURE_MODES.find((m) => m.id === fissureMode)?.label || 'Selected';

  const headerStatus = useMemo(() => {
    if (isLoading && !telemetry) {
      return { label: 'Syncing', color: M.ash, dot: false };
    }
    if (telemetry?.isLive) {
      return { label: 'Live Sync', color: M.emerald, dot: true };
    }
    if (telemetry) {
      return { label: 'Snapshot', color: M.amber, dot: true };
    }
    return { label: 'Offline', color: M.vermilion, dot: true };
  }, [isLoading, telemetry]);

  const isInitialLoad = isLoading && !telemetry;

  const baroCountdown = voidTrader
    ? getCountdownDisplay(
        voidTrader.active ? voidTrader.expiry : voidTrader.activation,
        now
      )
    : { text: 'Updating', isUpdating: true };

  const sortieCountdown = getCountdownDisplay(sortie?.expiry, now);
  const archonCountdown = getCountdownDisplay(archon?.expiry, now);

  const hasEndgameContent =
    Boolean(sortie && sortie.variants.length > 0) ||
    Boolean(archon && archon.missions.length > 0) ||
    Boolean(nightwave && nightwave.challenges.length > 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Warframe"
        statusLabel={headerStatus.label}
        statusColor={headerStatus.color}
        statusDot={headerStatus.dot}
      />

      {/* 4 Equal-Width Sub-Tabs (>=44px touch height, crisp short labels) */}
      <View style={styles.tabRow} accessibilityRole="tablist">
        {SECTIONS.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <Pressable
              key={sec.id}
              style={({ pressed }) => [
                styles.tabBtn,
                active && styles.tabBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => handleSelectSection(sec.id)}
              accessibilityRole="tab"
              accessibilityLabel={`${sec.label} tab`}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[styles.tabBtnText, active && styles.tabBtnTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {sec.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && Boolean(telemetry)}
            onRefresh={refreshTelemetry}
            tintColor={M.acid}
          />
        }
      >
        {error ? (
          <ErrorBanner
            message="Unable to reach Warframe WorldState relay. Showing latest available data."
            onRetry={refreshTelemetry}
          />
        ) : null}

        {isInitialLoad ? (
          <View style={styles.skeletonStack}>
            <SkeletonBlock height={28} width="55%" radius={radii.control} />
            <SkeletonBlock height={260} radius={radii.card} />
            <SkeletonBlock height={28} width="48%" radius={radii.control} />
            <SkeletonBlock height={120} radius={radii.card} />
          </View>
        ) : !telemetry ? (
          <EmptyStateCard
            icon="orbit"
            title="WorldState Unavailable"
            description="Could not load Origin System telemetry. Check your connection and try again."
            actionLabel="Retry Sync"
            onAction={refreshTelemetry}
          />
        ) : (
          <>
            {/* SECTION 1: OPEN WORLD CYCLES & ALERTS */}
            {activeSection === 'cycles' && (
              <View>
                <SectionBarcodeHeader
                  title="Open World Cycles"
                  subtitle="Environmental rotations across 5 zones"
                  rightText={`${cycles.length} Zones`}
                />

                <View style={styles.boardCard}>
                  {cycles.map((cycle, index) => {
                    const visual = getCycleVisual(cycle.state);
                    const countdown = getCountdownDisplay(cycle.expiry, now);
                    const zoneLabel = formatZoneLabel(cycle.zone);

                    return (
                      <View
                        key={cycle.id}
                        accessible
                        accessibilityLabel={`${cycle.name}, ${zoneLabel}, ${visual.label}, ${countdown.text}`}
                        style={[
                          styles.cycleRow,
                          index === cycles.length - 1 && styles.rowLast,
                        ]}
                      >
                        <View style={styles.cycleInfo}>
                          <Text style={styles.cycleTitle}>{cycle.name}</Text>
                          <Text style={styles.cycleSubtitle}>{zoneLabel}</Text>
                        </View>

                        <View style={styles.cycleStatusCol}>
                          <StatusPill
                            label={visual.label}
                            color={visual.color}
                            icon={visual.icon}
                            compact
                          />
                          <Text
                            style={[
                              styles.cycleCountdown,
                              countdown.isUpdating && styles.updatingText,
                            ]}
                          >
                            {countdown.text}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.subSection}>
                  <SectionBarcodeHeader
                    title="Tactical Alerts & Events"
                    subtitle="Active Lotus directives"
                    rightText={`${alerts.length} Active`}
                    rightColor={alerts.length > 0 ? M.acid : M.ash}
                  />

                  {alerts.length === 0 ? (
                    <EmptyStateCard
                      icon="bell-check-outline"
                      title="No Tactical Alerts Active"
                      description="No special Lotus directives are currently active. Check Fissures or Endgame for Void Relics, Invasions, and daily missions."
                    />
                  ) : (
                    <View style={styles.boardCard}>
                      {alerts.map((al, idx) => {
                        const alCountdown = getCountdownDisplay(al.expiry, now);
                        const factionColor = getFactionColor(al.faction);
                        return (
                          <View
                            key={al.id}
                            accessible
                            accessibilityLabel={`${al.rewardText} at ${al.node}, ${al.missionType}, ${alCountdown.text}`}
                            style={[
                              styles.alertRow,
                              idx === alerts.length - 1 && styles.rowLast,
                            ]}
                          >
                            <View style={styles.alertLeft}>
                              <Text style={styles.alertReward}>
                                {al.rewardText}
                              </Text>
                              <View style={styles.alertMetaRow}>
                                <Text style={styles.alertMeta}>
                                  {al.node} · {al.missionType}
                                </Text>
                                <StatusPill
                                  label={al.faction}
                                  color={factionColor}
                                  compact
                                />
                              </View>
                            </View>
                            <View style={styles.alertRight}>
                              <Text
                                style={[
                                  styles.alertTimer,
                                  alCountdown.isUpdating && styles.updatingText,
                                ]}
                              >
                                {alCountdown.text}
                              </Text>
                              {al.credits > 0 ? (
                                <Text style={styles.alertCredits}>
                                  +{al.credits.toLocaleString()} Cr
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* SECTION 2: BARO KI'TEER */}
            {activeSection === 'baro' && voidTrader && (
              <View>
                <SectionBarcodeHeader
                  title="Baro Ki'Teer"
                  subtitle="Void Trader schedule & Relay status"
                  rightText={voidTrader.active ? 'Docked' : 'In Transit'}
                  rightColor={voidTrader.active ? M.emerald : M.amber}
                />

                {/* Flat single-surface Baro summary card split by 1px hairline divider */}
                <View style={styles.boardCard}>
                  <View style={styles.baroSummaryTop}>
                    <View style={styles.baroLocationCol}>
                      <Text style={styles.baroLocationLabel}>
                        Relay Destination
                      </Text>
                      <Text style={styles.baroLocationValue}>
                        {voidTrader.location}
                      </Text>
                    </View>
                    <StatusPill
                      label={voidTrader.active ? 'Docked' : 'In Transit'}
                      color={voidTrader.active ? M.emerald : M.amber}
                      dot
                    />
                  </View>

                  <View style={styles.baroTimerRow}>
                    <View style={styles.baroTimerLabelWrap}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={16}
                        color={M.ash}
                      />
                      <Text style={styles.baroTimerLabel}>
                        {voidTrader.active
                          ? 'Departs Relay In'
                          : 'Arrives At Relay In'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.baroTimerValue,
                        baroCountdown.isUpdating && styles.updatingText,
                      ]}
                    >
                      {baroCountdown.text}
                    </Text>
                  </View>
                </View>

                <View style={styles.subSection}>
                  <SectionBarcodeHeader
                    title={
                      voidTrader.inventory.length > 0
                        ? `Void Offerings (${voidTrader.inventory.length})`
                        : 'Void Offerings'
                    }
                    subtitle={
                      voidTrader.active
                        ? 'Live offerings available for Ducats & Credits'
                        : 'Inventory updates once Baro docks at the Relay'
                    }
                  />

                  {!voidTrader.active && voidTrader.inventory.length === 0 ? (
                    <EmptyStateCard
                      icon="rocket-launch-outline"
                      title="Baro Ki'Teer Is In Transit"
                      description={
                        baroCountdown.isUpdating
                          ? `Heading to ${voidTrader.location}. Offerings will appear here once Baro docks.`
                          : `Returns to ${voidTrader.location} in ${baroCountdown.text}. Offerings will appear here once Baro docks.`
                      }
                      actionLabel="Refresh Schedule"
                      onAction={refreshTelemetry}
                    />
                  ) : voidTrader.inventory.length === 0 ? (
                    <EmptyStateCard
                      icon="package-variant"
                      title="Inventory Syncing"
                      description={`Baro is docked at ${voidTrader.location}, but offerings have not synced yet.`}
                      actionLabel="Refresh Offerings"
                      onAction={refreshTelemetry}
                    />
                  ) : (
                    <View style={styles.boardCard}>
                      {voidTrader.inventory.map((item, idx) => (
                        <View
                          key={`${item.item}-${idx}`}
                          accessible
                          accessibilityLabel={`${item.item}, ${item.ducats} Ducats, ${item.credits.toLocaleString()} Credits`}
                          style={[
                            styles.baroItemRow,
                            idx === voidTrader.inventory.length - 1 &&
                              styles.rowLast,
                          ]}
                        >
                          <Text style={styles.baroItemName}>{item.item}</Text>
                          <View style={styles.baroCosts}>
                            <View style={styles.costGroup}>
                              <Text style={styles.ducatVal}>{item.ducats}</Text>
                              <Text style={styles.ducatUnit}>Ducats</Text>
                            </View>
                            <View style={styles.costGroup}>
                              <Text style={styles.creditVal}>
                                {Math.round(item.credits / 1000)}k
                              </Text>
                              <Text style={styles.creditUnit}>Cr</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* SECTION 3: VOID FISSURES & INVASIONS */}
            {activeSection === 'fissures' && (
              <View>
                <SectionBarcodeHeader
                  title="Active Void Fissures"
                  subtitle="Relic cracking missions sorted by tier"
                  rightText={`${filteredFissures.length} Active`}
                />

                {/* >=44px Horizontal Mode Filter Chips with Live Counts */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                  style={styles.filterScroll}
                >
                  {FISSURE_MODES.map((mode) => {
                    const selected = fissureMode === mode.id;
                    const count = fissureCounts[mode.id];
                    return (
                      <Pressable
                        key={mode.id}
                        style={({ pressed }) => [
                          styles.filterChip,
                          selected && styles.filterChipActive,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setFissureMode(mode.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${mode.label} fissures, ${count} active`}
                        accessibilityState={{ selected }}
                      >
                        {mode.dotColor ? (
                          <View
                            style={[
                              styles.filterDot,
                              {
                                backgroundColor: selected
                                  ? M.acid
                                  : mode.dotColor,
                              },
                            ]}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.filterChipText,
                            selected && styles.filterChipTextActive,
                          ]}
                        >
                          {mode.label}
                        </Text>
                        <Text
                          style={[
                            styles.filterChipCount,
                            selected && styles.filterChipCountActive,
                          ]}
                        >
                          {count}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {filteredFissures.length === 0 ? (
                  fissures.length > 0 ? (
                    <EmptyStateCard
                      icon="filter-off-outline"
                      title={`No ${activeModeLabel} Fissures`}
                      description="No active Void Fissures match this mode right now."
                      actionLabel="Show All Fissures"
                      onAction={() => setFissureMode('all')}
                    />
                  ) : (
                    <EmptyStateCard
                      icon="atom"
                      title="No Active Void Fissures"
                      description="Fissure missions are currently rotating. Refresh to fetch the latest list."
                      actionLabel="Refresh Fissures"
                      onAction={refreshTelemetry}
                    />
                  )
                ) : (
                  <View style={styles.boardCard}>
                    {filteredFissures.map((f, idx) => {
                      const tierColor = getFissureTierColor(f.tier);
                      const fCountdown = getCountdownDisplay(f.expiry, now);
                      return (
                        <View
                          key={f.id}
                          accessible
                          accessibilityLabel={`${f.tier} ${f.missionType} on ${f.node}, ${f.enemy}${f.isHard ? ', Steel Path' : ''}${f.isStorm ? ', Void Storm' : ''}, ${fCountdown.text}`}
                          style={[
                            styles.fissureRow,
                            idx === filteredFissures.length - 1 &&
                              styles.rowLast,
                          ]}
                        >
                          <View style={styles.fissureLeft}>
                            <View style={styles.fissureTitleLine}>
                              <Text style={styles.fissureType}>
                                {f.missionType}
                              </Text>
                              {f.isHard ? (
                                <StatusPill
                                  label="Steel Path"
                                  color={M.vermilion}
                                  compact
                                />
                              ) : null}
                              {f.isStorm ? (
                                <StatusPill
                                  label="Void Storm"
                                  color={M.violet}
                                  compact
                                />
                              ) : null}
                            </View>
                            <Text style={styles.fissureNode}>
                              {f.node} · {f.enemy}
                            </Text>
                          </View>

                          <View style={styles.fissureRight}>
                            <StatusPill
                              label={f.tier}
                              color={tierColor}
                              compact
                            />
                            <Text
                              style={[
                                styles.fissureTimer,
                                fCountdown.isUpdating && styles.updatingText,
                              ]}
                            >
                              {fCountdown.text}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Faction Invasions with Dual-Colored Progress Bar */}
                <View style={styles.subSection}>
                  <SectionBarcodeHeader
                    title="Faction Invasions"
                    subtitle="Support Grineer or Corpus for Fieldron, Detonite & Mutagen"
                    rightText={`${invasions.length} Sectors`}
                  />

                  {invasions.length === 0 ? (
                    <EmptyStateCard
                      icon="sword-cross"
                      title="No Active Invasions"
                      description="Origin System sectors are currently uncontested."
                    />
                  ) : (
                    <View style={styles.invasionList}>
                      {invasions.map((inv) => {
                        const attackerColor = getFactionColor(
                          inv.attackerFaction
                        );
                        const defenderColor = getFactionColor(
                          inv.defenderFaction
                        );
                        const pct = Math.max(0, Math.min(100, inv.completion));
                        return (
                          <View
                            key={inv.id}
                            style={styles.invasionCard}
                            accessible
                            accessibilityLabel={`${inv.node}, ${inv.attackerFaction} versus ${inv.defenderFaction}, ${pct}% complete`}
                          >
                            <View style={styles.invasionTop}>
                              <Text style={styles.invasionNode}>
                                {inv.node}
                              </Text>
                              <Text style={styles.invasionPct}>{pct}%</Text>
                            </View>
                            <Text style={styles.invasionDesc}>{inv.desc}</Text>

                            <View style={styles.invasionBarTrack}>
                              {pct > 0 ? (
                                <View
                                  style={[
                                    styles.invasionBarSegment,
                                    {
                                      width: `${pct}%`,
                                      backgroundColor: attackerColor,
                                    },
                                  ]}
                                />
                              ) : null}
                              {pct > 0 && pct < 100 ? (
                                <View style={styles.invasionBarGap} />
                              ) : null}
                              {pct < 100 ? (
                                <View
                                  style={[
                                    styles.invasionBarSegment,
                                    {
                                      flex: 1,
                                      backgroundColor: defenderColor,
                                    },
                                  ]}
                                />
                              ) : null}
                            </View>

                            <View style={styles.invasionRewards}>
                              <View style={styles.invSide}>
                                <View style={styles.invFactionRow}>
                                  <View
                                    style={[
                                      styles.factionDot,
                                      { backgroundColor: attackerColor },
                                    ]}
                                  />
                                  <Text
                                    style={[
                                      styles.invFaction,
                                      { color: attackerColor },
                                    ]}
                                  >
                                    {inv.attackerFaction}
                                  </Text>
                                </View>
                                <Text
                                  style={styles.invRewardText}
                                  numberOfLines={2}
                                >
                                  {inv.attackerReward}
                                </Text>
                              </View>

                              <View
                                style={[
                                  styles.invSide,
                                  styles.invSideRight,
                                ]}
                              >
                                <View style={styles.invFactionRow}>
                                  <Text
                                    style={[
                                      styles.invFaction,
                                      { color: defenderColor },
                                    ]}
                                  >
                                    {inv.defenderFaction}
                                  </Text>
                                  <View
                                    style={[
                                      styles.factionDot,
                                      { backgroundColor: defenderColor },
                                    ]}
                                  />
                                </View>
                                <Text
                                  style={[
                                    styles.invRewardText,
                                    styles.textRight,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {inv.defenderReward}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* SECTION 4: ENDGAME (SORTIE, ARCHON HUNT & NIGHTWAVE) */}
            {activeSection === 'ops' && (
              <View>
                {!hasEndgameContent ? (
                  <EmptyStateCard
                    icon="shield-sword-outline"
                    title="Endgame Rotations Updating"
                    description="Sortie, Archon Hunt, and Nightwave acts are syncing. Refresh to check again."
                    actionLabel="Refresh Endgame"
                    onAction={refreshTelemetry}
                  />
                ) : (
                  <>
                    {sortie && sortie.variants.length > 0 ? (
                      <View>
                        <SectionBarcodeHeader
                          title={`Daily Sortie · ${sortie.boss}`}
                          subtitle={`${sortie.faction} Command`}
                          rightText={sortieCountdown.text}
                          rightColor={
                            sortieCountdown.isUpdating ? M.amber : M.ash
                          }
                          accentColor={getFactionColor(sortie.faction)}
                        />

                        <View style={styles.boardCard}>
                          {sortie.variants.map((v, i) => (
                            <View
                              key={`${v.node}-${i}`}
                              accessible
                              accessibilityLabel={`Stage ${i + 1}: ${v.missionType} on ${v.node}, modifier ${v.modifier}`}
                              style={[
                                styles.stageRow,
                                i === sortie.variants.length - 1 &&
                                  styles.rowLast,
                              ]}
                            >
                              <View
                                style={[
                                  styles.stageBadge,
                                  {
                                    backgroundColor: withAlpha(M.amber, 0.14),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.stageBadgeText,
                                    { color: M.amber },
                                  ]}
                                >
                                  {i + 1}
                                </Text>
                              </View>
                              <View style={styles.stageBody}>
                                <Text style={styles.stageTitle}>
                                  {v.missionType} · {v.node}
                                </Text>
                                <Text style={styles.stageMeta}>
                                  {v.modifier}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {archon && archon.missions.length > 0 ? (
                      <View
                        style={
                          sortie && sortie.variants.length > 0
                            ? styles.subSection
                            : undefined
                        }
                      >
                        <SectionBarcodeHeader
                          title={`Archon Hunt · ${archon.boss}`}
                          subtitle="Weekly Narmer Showdown"
                          rightText={archonCountdown.text}
                          rightColor={
                            archonCountdown.isUpdating ? M.amber : M.ash
                          }
                          accentColor={M.vermilion}
                        />

                        <View style={styles.boardCard}>
                          {archon.missions.map((m, i) => (
                            <View
                              key={`${m.node}-${i}`}
                              accessible
                              accessibilityLabel={`Archon stage ${i + 1}: ${m.type} on ${m.node}`}
                              style={[
                                styles.stageRow,
                                i === archon.missions.length - 1 &&
                                  styles.rowLast,
                              ]}
                            >
                              <View
                                style={[
                                  styles.stageBadge,
                                  {
                                    backgroundColor: withAlpha(
                                      M.vermilion,
                                      0.14
                                    ),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.stageBadgeText,
                                    { color: M.vermilion },
                                  ]}
                                >
                                  {i + 1}
                                </Text>
                              </View>
                              <View style={styles.stageBody}>
                                <Text style={styles.stageTitle}>{m.type}</Text>
                                <Text style={styles.stageMeta}>{m.node}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {nightwave && nightwave.challenges.length > 0 ? (
                      <View style={styles.subSection}>
                        <SectionBarcodeHeader
                          title="Nightwave Acts"
                          subtitle={`Series ${nightwave.season} standing challenges`}
                          rightText={`${nightwave.challenges.length} Acts`}
                          accentColor={M.violet}
                        />

                        <View style={styles.boardCard}>
                          {nightwave.challenges.map((ch, idx) => {
                            const tierLabel = ch.isElite
                              ? 'Elite'
                              : ch.isDaily
                              ? 'Daily'
                              : 'Weekly';
                            const tierColor = ch.isElite
                              ? M.amber
                              : ch.isDaily
                              ? M.cyan
                              : M.violet;

                            return (
                              <View
                                key={ch.id}
                                accessible
                                accessibilityLabel={`${tierLabel} Nightwave act: ${ch.title}, ${ch.reputation.toLocaleString()} standing`}
                                style={[
                                  styles.nwRow,
                                  idx === nightwave.challenges.length - 1 &&
                                    styles.rowLast,
                                ]}
                              >
                                <View style={styles.nwLeft}>
                                  <Text style={styles.nwTitle}>{ch.title}</Text>
                                  <Text style={styles.nwDesc}>{ch.desc}</Text>
                                </View>
                                <View style={styles.nwRight}>
                                  <StatusPill
                                    label={tierLabel}
                                    color={tierColor}
                                    compact
                                  />
                                  <Text style={styles.nwStanding}>
                                    +{ch.reputation.toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            )}
          </>
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
  pressed: {
    opacity: 0.78,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: M.surface,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.border,
  },
  tabBtnActive: {
    backgroundColor: withAlpha(M.acid, 0.16),
    borderColor: M.acid,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  tabBtnTextActive: {
    color: M.acid,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 36,
  },
  skeletonStack: {
    gap: spacing.md,
  },
  subSection: {
    marginTop: spacing.xl,
  },
  boardCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  updatingText: {
    color: M.amber,
  },

  // Cycles
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  cycleInfo: {
    flex: 1,
  },
  cycleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M.bone,
    lineHeight: 21,
  },
  cycleSubtitle: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  cycleStatusCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  cycleCountdown: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.inkSecondary,
    fontVariant: ['tabular-nums'],
  },

  // Alerts
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  alertLeft: {
    flex: 1,
    gap: 5,
  },
  alertReward: {
    fontSize: 15,
    fontWeight: '700',
    color: M.amber,
    lineHeight: 20,
  },
  alertMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  alertMeta: {
    fontSize: 13,
    color: M.inkSecondary,
  },
  alertRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  alertTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  alertCredits: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    color: M.ash,
    fontVariant: ['tabular-nums'],
  },

  // Baro Ki'Teer (Flat single card with hairline divider)
  baroSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  baroLocationCol: {
    flex: 1,
  },
  baroLocationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  baroLocationValue: {
    fontSize: 17,
    fontWeight: '800',
    color: M.bone,
    marginTop: 2,
    lineHeight: 22,
  },
  baroTimerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: M.surfaceElevated,
    gap: 10,
  },
  baroTimerLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  baroTimerLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  baroTimerValue: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
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
    lineHeight: 20,
  },
  baroCosts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  costGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  ducatVal: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '700',
    color: M.amber,
    fontVariant: ['tabular-nums'],
  },
  ducatUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: withAlpha(M.amber, 0.8),
  },
  creditVal: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    fontWeight: '600',
    color: M.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  creditUnit: {
    fontSize: 12,
    color: M.ash,
  },

  // Fissure Mode Filter Chips
  filterScroll: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.control,
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
  },
  filterChipActive: {
    backgroundColor: withAlpha(M.acid, 0.16),
    borderColor: M.acid,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  filterChipTextActive: {
    color: M.acid,
    fontWeight: '700',
  },
  filterChipCount: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.ash,
    fontVariant: ['tabular-nums'],
  },
  filterChipCountActive: {
    color: M.acid,
  },

  // Fissures List
  fissureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  fissureLeft: {
    flex: 1,
    gap: 4,
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
  fissureNode: {
    fontSize: 13,
    color: M.ash,
  },
  fissureRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  fissureTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.inkSecondary,
    fontVariant: ['tabular-nums'],
  },

  // Invasions
  invasionList: {
    gap: 10,
  },
  invasionCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    padding: 14,
  },
  invasionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  invasionNode: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  invasionPct: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  invasionDesc: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
    marginBottom: 10,
  },
  invasionBarTrack: {
    flexDirection: 'row',
    height: 7,
    backgroundColor: M.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  invasionBarSegment: {
    height: '100%',
  },
  invasionBarGap: {
    width: 2,
    height: '100%',
    backgroundColor: M.void,
  },
  invasionRewards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  invSide: {
    flex: 1,
  },
  invSideRight: {
    alignItems: 'flex-end',
  },
  invFactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  factionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  invFaction: {
    fontSize: 12,
    fontWeight: '700',
  },
  invRewardText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  textRight: {
    textAlign: 'right',
  },

  // Endgame (Sortie, Archon, Nightwave)
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  stageBadge: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageBadgeText: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stageBody: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
    lineHeight: 20,
  },
  stageMeta: {
    fontSize: 13,
    color: M.inkSecondary,
    marginTop: 2,
  },
  nwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
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
    lineHeight: 20,
  },
  nwDesc: {
    fontSize: 13,
    color: M.inkSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  nwRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  nwStanding: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
});
