import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import {
  calculateStockAfterChange,
  foodSchema,
  manualStockChangeSchema,
  stockTransactionIdSchema,
  stockTransactionSchema,
  type Food,
  type StockTransaction,
} from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { getFood } from './foodReads.js';
import { jsonResponse } from './http.js';

const stockAdjustmentInputSchema = manualStockChangeSchema.extend({ idempotencyKey: stockTransactionIdSchema });

/** Atomically updates Food stock and records the user-requested change. */
export async function adjustFoodStock(
  tableName: string,
  userId: string,
  foodId: string | undefined,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = foodSchema.shape.id.safeParse(foodId);
  if (!id.success) return jsonResponse(400, { message: 'Invalid Food ID' });

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid stock adjustment' });
  }

  const input = stockAdjustmentInputSchema.safeParse(requestBody);
  if (!input.success) return jsonResponse(400, { message: 'Invalid stock adjustment' });

  const food = await getFood(tableName, userId, id.data, true);
  if (!food) return jsonResponse(404, { message: 'Food not found' });

  let currentStock: Food['currentStock'];
  try {
    currentStock = calculateStockAfterChange(
      food.currentStock,
      input.data.direction,
      input.data.quantity,
    );
  } catch (error) {
    if (error instanceof RangeError) {
      return jsonResponse(400, { message: 'Invalid stock adjustment' });
    }
    throw error;
  }

  const timestamp = new Date().toISOString();
  const stockTransaction: StockTransaction = stockTransactionSchema.parse({
    createdAt: timestamp,
    direction: input.data.direction,
    foodId: food.id,
    id: input.data.idempotencyKey,
    quantity: input.data.quantity,
    reason: input.data.reason,
    userId,
  });
  const updatedFood = foodSchema.parse({
    ...food,
    currentStock,
    updatedAt: timestamp,
  });

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              ConditionExpression: 'currentStock = :expectedStock',
              ExpressionAttributeValues: {
                ':expectedStock': food.currentStock,
                ':newStock': currentStock,
                ':updatedAt': timestamp,
              },
              Key: { entityKey: `FOOD#${food.id}`, userId },
              TableName: tableName,
              UpdateExpression:
                'SET currentStock = :newStock, updatedAt = :updatedAt',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                ...stockTransaction,
                entityKey: `STOCK_TRANSACTION#${stockTransaction.id}`,
              },
              TableName: tableName,
            },
          },
        ],
      }),
    );
  } catch (error) {
    const conditionFailed =
      error instanceof TransactionCanceledException &&
      error.CancellationReasons?.some(({ Code }) => Code === 'ConditionalCheckFailed');
    if (conditionFailed) {
      return jsonResponse(409, { message: 'Stock changed; try again' });
    }
    throw error;
  }

  return jsonResponse(200, { food: updatedFood, stockTransaction });
}
