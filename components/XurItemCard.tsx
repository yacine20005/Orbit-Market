import React from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  View,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors, { getCurrencyName } from '@/constants/Colors';
import { XurInventoryItem } from '@/services/api';
import { SegmentedStatBar } from './MarathonPrimitives';

const M = Colors.marathon;

interface XurItemCardProps {
  item: XurInventoryItem;
  expanded?: boolean;
  onPress: () => void;
}

const getMetaLabel = (item: XurInventoryItem): string => {
  if (item.rollType === 'curated') return 'Curated Perks';
  if (item.rollType === 'random') return 'Random Roll';
  if (item.classType === 0) return 'Titan';
  if (item.classType === 1) return 'Hunter';
  if (item.classType === 2) return 'Warlock';
  return item.rarity;
};

const getPerkPreviewLine = (item: XurInventoryItem): string | null => {
  if (!item.perks || item.perks.length === 0) {
    return item.itemDescription || null;
  }

  if (item.rollType === 'curated') {
    const traits = item.perks.filter(
      (p) => p.slot === 'Trait' || p.slot === 'Origin Trait'
    );
    if (traits.length > 0) {
      return `Perks: ${traits.map((t) => t.name).join(' · ')}`;
    }
    return `Perks: ${item.perks.map((p) => p.name).join(' · ')}`;
  }

  if (item.rollType === 'random') {
    const frame = item.perks.find((p) => p.slot === 'Intrinsic');
    const origin = item.perks.find((p) => p.slot === 'Origin Trait');
    const parts = ['Random traits on purchase'];
    if (frame) parts.push(frame.name);
    if (origin) parts.push(origin.name);
    return parts.join(' · ');
  }

  const primary = item.perks[0];
  return primary.description
    ? `${primary.name} — ${primary.description}`
    : primary.name;
};

