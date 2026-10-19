import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '../../theme/useThemeColors';

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarBackground: () => (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.background },
            ]}
          />
        ),
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : colors.accent} name="calendar-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : colors.accent} name="cart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="eat"
        options={{
          title: 'Eat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : colors.accent} name="add-circle-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : colors.accent} name="bar-chart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : colors.accent} name="person-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
