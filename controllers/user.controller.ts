import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth";
import userService from "../services/user.service";
import APIResponse from "../lib/APIResponse";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema";
import AppError from "../lib/Error";

class UserController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAll();
      res
        .status(200)
        .json(new APIResponse(true, "Users retrieved successfully", users));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.user.id);
      res
        .status(200)
        .json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async getByEmail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getByEmail(req.user.email);
      res
        .status(200)
        .json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async getByClerkUserId(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const clerkUserId = req.params.clerkUserId;
      if (!clerkUserId) {
        throw new AppError(400, "Clerk user ID is required");
      }

      const user = await userService.getByClerkUserId(clerkUserId);
      res
        .status(200)
        .json(new APIResponse(true, "User retrieved successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error, value } = createUserSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        throw new AppError(400, error.details.map((d) => d.message).join(", "));
      }

      const user = await userService.create(value);
      res
        .status(201)
        .json(new APIResponse(true, "User created successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { error: bodyError, value: bodyValue } = updateUserSchema.validate(
        req.body,
        { abortEarly: false }
      );

      if (bodyError) {
        throw new AppError(
          400,
          bodyError.details.map((d) => d.message).join(", ")
        );
      }

      const user = await userService.update(req.user.id, bodyValue);
      res
        .status(200)
        .json(new APIResponse(true, "User updated successfully", user));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.delete(req.user.id);
      res.status(200).json(new APIResponse(true, "User deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();
