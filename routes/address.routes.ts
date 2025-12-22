import type { RequestHandler } from "express";
import express from "express";
import addressController from "../controllers/address.controller";

const router = express.Router();

router.get("/", addressController.getByUserId as RequestHandler);
router.post("/", addressController.create as RequestHandler);
router.put("/", addressController.updateByUserId as RequestHandler);
router.delete("/", addressController.deleteByUserId as RequestHandler);

export default router;
