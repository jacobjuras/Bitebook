import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { createFood } from '../../../../api/foods';
import { FoodForm } from '~/components';
import type { FoodFormValues } from '~/models';

export default function NewFoodScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(food: FoodFormValues) {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await createFood(food);
      await queryClient.invalidateQueries({ queryKey: ['foods'] });
      router.back();
    } catch {
      setError('Unable to save this Food. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FoodForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    />
  );
}
