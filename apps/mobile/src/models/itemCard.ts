import type { ReactNode } from 'react';

export type ItemCardModel = {
  accessory?: (itemTestIDPrefix: string) => ReactNode;
  chips?: readonly {
    id: string;
    label: string;
  }[];
  details: readonly {
    id: string;
    text: string;
  }[];
  id: string;
  title: string;
};
