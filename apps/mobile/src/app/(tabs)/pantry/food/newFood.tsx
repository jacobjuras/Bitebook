import { normalizeTagName } from '@bitebook/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { createFood } from '../../../../api/foods';
import { tagsQueryOptions } from '../../../../query/pantryQueries';
import { FoodForm } from '~/components';
import type { FoodFormValues } from '~/models';

export default function NewFoodScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit({ tagNames, ...food }: FoodFormValues) {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const tagIds: string[] = [];
      const newTags: { name: string }[] = [];

      if (tagNames && tagNames.length > 0) {
        const existingTags = await queryClient.ensureQueryData(tagsQueryOptions);
        const tagsByName = new Map(
          existingTags.map((tag) => [tag.normalizedName, tag]),
        );
        for (const name of tagNames) {
          const tag = tagsByName.get(normalizeTagName(name));
          if (tag) {
            tagIds.push(tag.id);
          } else {
            newTags.push({ name });
          }
        }
      }

      await createFood({
        ...food,
        ...(newTags.length > 0 ? { newTags } : {}),
        ...(tagIds.length > 0 ? { tagIds } : {}),
      });
      if (newTags.length > 0) {
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

  return (
    <FoodForm
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    />
  );
}
