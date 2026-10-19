import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { brandColors } from '../../theme/colors';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : brandColors.accent} name="calendar-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : brandColors.accent} name="cart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="eat"
        options={{
          title: 'Eat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : brandColors.accent} name="add-circle-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : brandColors.accent} name="bar-chart-outline" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => (
            <Ionicons color={typeof color === 'string' ? color : brandColors.accent} name="person-outline" size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
