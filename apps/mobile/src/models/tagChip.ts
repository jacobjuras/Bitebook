import type { TagChipVariant } from '~/constants';

export type TagChipModel = {
  accessibilityLabel: string;
  id: string;
  label: string;
  onPress: () => void;
  testIDPrefix: string;
  variant: TagChipVariant;
};
