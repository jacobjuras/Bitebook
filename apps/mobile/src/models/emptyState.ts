import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type EmptyState = {
  action: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
};
