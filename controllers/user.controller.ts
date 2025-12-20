import type { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import APIResponse from "../lib/APIResponse";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../schemas/user.schema";
import Error from "../lib/Error";

class UserController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAll();
      res.status(200).json(new APIResponse(true, "Users retrieved successfully", users));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const user = await userService.getById(value.id);
      res.status(200).json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async getByEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.params.email;
      if (!email) {
        throw new Error(400, "Email is required");
      }

      const user = await userService.getByEmail(email);
      res.status(200).json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async getByClerkUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkUserId = req.params.clerkUserId;
      if (!clerkUserId) {
        throw new Error(400, "Clerk user ID is required");
      }

      const user = await userService.getByClerkUserId(clerkUserId);
      res.status(200).json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createUserSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      const user = await userService.create(value);
      res.status(201).json(new APIResponse(true, "User created successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { error: paramError, value: paramValue } = userIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (paramError) {
        throw new Error(400, paramError.details.map((d) => d.message).join(", "));
      }

      const { error: bodyError, value: bodyValue } = updateUserSchema.validate(
        req.body,
        { abortEarly: false }
      );

      if (bodyError) {
        throw new Error(400, bodyError.details.map((d) => d.message).join(", "));
      }

      const user = await userService.update(paramValue.id, bodyValue);
      res.status(200).json(new APIResponse(true, "User updated successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = userIdParamSchema.validate(
        { id: Number(req.params.id) },
        { abortEarly: false }
      );

      if (error) {
        throw new Error(400, error.details.map((d) => d.message).join(", "));
      }

      await userService.delete(value.id);
      res.status(200).json(new APIResponse(true, "User deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
