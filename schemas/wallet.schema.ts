import Joi from "joi";

// ============================================
// Session Schemas
// ============================================

export const verifySessionSchema = Joi.object({
  otpId: Joi.string().min(1).required().messages({
    "string.empty": "OTP ID cannot be empty",
    "any.required": "OTP ID is required",
  }),

  otpCode: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.empty": "OTP code cannot be empty",
    "string.length": "OTP code must be exactly 6 digits",
    "string.pattern.base": "OTP code must contain only digits",
    "any.required": "OTP code is required",
  }),
});

// ============================================
// Wallet Schemas
// ============================================

export const createWalletSchema = Joi.object({
  walletName: Joi.string().min(1).max(100).optional().messages({
    "string.empty": "Wallet name cannot be empty",
    "string.max": "Wallet name cannot exceed 100 characters",
  }),
});

// ============================================
// Transaction Query Schemas
// ============================================

export const getTransactionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),

  offset: Joi.number().integer().min(0).optional().default(0).messages({
    "number.base": "Offset must be a number",
    "number.integer": "Offset must be an integer",
    "number.min": "Offset cannot be negative",
  }),
});

// ============================================
// Type Exports
// ============================================

export type VerifySessionInput = {
  otpId: string;
  otpCode: string;
};

export type CreateWalletInput = {
  walletName?: string;
};

export type GetTransactionsQuery = {
  limit?: number;
  offset?: number;
};
