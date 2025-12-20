import express from "express";
import addressController from "../controllers/address.controller";

const router = express.Router();

router.get("/", addressController.getAll);
router.get("/:id", addressController.getById);
router.get("/user/:userId", addressController.getByUserId);
router.post("/", addressController.create);
router.put("/:id", addressController.update);
router.put("/user/:userId", addressController.updateByUserId);
router.delete("/:id", addressController.delete);
router.delete("/user/:userId", addressController.deleteByUserId);

export default router;
