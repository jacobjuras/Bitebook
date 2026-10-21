import { queryOptions } from '@tanstack/react-query';

import { listFoods } from '../api/foods';
import { listMeals } from '../api/meals';

export const foodsQueryOptions = queryOptions({
  queryFn: listFoods,
  queryKey: ['foods'],
  staleTime: Infinity,
});

export const mealsQueryOptions = queryOptions({
  queryFn: listMeals,
  queryKey: ['meals'],
  staleTime: Infinity,
});
