import { Stack } from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

export default function PantryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="food/newFood"
        options={{
          headerBackButtonDisplayMode: 'default',
          headerBackTitle: 'Pantry',
          title: '',
        }}
      />
      <Stack.Screen
        name="meal/newMeal"
        options={{ headerBackTitle: 'Pantry', title: 'Create meal' }}
      />
    </Stack>
  );
}
