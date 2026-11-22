import React, { useState, useMemo } from 'react';
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
import Colors from '@/constants/Colors';
import { useXur } from '@/hooks/useXur';
import { DESTINY_VENDORS, DestinyVendorId } from '@/services/api';
import XurItemCard from '@/components/XurItemCard';

const M = Colors.marathon;

const CLASS_FILTERS = ['All', 'Titan', 'Hunter', 'Warlock'] as const;
type ClassFilter = (typeof CLASS_FILTERS)[number];

export default function XurScreen() {
  const insets = useSafeAreaInsets();
  const {
    xurData,
    activeVendor,
    selectedVendorId,
    selectVendor,
    isLoading,
    isXurPresent,
    timeUntilXur,
    refreshXurData,
  } = useXur('xur');

  const [selectedClass, setSelectedClass] = useState<ClassFilter>('All');
  const [expandedKey, setExpandedKey] = useState<string | null>('0');

  const items = useMemo(() => {
    const rawMap = xurData?.sales?.saleItems || {};
    return Object.entries(rawMap).filter(([_, item]) => {
      if (selectedClass === 'All') return true;
      return item.supportedClasses?.includes(selectedClass);
    });
  }, [xurData, selectedClass]);

  const handleVendorChange = (id: DestinyVendorId) => {
    setSelectedClass('All');
    setExpandedKey('0');
    selectVendor(id);
  };

  const vendorIconUri = activeVendor.icon.startsWith('http')
    ? activeVendor.icon
    : `https://www.bungie.net${activeVendor.icon}`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Destiny 2 · Vendors</Text>
        <Text style={styles.topBarMeta}>
          {selectedVendorId === 'xur' && isXurPresent
            ? 'Xûr Active'
            : 'Tower Network'}
        </Text>
      </View>

      {/* Clean Monochrome Vendor Selector */}
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
                style={[
                  styles.vendorPill,
                  isSelected && styles.vendorPillActive,
                ]}
                onPress={() => handleVendorChange(vendor.id)}
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshXurData}
            tintColor={M.bone}
          />
        }
      >
        {/* Compact Vendor Header Banner */}
        <View style={styles.vendorBanner}>
          <Image
            source={{ uri: vendorIconUri }}
            style={styles.vendorPortrait}
          />
          <View style={styles.vendorTextCol}>
            <Text style={styles.vendorName}>{activeVendor.name}</Text>
            <Text style={styles.vendorSubtitle}>
              {activeVendor.subtitle} · {activeVendor.location}
            </Text>
            <Text style={styles.vendorTimerLine}>
              {selectedVendorId === 'xur'
                ? isXurPresent
                  ? 'Leaves in '
                  : 'Arrives in '
                : 'Rotation resets in '}
              <Text style={styles.vendorTimerValue}>{timeUntilXur}</Text>
            </Text>
          </View>
        </View>

        {/* Class Filter Bar */}
        <View style={styles.classFilterBar}>
          {CLASS_FILTERS.map((cls) => {
            const active = selectedClass === cls;
            return (
              <Pressable
                key={cls}
                style={[
                  styles.classChip,
                  active && styles.classChipActive,
                ]}
                onPress={() => setSelectedClass(cls)}
              >
                <Text
                  style={[
                    styles.classChipText,
                    active && styles.classChipTextActive,
                  ]}
                >
                  {cls}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Helper Hint for Inline Expansion */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            Inventory ({items.length})
          </Text>
          <Text style={styles.listHeaderHint}>Tap item to inspect</Text>
        </View>

        {/* Inventory Items (Inline Expandable) */}
        {items.map(([key, item]) => {
          const isExpanded = expandedKey === key;
          return (
            <XurItemCard
              key={`${selectedVendorId}-${key}-${item.itemHash}`}
              item={item}
              expanded={isExpanded}
              onPress={() => setExpandedKey(isExpanded ? null : key)}
            />
          );
        })}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.border,
  },
  vendorPillActive: {
    backgroundColor: M.bone,
    borderColor: M.bone,
  },
  vendorPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  vendorPillTextActive: {
    color: M.void,
    fontWeight: '700',
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
    borderRadius: 6,
    padding: 14,
  },
  vendorPortrait: {
    width: 52,
    height: 52,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.borderActive,
  },
  vendorTextCol: {
    flex: 1,
  },
  vendorName: {
    fontSize: 18,
    fontWeight: '800',
    color: M.bone,
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
  },
  classFilterBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  classChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 4,
  },
  classChipActive: {
    backgroundColor: M.surfaceElevated,
    borderColor: M.bone,
  },
  classChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
  },
  classChipTextActive: {
    color: M.bone,
    fontWeight: '700',
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
});
