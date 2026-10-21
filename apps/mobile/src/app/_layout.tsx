import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { AuthStatus } from '../auth/AuthStatus';
import { foodsQueryOptions, mealsQueryOptions } from '../query/pantryQueries';
import { queryClient } from '../query/queryClient';

function AuthenticatedRoutes() {
  const { status } = useAuth();
  const isSignedIn = status === AuthStatus.SignedIn;

  useEffect(() => {
    if (status === AuthStatus.SignedIn) {
      void queryClient.query(foodsQueryOptions).catch(() => undefined);
      void queryClient.query(mealsQueryOptions).catch(() => undefined);
      return;
    }
    if (status === AuthStatus.SignedOut) queryClient.clear();
  }, [status]);

  // Authenticated route stack
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Signed-out routes */}
      <Stack.Protected guard={!isSignedIn}>
        {/* Sign-in route */}
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>
      {/* Signed-in routes */}
      <Stack.Protected guard={isSignedIn}>
        {/* Tabbed application route */}
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Root application layout
  return (
    <QueryClientProvider client={queryClient}>
      {/* Authentication provider */}
      <AuthProvider>
        {/* Guarded application routes */}
        <AuthenticatedRoutes />
        {/* System status bar */}
        <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
