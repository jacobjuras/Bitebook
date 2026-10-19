import colorValues from './colorValues.json';

export type ThemeColors = {
  accent: string;
  accentSubtle: string;
  background: string;
  control: string;
  controlSelected: string;
  onAccent: string;
  textPrimary: string;
  textSecondary: string;
};

export const brandColors = colorValues.brand;

export const themeColors = {
  light: {
    ...colorValues.themes.light,
    accent: brandColors.accent,
    accentSubtle: brandColors.accentSubtle,
    onAccent: brandColors.onAccent,
  },
  dark: {
    ...colorValues.themes.dark,
    accent: brandColors.accent,
    accentSubtle: brandColors.accentSubtle,
    onAccent: brandColors.onAccent,
  },
} satisfies Record<'dark' | 'light', ThemeColors>;
