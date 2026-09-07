import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err.code === 11000) {
    return res.status(409).json({ message: "A record with these details already exists", details: err.keyValue });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ message: "Validation failed", details: err.errors });
  }

  const status = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  res.status(status).json({ message: err.message || "Internal server error" });
}
