import type { RequestHandler } from "express";
import express from "express";
import userController from "../controllers/user.controller";
import admin from "../middlewares/admin";
import auth from "../middlewares/auth";
import zynkEmailCheck from "../middlewares/zynk-email-check";

const router = express.Router();

router.get("/me", auth, userController.getById as RequestHandler);
router.get("/email", auth, userController.getByEmail as RequestHandler);
// User creation requires admin token to prevent arbitrary user creation
router.post("/", admin, zynkEmailCheck, userController.create as RequestHandler);
router.put("/update-user", auth, userController.update as RequestHandler);
router.delete("/delete-user", auth, userController.delete as RequestHandler);

export default router;
