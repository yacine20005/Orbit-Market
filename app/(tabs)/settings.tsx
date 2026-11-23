import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  Text,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors, { radii, spacing, withAlpha } from '@/constants/Colors';
import { apiService } from '@/services/api';
import { warframeService } from '@/services/warframe';
import {
  ScreenHeader,
  SectionBarcodeHeader,
  StatusPill,
} from '@/components/MarathonPrimitives';

const M = Colors.marathon;

interface InlineFeedback {
  tone: 'success' | 'warning' | 'error';
  message: string;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isMountedRef = useRef(true);
  const statusFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const keyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [diag, setDiag] = useState<{
    testing: boolean;
    hasTested: boolean;
    bungieOk: boolean;
    warframeOk: boolean;
    latencyMs: number;
  }>({
    testing: true,
    hasTested: false,
    bungieOk: false,
    warframeOk: false,
    latencyMs: 0,
  });

  const [refreshingAll, setRefreshingAll] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<InlineFeedback | null>(
    null
  );

  const [apiKeyInput, setApiKeyInput] = useState(() => apiService.getApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<InlineFeedback | null>(null);

  const clearTimer = (
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimer(statusFeedbackTimerRef);
      clearTimer(keyFeedbackTimerRef);
    };
  }, []);

  const showTimedStatusFeedback = useCallback(
    (feedback: InlineFeedback, durationMs = 4000) => {
      if (!isMountedRef.current) return;
      clearTimer(statusFeedbackTimerRef);
      setStatusFeedback(feedback);
      statusFeedbackTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setStatusFeedback(null);
        }
        statusFeedbackTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  const showTimedKeyFeedback = useCallback(
    (feedback: InlineFeedback, durationMs = 4000) => {
      if (!isMountedRef.current) return;
      clearTimer(keyFeedbackTimerRef);
      setKeyFeedback(feedback);
      keyFeedbackTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setKeyFeedback(null);
        }
        keyFeedbackTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  const runDiagnostics = useCallback(
    async (notifyUser = false) => {
      if (!isMountedRef.current) return;
      setDiag((prev) => ({ ...prev, testing: true }));

      try {
        const res = await apiService.testConnection();
        if (!isMountedRef.current) return;

        setDiag({
          testing: false,
          hasTested: true,
          bungieOk: res.bungieOk,
          warframeOk: res.warframeOk,
          latencyMs: res.latencyMs,
        });

        if (notifyUser) {
          if (res.bungieOk && res.warframeOk) {
            showTimedStatusFeedback({
              tone: 'success',
              message: `All upstream APIs reachable (${res.latencyMs} ms).`,
            });
          } else if (res.bungieOk || res.warframeOk) {
            showTimedStatusFeedback({
              tone: 'warning',
              message: `Partial connectivity (${res.latencyMs} ms). Offline service will use snapshot fallback.`,
            });
          } else {
            showTimedStatusFeedback({
              tone: 'error',
              message:
                'Both upstream APIs unreachable. Check network or Bungie API key.',
            });
          }
        }
      } catch {
        if (!isMountedRef.current) return;
        setDiag((prev) => ({
          ...prev,
          testing: false,
          hasTested: true,
          bungieOk: false,
          warframeOk: false,
        }));
        if (notifyUser) {
          showTimedStatusFeedback({
            tone: 'error',
            message: 'Connection check failed. Please try again.',
          });
        }
      }
    },
    [showTimedStatusFeedback]
  );

  useEffect(() => {
    runDiagnostics(false);
  }, [runDiagnostics]);

  const handleFlushCaches = async () => {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      apiService.clearCache();
      warframeService.clearCache();
      const [xurRes, wfRes] = await Promise.all([
        apiService.getVendorInventory('xur', false),
        warframeService.getTelemetry(false),
      ]);
      if (!isMountedRef.current) return;

      const liveBungie = Boolean(xurRes?.Response?.isLiveApi);
      const liveWf = Boolean(wfRes?.isLive);

      if (liveBungie && liveWf) {
        showTimedStatusFeedback({
          tone: 'success',
          message: 'Live Destiny 2 & Warframe caches refreshed.',
        });
      } else if (liveBungie || liveWf) {
        showTimedStatusFeedback({
          tone: 'warning',
          message:
            'Caches refreshed with partial live sync; snapshot fallback active for offline source.',
        });
      } else {
        showTimedStatusFeedback({
          tone: 'warning',
          message: 'Refreshed from local snapshot cache (upstream APIs offline).',
        });
      }
    } catch {
      if (!isMountedRef.current) return;
      showTimedStatusFeedback({
        tone: 'error',
        message: 'Failed to refresh caches. Check connectivity and try again.',
      });
    } finally {
      if (isMountedRef.current) {
        setRefreshingAll(false);
      }
    }
  };

  const handleApplyApiKey = () => {
    const trimmed = apiKeyInput.trim();
    apiService.setApiKey(trimmed);
    setApiKeyInput(trimmed);

    if (trimmed.length === 0) {
      showTimedKeyFeedback({
        tone: 'warning',
        message:
          'Custom key cleared for this session. Using default configuration.',
      });
    } else {
      showTimedKeyFeedback({
        tone: 'success',
        message:
          'API key applied for this session. Active Destiny 2 tabs refreshed.',
      });
    }
    runDiagnostics(false);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    setShowApiKey(false);
    apiService.setApiKey('');
    showTimedKeyFeedback({
      tone: 'warning',
      message: 'API key reset to default session configuration.',
    });
    runDiagnostics(false);
  };

  const headerStatus = useMemo(() => {
    if (diag.testing) {
      return { label: 'Checking', color: M.ash, dot: false };
    }
    if (diag.bungieOk && diag.warframeOk) {
      return { label: 'All Online', color: M.emerald, dot: true };
    }
    if (diag.bungieOk || diag.warframeOk) {
      return { label: 'Snapshot', color: M.amber, dot: true };
    }
    return { label: 'Offline', color: M.vermilion, dot: true };
  }, [diag]);

  const getServicePill = (ok: boolean) => {
    if (diag.testing && !diag.hasTested) {
      return { label: 'Checking', color: M.ash, dot: false };
    }
    if (ok) {
      return { label: 'Online', color: M.emerald, dot: true };
    }
    if (!diag.bungieOk && !diag.warframeOk) {
      return { label: 'Offline', color: M.vermilion, dot: true };
    }
    return { label: 'Snapshot', color: M.amber, dot: true };
  };

  const bungiePill = getServicePill(diag.bungieOk);
  const warframePill = getServicePill(diag.warframeOk);

  const renderFeedback = (feedback: InlineFeedback | null) => {
    if (!feedback) return null;
    const color =
      feedback.tone === 'success'
        ? M.emerald
        : feedback.tone === 'warning'
        ? M.amber
        : M.vermilion;
    const icon =
      feedback.tone === 'success'
        ? 'check-circle-outline'
        : feedback.tone === 'warning'
        ? 'alert-outline'
        : 'alert-circle-outline';

    return (
      <View
        style={styles.feedbackRow}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text style={[styles.feedbackText, { color }]}>{feedback.message}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="Settings"
        statusLabel={headerStatus.label}
        statusColor={headerStatus.color}
        statusDot={headerStatus.dot}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* API STATUS */}
          <SectionBarcodeHeader
            title="API Connection Status"
            subtitle="Direct client-to-API status and response latency"
            rightText={diag.latencyMs > 0 ? `${diag.latencyMs} ms` : undefined}
            rightColor={
              diag.latencyMs > 0
                ? diag.latencyMs < 1000
                  ? M.emerald
                  : M.amber
                : M.ash
            }
          />

          <View style={styles.card}>
            <View
              style={styles.statusRow}
              accessible
              accessibilityLabel={`Bungie.net Platform API, ${bungiePill.label}`}
            >
              <View style={styles.statusLeft}>
                <Text style={styles.statusTitle}>Bungie.net Platform API</Text>
                <Text style={styles.statusUrl} numberOfLines={1}>
                  bungie.net/Platform/Destiny2
                </Text>
              </View>
              <StatusPill
                label={bungiePill.label}
                color={bungiePill.color}
                dot={bungiePill.dot}
                compact
              />
            </View>

            <View
              style={styles.statusRow}
              accessible
              accessibilityLabel={`Warframe WorldState API, ${warframePill.label}`}
            >
              <View style={styles.statusLeft}>
                <Text style={styles.statusTitle}>Warframe WorldState API</Text>
                <Text style={styles.statusUrl} numberOfLines={1}>
                  api.warframestat.us/pc
                </Text>
              </View>
              <StatusPill
                label={warframePill.label}
                color={warframePill.color}
                dot={warframePill.dot}
                compact
              />
            </View>

            <View
              style={[styles.statusRow, styles.rowLast]}
              accessible
              accessibilityLabel="Embedded Destiny 2 Manifest, Ready"
            >
              <View style={styles.statusLeft}>
                <Text style={styles.statusTitle}>
                  Embedded Destiny 2 Manifest
                </Text>
                <Text style={styles.statusUrl}>
                  56 pre-indexed Exotic & Legendary items
                </Text>
              </View>
              <StatusPill label="Ready" color={M.emerald} dot compact />
            </View>

            <View style={styles.actionFooter}>
              <View style={styles.actionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    diag.testing && styles.btnDisabled,
                    pressed && !diag.testing && styles.pressed,
                  ]}
                  onPress={() => runDiagnostics(true)}
                  disabled={diag.testing}
                  accessibilityRole="button"
                  accessibilityLabel="Test Connections"
                  accessibilityState={{ busy: diag.testing, disabled: diag.testing }}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={16}
                    color={M.void}
                  />
                  <Text
                    style={styles.primaryBtnText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {diag.testing ? 'Testing...' : 'Test Connections'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    refreshingAll && styles.btnDisabled,
                    pressed && !refreshingAll && styles.pressed,
                  ]}
                  onPress={handleFlushCaches}
                  disabled={refreshingAll}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh All Data"
                  accessibilityState={{
                    busy: refreshingAll,
                    disabled: refreshingAll,
                  }}
                >
                  <Text
                    style={styles.secondaryBtnText}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {refreshingAll ? 'Refreshing...' : 'Refresh All Data'}
                  </Text>
                </Pressable>
              </View>

              {renderFeedback(statusFeedback)}
            </View>
          </View>

          {/* BUNGIE API KEY OVERRIDE */}
          <View style={styles.sectionSpacer}>
            <SectionBarcodeHeader
              title="Bungie.net API Key"
              subtitle="Session X-API-Key header for Destiny 2 requests"
            />

            <View style={styles.cardPad}>
              <Text style={styles.helperText}>
                Orbit Market connects directly to Bungie.net from your device.
                Applying a key updates active Destiny 2 tabs immediately for
                this session.
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="Enter Bungie X-API-Key..."
                  placeholderTextColor={M.ash}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  returnKeyType="done"
                  onSubmitEditing={handleApplyApiKey}
                  accessibilityLabel="Bungie API Key"
                  accessibilityHint="Enter or paste your personal Bungie.net X-API-Key"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.eyeToggleBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setShowApiKey((prev) => !prev)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showApiKey ? 'Hide API key' : 'Show API key'
                  }
                  accessibilityState={{ expanded: showApiKey }}
                >
                  <MaterialCommunityIcons
                    name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={showApiKey ? M.acid : M.inkSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.keyActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.applyKeyBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleApplyApiKey}
                  accessibilityRole="button"
                  accessibilityLabel="Apply API Key"
                >
                  <Text style={styles.primaryBtnText}>Apply API Key</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.clearKeyBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleClearApiKey}
                  accessibilityRole="button"
                  accessibilityLabel="Clear API Key"
                >
                  <Text style={styles.secondaryBtnText}>Clear</Text>
                </Pressable>
              </View>

              {renderFeedback(keyFeedback)}
            </View>
          </View>

          {/* ABOUT */}
          <View style={styles.sectionSpacer}>
            <SectionBarcodeHeader
              title="About Orbit Market"
              subtitle="Version 2.0.0 · Standalone Release"
            />

            <View style={styles.cardPad}>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Application</Text>
                <Text style={styles.specVal}>Orbit Market v2.0.0</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Design Direction</Text>
                <Text style={styles.specVal}>Swiss Editorial</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specKey}>Architecture</Text>
                <Text style={styles.specVal}>
                  Autonomous Client + Offline Cache
                </Text>
              </View>
              <View style={[styles.specRow, styles.rowLast]}>
                <Text style={styles.specKey}>Author</Text>
                <Text style={styles.specVal}>
                  Yacine Hamadouche (yacine20005)
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: M.void,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sectionSpacer: {
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  cardPad: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
    lineHeight: 20,
  },
  statusUrl: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  actionFooter: {
    padding: 14,
    backgroundColor: M.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: M.border,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryBtn: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: M.bone,
    paddingHorizontal: 10,
    borderRadius: radii.control,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: M.void,
  },
  secondaryBtn: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.borderActive,
    paddingHorizontal: 10,
    borderRadius: radii.control,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: M.bone,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  helperText: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.borderActive,
    borderRadius: radii.control,
    marginBottom: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: M.bone,
    fontFamily: 'SpaceMono',
    fontSize: 14,
  },
  eyeToggleBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: withAlpha(M.borderActive, 0.7),
  },
  keyActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  applyKeyBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: M.bone,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  clearKeyBtn: {
    minHeight: 48,
    minWidth: 84,
    backgroundColor: M.surfaceElevated,
    borderWidth: 1,
    borderColor: M.borderActive,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  specKey: {
    fontSize: 14,
    color: M.ash,
  },
  specVal: {
    fontSize: 14,
    fontWeight: '600',
    color: M.bone,
    textAlign: 'right',
    flexShrink: 1,
  },
});
