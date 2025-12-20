import express from "express";
import userController from "../controllers/user.controller";
import zynkEmailCheck from "../middlewares/zynk-email-check";

const router = express.Router();

router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.get("/email/:email", userController.getByEmail);
router.get("/clerk/:clerkUserId", userController.getByClerkUserId);
router.post("/", zynkEmailCheck, userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.delete);

export default router;
