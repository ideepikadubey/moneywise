import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { FirmMember, FirmRole } from "../models/FirmMember";

/**
 * Every request that touches firm-scoped data must pass through this.
 * Expects the firm id in `req.params.firmId` OR `req.headers["x-firm-id"]`.
 * Attaches req.firmId and req.firmRole so controllers can filter queries
 * and enforce permissions without re-querying membership every time.
 */
export async function requireFirmAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const firmId = (req.params.firmId as string) || (req.headers["x-firm-id"] as string);

  if (!firmId) {
    return res.status(400).json({ message: "Firm ID is required (x-firm-id header or route param)" });
  }

  const membership = await FirmMember.findOne({ user: req.userId, firm: firmId, isActive: true });

  if (!membership) {
    return res.status(403).json({ message: "You do not have access to this firm" });
  }

  req.firmId = firmId;
  req.firmRole = membership.role;
  next();
}

/**
 * Restricts a route to specific roles, e.g. requireRole("owner", "admin").
 * Must be used after requireFirmAccess.
 */
export function requireRole(...allowedRoles: FirmRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.firmRole || !allowedRoles.includes(req.firmRole as FirmRole)) {
      return res.status(403).json({ message: `This action requires one of these roles: ${allowedRoles.join(", ")}` });
    }
    next();
  };
}
