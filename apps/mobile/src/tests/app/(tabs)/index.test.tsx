import { render, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) =>
    createElement('Redirect', { href, testID: 'index-redirect' }),
}));

import IndexRoute from '../../../app/(tabs)/index.js';

describe('index route', () => {
  it('redirects to the explicit Calendar route', async () => {
    await render(<IndexRoute />);

    expect(screen.getByTestId('index-redirect').props.href).toBe('/calendar');
  });
});
