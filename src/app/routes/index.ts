import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { PropertyRoutes } from "../modules/property/property.routes";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/properties", PropertyRoutes);

export const IndexRoutes = router;
