import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
}
