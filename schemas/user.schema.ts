import Joi from "joi";

export const createUserSchema = Joi.object({
  clerkUserId: Joi.string().min(1).required().messages({
    "string.empty": "Clerk user ID cannot be empty",
    "any.required": "Clerk user ID is required",
  }),

  firstName: Joi.string().min(1).max(100).required().messages({
    "string.empty": "First name cannot be empty",
    "string.max": "First name cannot exceed 100 characters",
    "any.required": "First name is required",
  }),

  lastName: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Last name cannot be empty",
    "string.max": "Last name cannot exceed 100 characters",
    "any.required": "Last name is required",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email cannot be empty",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  phoneNumberPrefix: Joi.string().min(1).max(5).required().messages({
    "string.empty": "Phone number prefix cannot be empty",
    "string.max": "Phone number prefix cannot exceed 5 characters",
    "any.required": "Phone number prefix is required",
  }),

  phoneNumber: Joi.string().min(1).max(20).required().messages({
    "string.empty": "Phone number cannot be empty",
    "string.max": "Phone number cannot exceed 20 characters",
    "any.required": "Phone number is required",
  }),

  nationality: Joi.string().min(1).max(100).required().messages({
    "string.empty": "Nationality cannot be empty",
    "string.max": "Nationality cannot exceed 100 characters",
    "any.required": "Nationality is required",
  }),

  dateOfBirth: Joi.date().iso().required().messages({
    "date.base": "Please provide a valid date",
    "date.format": "Date must be in ISO format",
    "any.required": "Date of birth is required",
  }),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).messages({
    "string.empty": "First name cannot be empty",
    "string.max": "First name cannot exceed 100 characters",
  }),

  lastName: Joi.string().min(1).max(100).messages({
    "string.empty": "Last name cannot be empty",
    "string.max": "Last name cannot exceed 100 characters",
  }),

  email: Joi.string().email().messages({
    "string.empty": "Email cannot be empty",
    "string.email": "Please provide a valid email address",
  }),

  phoneNumberPrefix: Joi.string().min(1).max(5).messages({
    "string.empty": "Phone number prefix cannot be empty",
    "string.max": "Phone number prefix cannot exceed 5 characters",
  }),

  phoneNumber: Joi.string().min(1).max(20).messages({
    "string.empty": "Phone number cannot be empty",
    "string.max": "Phone number cannot exceed 20 characters",
  }),

  zynkEntityId: Joi.string().min(30).max(50).messages({
    "string.empty": "Zynk entity id cannot be empty",
    "string.min": "Zynk entity id must be at least 30 characters",
    "string.max": "Zynk entity id cannot exceed 100 characters",
  }),

  nationality: Joi.string().min(1).max(100).messages({
    "string.empty": "Nationality cannot be empty",
    "string.max": "Nationality cannot exceed 100 characters",
  }),

  dateOfBirth: Joi.date().iso().messages({
    "date.base": "Please provide a valid date",
    "date.format": "Date must be in ISO format",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field is required to update",
  });

export const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a number",
    "number.integer": "User ID must be an integer",
    "number.positive": "User ID must be a positive number",
    "any.required": "User ID is required",
  }),
});

export type CreateUserInput = {
  clerkUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumberPrefix: string;
  phoneNumber: string;
  nationality: string;
  dateOfBirth: Date;
};

export type UpdateUserInput = Partial<CreateUserInput> & {
  zynkEntityId?: string;
  accountStatus?: string;
};

export type UserIdParam = {
  id: number;
};
