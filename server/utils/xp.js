import XpEvent from "../models/XpEvent.js";

export async function awardXp(userId, key, points, reason) {
  try {
    await XpEvent.create({ user: userId, key, points, reason });
    return points;
  } catch (error) {
    if (error.code === 11000) return 0; // idempotent: no duplicate reward
    throw error;
  }
}
