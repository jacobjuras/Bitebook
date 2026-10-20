import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '../auth/AuthProvider';

function AuthenticatedRoutes() {
  const { status } = useAuth();
  const isSignedIn = status === 'signed-in';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
