import Joi from "joi";

export const createAddressSchema = Joi.object({
  addressLine1: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Address line 1 cannot be empty",
    "string.max": "Address line 1 cannot exceed 255 characters",
    "any.required": "Address line 1 is required",
  }),

  addressLine2: Joi.string().max(255).allow("").optional().messages({
    "string.max": "Address line 2 cannot exceed 255 characters",
  }),

  locality: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Locality cannot be empty",
    "string.max": "Locality cannot exceed 100 characters",
    "any.required": "Locality is required",
  }),

  city: Joi.string().min(1).max(100).required().messages({
    "string.empty": "City cannot be empty",
    "string.max": "City cannot exceed 100 characters",
    "any.required": "City is required",
  }),

  state: Joi.string().min(1).max(100).required().messages({
    "string.empty": "State cannot be empty",
    "string.max": "State cannot exceed 100 characters",
    "any.required": "State is required",
  }),

  country: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Country cannot be empty",
    "string.max": "Country cannot exceed 100 characters",
    "any.required": "Country is required",
  }),

  postalCode: Joi.string().min(1).max(20).required().messages({
    "string.empty": "Postal code cannot be empty",
    "string.max": "Postal code cannot exceed 20 characters",
    "any.required": "Postal code is required",
  }),

  userId: Joi.string().uuid().required().messages({
    "string.base": "User ID must be a string",
    "string.guid": "User ID must be a valid UUID",
    "any.required": "User ID is required",
  }),
});

export const updateAddressSchema = Joi.object({
  addressLine1: Joi.string().min(1).max(255).messages({
    "string.empty": "Address line 1 cannot be empty",
    "string.max": "Address line 1 cannot exceed 255 characters",
  }),

  addressLine2: Joi.string().max(255).allow("", null).messages({
    "string.max": "Address line 2 cannot exceed 255 characters",
  }),

  locality: Joi.string().min(1).max(100).messages({
    "string.empty": "Locality cannot be empty",
    "string.max": "Locality cannot exceed 100 characters",
  }),

  city: Joi.string().min(1).max(100).messages({
    "string.empty": "City cannot be empty",
    "string.max": "City cannot exceed 100 characters",
  }),

  state: Joi.string().min(1).max(100).messages({
    "string.empty": "State cannot be empty",
    "string.max": "State cannot exceed 100 characters",
  }),

  country: Joi.string().min(1).max(100).messages({
    "string.empty": "Country cannot be empty",
    "string.max": "Country cannot exceed 100 characters",
  }),

  postalCode: Joi.string().min(1).max(20).messages({
    "string.empty": "Postal code cannot be empty",
    "string.max": "Postal code cannot exceed 20 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const addressIdParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    "string.base": "Address ID must be a string",
    "string.guid": "Address ID must be a valid UUID",
    "any.required": "Address ID is required",
  }),
});

export type CreateAddressInput = {
  addressLine1: string;
  addressLine2?: string;
  locality: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  userId: string;
};

export type UpdateAddressInput = Partial<Omit<CreateAddressInput, "userId">>;

export type AddressIdParam = {
  id: string;
};
