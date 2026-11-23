import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors, { radii, withAlpha } from '@/constants/Colors';

const M = Colors.marathon;

export type IconName = React.ComponentProps<
  typeof MaterialCommunityIcons
>['name'];

/**
 * Restrained Swiss Editorial metadata tag with optional semantic tint, dot, or icon.
 */
export function StatusPill({
  label,
  color,
  filled = false,
  dot = false,
  icon,
  compact = false,
  style,
}: {
  label: string;
  color?: string;
  filled?: boolean;
  dot?: boolean;
  icon?: IconName;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const accent = color || M.bone;
  const bg = filled
    ? accent
    : color
    ? withAlpha(color, 0.14)
    : M.surfaceElevated;
  const borderColor = filled
    ? accent
    : color
    ? withAlpha(color, 0.34)
    : M.border;
  const fg = filled ? M.void : color ? color : M.inkSecondary;

  return (
    <View
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { backgroundColor: bg, borderColor },
        style,
      ]}
    >
      {dot ? (
        <View style={[styles.pillDot, { backgroundColor: fg }]} />
      ) : null}
      {icon ? (
        <MaterialCommunityIcons name={icon} size={13} color={fg} />
      ) : null}
      <Text style={[styles.pillText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Standardized editorial top bar shared across all tabs.
 */
export function ScreenHeader({
  title,
  statusLabel,
  statusColor,
  statusDot = false,
  rightElement,
}: {
  title: string;
  statusLabel?: string;
  statusColor?: string;
  statusDot?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.screenTitle} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {rightElement ? (
        rightElement
      ) : statusLabel ? (
        <StatusPill
          label={statusLabel}
          color={statusColor}
          dot={statusDot}
          compact
        />
      ) : null}
    </View>
  );
}

/**
 * Clean Swiss Editorial section header — bold title, optional subtitle, right tabular metadata.
 * Exported as both SectionBarcodeHeader (compat) and SectionHeader.
 */
export function SectionBarcodeHeader({
  title,
  subtitle,
  rightText,
  rightColor,
  accentColor,
}: {
  index?: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  rightColor?: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTextCol}>
        <View style={styles.sectionTitleRow}>
          {accentColor ? (
            <View
              style={[styles.sectionDot, { backgroundColor: accentColor }]}
            />
          ) : null}
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {rightText ? (
        <Text
          style={[
            styles.rightMetaText,
            rightColor ? { color: rightColor } : null,
          ]}
        >
          {rightText}
        </Text>
      ) : null}
    </View>
  );
}

export const SectionHeader = SectionBarcodeHeader;

/**
 * Clean segmented stat bar for weapons & armor.
 */
export function SegmentedStatBar({
  label,
  value,
  max = 100,
  segments = 16,
  color,
}: {
  label: string;
  value: number;
  max?: number;
  segments?: number;
  color?: string;
}) {
  const safeMax = max || 100;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const filledCount = Math.round(ratio * segments);
  const activeColor = color || M.bone;

  return (
    <View
      style={styles.statRow}
      accessible
      accessibilityLabel={`${label}: ${value} out of ${safeMax}`}
    >
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={styles.segmentTrack}>
        {Array.from({ length: segments }).map((_, idx) => {
          const active = idx < filledCount;
          return (
            <View
              key={idx}
              style={[
                styles.segmentCell,
                {
                  backgroundColor: active ? activeColor : M.border,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Architectural tonal skeleton placeholder for loading states.
 */
export function SkeletonBlock({
  height = 56,
  width = '100%',
  radius = radii.card,
  style,
}: {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.skeleton,
        { height, width, borderRadius: radius },
        style,
      ]}
    />
  );
}

/**
 * Non-blocking inline error banner with retry action.
 */
export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
  style,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.errorBanner, style]} accessibilityRole="alert">
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={20}
        color={M.vermilion}
      />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable
          style={({ pressed }) => [
            styles.errorRetryBtn,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.errorRetryText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Helpful, clean empty state card with optional recovery button.
 */
export function EmptyStateCard({
  icon = 'information-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.emptyCard, style]}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color={M.ash} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [
            styles.emptyActionBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 54,
    paddingVertical: 10,
    backgroundColor: M.surface,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: M.bone,
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    gap: 12,
  },
  sectionTextCol: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    color: M.bone,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  sectionSubtitle: {
    color: M.ash,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  rightMetaText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.ash,
    fontVariant: ['tabular-nums'],
  },
  statRow: {
    marginBottom: 10,
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statLabel: {
    color: M.inkSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    fontVariant: ['tabular-nums'],
  },
  segmentTrack: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
  },
  segmentCell: {
    flex: 1,
    height: '100%',
    borderRadius: 1,
  },
  skeleton: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: withAlpha(M.vermilion, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(M.vermilion, 0.34),
    borderRadius: radii.card,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: M.bone,
    lineHeight: 18,
  },
  errorRetryBtn: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.control,
    backgroundColor: M.surfaceElevated,
    borderWidth: 1,
    borderColor: M.borderActive,
  },
  errorRetryText: {
    fontSize: 12,
    fontWeight: '700',
    color: M.bone,
  },
  emptyCard: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    padding: 20,
    alignItems: 'flex-start',
  },
  emptyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.control,
    backgroundColor: M.surfaceElevated,
    borderWidth: 1,
    borderColor: M.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: M.inkSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyActionBtn: {
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radii.control,
    backgroundColor: M.bone,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: M.void,
  },
});
