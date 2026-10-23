import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { createFood } from '../../../../api/foods';
import { tagsQueryOptions } from '../../../../query/pantryQueries';
import { ContentStateView, FoodForm } from '~/components';
import { ContentStateKind } from '~/constants';
import type { FoodFormValues } from '~/models';

export default function NewFoodScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const tagsQuery = useQuery(tagsQueryOptions);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(food: FoodFormValues) {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await createFood(food);
      if (food.newTags && food.newTags.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ['tags'] });
      }
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      router.back();
    } catch {
      setError('Unable to save this Food. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tagsQuery.isPending) {
    return (
      <ContentStateView
        state={{ kind: ContentStateKind.Loading }}
        testIDPrefix="new-food-tags"
      />
    );
  }
  if (tagsQuery.isError) {
    return (
      <ContentStateView
        state={{
          kind: ContentStateKind.Error,
          message: 'Unable to load Tags.',
          onRetry: () => void tagsQuery.refetch(),
        }}
        testIDPrefix="new-food-tags"
      />
    );
  }

  return (
    <FoodForm
      availableTags={tagsQuery.data}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    />
  );
}
