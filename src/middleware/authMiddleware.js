import jwt from "jsonwebtoken";
import User from "../models/User.js";

async function getAuthUser(req) {
  const bearer = req.headers.authorization;
  const token = req.cookies.token || (bearer && bearer.startsWith("Bearer ") ? bearer.slice(7) : null);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-passwordHash -resetToken -resetTokenExpiry");
    return user || null;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(user.role)) return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    req.user = user;
    next();
  };
}

export { getAuthUser, requireAuth, requireRole };
