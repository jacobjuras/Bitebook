export enum PantrySection {
  Foods = 'foods',
  Meals = 'meals',
}

export const pantrySectionLabels: Record<PantrySection, string> = {
  [PantrySection.Foods]: 'Foods',
  [PantrySection.Meals]: 'Meals',
};
