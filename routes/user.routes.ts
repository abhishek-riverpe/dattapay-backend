import type { RequestHandler } from "express";
import express from "express";
import userController from "../controllers/user.controller";
import zynkEmailCheck from "../middlewares/zynk-email-check";

const router = express.Router();

router.get("/", userController.getAll as RequestHandler);
router.get("/me", userController.getById as RequestHandler);
router.get("/email", userController.getByEmail as RequestHandler);
router.post("/", zynkEmailCheck, userController.create as RequestHandler);
router.put("/update-user", userController.update as RequestHandler);
router.delete("/delete-user", userController.delete as RequestHandler);

export default router;
