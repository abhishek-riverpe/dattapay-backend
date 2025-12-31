import Joi from "joi";

// ============================================
// Create External Account Schema
// ============================================

export const createExternalAccountSchema = Joi.object({
  walletAddress: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Wallet address cannot be empty",
    "string.max": "Wallet address cannot exceed 255 characters",
    "any.required": "Wallet address is required",
  }),

  label: Joi.string().min(1).max(100).optional().messages({
    "string.empty": "Label cannot be empty",
    "string.max": "Label cannot exceed 100 characters",
  }),

  type: Joi.string().optional().messages({
    "string.empty": "Type cannot be empty",
  }),

  walletId: Joi.string().optional().messages({
    "string.empty": "Wallet ID cannot be empty",
  }),
});

// ============================================
// ID Parameter Schema
// ============================================

export const externalAccountIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "ID must be a number",
    "number.integer": "ID must be an integer",
    "number.positive": "ID must be a positive number",
    "any.required": "ID is required",
  }),
});

// ============================================
// Type Exports
// ============================================

export type CreateExternalAccountInput = {
  walletAddress: string;
  label?: string;
  type?: string;
  walletId?: string;
};

export type ExternalAccountIdParam = {
  id: number;
};
