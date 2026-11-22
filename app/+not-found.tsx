import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import Colors from '@/constants/Colors';

const M = Colors.marathon;

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'ERR // 404' }} />
      <View style={styles.container}>
        <View style={styles.codePill}>
          <Text style={styles.codeText}>ERR // 404 SECTOR MISSING</Text>
        </View>
        <Text style={styles.title}>TELEMETRY NODE NOT FOUND</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>[RETURN TO ORBITAL HUB]</Text>
        </Link>
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
  codePill: {
    backgroundColor: M.vermilion,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    fontWeight: '700',
    color: M.void,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: M.bone,
    letterSpacing: 1,
  },
  link: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: M.acid,
  },
  linkText: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    fontWeight: '700',
    color: M.acid,
  },
});
