import Joi from "joi";

// ============================================
// Simulate Transfer Schema
// ============================================

export const simulateTransferSchema = Joi.object({
  externalAccountId: Joi.string().uuid().required().messages({
    "string.base": "External account ID must be a string",
    "string.guid": "External account ID must be a valid UUID",
    "any.required": "External account ID is required",
  }),

  exactAmountIn: Joi.number().positive().optional().messages({
    "number.base": "Exact amount in must be a number",
    "number.positive": "Exact amount in must be positive",
  }),

  exactAmountOut: Joi.number().positive().optional().messages({
    "number.base": "Exact amount out must be a number",
    "number.positive": "Exact amount out must be positive",
  }),

  depositMemo: Joi.string().max(255).optional().messages({
    "string.max": "Deposit memo cannot exceed 255 characters",
  }),
}).or("exactAmountIn", "exactAmountOut").messages({
  "object.missing": "Either exactAmountIn or exactAmountOut is required",
});

// ============================================
// Transfer Schema
// ============================================

export const transferSchema = Joi.object({
  executionId: Joi.string().required().messages({
    "string.empty": "Execution ID cannot be empty",
    "any.required": "Execution ID is required",
  }),

  signature: Joi.string().required().messages({
    "string.empty": "Signature cannot be empty",
    "any.required": "Signature is required",
  }),
});

// ============================================
// Type Exports
// ============================================

export type SimulateTransferInput = {
  externalAccountId: string;
  exactAmountIn?: number;
  exactAmountOut?: number;
  depositMemo?: string;
};

export type TransferInput = {
  executionId: string;
  signature: string;
};