export default function XurItemCard({
  item,
  expanded = false,
  onPress,
}: XurItemCardProps) {
  const isExotic = item.rarity === 'Exotic';
  const metaLabel = getMetaLabel(item);
  const previewLine = getPerkPreviewLine(item);

  const imageUri = item.itemIcon.startsWith('http')
    ? item.itemIcon
    : `https://www.bungie.net${item.itemIcon}`;

  const primaryCost = item.costs && item.costs.length > 0 ? item.costs[0] : null;
  const hasStats = Boolean(item.stats && item.stats.length > 0);
  const isArmorStats =
    hasStats && item.stats?.some((s) => s.name === 'Resilience' || s.name === 'Mobility');
  const totalArmorStat = isArmorStats
    ? item.stats!.reduce((sum, s) => sum + s.value, 0)
    : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        expanded && styles.cardExpanded,
        pressed && { opacity: 0.92 },
      ]}
      onPress={onPress}
    >
      {/* Main Row: Icon + Info + Price/Chevron */}
      <View style={styles.mainRow}>
        <View
          style={[
            styles.iconWrap,
            { borderColor: isExotic ? M.amber : M.borderActive },
          ]}
        >
          <Image source={{ uri: imageUri }} style={styles.itemIcon} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.itemName} numberOfLines={expanded ? 2 : 1}>
            {item.itemName}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.typeText}>
              {item.itemTypeDisplayName || item.rarity}
            </Text>
            {metaLabel && metaLabel !== item.itemTypeDisplayName ? (
              <>
                <Text style={styles.dotSeparator}>·</Text>
                <Text style={styles.metaTagText}>{metaLabel}</Text>
              </>
            ) : null}
          </View>

          {!expanded && previewLine ? (
            <Text style={styles.perkPreview} numberOfLines={1}>
              {previewLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          {primaryCost && primaryCost.quantity > 0 ? (
            <View style={styles.costBox}>
              <Text style={styles.costAmount}>
                {primaryCost.quantity >= 1000
                  ? `${Math.round(primaryCost.quantity / 1000)}k`
                  : primaryCost.quantity}
              </Text>
              <Text style={styles.costUnit}>
                {getCurrencyName(primaryCost.itemHash)}
              </Text>
            </View>
          ) : (
            <Text style={styles.freeTag}>Quest</Text>
          )}
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={expanded ? M.bone : M.ash}
          />
        </View>
      </View>

      {/* Inline Expanded Details: Perks / Description / Stats / Lore */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Item Description (for Bounties, Engrams, Passages, Materials, Shaders) */}
          {item.itemDescription ? (
            <Text style={styles.itemFullDesc}>{item.itemDescription}</Text>
          ) : null}

          {/* Perks & Weapon Rolls */}
          {item.perks && item.perks.length > 0 ? (
            <View style={styles.perkList}>
              <Text style={styles.sectionHeading}>
                {item.rollType === 'curated'
                  ? 'Predefined Weapon Roll'
                  : item.rollType === 'random'
                  ? 'Weapon Frame & Roll Info'
                  : 'Intrinsic Traits'}
              </Text>
              {item.perks.map((perk, idx) => {
                const perkIconUri = perk.icon
                  ? perk.icon.startsWith('http')
                    ? perk.icon
                    : `https://www.bungie.net${perk.icon}`
                  : null;
                return (
                  <View
                    key={`${perk.hash}-${idx}`}
                    style={styles.perkDetailRow}
                  >
                    {perkIconUri ? (
                      <Image
                        source={{ uri: perkIconUri }}
                        style={styles.perkIcon}
                      />
                    ) : null}
                    <View style={styles.perkDetailTextCol}>
                      <View style={styles.perkTitleLine}>
                        <Text style={styles.perkDetailTitle}>{perk.name}</Text>
                        {perk.slot ? (
                          <Text style={styles.perkSlotLabel}>{perk.slot}</Text>
                        ) : null}
                      </View>
                      {perk.description ? (
                        <Text style={styles.perkDetailDesc}>
                          {perk.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Segmented Stats (Strictly Weapons & Armor only) */}
          {hasStats && (
            <View style={styles.statsContainer}>
              <View style={styles.statsHeaderRow}>
                <Text style={styles.sectionHeading}>
                  {isArmorStats ? 'Armor Attributes' : 'Weapon Stats'}
                </Text>
                {totalArmorStat > 0 ? (
                  <Text style={styles.totalStatText}>
                    Total {totalArmorStat}
                  </Text>
                ) : null}
              </View>
              {item.stats!.map((stat) => (
                <SegmentedStatBar
                  key={stat.hash}
                  label={stat.name}
                  value={stat.value}
                  max={stat.maximum || 100}
                  segments={15}
                />
              ))}
            </View>
          )}

          {/* Lore / Flavor Text */}
          {item.flavorText ? (
            <Text style={styles.flavorText}>"{item.flavorText}"</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    marginBottom: 10,
    padding: 14,
  },
  cardExpanded: {
    borderColor: M.borderActive,
    backgroundColor: M.surfaceElevated,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 4,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: M.void,
  },
  itemIcon: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: M.bone,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
    color: M.inkSecondary,
  },
  dotSeparator: {
    color: M.ash,
    fontSize: 13,
  },
  metaTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: M.ash,
  },
  perkPreview: {
    marginTop: 4,
    fontSize: 13,
    color: M.ash,
    lineHeight: 18,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    minWidth: 64,
  },
  costBox: {
    alignItems: 'flex-end',
  },
  costAmount: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  costUnit: {
    fontSize: 11,
    color: M.ash,
    fontWeight: '500',
  },
  freeTag: {
    fontSize: 12,
    color: M.ash,
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: M.border,
    gap: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: M.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  perkList: {
    gap: 8,
  },
  perkDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: M.void,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.border,
  },
  perkIcon: {
    width: 32,
    height: 32,
    borderRadius: 4,
    marginTop: 2,
  },
  perkDetailTextCol: {
    flex: 1,
  },
  perkTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  perkDetailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: M.bone,
    flex: 1,
  },
  perkSlotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  perkDetailDesc: {
    fontSize: 13,
    color: M.inkSecondary,
    lineHeight: 19,
  },
  itemFullDesc: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
  },
  statsContainer: {
    backgroundColor: M.void,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: M.border,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalStatText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.bone,
    marginBottom: 8,
  },
  flavorText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: M.ash,
    lineHeight: 19,
  },
});
