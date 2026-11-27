import { z } from "zod";

export const skuSchema = z
  .string()
  .min(1, "SKU is required.")
  .max(64, "SKU must be at most 64 characters.")
  .refine(
    (val) => /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(val),
    { message: "SKU must be uppercase alphanumeric segments separated by hyphens." },
  );

export const priceSchema = z
  .number()
  .int("Price must be in whole paise.")
  .nonnegative("Price cannot be negative.");

export const inrAmountSchema = z
  .number()
  .nonnegative("Amount cannot be negative.")
  .finite()
  .transform((val) => Math.round(val * 100) / 100);

export const emailSchema = z.string().email("Invalid email address.");
export const phoneSchema = z.string().min(10).max(15, "Invalid phone number.");
