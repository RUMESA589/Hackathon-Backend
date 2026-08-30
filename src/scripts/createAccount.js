import dotenv from "dotenv";
dotenv.config();
import connectDatabase from "../config/db.js";
import User from "../models/User.js";
import Worker from "../models/Worker.js";
import { hashPassword } from "../utils/auth.js";

async function main() {
  const [role, name, email, password, specialization, categories] = process.argv.slice(2);
  if (!["admin", "worker"].includes(role) || !name || !email || !password) {
    console.log('Usage: node src/scripts/createAccount.js admin "Name" email password');
    console.log('Usage: node src/scripts/createAccount.js worker "Name" email password "Specialization" "Tech Rescue,Electrical"');
    process.exit(1);
  }

  await connectDatabase();
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) {
    console.log("Email already registered");
    process.exit(1);
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role
  });

  if (role === "worker") {
    await Worker.create({
      user: user._id,
      specialization,
      categories: categories ? categories.split(",").map(value => value.trim()).filter(Boolean) : []
    });
  }

  console.log(`${role} account created: ${user.email}`);
  process.exit(0);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
