import React, { useState, useMemo, useEffect, useRef, ComponentRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Image,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors, { radii, getClassColor } from '@/constants/Colors';
import { useXur } from '@/hooks/useXur';
import { DESTINY_VENDORS, DestinyVendorId } from '@/services/api';
import XurItemCard from '@/components/XurItemCard';
import {
  ScreenHeader,
  SkeletonBlock,
  ErrorBanner,
  EmptyStateCard,
} from '@/components/MarathonPrimitives';

const M = Colors.marathon;

const CLASS_FILTERS = ['All', 'Titan', 'Hunter', 'Warlock'] as const;
type ClassFilter = (typeof CLASS_FILTERS)[number];

export default function XurScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const {
    xurData,
    activeVendor,
    selectedVendorId,
    selectVendor,
    isLoading,
    error,
    isXurPresent,
    timeUntilXur,
    refreshXurData,
  } = useXur('xur');

  const [selectedClass, setSelectedClass] = useState<ClassFilter>('All');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const autoExpandPendingRef = useRef(true);

  const allEntries = useMemo(
    () => Object.entries(xurData?.sales?.saleItems || {}),
    [xurData]
  );

  const classCounts = useMemo(() => {
    const counts: Record<ClassFilter, number> = {
      All: allEntries.length,
      Titan: 0,
      Hunter: 0,
      Warlock: 0,
    };
    for (const [, item] of allEntries) {
      if (item.supportedClasses?.includes('Titan')) counts.Titan += 1;
      if (item.supportedClasses?.includes('Hunter')) counts.Hunter += 1;
      if (item.supportedClasses?.includes('Warlock')) counts.Warlock += 1;
    }
    return counts;
  }, [allEntries]);

  const items = useMemo(() => {
    if (selectedClass === 'All') return allEntries;
    return allEntries.filter(([, item]) =>
      item.supportedClasses?.includes(selectedClass)
    );
  }, [allEntries, selectedClass]);

  // Auto-expand the first actual item key on vendor load or class switch
  useEffect(() => {
    if (autoExpandPendingRef.current && items.length > 0) {
      setExpandedKey(items[0][0]);
      autoExpandPendingRef.current = false;
    } else if (
      expandedKey !== null &&
      !items.some(([key]) => key === expandedKey)
    ) {
      setExpandedKey(items.length > 0 ? items[0][0] : null);
    }
  }, [items, expandedKey]);

  const handleVendorChange = (id: DestinyVendorId) => {
    if (id === selectedVendorId) return;
    setSelectedClass('All');
    setExpandedKey(null);
    autoExpandPendingRef.current = true;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    selectVendor(id);
  };

  const handleClassChange = (cls: ClassFilter) => {
    setSelectedClass(cls);
    setExpandedKey(null);
    autoExpandPendingRef.current = true;
  };

  const handleToggleItem = (key: string) => {
    autoExpandPendingRef.current = false;
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const vendorIconUri = activeVendor.icon.startsWith('http')
    ? activeVendor.icon
    : `https://www.bungie.net${activeVendor.icon}`;

  const headerStatusLabel =
    selectedVendorId === 'xur'
      ? isXurPresent
        ? 'Xûr Active'
        : 'Away'
      : xurData?.isLiveApi
      ? 'Live Sync'
      : 'Snapshot';

  const headerStatusColor =
    selectedVendorId === 'xur'
      ? isXurPresent
        ? M.emerald
        : M.amber
      : xurData?.isLiveApi
      ? M.emerald
      : M.amber;

  const headerStatusDot =
    selectedVendorId === 'xur' ? isXurPresent : Boolean(xurData?.isLiveApi);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Destiny 2"
        statusLabel={headerStatusLabel}
        statusColor={headerStatusColor}
        statusDot={headerStatusDot}
      />

      {/* Horizontal Vendor Selector Rail */}
      <View style={styles.vendorSelectorWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vendorTabsScroll}
        >
          {DESTINY_VENDORS.map((vendor) => {
            const isSelected = vendor.id === selectedVendorId;
            return (
              <Pressable
                key={vendor.id}
                style={({ pressed }) => [
                  styles.vendorPill,
                  isSelected && styles.vendorPillActive,
                  pressed && !isSelected && styles.vendorPillPressed,
                ]}
                onPress={() => handleVendorChange(vendor.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${vendor.name}, ${vendor.subtitle}`}
              >
                <Text
                  style={[
                    styles.vendorPillText,
                    isSelected && styles.vendorPillTextActive,
                  ]}
                >
                  {vendor.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshXurData}
            tintColor={M.acid}
          />
        }
      >
        {error ? (
          <ErrorBanner
            message="Could not reach Bungie.net right now. Pull to retry or inspect cached offerings."
            onRetry={refreshXurData}
          />
        ) : null}

        {/* Vendor Summary Banner */}
        <View style={styles.vendorBanner}>
          <Image
            source={{ uri: vendorIconUri }}
            style={styles.vendorPortrait}
          />
          <View style={styles.vendorTextCol}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {activeVendor.name}
            </Text>
            <Text style={styles.vendorSubtitle} numberOfLines={1}>
              {activeVendor.subtitle} · {activeVendor.location}
            </Text>
            <Text style={styles.vendorTimerLine} numberOfLines={1}>
              {selectedVendorId === 'xur'
                ? isXurPresent
                  ? 'Leaves in '
                  : 'Arrives in '
                : 'Resets in '}
              <Text style={styles.vendorTimerValue}>{timeUntilXur}</Text>
            </Text>
          </View>
        </View>

        {/* Class Filter Chips (>=44px height with class dots & counts) */}
        <View style={styles.classFilterBar}>
          {CLASS_FILTERS.map((cls) => {
            const active = selectedClass === cls;
            const count = classCounts[cls];
            const clsColor = cls === 'All' ? M.acid : getClassColor(cls);

            return (
              <Pressable
                key={cls}
                style={({ pressed }) => [
                  styles.classChip,
                  active && [
                    styles.classChipActive,
                    { borderColor: clsColor },
                  ],
                  pressed && !active && styles.classChipPressed,
                ]}
                onPress={() => handleClassChange(cls)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${cls}, ${count} items`}
              >
                <View style={styles.classChipTop}>
                  {cls !== 'All' ? (
                    <View
                      style={[
                        styles.classDot,
                        { backgroundColor: clsColor },
                      ]}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.classChipText,
                      active && styles.classChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cls}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.classChipCount,
                    active && { color: clsColor },
                  ]}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Inventory List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle} accessibilityRole="header">
            Inventory ({items.length})
          </Text>
          <Text style={styles.listHeaderHint}>Tap item to inspect</Text>
        </View>

        {/* Loading Skeletons / Empty State / Inventory List */}
        {isLoading && allEntries.length === 0 ? (
          <View style={styles.skeletonStack}>
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
            <SkeletonBlock height={88} />
          </View>
        ) : items.length === 0 ? (
          selectedClass !== 'All' ? (
            <EmptyStateCard
              icon="filter-off-outline"
              title={`No ${selectedClass} Gear`}
              description={`${activeVendor.name} has no ${selectedClass}-specific items in this rotation.`}
              actionLabel="Show All Classes"
              onAction={() => handleClassChange('All')}
            />
          ) : (
            <EmptyStateCard
              icon="package-variant"
              title="No Offerings Loaded"
              description={`Could not load ${activeVendor.name}'s inventory. Tap below to retry.`}
              actionLabel="Refresh Inventory"
              onAction={refreshXurData}
            />
          )
        ) : (
          items.map(([key, item]) => {
            const isExpanded = expandedKey === key;
            return (
              <XurItemCard
                key={`${selectedVendorId}-${key}-${item.itemHash}`}
                item={item}
                expanded={isExpanded}
                onPress={() => handleToggleItem(key)}
              />
            );
          })
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
  vendorSelectorWrap: {
    backgroundColor: M.surface,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  vendorTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  vendorPill: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.control,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorPillActive: {
    backgroundColor: M.acid,
    borderColor: M.acid,
  },
  vendorPillPressed: {
    backgroundColor: M.surfaceElevated,
  },
  vendorPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  vendorPillTextActive: {
    color: M.void,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  vendorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    padding: 14,
  },
  vendorPortrait: {
    width: 52,
    height: 52,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: M.borderActive,
    backgroundColor: M.void,
  },
  vendorTextCol: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '800',
    color: M.bone,
    letterSpacing: -0.3,
  },
  vendorSubtitle: {
    fontSize: 13,
    color: M.inkSecondary,
    marginTop: 2,
  },
  vendorTimerLine: {
    fontSize: 13,
    color: M.ash,
    marginTop: 4,
  },
  vendorTimerValue: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  classFilterBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  classChip: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.control,
    gap: 2,
  },
  classChipActive: {
    backgroundColor: M.surfaceElevated,
  },
  classChipPressed: {
    backgroundColor: M.surfaceElevated,
  },
  classChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  classChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  classChipTextActive: {
    color: M.bone,
    fontWeight: '700',
  },
  classChipCount: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.ash,
    fontVariant: ['tabular-nums'],
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  listHeaderHint: {
    fontSize: 12,
    color: M.ash,
  },
  skeletonStack: {
    gap: 10,
  },
});
