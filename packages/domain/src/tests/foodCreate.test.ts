import { describe, expect, it } from 'vitest';

import { foodCreateInputSchema } from '../foodCreate.js';

const foodInput = {
  name: 'Oats',
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' as const },
};

function tagId(index: number): string {
  return `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

describe('foodCreateInputSchema', () => {
  it('accepts existing Tag IDs and new Tag definitions together', () => {
    const input = {
      ...foodInput,
      newTags: [{ color: '#abcdef', name: ' Fiber ' }],
      tagIds: [tagId(1)],
    };

    expect(foodCreateInputSchema.parse(input)).toEqual({
      ...foodInput,
      newTags: [{ color: '#ABCDEF', name: 'Fiber' }],
      tagIds: [tagId(1)],
    });
  });

  it('rejects more than ten combined existing and new Tags', () => {
    expect(foodCreateInputSchema.safeParse({
      ...foodInput,
      newTags: [{ name: 'eleventh' }],
      tagIds: Array.from({ length: 10 }, (_, index) => tagId(index)),
    }).success).toBe(false);
  });

  it('rejects duplicate normalized new Tag names', () => {
    expect(foodCreateInputSchema.safeParse({
      ...foodInput,
      newTags: [{ name: 'Protein' }, { name: ' protein ' }],
    }).success).toBe(false);
  });
});
