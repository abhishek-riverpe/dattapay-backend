import Joi from "joi";

// ============================================
// Create Teleport Schema
// ============================================

export const createTeleportSchema = Joi.object({
  externalAccountId: Joi.number().integer().positive().required().messages({
    "number.base": "External account ID must be a number",
    "number.integer": "External account ID must be an integer",
    "number.positive": "External account ID must be a positive number",
    "any.required": "External account ID is required",
  }),
});

// ============================================
// Update Teleport Schema
// ============================================

export const updateTeleportSchema = Joi.object({
  externalAccountId: Joi.number().integer().positive().required().messages({
    "number.base": "External account ID must be a number",
    "number.integer": "External account ID must be an integer",
    "number.positive": "External account ID must be a positive number",
    "any.required": "External account ID is required",
  }),
});

// ============================================
// Type Exports
// ============================================

export type CreateTeleportInput = {
  externalAccountId: number;
};

export type UpdateTeleportInput = {
  externalAccountId: number;
};
