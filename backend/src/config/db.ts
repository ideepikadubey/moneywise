import mongoose from "mongoose";

function sanitizeMongoUri(uri: string): string {
  // If the password contains unencoded special characters like '@', automatically encode them
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^@\/]+)(\/.*)?$/);
  if (match) {
    const [, protocol, user, pass, host, rest = ""] = match;
    return `${protocol}${user}:${encodeURIComponent(decodeURIComponent(pass))}@${host}${rest}`;
  }
  return uri;
}

export async function connectDB(): Promise<void> {
  const rawUri = process.env.MONGO_URI;
  if (!rawUri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  const uri = sanitizeMongoUri(rawUri.trim());

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });
}
