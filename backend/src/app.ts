import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes";
import firmRoutes from "./routes/firmRoutes";
import partyRoutes from "./routes/partyRoutes";
import productRoutes from "./routes/productRoutes";
import salesRoutes from "./routes/salesRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import reportRoutes from "./routes/reportRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl) or matching allowed list/localhost
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // In development allow all, or restrict in production
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Firm-Id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/firms", firmRoutes);

// Firm-scoped routes (supports x-firm-id header from frontend or :firmId param)
app.use("/api/parties", partyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);

app.use("/api/firms/:firmId/parties", partyRoutes);
app.use("/api/firms/:firmId/products", productRoutes);
app.use("/api/firms/:firmId/sales", salesRoutes);
app.use("/api/firms/:firmId/purchases", purchaseRoutes);
app.use("/api/firms/:firmId/payments", paymentRoutes);
app.use("/api/firms/:firmId/expenses", expenseRoutes);
app.use("/api/firms/:firmId/reports", reportRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

export default app;
