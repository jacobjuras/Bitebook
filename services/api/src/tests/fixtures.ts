import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

export const documentClientMock = mockClient(DynamoDBDocumentClient);

export const tagId = 'a62cb6cb-b601-45e9-a6e8-99b05fdbf71d';
export const validFoodInput = {
  name: 'Oats',
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' as const },
  tagIds: [tagId],
};

export const storedFood = {
  ...validFoodInput,
  createdAt: '2026-10-19T03:00:00.000Z',
  id: 'd52ee286-4771-4f70-ab5a-34a1dc071025',
  updatedAt: '2026-10-19T03:00:00.000Z',
  userId: 'user-123',
};

export const mealInput = {
  ingredients: [
    { foodId: storedFood.id, quantity: { amount: 80, unit: 'g' as const } },
    {
      foodId: 'e240e5a3-e4cd-4df0-9d6e-0c5d1856f780',
      quantity: { amount: 1, unit: 'item' as const },
    },
  ],
  name: 'Breakfast',
  tagIds: [tagId],
};

export const storedMeal = {
  ...mealInput,
  createdAt: '2026-10-19T05:00:00.000Z',
  id: '1d78fb29-f8ce-47a3-9ab4-38e0dc705832',
  updatedAt: '2026-10-19T05:00:00.000Z',
  userId: 'user-123',
};

export const storedTag = {
  color: '#1A2B3C',
  createdAt: '2026-10-19T05:30:00.000Z',
  id: tagId,
  name: 'protein',
  normalizedName: 'protein',
  updatedAt: '2026-10-19T05:30:00.000Z',
  userId: 'user-123',
};

export const storedProfile = {
  createdAt: '2026-10-19T06:00:00.000Z',
  displayName: 'Jacob',
  timeZone: 'America/Los_Angeles',
  updatedAt: '2026-10-19T06:00:00.000Z',
  userId: 'user-123',
};

export function resetDocumentClientMock(): void {
  documentClientMock.reset();
  documentClientMock.on(DeleteCommand).resolves({});
  documentClientMock.on(GetCommand).resolves({});
  documentClientMock.on(PutCommand).resolves({});
  documentClientMock.on(QueryCommand).resolves({ Items: [] });
  documentClientMock.on(TransactWriteCommand).resolves({});
  documentClientMock.on(UpdateCommand).resolves({});
}
