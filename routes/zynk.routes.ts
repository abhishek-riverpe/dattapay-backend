import express from "express";
import zynkController from "../controllers/zynk.controller";

const router = express.Router();

router.post("/entities/:userId", zynkController.createEntity);

export default router;
