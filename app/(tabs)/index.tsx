import React from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Text,
  Image,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors, {
  radii,
  getCurrencyName,
  getRarityColor,
  getClassColor,
  getCycleVisual,
} from '@/constants/Colors';
import { useXur } from '@/hooks/useXur';
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

const getClassLabel = (classType: number): string | null => {
  if (classType === 0) return 'Titan';
  if (classType === 1) return 'Hunter';
  if (classType === 2) return 'Warlock';
  return null;
};

const isPendingTimer = (val: string): boolean => {
  const upper = val.toUpperCase();
  return upper === 'ROTATING' || upper === 'SYNCING';
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    xurData,
    isXurPresent,
    timeUntilXur,
    isLoading: d2Loading,
    error: d2Error,
    refreshXurData,
  } = useXur('xur');
  const {
    telemetry,
    now,
    isLoading: wfLoading,
    error: wfError,
    refreshTelemetry,
  } = useWarframe();

  const handleRefreshAll = async () => {
    await Promise.all([refreshXurData(), refreshTelemetry()]);
  };

  const xurItems = xurData?.sales?.saleItems
    ? Object.values(xurData.sales.saleItems).slice(0, 4)
    : [];
  const cycles = telemetry?.cycles || [];
  const baro = telemetry?.voidTrader;
  const sortie = telemetry?.sortie;
  const alerts = telemetry?.alerts || [];

  const baroCountdown = baro
    ? formatRemainingTime(baro.active ? baro.expiry : baro.activation, now)
    : 'Syncing';

  const combinedError = d2Error || wfError;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Orbit Market"
        statusLabel={isXurPresent ? 'Xûr Active' : 'Weekly Reset'}
        statusColor={isXurPresent ? M.emerald : M.ash}
        statusDot={isXurPresent}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={d2Loading || wfLoading}
            onRefresh={handleRefreshAll}
            tintColor={M.acid}
          />
        }
      >
        {combinedError ? (
          <ErrorBanner
            message="Some live feeds could not be reached. Showing cached data where available."
            onRetry={handleRefreshAll}
          />
        ) : null}

        {/* 2-UP LIVE STATUS STRIP (ABOVE THE FOLD) */}
        <View style={styles.statusStrip}>
          <Pressable
            style={({ pressed }) => [
              styles.statusCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/xur')}
            accessibilityRole="button"
            accessibilityLabel={`Xûr, ${
              isXurPresent ? 'Active' : 'Away'
            }, ${isXurPresent ? 'leaves in' : 'arrives in'} ${timeUntilXur}, Tower Bazaar`}
            accessibilityHint="Open Destiny 2 vendors"
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardTitle} numberOfLines={1}>
                Xûr
              </Text>
              <StatusPill
                label={isXurPresent ? 'Live' : 'Away'}
                color={isXurPresent ? M.emerald : M.amber}
                dot={isXurPresent}
                compact
              />
            </View>
            <Text style={styles.statusCardLabel}>
              {isXurPresent ? 'Leaves in' : 'Arrives in'}
            </Text>
            <Text
              style={styles.statusCardTimer}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {timeUntilXur}
            </Text>
            <Text style={styles.statusCardSub} numberOfLines={1}>
              Tower Bazaar
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.statusCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/(tabs)/warframe')}
            accessibilityRole="button"
            accessibilityLabel={`Baro Ki'Teer, ${
              baro?.active ? 'Docked' : 'In Transit'
            }, ${baro?.active ? 'departs in' : 'arrives in'} ${baroCountdown}, ${
              baro?.location || 'Relay'
            }`}
            accessibilityHint="Open Warframe WorldState"
          >
            <View style={styles.statusCardTop}>
              <Text style={styles.statusCardTitle} numberOfLines={1}>
                Baro
              </Text>
              <StatusPill
                label={baro?.active ? 'Docked' : 'Transit'}
                color={baro?.active ? M.emerald : M.amber}
                dot={Boolean(baro?.active)}
                compact
              />
            </View>
            <Text style={styles.statusCardLabel}>
              {baro?.active ? 'Departs in' : 'Arrives in'}
            </Text>
            <Text
              style={styles.statusCardTimer}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {isPendingTimer(baroCountdown) ? 'Updating…' : baroCountdown}
            </Text>
            <Text style={styles.statusCardSub} numberOfLines={1}>
              {baro?.location || 'Relay Inbound'}
            </Text>
          </Pressable>
        </View>

        {/* SECTION 1: DESTINY 2 · XÛR'S OFFERINGS */}
        <View style={styles.sectionSpacer}>
          <SectionBarcodeHeader
            title="Xûr's Offerings"
            subtitle="Featured Exotic rotation · Tower Bazaar"
            accentColor={M.amber}
          />

          {d2Loading && xurItems.length === 0 ? (
            <View style={styles.skeletonStack}>
              <SkeletonBlock height={64} />
              <SkeletonBlock height={64} />
              <SkeletonBlock height={64} />
            </View>
          ) : xurItems.length === 0 ? (
            <EmptyStateCard
              icon="package-variant"
              title="No Featured Items Loaded"
              description="Open the Destiny 2 tab or retry to sync Tower vendor inventories."
              actionLabel="Open Destiny 2"
              onAction={() => router.push('/(tabs)/xur')}
            />
          ) : (
            <View style={styles.card}>
              <View style={styles.itemPreviewList}>
                {xurItems.map((item, idx) => {
                  const iconUri = item.itemIcon.startsWith('http')
                    ? item.itemIcon
                    : `https://www.bungie.net${item.itemIcon}`;
                  const cost = item.costs?.[0];
                  const isExotic = item.rarity === 'Exotic';
                  const rarityColor = getRarityColor(item.rarity);
                  const clsLabel = getClassLabel(item.classType);
                  const clsColor = clsLabel ? getClassColor(clsLabel) : null;
                  const isLast = idx === xurItems.length - 1;

                  return (
                    <Pressable
                      key={`${item.itemHash}-${idx}`}
                      style={({ pressed }) => [
                        styles.previewRow,
                        isLast && styles.rowNoBorder,
                        pressed && styles.rowPressed,
                      ]}
                      onPress={() => router.push('/(tabs)/xur')}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.itemName}, ${
                        item.itemTypeDisplayName || item.rarity
                      }${clsLabel ? `, ${clsLabel}` : ''}${
                        cost && cost.quantity > 0
                          ? `, ${cost.quantity} ${getCurrencyName(cost.itemHash)}`
                          : ''
                      }`}
                      accessibilityHint="View full details in Destiny 2 tab"
                    >
                      <Image
                        source={{ uri: iconUri }}
                        style={[
                          styles.previewIcon,
                          { borderColor: rarityColor },
                        ]}
                      />
                      <View style={styles.previewTextCol}>
                        <Text style={styles.previewItemName} numberOfLines={1}>
                          {item.itemName}
                        </Text>
                        <View style={styles.previewMetaRow}>
                          <Text style={styles.previewItemSub} numberOfLines={1}>
                            {item.itemTypeDisplayName || item.rarity}
                          </Text>
                          {clsLabel && clsColor ? (
                            <>
                              <Text style={styles.dotSep}>·</Text>
                              <View
                                style={[
                                  styles.classDot,
                                  { backgroundColor: clsColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.previewClassText,
                                  { color: clsColor },
                                ]}
                              >
                                {clsLabel}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                      {cost && cost.quantity > 0 ? (
                        <View style={styles.previewPriceCol}>
                          <Text
                            style={[
                              styles.previewPriceVal,
                              isExotic && { color: M.amber },
                            ]}
                          >
                            {cost.quantity}
                          </Text>
                          <Text style={styles.previewPriceUnit}>
                            {getCurrencyName(cost.itemHash)}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.previewQuestTag}>Quest</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.ctaButton,
                  pressed && { opacity: 0.88 },
                ]}
                onPress={() => router.push('/(tabs)/xur')}
                accessibilityRole="button"
                accessibilityLabel="All 5 Tower Vendors"
                accessibilityHint="Browse Xûr, Banshee-44, Ada-1, Saint-14, and Valus Saladin"
              >
                <Text style={styles.ctaButtonText} numberOfLines={1}>
                  All 5 Tower Vendors
                </Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={18}
                  color={M.void}
                />
              </Pressable>
            </View>
          )}
        </View>

        {/* SECTION 2: WARFRAME · OPEN WORLD CYCLES */}
        <View style={styles.sectionSpacer}>
          <SectionBarcodeHeader
            title="Open World Cycles"
            subtitle="Real-time planet states across the Origin System"
            accentColor={M.cyan}
          />

          {wfLoading && cycles.length === 0 ? (
            <SkeletonBlock height={240} />
          ) : cycles.length === 0 ? (
            <EmptyStateCard
              icon="orbit"
              title="World Cycles Unavailable"
              description="Pull down to refresh Warframe open-world timers."
              actionLabel="Retry Sync"
              onAction={refreshTelemetry}
            />
          ) : (
            <View style={styles.card}>
              {cycles.map((cycle, index) => {
                const rawCountdown = cycle.expiry
                  ? formatRemainingTime(cycle.expiry, now)
                  : cycle.timeLeft || 'SYNCING';
                const updating = isPendingTimer(rawCountdown);
                const visual = getCycleVisual(cycle.state);
                const isLast = index === cycles.length - 1;

                return (
                  <Pressable
                    key={cycle.id}
                    style={({ pressed }) => [
                      styles.cycleRow,
                      isLast && styles.rowNoBorder,
                      pressed && styles.rowPressed,
                    ]}
                    onPress={() => router.push('/(tabs)/warframe')}
                    accessibilityRole="button"
                    accessibilityLabel={`${cycle.name}, ${visual.label}, ${
                      updating ? 'Updating' : rawCountdown
                    }`}
                    accessibilityHint="Open Warframe WorldState"
                  >
                    <View style={styles.cycleLeft}>
                      <Text style={styles.cycleName} numberOfLines={1}>
                        {cycle.name}
                      </Text>
                      <Text style={styles.cycleZone} numberOfLines={1}>
                        {cycle.zone.replace(' // ', ' · ')}
                      </Text>
                    </View>

                    <View style={styles.cycleRight}>
                      <StatusPill
                        label={visual.label}
                        color={visual.color}
                        icon={visual.icon}
                        compact
                      />
                      {updating ? (
                        <Text style={styles.cycleUpdating}>Updating…</Text>
                      ) : (
                        <Text style={styles.cycleTimer}>{rawCountdown}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* SECTION 3: DAILY OPERATIONS (SORTIE & TACTICAL ALERTS) */}
        {(sortie || alerts.length > 0) && (
          <View style={styles.sectionSpacer}>
            <SectionBarcodeHeader
              title="Daily Operations"
              subtitle="Warframe endgame rotation & active alerts"
              accentColor={M.violet}
            />

            <View style={styles.card}>
              {sortie ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.opsRow,
                    alerts.length === 0 && styles.rowNoBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push('/(tabs)/warframe')}
                  accessibilityRole="button"
                  accessibilityLabel={`Daily Sortie, ${sortie.boss}, ${
                    sortie.faction
                  }, resets in ${formatRemainingTime(sortie.expiry, now)}`}
                  accessibilityHint="Open Warframe endgame tab"
                >
                  <View style={styles.opsLeft}>
                    <Text style={styles.opsTitle} numberOfLines={1}>
                      Daily Sortie · {sortie.boss}
                    </Text>
                    <Text style={styles.opsSubtitle} numberOfLines={1}>
                      {sortie.faction} · {sortie.variants.length} Missions
                    </Text>
                  </View>
                  <View style={styles.opsRight}>
                    <Text style={styles.opsStatus}>Resets in</Text>
                    <Text style={styles.opsTimer}>
                      {isPendingTimer(formatRemainingTime(sortie.expiry, now))
                        ? 'Updating…'
                        : formatRemainingTime(sortie.expiry, now)}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              {alerts.length > 0 ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.opsRow,
                    styles.rowNoBorder,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => router.push('/(tabs)/warframe')}
                  accessibilityRole="button"
                  accessibilityLabel={`Tactical Alerts, ${alerts.length} active, featuring ${alerts[0].rewardText}`}
                  accessibilityHint="Open Warframe alerts"
                >
                  <View style={styles.opsLeft}>
                    <Text style={styles.opsTitle} numberOfLines={1}>
                      {alerts[0].rewardText}
                    </Text>
                    <Text style={styles.opsSubtitle} numberOfLines={1}>
                      {alerts.length > 1
                        ? `${alerts[0].node} · +${alerts.length - 1} more alerts`
                        : `${alerts[0].node} · ${alerts[0].missionType}`}
                    </Text>
                  </View>
                  <StatusPill
                    label={`${alerts.length} Active`}
                    color={M.emerald}
                    dot
                    compact
                  />
                </Pressable>
              ) : null}
            </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  statusStrip: {
    flexDirection: 'row',
    gap: 10,
  },
  statusCard: {
    flex: 1,
    minHeight: 106,
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    padding: 13,
    justifyContent: 'space-between',
  },
  cardPressed: {
    backgroundColor: M.surfaceElevated,
    borderColor: M.borderActive,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: M.bone,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  statusCardLabel: {
    fontSize: 12,
    color: M.ash,
    marginTop: 8,
  },
  statusCardTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  statusCardSub: {
    fontSize: 12,
    color: M.inkSecondary,
    marginTop: 4,
  },
  sectionSpacer: {
    marginTop: 24,
  },
  skeletonStack: {
    gap: 8,
  },
  card: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  itemPreviewList: {
    paddingHorizontal: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    backgroundColor: M.surfaceElevated,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.control,
    borderWidth: 1.5,
    backgroundColor: M.void,
  },
  previewTextCol: {
    flex: 1,
  },
  previewItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  previewItemSub: {
    fontSize: 12,
    color: M.ash,
  },
  dotSep: {
    fontSize: 12,
    color: M.ash,
  },
  classDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewClassText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewPriceCol: {
    alignItems: 'flex-end',
  },
  previewPriceVal: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  previewPriceUnit: {
    fontSize: 12,
    color: M.ash,
  },
  previewQuestTag: {
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M.acid,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: M.void,
    letterSpacing: -0.2,
    flex: 1,
    paddingRight: 8,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  cycleLeft: {
    flex: 1,
  },
  cycleName: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  cycleZone: {
    fontSize: 12,
    color: M.ash,
    marginTop: 2,
  },
  cycleRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cycleTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  cycleUpdating: {
    fontSize: 12,
    fontWeight: '500',
    color: M.ash,
  },
  opsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  opsLeft: {
    flex: 1,
  },
  opsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  opsSubtitle: {
    fontSize: 12,
    color: M.ash,
    marginTop: 2,
  },
  opsRight: {
    alignItems: 'flex-end',
  },
  opsStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  opsTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
});
