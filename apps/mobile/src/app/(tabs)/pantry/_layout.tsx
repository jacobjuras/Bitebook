import { Stack } from 'expo-router';

export default function PantryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="food/new"
        options={{ headerBackTitle: 'Pantry', title: 'Add food' }}
      />
      <Stack.Screen
        name="meal/new"
        options={{ headerBackTitle: 'Pantry', title: 'Create meal' }}
      />
    </Stack>
  );
}
