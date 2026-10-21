import { describe, expect, it } from 'vitest';

import colorValues from '../colorValues.json';
import { brandColors, themeColors } from '../colors.js';

describe('theme colors', () => {
  it('uses the shared brand palette in both visual themes', () => {
    expect(brandColors).toBe(colorValues.brand);
    expect(themeColors.light).toMatchObject({
      accent: brandColors.accent,
      accentSubtle: brandColors.accentSubtle,
      onAccent: brandColors.onAccent,
    });
    expect(themeColors.dark).toMatchObject({
      accent: brandColors.accent,
      accentSubtle: brandColors.accentSubtle,
      onAccent: brandColors.onAccent,
    });
  });

  it('keeps light and dark surface colors distinct', () => {
    expect(themeColors.light.background).toBe(colorValues.themes.light.background);
    expect(themeColors.dark.background).toBe(colorValues.themes.dark.background);
    expect(themeColors.light.background).not.toBe(themeColors.dark.background);
    expect(themeColors.light.textPrimary).not.toBe(themeColors.dark.textPrimary);
  });
});
