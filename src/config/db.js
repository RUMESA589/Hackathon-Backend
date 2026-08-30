import mongoose from "mongoose";

async function connectDatabase() {
  const url = process.env.MONGODB_URI;
  if (!url) throw new Error("MONGODB_URI is required");
  await mongoose.connect(url);
  console.log("MongoDB connected");
}

export default connectDatabase;
