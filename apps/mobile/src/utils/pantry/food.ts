import type { Food } from '@bitebook/domain';
import { createElement } from 'react';

import { FavoriteIndicator } from '../../components/FavoriteIndicator/FavoriteIndicator';
import type { ItemCardModel } from '../../models/itemCard';
import type { SortableItem } from '../../models/searchFilterSort';

function renderFavoriteIndicator(testIDPrefix: string) {
  return createElement(FavoriteIndicator, { testIDPrefix });
}

export function getFoodCardItem(food: Food): ItemCardModel {
  const summary = [`${food.nutritionFacts.caloriesKcal} kcal`];
  if (food.nutritionFacts.proteinG !== undefined) {
    summary.push(`${food.nutritionFacts.proteinG} g protein`);
  }

  return {
    accessory: food.isFavorite === true ? renderFavoriteIndicator : undefined,
    chips: food.tags?.map((tag) => ({ id: tag, label: tag })),
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
