import express from "express";
import users from "./user.routes";
import addresses from "./address.routes";

const router = express.Router();

router.use("/users", users);
router.use("/addresses", addresses);

export default router;
