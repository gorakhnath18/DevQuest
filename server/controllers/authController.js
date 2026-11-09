import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function tokenFor(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}
function publicUser(user) {
  return { id: user._id, name: user.name, username: user.username, email: user.email, bio: user.bio, isPublic: user.isPublic };
}

export async function register(req, res) {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) return res.status(400).json({ message: "All fields are required." });
    if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedUsername = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) return res.status(400).json({ message: "Username must be 3–24 characters: letters, numbers or underscore." });
    const exists = await User.findOne({ $or: [{ email: String(email).toLowerCase() }, { username: normalizedUsername }] });
    if (exists) return res.status(409).json({ message: "Email or username is already registered." });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name: String(name).trim(), username: normalizedUsername, email: String(email).trim().toLowerCase(), password: hashed });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Could not create account." });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase().trim() }).select("+password");
    if (!user || !(await bcrypt.compare(password || "", user.password))) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ message: "Could not log in." });
  }
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
