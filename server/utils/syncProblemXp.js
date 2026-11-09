import Problem from "../models/Problem.js";
import XpEvent from "../models/XpEvent.js";

const pointsByDifficulty = { Easy: 1, Medium: 2, Hard: 3 };

export async function syncProblemXp() {
  const events = await XpEvent.find({ key: /^problem:[a-f\d]{24}:solved$/i })
    .select("key points")
    .lean();
  if (!events.length) return;

  const problemIds = [...new Set(events.map(event => event.key.slice(8, 32)))];
  const problems = await Problem.find({ _id: { $in: problemIds } }).select("difficulty").lean();
  const difficultyById = new Map(problems.map(problem => [String(problem._id), problem.difficulty]));
  const operations = events.flatMap(event => {
    const problemId = event.key.slice(8, 32);
    const points = pointsByDifficulty[difficultyById.get(problemId)];
    if (!points || event.points === points) return [];
    return [{
      updateOne: {
        filter: { _id: event._id },
        update: { $set: { points } }
      }
    }];
  });
  if (!operations.length) return;

  const result = await XpEvent.bulkWrite(operations, { ordered: false });
  console.log(`Updated ${result.modifiedCount} historical DSA XP award${result.modifiedCount === 1 ? "" : "s"} by problem difficulty.`);
}
