import { z } from "zod"
import { normalizePhoneNumber } from "@/lib/whatsapp"

const invalidPhoneMessage = "Informe um WhatsApp válido com país e número."

export const requiredWhatsAppSchema = z
  .string()
  .trim()
  .min(1, "WhatsApp é obrigatório.")
  .refine((value) => Boolean(normalizePhoneNumber(value)), invalidPhoneMessage)
  .transform((value) => normalizePhoneNumber(value)!)

export const optionalWhatsAppSchema = z
  .string()
  .trim()
  .refine((value) => !value || Boolean(normalizePhoneNumber(value)), invalidPhoneMessage)
  .transform((value) => (value ? normalizePhoneNumber(value)! : ""))
  .optional()
