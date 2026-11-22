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
import Colors, { getCurrencyName } from '@/constants/Colors';
import { useXur } from '@/hooks/useXur';
import { useWarframe } from '@/hooks/useWarframe';
import { formatRemainingTime } from '@/services/warframe';
import { SectionBarcodeHeader } from '@/components/MarathonPrimitives';

const M = Colors.marathon;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    xurData,
    isXurPresent,
    timeUntilXur,
    isLoading: d2Loading,
    refreshXurData,
  } = useXur('xur');
  const {
    telemetry,
    now,
    isLoading: wfLoading,
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Clean Editorial Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.brandTitle}>Orbit Market</Text>
        <Text style={styles.topBarMeta}>
          {isXurPresent ? 'Xûr Active' : 'Weekly Reset'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={d2Loading || wfLoading}
            onRefresh={handleRefreshAll}
            tintColor={M.bone}
          />
        }
      >
        {/* SECTION 1: DESTINY 2 // XÛR & VENDORS */}
        <SectionBarcodeHeader
          title="Destiny 2 · Xûr & Vendors"
          subtitle="Weekly Exotic rotation & Tower armory"
          rightText={timeUntilXur}
        />

        <View style={styles.card}>
          {/* Vendor Summary Row */}
          <Pressable
            style={styles.vendorHeaderRow}
            onPress={() => router.push('/(tabs)/xur')}
          >
            <Image
              source={{
                uri: 'https://www.bungie.net/common/destiny2_content/icons/801c07dc080b79c7da99ac4f59db1f66.jpg',
              }}
              style={styles.vendorAvatar}
            />
            <View style={styles.vendorInfoCol}>
              <Text style={styles.vendorName}>Xûr, Agent of the Nine</Text>
              <Text style={styles.vendorMeta}>
                Tower Bazaar · {isXurPresent ? 'Leaves in ' : 'Arrives in '}
                <Text style={styles.monoInline}>{timeUntilXur}</Text>
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={M.ash}
            />
          </Pressable>

          {/* Direct Preview of Xûr's Featured Exotics */}
          <View style={styles.itemPreviewList}>
            {xurItems.map((item) => {
              const iconUri = item.itemIcon.startsWith('http')
                ? item.itemIcon
                : `https://www.bungie.net${item.itemIcon}`;
              const cost = item.costs?.[0];
              const isExotic = item.rarity === 'Exotic';
              return (
                <Pressable
                  key={item.itemHash}
                  style={styles.previewRow}
                  onPress={() => router.push('/(tabs)/xur')}
                >
                  <Image
                    source={{ uri: iconUri }}
                    style={[
                      styles.previewIcon,
                      { borderColor: isExotic ? M.amber : M.borderActive },
                    ]}
                  />
                  <View style={styles.previewTextCol}>
                    <Text style={styles.previewItemName} numberOfLines={1}>
                      {item.itemName}
                    </Text>
                    <Text style={styles.previewItemSub} numberOfLines={1}>
                      {item.itemTypeDisplayName || item.rarity}
                    </Text>
                  </View>
                  {cost && cost.quantity > 0 ? (
                    <View style={styles.previewPriceCol}>
                      <Text style={styles.previewPriceVal}>{cost.quantity}</Text>
                      <Text style={styles.previewPriceUnit}>
                        {getCurrencyName(cost.itemHash)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/xur')}
          >
            <Text style={styles.ctaButtonText}>
              Browse All 5 Tower Vendors (Xûr, Banshee-44, Ada-1, Saint-14, Saladin)
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={18}
              color={M.void}
            />
          </Pressable>
        </View>

        {/* SECTION 2: WARFRAME // OPEN WORLD CYCLES (ALL 5 IN ONE BOARD) */}
        <View style={styles.sectionSpacer}>
          <SectionBarcodeHeader
            title="Warframe · Open World Cycles"
            subtitle="Real-time planet states across the Origin System"
          />

          <View style={styles.card}>
            {cycles.map((cycle, index) => {
              const countdown = cycle.expiry
                ? formatRemainingTime(cycle.expiry, now)
                : cycle.timeLeft || 'LIVE';
              return (
                <Pressable
                  key={cycle.id}
                  style={[
                    styles.cycleRow,
                    index === cycles.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => router.push('/(tabs)/warframe')}
                >
                  <View style={styles.cycleLeft}>
                    <Text style={styles.cycleName}>{cycle.name}</Text>
                    <Text style={styles.cycleZone}>
                      {cycle.zone.replace(' // ', ' · ')}
                    </Text>
                  </View>

                  <View style={styles.cycleRight}>
                    <Text style={styles.cycleStateLabel}>{cycle.state}</Text>
                    <Text style={styles.cycleTimer}>{countdown}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: BARO KI'TEER & DAILY SORTIE */}
        <View style={styles.sectionSpacer}>
          <SectionBarcodeHeader
            title="Baro Ki'Teer & Tactical Ops"
            subtitle="Void Trader schedule & daily endgame rotation"
          />

          <View style={styles.card}>
            {/* Baro Row */}
            <Pressable
              style={styles.opsRow}
              onPress={() => router.push('/(tabs)/warframe')}
            >
              <View style={styles.opsLeft}>
                <Text style={styles.opsTitle}>Baro Ki'Teer (Void Trader)</Text>
                <Text style={styles.opsSubtitle}>
                  {baro?.location || 'Kronia Relay (Saturn)'}
                </Text>
              </View>
              <View style={styles.opsRight}>
                <Text style={styles.opsStatus}>
                  {baro?.active ? 'Docked Now' : 'Arrives in'}
                </Text>
                <Text style={styles.opsTimer}>
                  {baro
                    ? formatRemainingTime(
                        baro.active ? baro.expiry : baro.activation,
                        now
                      )
                    : '4D 23H'}
                </Text>
              </View>
            </Pressable>

            {/* Sortie Row */}
            {sortie && (
              <Pressable
                style={[styles.opsRow, { borderBottomWidth: 0 }]}
                onPress={() => router.push('/(tabs)/warframe')}
              >
                <View style={styles.opsLeft}>
                  <Text style={styles.opsTitle}>Daily Sortie: {sortie.boss}</Text>
                  <Text style={styles.opsSubtitle}>
                    {sortie.faction} · {sortie.variants.length} Missions
                  </Text>
                </View>
                <View style={styles.opsRight}>
                  <Text style={styles.opsStatus}>Resets in</Text>
                  <Text style={styles.opsTimer}>
                    {formatRemainingTime(sortie.expiry, now)}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    backgroundColor: M.surface,
  },
  brandTitle: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionSpacer: {
    marginTop: 24,
  },
  card: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  vendorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: M.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.borderActive,
  },
  vendorInfoCol: {
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '700',
    color: M.bone,
  },
  vendorMeta: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  monoInline: {
    fontFamily: 'SpaceMono',
    color: M.bone,
    fontWeight: '700',
  },
  itemPreviewList: {
    paddingHorizontal: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
  },
  previewTextCol: {
    flex: 1,
  },
  previewItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  previewItemSub: {
    fontSize: 13,
    color: M.ash,
    marginTop: 1,
  },
  previewPriceCol: {
    alignItems: 'flex-end',
  },
  previewPriceVal: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  previewPriceUnit: {
    fontSize: 11,
    color: M.ash,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: M.bone,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: M.void,
    flex: 1,
    paddingRight: 8,
  },
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  cycleLeft: {
    flex: 1,
    paddingRight: 10,
  },
  cycleName: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  cycleZone: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  cycleRight: {
    alignItems: 'flex-end',
  },
  cycleStateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  cycleTimer: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
    marginTop: 2,
  },
  opsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  opsLeft: {
    flex: 1,
    paddingRight: 12,
  },
  opsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  opsSubtitle: {
    fontSize: 13,
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
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
    marginTop: 2,
  },
});
