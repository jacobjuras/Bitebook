import * as z from 'zod';

const timeZoneSchema = z.string().refine((timeZone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}, 'Time zone must be a valid IANA identifier');

export const userProfileSchema = z.strictObject({
  userId: z.string().min(1),
  displayName: z.string().trim().min(1).max(100).optional(),
  timeZone: timeZoneSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
