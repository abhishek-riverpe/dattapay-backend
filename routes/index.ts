import express from "express";
import users from "./user.routes";
import addresses from "./address.routes";
import zynk from "./zynk.routes";
import auth from "../middlewares/auth";

const router = express.Router();

router.use("/users", users);
router.use("/addresses", auth, addresses);
router.use("/zynk", auth, zynk);

export default router;
