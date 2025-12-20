import express from "express";
import users from "./user.routes";
import addresses from "./address.routes";
import zynk from "./zynk.routes";

const router = express.Router();

router.use("/users", users);
router.use("/addresses", addresses);
router.use("/zynk", zynk);

export default router;
