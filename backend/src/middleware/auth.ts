import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { User } from "../models/User";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  firmId?: string; // set by requireFirmAccess middleware
  firmRole?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = header.split(" ")[1];
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid or inactive user" });
    }

    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
