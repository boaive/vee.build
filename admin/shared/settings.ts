import { z } from 'zod';

/**
 * The owner's settings. Business details are printed on quotes. CONFIRM:
 * the defaults are ours (30 days' validity; the terms are the site's own
 * `pricingNote`, word for word).
 */
export const Settings = z.object({
  business: z.object({
    name: z.string().trim().max(160),
    address: z.string().trim().max(400),
    phone: z.string().trim().max(60),
    email: z.union([z.literal(''), z.string().trim().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Enter a valid email address.')]),
    /** 15 characters, state code first. Optional. */
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), 'A GSTIN is 15 characters, like 33ABCDE1234F1Z5.'),
  }),
  quotes: z.object({
    validityDays: z.number().int().min(1, 'At least one day.').max(365, 'At most a year.'),
    terms: z.string().trim().min(1, 'Terms cannot be empty.').max(4000),
  }),
  notify: z.object({
    /** An email for every new enquiry. */
    newEnquiry: z.boolean(),
    /** An email whenever someone signs in to the panel. */
    signIn: z.boolean(),
  }),
});
export type Settings = z.infer<typeof Settings>;

export const DEFAULT_SETTINGS: Settings = {
  business: { name: 'VEE.BUILD', address: '', phone: '', email: '', gstin: '' },
  quotes: {
    validityDays: 30,
    terms: 'Indicative estimate in Indian rupees, ex-works, excluding GST. Delivery within 100 km. Confirm with VEE.BUILD.',
  },
  notify: { newEnquiry: true, signIn: true },
};

export const PasswordChange = z.object({
  current: z.string().min(1, 'Enter your current password.').max(256),
  next: z.string().min(12, 'Use at least 12 characters.').max(256),
});
export type PasswordChange = z.infer<typeof PasswordChange>;

export const SignIn = z.object({
  email: z.string().trim().max(254),
  password: z.string().max(256),
  turnstileToken: z.string().max(4096).default(''),
});
