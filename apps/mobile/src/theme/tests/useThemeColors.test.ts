import { renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useColorScheme: vi.fn(),
}));

vi.mock('react-native', () => ({
  useColorScheme: mocks.useColorScheme,
}));

import { themeColors } from '../colors.js';
import { useThemeColors } from '../useThemeColors.js';

beforeEach(() => vi.clearAllMocks());

describe('useThemeColors', () => {
  it('returns dark colors for the dark device scheme', async () => {
    mocks.useColorScheme.mockReturnValue('dark');

    const { result } = await renderHook(() => useThemeColors());

    expect(result.current).toBe(themeColors.dark);
  });

  it.each(['light', null])(
    'returns light colors for the %s device scheme',
    async (scheme) => {
      mocks.useColorScheme.mockReturnValue(scheme);

      const { result } = await renderHook(() => useThemeColors());

      expect(result.current).toBe(themeColors.light);
    },
  );
});
