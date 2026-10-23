export type TagInputChipModel = {
  isInvalid: boolean;
  onBlur: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
  value: string;
};
