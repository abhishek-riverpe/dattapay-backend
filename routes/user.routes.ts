import express from "express";
import userController from "../controllers/user.controller";

const router = express.Router();

router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.get("/email/:email", userController.getByEmail);
router.get("/clerk/:clerkUserId", userController.getByClerkUserId);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.delete);

export default router;
