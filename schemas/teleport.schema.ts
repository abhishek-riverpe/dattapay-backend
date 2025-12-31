import Joi from "joi";

// ============================================
// Create Teleport Schema
// ============================================

export const createTeleportSchema = Joi.object({
  externalAccountId: Joi.string().uuid().required().messages({
    "string.base": "External account ID must be a string",
    "string.guid": "External account ID must be a valid UUID",
    "any.required": "External account ID is required",
  }),
});

// ============================================
// Update Teleport Schema
// ============================================

export const updateTeleportSchema = Joi.object({
  externalAccountId: Joi.string().uuid().required().messages({
    "string.base": "External account ID must be a string",
    "string.guid": "External account ID must be a valid UUID",
    "any.required": "External account ID is required",
  }),
});

// ============================================
// Type Exports
// ============================================

export type CreateTeleportInput = {
  externalAccountId: string;
};

export type UpdateTeleportInput = {
  externalAccountId: string;
};
