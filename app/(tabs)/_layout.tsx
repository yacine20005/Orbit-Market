import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import Colors from '@/constants/Colors';

const M = Colors.marathon;

function TabIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return (
    <MaterialCommunityIcons size={24} style={{ marginBottom: -2 }} {...props} />
  );
}

export default function TabLayout() {
  const handleTabPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: M.bone,
        tabBarInactiveTintColor: M.ash,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: M.void,
          borderTopWidth: 1,
          borderTopColor: M.border,
          elevation: 0,
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color }) => (
            <TabIcon name="view-dashboard-outline" color={String(color)} />
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
          tabBarIcon: ({ color }) => (
            <TabIcon name="rhombus-split" color={String(color)} />
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
          tabBarIcon: ({ color }) => (
            <TabIcon name="orbit" color={String(color)} />
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
          tabBarIcon: ({ color }) => (
            <TabIcon name="tune-vertical" color={String(color)} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}
