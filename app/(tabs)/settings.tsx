import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  View,
  Text,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { apiService } from '@/services/api';
import { warframeService } from '@/services/warframe';
import { SectionBarcodeHeader } from '@/components/MarathonPrimitives';

const M = Colors.marathon;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [diag, setDiag] = useState<{
    testing: boolean;
    bungieOk: boolean;
    warframeOk: boolean;
    latencyMs: number;
  }>({
    testing: true,
    bungieOk: true,
    warframeOk: true,
    latencyMs: 0,
  });

  const [apiKeyInput, setApiKeyInput] = useState(apiService.getApiKey());
  const [savedNotice, setSavedNotice] = useState(false);
  const [cacheFlushed, setCacheFlushed] = useState(false);

  const runDiagnostics = async () => {
    setDiag((prev) => ({ ...prev, testing: true }));
    const res = await apiService.testConnection();
    setDiag({
      testing: false,
      bungieOk: res.bungieOk,
      warframeOk: res.warframeOk,
      latencyMs: res.latencyMs,
    });
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleSaveApiKey = () => {
    apiService.setApiKey(apiKeyInput);
    setSavedNotice(true);
    runDiagnostics();
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleFlushCaches = async () => {
    setCacheFlushed(true);
    await Promise.all([
      apiService.getVendorInventory('xur', true),
      warframeService.getTelemetry(true),
    ]);
    setTimeout(() => setCacheFlushed(false), 2000);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>Settings & Status</Text>
        <Text style={styles.topBarMeta}>
          {diag.testing
            ? 'Checking...'
            : diag.bungieOk && diag.warframeOk
            ? 'Online'
            : 'Snapshot'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* API STATUS */}
        <SectionBarcodeHeader
          title="API Connection Status"
          subtitle="Direct client-to-API status and response latency"
          rightText={diag.latencyMs > 0 ? `${diag.latencyMs} ms` : ''}
        />

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusTitle}>Bungie.net Platform API</Text>
              <Text style={styles.statusUrl}>
                https://www.bungie.net/Platform/Destiny2
              </Text>
            </View>
            <Text style={styles.statusValue}>
              {diag.bungieOk ? 'Online' : 'Snapshot'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusTitle}>Warframe WorldState API</Text>
              <Text style={styles.statusUrl}>
                https://api.warframestat.us/pc
              </Text>
            </View>
            <Text style={styles.statusValue}>
              {diag.warframeOk ? 'Online' : 'Snapshot'}
            </Text>
          </View>

          <View style={[styles.statusRow, { borderBottomWidth: 0 }]}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusTitle}>Embedded Destiny 2 Manifest</Text>
              <Text style={styles.statusUrl}>
                56 pre-indexed Exotic & Legendary items
              </Text>
            </View>
            <Text style={styles.statusValue}>Ready</Text>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.primaryBtn} onPress={runDiagnostics}>
              <MaterialCommunityIcons
                name="refresh"
                size={18}
                color={M.void}
              />
              <Text style={styles.primaryBtnText}>
                {diag.testing ? 'Testing...' : 'Test Connection'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={handleFlushCaches}>
              <Text style={styles.secondaryBtnText}>
                {cacheFlushed ? 'Refreshed' : 'Refresh All Data'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* BUNGIE API KEY OVERRIDE */}
        <View style={styles.sectionSpacer}>
          <SectionBarcodeHeader
            title="Bungie.net API Key"
            subtitle="X-API-Key header used for Destiny 2 requests"
          />

          <View style={styles.cardPad}>
            <Text style={styles.helperText}>
              Orbit Market connects directly to Bungie.net from your device. You
              can enter or replace your personal Bungie API key below at any
              time.
            </Text>

            <TextInput
              style={styles.input}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="Enter Bungie X-API-Key..."
              placeholderTextColor={M.ash}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable style={styles.saveKeyBtn} onPress={handleSaveApiKey}>
              <Text style={styles.saveKeyBtnText}>
                {savedNotice ? 'API Key Applied' : 'Save & Apply API Key'}
              </Text>
            </Pressable>
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
              <Text style={styles.specVal}>Autonomous Client + Offline Cache</Text>
            </View>
            <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.specKey}>Author</Text>
              <Text style={styles.specVal}>Yacine Hamadouche (yacine20005)</Text>
            </View>
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
  cardPad: {
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    borderRadius: 6,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
    gap: 12,
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: M.bone,
  },
  statusUrl: {
    fontSize: 13,
    color: M.ash,
    marginTop: 2,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: M.inkSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: M.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: M.border,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: M.bone,
    paddingVertical: 11,
    borderRadius: 4,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: M.void,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.borderActive,
    paddingVertical: 11,
    borderRadius: 4,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: M.bone,
  },
  helperText: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  input: {
    backgroundColor: M.void,
    borderWidth: 1,
    borderColor: M.borderActive,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: M.bone,
    fontFamily: 'SpaceMono',
    fontSize: 14,
    marginBottom: 12,
  },
  saveKeyBtn: {
    backgroundColor: M.bone,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveKeyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: M.void,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: M.border,
  },
  specKey: {
    fontSize: 14,
    color: M.ash,
  },
  specVal: {
    fontSize: 14,
    fontWeight: '600',
    color: M.bone,
  },
});
