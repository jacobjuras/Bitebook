import { createElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('expo-router', () => {
  const Tabs = Object.assign(
    ({ children, ...props }: { children: ReactNode }) =>
      createElement('Tabs', { ...props, testID: 'tab-layout' }, children),
    {
      Screen: ({ name, ...props }: { name: string }) =>
        createElement('Tabs.Screen', {
          ...props,
          name,
          testID: `tab-screen-${name}`,
        }),
    },
  );
  return { Tabs };
});
vi.mock('../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    background: 'background',
    border: 'border',
    textSecondary: 'text-secondary',
  }),
}));

import TabLayout from '../../../app/(tabs)/_layout.js';

const tabs = [
  ['index', 'Calendar', 'calendar-outline'],
  ['pantry', 'Pantry', 'cart-outline'],
  ['eat', 'Eat', 'add-circle-outline'],
  ['reports', 'Reports', 'bar-chart-outline'],
  ['me', 'Me', 'person-outline'],
] as const;

describe('tab layout', () => {
  it('configures every tab and both icon-color branches', async () => {
    await render(<TabLayout />);

    for (const [name, title, iconName] of tabs) {
      const options = screen.getByTestId(`tab-screen-${name}`).props.options;
      expect(options.title).toBe(title);
      expect(options.tabBarIcon({ color: 'selected', size: 24 }).props).toMatchObject({
        color: 'selected',
        name: iconName,
        size: 24,
      });
      expect(options.tabBarIcon({ color: 1, size: 20 }).props).toMatchObject({
        color: 'accent',
        name: iconName,
        size: 20,
      });
    }
  });

  it('configures the themed tab scene and background', async () => {
    await render(<TabLayout />);
    const { screenOptions } = screen.getByTestId('tab-layout').props;

    expect(screenOptions).toMatchObject({
      headerShown: false,
      sceneStyle: { backgroundColor: 'background' },
      tabBarActiveTintColor: 'accent',
      tabBarInactiveTintColor: 'text-secondary',
      tabBarStyle: {
        backgroundColor: 'background',
        borderTopColor: 'border',
      },
    });
    expect(screenOptions.tabBarBackground().props.style).toEqual([
      expect.anything(),
      { backgroundColor: 'background' },
    ]);
  });
});
