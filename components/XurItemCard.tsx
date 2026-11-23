import React from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  View,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors, {
  radii,
  getCurrencyName,
  getRarityColor,
  getClassColor,
  cleanBungieText,
} from '@/constants/Colors';
import { XurInventoryItem } from '@/services/api';
import { SegmentedStatBar } from './MarathonPrimitives';

const M = Colors.marathon;

interface XurItemCardProps {
  item: XurInventoryItem;
  expanded?: boolean;
  onPress: () => void;
}

const ARMOR_TYPE_RE = /^(helmet|gauntlets|chest armor|leg armor)$/i;

const getClassLabel = (classType: number): string | null => {
  if (classType === 0) return 'Titan';
  if (classType === 1) return 'Hunter';
  if (classType === 2) return 'Warlock';
  return null;
};

const getMetaLabel = (item: XurInventoryItem): string => {
  if (item.rollType === 'curated') return 'Curated Roll';
  if (item.rollType === 'random') return 'Random Roll';
  const cls = getClassLabel(item.classType);
  if (cls) return cls;
  return item.rarity;
};

const getPerkPreviewLine = (item: XurInventoryItem): string | null => {
  if (!item.perks || item.perks.length === 0) {
    const cleaned = cleanBungieText(item.itemDescription);
    return cleaned || null;
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
  const cleanedDesc = cleanBungieText(primary.description);
  return cleanedDesc ? `${primary.name} — ${cleanedDesc}` : primary.name;
};

export default function XurItemCard({
  item,
  expanded = false,
  onPress,
}: XurItemCardProps) {
  const isExotic = item.rarity === 'Exotic';
  const rarityColor = getRarityColor(item.rarity);
  const classLabel = getClassLabel(item.classType);
  const classColor = classLabel ? getClassColor(classLabel) : null;
  const metaLabel = getMetaLabel(item);
  const previewLine = getPerkPreviewLine(item);
  const cleanedDescription = cleanBungieText(item.itemDescription);
  const cleanedFlavor = cleanBungieText(item.flavorText);

  const imageUri = item.itemIcon.startsWith('http')
    ? item.itemIcon
    : `https://www.bungie.net${item.itemIcon}`;

  const primaryCost = item.costs && item.costs.length > 0 ? item.costs[0] : null;
  const hasStats = Boolean(item.stats && item.stats.length > 0);
  const isArmorType = ARMOR_TYPE_RE.test(item.itemTypeDisplayName || '');
  const isArmorStats =
    hasStats &&
    item.stats?.some((s) => s.name === 'Resilience' || s.name === 'Mobility');
  const totalArmorStat = isArmorStats
    ? item.stats!.reduce((sum, s) => sum + s.value, 0)
    : 0;

  const costDisplay =
    primaryCost && primaryCost.quantity > 0
      ? primaryCost.quantity >= 1000
        ? `${Math.round(primaryCost.quantity / 1000)}k`
        : String(primaryCost.quantity)
      : null;
  const costUnit =
    primaryCost && primaryCost.quantity > 0
      ? getCurrencyName(primaryCost.itemHash)
      : 'Quest';

  const a11yLabel = `${item.itemName}, ${item.itemTypeDisplayName || item.rarity}${
    metaLabel && metaLabel !== item.itemTypeDisplayName ? `, ${metaLabel}` : ''
  }, ${costDisplay ? `${costDisplay} ${costUnit}` : 'Quest item'}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        expanded && styles.cardExpanded,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={a11yLabel}
      accessibilityHint={
        expanded ? 'Tap to collapse item details' : 'Tap to view perks and stats'
      }
    >
      {/* Main Row: Icon + Info + Price/Chevron */}
      <View style={styles.mainRow}>
        <View style={[styles.iconWrap, { borderColor: rarityColor }]}>
          <Image source={{ uri: imageUri }} style={styles.itemIcon} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.itemName} numberOfLines={expanded ? 2 : 1}>
            {item.itemName}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.typeText} numberOfLines={1}>
              {item.itemTypeDisplayName || item.rarity}
            </Text>
            {metaLabel && metaLabel !== item.itemTypeDisplayName ? (
              <View style={styles.metaBadgeInline}>
                <View
                  style={[
                    styles.classDot,
                    {
                      backgroundColor:
                        classColor && metaLabel === classLabel
                          ? classColor
                          : item.rollType === 'curated'
                          ? M.acid
                          : M.ash,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.metaTagText,
                    classColor && metaLabel === classLabel
                      ? { color: classColor }
                      : item.rollType === 'curated'
                      ? { color: M.acid }
                      : null,
                  ]}
                  numberOfLines={1}
                >
                  {metaLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {!expanded && previewLine ? (
            <Text style={styles.perkPreview} numberOfLines={1}>
              {previewLine}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightCol}>
          {costDisplay ? (
            <View style={styles.costBox}>
              <Text
                style={[
                  styles.costAmount,
                  isExotic && { color: M.amber },
                ]}
              >
                {costDisplay}
              </Text>
              <Text style={styles.costUnit}>{costUnit}</Text>
            </View>
          ) : (
            <Text style={styles.freeTag}>Quest</Text>
          )}
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={expanded ? M.acid : M.ash}
          />
        </View>
      </View>

      {/* Flat Inline Expanded Details — Zero Nested Cards */}
      {expanded && (
        <View style={styles.expandedSection}>
          {cleanedDescription ? (
            <Text style={styles.itemFullDesc}>{cleanedDescription}</Text>
          ) : null}

          {/* Perks & Weapon Rolls */}
          {item.perks && item.perks.length > 0 ? (
            <View style={styles.detailBlock}>
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
                const perkDesc = cleanBungieText(perk.description);
                const isLast = idx === item.perks.length - 1;
                return (
                  <View
                    key={`${perk.hash}-${idx}`}
                    style={[
                      styles.perkDetailRow,
                      !isLast && styles.perkRowBorder,
                    ]}
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
                      {perkDesc ? (
                        <Text style={styles.perkDetailDesc}>{perkDesc}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Segmented Stats (Strictly Real Weapon & Armor Stats Only) */}
          {hasStats ? (
            <View style={styles.detailBlock}>
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
                  color={isExotic ? M.amber : M.bone}
                />
              ))}
            </View>
          ) : isArmorType ? (
            <View style={styles.detailBlock}>
              <Text style={styles.noStatsNote}>
                Stat distribution rolls dynamically per live vendor instance.
              </Text>
            </View>
          ) : null}

          {/* Lore / Flavor Text */}
          {cleanedFlavor ? (
            <View style={styles.flavorWrap}>
              <Text style={styles.flavorText}>"{cleanedFlavor}"</Text>
            </View>
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
    borderRadius: radii.card,
    marginBottom: 10,
    padding: 14,
  },
  cardExpanded: {
    borderColor: M.borderActive,
    backgroundColor: M.surfaceElevated,
  },
  cardPressed: {
    backgroundColor: M.surfaceElevated,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.control,
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
    columnGap: 10,
    rowGap: 2,
    flexWrap: 'wrap',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
    color: M.inkSecondary,
  },
  metaBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  classDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    minWidth: 72,
  },
  costBox: {
    alignItems: 'flex-end',
  },
  costAmount: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  costUnit: {
    fontSize: 12,
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
  detailBlock: {
    paddingTop: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: M.ash,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  perkDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  perkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  perkIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.control,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.border,
    marginTop: 1,
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
    fontSize: 13.5,
    color: M.inkSecondary,
    lineHeight: 20,
  },
  itemFullDesc: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: M.border,
  },
  totalStatText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.bone,
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  noStatsNote: {
    fontSize: 12,
    color: M.ash,
    lineHeight: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: M.border,
  },
  flavorWrap: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: M.border,
  },
  flavorText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: M.ash,
    lineHeight: 19,
  },
});
