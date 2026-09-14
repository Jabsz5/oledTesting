import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#e8d8d0',
        tabBarStyle: {
          backgroundColor: '#a76a50',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="house.fill"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="userControls"
        options={{
          title: 'User Controls',
          tabBarIcon: ({ color }) => (
            <FontAwesome
              name="gear"
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="drawing"
        options={{
          title: 'Draw!',
          tabBarIcon: ({ color }) => (
            <FontAwesome
              name="paint-brush"
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}