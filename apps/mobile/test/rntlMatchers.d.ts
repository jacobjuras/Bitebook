import 'vitest';

declare module 'vitest' {
  interface Assertion<R, T> {
    toHaveTextContent(
      expectedText: string | RegExp,
      options?: {
        exact?: boolean;
        normalizer?: (text: string) => string;
      },
    ): R;
  }
}
