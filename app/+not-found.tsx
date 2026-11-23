import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors, { radii } from '@/constants/Colors';

const M = Colors.marathon;

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name="compass-off-outline"
            size={28}
            color={M.ash}
          />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Screen Not Found
        </Text>
        <Text style={styles.subtitle}>
          This route does not exist in Orbit Market. Return to the live
          overview to check vendors and world cycles.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.linkBtn,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          accessibilityLabel="Return to Overview"
        >
          <Text style={styles.linkText}>Back to Overview</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={18}
            color={M.void}
          />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: M.void,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radii.card,
    backgroundColor: M.surface,
    borderWidth: 1,
    borderColor: M.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: M.bone,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: M.inkSecondary,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 8,
  },
  linkBtn: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radii.control,
    backgroundColor: M.acid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: M.void,
  },
});
