import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';

const M = Colors.marathon;

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.activeIndicator,
          focused && { backgroundColor: M.acid },
        ]}
      />
      <MaterialCommunityIcons name={name} size={23} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

  const handleTabPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: M.acid,
        tabBarInactiveTintColor: M.ash,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: M.void,
          borderTopWidth: 1,
          borderTopColor: M.border,
          elevation: 0,
          paddingBottom: bottomInset,
          paddingTop: 4,
          height: 58 + bottomInset,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              color={String(color)}
              focused={focused}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="xur"
        options={{
          title: 'Destiny 2',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'rhombus-split' : 'rhombus-split-outline'}
              color={String(color)}
              focused={focused}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="warframe"
        options={{
          title: 'Warframe',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="orbit"
              color={String(color)}
              focused={focused}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="tune-vertical"
              color={String(color)}
              focused={focused}
            />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
  },
  activeIndicator: {
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
});
