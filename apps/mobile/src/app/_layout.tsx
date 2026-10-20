import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuthStatus } from '../auth/AuthStatus';

function AuthenticatedRoutes() {
  const { status } = useAuth();
  const isSignedIn = status === AuthStatus.SignedIn;

  // Authenticated route stack
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Signed-out routes */}
      <Stack.Protected guard={!isSignedIn}>
        {/* Sign-in route */}
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      {/* Signed-in routes */}
      <Stack.Protected guard={isSignedIn}>
        {/* Tabbed application route */}
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Root application layout
  return (
    <AuthProvider>
      {/* Guarded application routes */}
      <AuthenticatedRoutes />
      {/* System status bar */}
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
