import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/Colors';

const M = Colors.marathon;

/**
 * Restrained monochrome metadata tag — zero rainbow dots or neon borders
 */
export function StatusPill({
  label,
  filled = false,
}: {
  label: string;
  color?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        filled
          ? { backgroundColor: M.bone, borderColor: M.bone }
          : { backgroundColor: M.surfaceElevated, borderColor: M.border },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: filled ? M.void : M.inkSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Clean Swiss Editorial section header — no colored vertical bars or boxed badges
 */
export function SectionBarcodeHeader({
  title,
  subtitle,
  rightText,
}: {
  index?: string;
  title: string;
  subtitle?: string;
  rightText?: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTextCol}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {rightText ? (
        <Text style={styles.rightMetaText}>{rightText}</Text>
      ) : null}
    </View>
  );
}

/**
 * Architectural surface container
 */
export function TelemetryFrame({
  children,
  headerLeft,
  headerRight,
  style,
}: {
  children: React.ReactNode;
  accentColor?: string;
  code?: string;
  headerLeft?: string;
  headerRight?: string;
  invertedHeader?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.frame, style]}>
      {headerLeft || headerRight ? (
        <View style={styles.frameHeader}>
          {headerLeft ? (
            <Text style={styles.frameHeaderTitle} numberOfLines={1}>
              {headerLeft}
            </Text>
          ) : null}
          {headerRight ? (
            <Text style={styles.frameHeaderRight}>{headerRight}</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.frameBody}>{children}</View>
    </View>
  );
}

/**
 * Clean monochrome segmented stat bar for weapons & armor
 */
export function SegmentedStatBar({
  label,
  value,
  max = 100,
  segments = 16,
}: {
  label: string;
  value: number;
  max?: number;
  segments?: number;
  color?: string;
}) {
  const ratio = Math.max(0, Math.min(1, value / (max || 100)));
  const filledCount = Math.round(ratio * segments);

  return (
    <View style={styles.statRow}>
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
                  backgroundColor: active ? M.bone : M.border,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
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
  sectionTitle: {
    color: M.bone,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: M.ash,
    fontSize: 13,
    marginTop: 2,
  },
  rightMetaText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  frame: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  frameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: M.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  frameHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: M.bone,
    flex: 1,
  },
  frameHeaderRight: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '600',
    color: M.ash,
  },
  frameBody: {
    padding: 14,
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
});
