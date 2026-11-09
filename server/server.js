import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { syncProblemXp } from "./utils/syncProblemXp.js";

const PORT = process.env.PORT || 5000;
try {
  await connectDB();
  await syncProblemXp();
  app.listen(PORT, () => console.log(`DEVQUEST API running at http://localhost:${PORT}`));
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exit(1);
}
