import { queryOptions } from '@tanstack/react-query';

import { listFoods } from '../api/foods';
import { listMeals } from '../api/meals';
import { listTags } from '../api/tags';

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

export const tagsQueryOptions = queryOptions({
  queryFn: listTags,
  queryKey: ['tags'],
  staleTime: Infinity,
});
