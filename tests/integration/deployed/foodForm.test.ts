import {
  foodSchema,
  tagSchema,
  type FoodCreateInput,
  type NutritionFacts,
  type Tag,
} from '@bitebook/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createDeployedTestContext,
  type DeployedTestContext,
} from './testContext.js';

let context: DeployedTestContext;

type CompleteFoodCreateInput = {
  [Field in keyof FoodCreateInput]-?: Exclude<FoodCreateInput[Field], undefined>;
};
type CompleteTagCreateInput = Required<Pick<Tag, 'color' | 'name'>>;

function getProperty(body: unknown, property: string): unknown {
  if (!body || typeof body !== 'object' || !(property in body)) {
    throw new Error(`Bitebook API response has no ${property}`);
  }
  return body[property as keyof typeof body];
}

const completeNutritionFacts = {
  addedSugarG: 2,
  caloriesKcal: 420,
  carbohydratesG: 35,
  cholesterolMg: 65,
  fatG: 18,
  fiberG: 7,
  micronutrients: {
    calcium: { amount: 120, unit: 'mg' as const },
    iron: { amount: 3, unit: 'mg' as const },
    potassium: { amount: 640, unit: 'mg' as const },
    sodium: { amount: 380, unit: 'mg' as const },
  },
  proteinG: 28,
  saturatedFatG: 6,
  sugarG: 8,
  transFatG: 0,
} satisfies NutritionFacts;

function foodInput(
  name: string,
  tags: Pick<CompleteFoodCreateInput, 'newTags' | 'tagIds'>,
): CompleteFoodCreateInput {
  return {
    isFavorite: true,
    name,
    nutritionFacts: completeNutritionFacts,
    servingSize: { amount: 250, unit: 'g' },
    ...tags,
  };
}

beforeAll(async () => {
  context = await createDeployedTestContext();
}, 30_000);

afterAll(async () => {
  await context?.cleanup();
}, 30_000);

describe('FoodForm deployed API contract', () => {
  it('creates and lists a standalone Tag', async () => {
    const name = `integ-${context.runId}-tag`;
    const input = {
      color: '#abcdef',
      name,
    } satisfies CompleteTagCreateInput;
    const created = await context.request('tags', 'POST', input);

    expect(created.response.status).toBe(201);
    const tag = tagSchema.parse(created.body);
    expect(tag).toMatchObject({
      ...input,
      color: '#ABCDEF',
      normalizedName: name,
      userId: context.userId,
    });

    const listed = await context.request('tags');
    expect(listed.response.status).toBe(200);
    const tags = tagSchema.array().parse(getProperty(listed.body, 'tags'));
    expect(tags).toContainEqual(tag);
  });

  it('creates and lists every Food field with existing and new Tags', async () => {
    const existingTagInput = {
      color: '#123abc',
      name: `integ-${context.runId}-existing`,
    } satisfies CompleteTagCreateInput;
    const existingTagResponse = await context.request(
      'tags',
      'POST',
      existingTagInput,
    );
    expect(existingTagResponse.response.status).toBe(201);
    const existingTag = tagSchema.parse(existingTagResponse.body);
    const newTagInput = {
      color: '#fedcba',
      name: `integ-${context.runId}-new`,
    } satisfies CompleteTagCreateInput;
    const name = `Integration Food ${context.runId}`;
    const input = foodInput(name, {
      newTags: [newTagInput],
      tagIds: [existingTag.id],
    });
    const created = await context.request('foods', 'POST', input);

    expect(created.response.status).toBe(201);
    const food = foodSchema.parse(created.body);
    expect(food).toMatchObject({
      isFavorite: input.isFavorite,
      name,
      nutritionFacts: completeNutritionFacts,
      servingSize: input.servingSize,
      userId: context.userId,
    });
    expect(food.tagIds).toContain(existingTag.id);
    expect(food.tagIds).toHaveLength(2);

    const foodsResponse = await context.request('foods');
    const tagsResponse = await context.request('tags');
    expect(foodsResponse.response.status).toBe(200);
    expect(tagsResponse.response.status).toBe(200);
    const foods = foodSchema.array().parse(getProperty(foodsResponse.body, 'foods'));
    const tags = tagSchema.array().parse(getProperty(tagsResponse.body, 'tags'));
    expect(foods).toContainEqual(food);
    expect(tags).toEqual(expect.arrayContaining([
      expect.objectContaining({
        color: '#FEDCBA',
        id: expect.any(String),
        name: newTagInput.name,
        normalizedName: newTagInput.name,
        userId: context.userId,
      }),
    ]));
    const newTag = tags.find(({ name: tagName }) => tagName === newTagInput.name);
    expect(food.tagIds).toContain(newTag?.id);
  });

  it('writes neither Food nor a second Tag when a name reservation conflicts', async () => {
    const tagName = `integ-${context.runId}-collision`;
    const existingTagInput = {
      color: '#456def',
      name: tagName,
    } satisfies CompleteTagCreateInput;
    const tagResponse = await context.request(
      'tags',
      'POST',
      existingTagInput,
    );
    expect(tagResponse.response.status).toBe(201);
    const existingTag = tagSchema.parse(tagResponse.body);

    const foodName = `Atomic failure ${context.runId}`;
    const conflictingTagInput = {
      color: '#fedcba',
      name: tagName,
    } satisfies CompleteTagCreateInput;
    const failed = await context.request(
      'foods',
      'POST',
      foodInput(foodName, {
        newTags: [conflictingTagInput],
        tagIds: [existingTag.id],
      }),
    );
    expect(failed.response.status).toBe(409);
    expect(failed.body).toEqual({ message: 'A Tag with this name already exists' });

    const foodsResponse = await context.request('foods');
    const tagsResponse = await context.request('tags');
    expect(foodsResponse.response.status).toBe(200);
    expect(tagsResponse.response.status).toBe(200);
    const foods = foodSchema.array().parse(getProperty(foodsResponse.body, 'foods'));
    const tags = tagSchema.array().parse(getProperty(tagsResponse.body, 'tags'));
    expect(foods.some(({ name }) => name === foodName)).toBe(false);
    expect(tags.filter(({ normalizedName }) => normalizedName === tagName))
      .toEqual([existingTag]);
  });
});
