import type { Food, Tag } from '@bitebook/domain';

import type { ItemCardModel, SortableItem } from '~/models';

import { getItemCardOrganization } from './itemCard';

export function getFoodCardItem(
  food: Food,
  tagsById: ReadonlyMap<string, Tag>,
): ItemCardModel {
  const summary = [`${food.nutritionFacts.caloriesKcal} kcal`];
  if (food.nutritionFacts.proteinG !== undefined) {
    summary.push(`${food.nutritionFacts.proteinG} g protein`);
  }

  return {
    ...getItemCardOrganization(food, tagsById),
    details: [{ id: 'summary', text: summary.join(' · ') }],
    id: food.id,
    title: food.name,
  };
}

export function getSortableFood(food: Food): SortableItem {
  return {
    caloriesKcal: food.nutritionFacts.caloriesKcal,
    name: food.name,
    recentAt: food.lastLoggedAt ?? food.createdAt,
  };
}
