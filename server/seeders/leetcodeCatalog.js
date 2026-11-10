const CATALOG_URL = "https://alfa-leetcode-api.onrender.com/problems";
const PAGE_SIZE = 100;
const TARGET_SIZE = 1000;

const topicWeights = new Map([
  ["Arrays", 100],
  ["Hashing", 55],
  ["Strings", 55],
  ["Two Pointers", 55],
  ["Sliding Window", 40],
  ["Binary Search", 50],
  ["Sorting", 30],
  ["Linked List", 50],
  ["Stack", 40],
  ["Queues", 20],
  ["Trees", 100],
  ["Heap", 30],
  ["Graphs", 95],
  ["Dynamic Programming", 100],
  ["Greedy", 30],
  ["Backtracking", 40],
  ["Bit Manipulation", 20],
  ["Trie", 10],
  ["Math", 30],
  ["Prefix Sum", 20],
  ["Recursion", 15],
  ["Data Structures", 15]
]);

const difficultyTargets = new Map([
  ["Easy", 250],
  ["Medium", 600],
  ["Hard", 150]
]);

const tagTopics = [
  [["Sliding Window"], "Sliding Window"],
  [["Prefix Sum"], "Prefix Sum"],
  [["Two Pointers"], "Two Pointers"],
  [["Binary Search"], "Binary Search"],
  [["Linked List", "Doubly-Linked List"], "Linked List"],
  [["Monotonic Stack", "Stack"], "Stack"],
  [["Monotonic Queue", "Queue"], "Queues"],
  [["Binary Search Tree", "Binary Tree", "Tree", "Lowest Common Ancestor"], "Trees"],
  [["Graph Theory", "Breadth-First Search", "Depth-First Search", "Topological Sort", "Union-Find", "Shortest Path", "Minimum Spanning Tree", "Strongly Connected Component"], "Graphs"],
  [["Dynamic Programming", "0-1 Knapsack", "Complete Knapsack", "Longest Common Subsequence", "Longest Increasing Subsequence", "Memoization"], "Dynamic Programming"],
  [["Greedy"], "Greedy"],
  [["Backtracking"], "Backtracking"],
  [["Heap (Priority Queue)", "Heap"], "Heap"],
  [["Bit Manipulation", "Bitmask"], "Bit Manipulation"],
  [["Trie"], "Trie"],
  [["Sorting", "Sort", "Merge Sort", "Quickselect", "Quicksort"], "Sorting"],
  [["String", "String Matching", "Rolling Hash", "Knuth–Morris–Pratt Algorithm", "Aho–Corasick Algorithm"], "Strings"],
  [["Hash Table", "Hash Function"], "Hashing"],
  [["Math", "Number Theory", "Combinatorics", "Geometry"], "Math"],
  [["Recursion"], "Recursion"],
  [["Design", "Data Stream", "Iterator"], "Data Structures"],
  [["Array", "Matrix"], "Arrays"]
];

function problemTopic(tags) {
  for (const [matches, topic] of tagTopics) {
    if (tags.some(tag => matches.includes(tag))) return topic;
  }
  return null;
}

function problemId(question) {
  const id = Number.parseInt(question.questionFrontendId, 10);
  return Number.isFinite(id) ? id : Number.MAX_SAFE_INTEGER;
}

function allocateWeighted(total, weights, capacities) {
  const allocation = new Map([...weights.keys()].map(topic => [topic, 0]));
  let remaining = total;

  while (remaining > 0) {
    const active = [...weights.entries()].filter(([topic, weight]) =>
      weight > 0 && (capacities.get(topic) || 0) > allocation.get(topic)
    );
    if (!active.length) break;
    const weightTotal = active.reduce((sum, [, weight]) => sum + weight, 0);
    const proposals = active.map(([topic, weight]) => {
      const exact = remaining * weight / weightTotal;
      const available = capacities.get(topic) - allocation.get(topic);
      return { topic, count: Math.min(available, Math.floor(exact)), remainder: exact - Math.floor(exact) };
    });

    let allocated = 0;
    for (const proposal of proposals) {
      if (!proposal.count) continue;
      allocation.set(proposal.topic, allocation.get(proposal.topic) + proposal.count);
      allocated += proposal.count;
    }
    remaining -= allocated;

    if (remaining > 0) {
      const byRemainder = proposals
        .filter(proposal => capacities.get(proposal.topic) > allocation.get(proposal.topic))
        .sort((a, b) => b.remainder - a.remainder || a.topic.localeCompare(b.topic));
      for (const proposal of byRemainder) {
        if (!remaining) break;
        allocation.set(proposal.topic, allocation.get(proposal.topic) + 1);
        remaining -= 1;
      }
    }
  }

  return { allocation, remaining };
}

async function fetchPage(skip) {
  const response = await fetch(`${CATALOG_URL}?limit=${PAGE_SIZE}&skip=${skip}`, {
    signal: AbortSignal.timeout(60000),
    headers: { "User-Agent": "DEVQUEST interview-prep catalog importer" }
  });
  if (!response.ok) throw new Error(`LeetCode catalog request failed at offset ${skip} (${response.status}).`);
  const payload = await response.json();
  if (!Array.isArray(payload.problemsetQuestionList) || !Number.isInteger(payload.totalQuestions)) {
    throw new Error(`LeetCode catalog returned invalid problem metadata at offset ${skip}.`);
  }
  return payload;
}

export async function getCompanyPrepLeetCodeProblems(starterProblems) {
  const firstPage = await fetchPage(0);
  const offsets = Array.from(
    { length: Math.ceil(firstPage.totalQuestions / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE
  );
  const pages = [firstPage];
  let cursor = 0;
  async function worker() {
    while (cursor < offsets.length) {
      const skip = offsets[cursor++];
      const page = await fetchPage(skip);
      if (page.totalQuestions !== firstPage.totalQuestions) {
        throw new Error("LeetCode catalog changed while it was being imported; run the seed again.");
      }
      pages.push(page);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, offsets.length) }, worker));

  const questions = pages.flatMap(page => page.problemsetQuestionList);
  const uniqueQuestions = new Map();
  for (const question of questions) {
    if (question.titleSlug) uniqueQuestions.set(question.titleSlug, question);
  }
  if (uniqueQuestions.size !== firstPage.totalQuestions) {
    throw new Error(`LeetCode catalog returned ${uniqueQuestions.size} unique problems; ${firstPage.totalQuestions} were expected.`);
  }

  const starterBySlug = new Map(starterProblems.map(([title, topic, pattern, difficulty, platform, url]) => {
    const slug = url.match(/\/problems\/([^/]+)/)?.[1];
    if (!slug) throw new Error(`Starter problem "${title}" has an invalid LeetCode URL.`);
    return [slug, { title, topic, pattern, difficulty, platform, url }];
  }));
  const mandatoryByTopic = new Map([...topicWeights.keys()].map(topic => [topic, 0]));
  const mandatoryByDifficulty = new Map([...difficultyTargets.keys()].map(difficulty => [difficulty, 0]));
  const selected = new Map();
  for (const [slug, starter] of starterBySlug) {
    const metadata = uniqueQuestions.get(slug);
    if (!metadata || metadata.isPaidOnly) {
      throw new Error(`Starter problem "${starter.title}" is unavailable in the free LeetCode catalog.`);
    }
    const topic = problemTopic((metadata.topicTags || []).map(tag => tag.name));
    if (!topic || !topicWeights.has(topic)) {
      throw new Error(`Starter problem "${starter.title}" has no supported DSA topic.`);
    }
    if (!difficultyTargets.has(metadata.difficulty)) {
      throw new Error(`Starter problem "${starter.title}" has an unsupported difficulty.`);
    }
    const url = `https://leetcode.com/problems/${slug}/`;
    selected.set(slug, {
      title: metadata.title,
      topic,
      pattern: (metadata.topicTags || []).map(tag => tag.name).join(", ").slice(0, 100),
      difficulty: metadata.difficulty,
      platform: "LeetCode",
      url
    });
    mandatoryByTopic.set(topic, mandatoryByTopic.get(topic) + 1);
    mandatoryByDifficulty.set(metadata.difficulty, mandatoryByDifficulty.get(metadata.difficulty) + 1);
  }

  const topicCandidates = new Map([...topicWeights.keys()].map(topic => [topic, new Map(
    [...difficultyTargets.keys()].map(difficulty => [difficulty, []])
  )]));
  for (const [slug, question] of uniqueQuestions) {
    if (question.isPaidOnly || selected.has(slug) || !difficultyTargets.has(question.difficulty)) continue;
    const topic = problemTopic((question.topicTags || []).map(tag => tag.name));
    if (!topic || !topicCandidates.has(topic)) continue;
    const id = problemId(question);
    if (id === Number.MAX_SAFE_INTEGER) continue;
    topicCandidates.get(topic).get(question.difficulty).push({
      id,
      slug,
      problem: {
        title: question.title,
        topic,
        pattern: (question.topicTags || []).map(tag => tag.name).join(", ").slice(0, 100),
        difficulty: question.difficulty,
        platform: "LeetCode",
        url: `https://leetcode.com/problems/${slug}/`
      }
    });
  }
  for (const byDifficulty of topicCandidates.values()) {
    for (const candidates of byDifficulty.values()) candidates.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
  }

  const remainingTopicWeights = new Map([...topicWeights].map(([topic, weight]) => [
    topic,
    Math.max(0, weight - mandatoryByTopic.get(topic))
  ]));
  for (const [difficulty, target] of difficultyTargets) {
    const remainingTarget = target - mandatoryByDifficulty.get(difficulty);
    if (remainingTarget < 0) throw new Error(`Starter problems exceed the ${difficulty} catalog target.`);
    const capacities = new Map([...topicWeights.keys()].map(topic => [
      topic,
      topicCandidates.get(topic).get(difficulty).length
    ]));
    const { allocation, remaining } = allocateWeighted(remainingTarget, remainingTopicWeights, capacities);
    if (remaining) {
      throw new Error(`LeetCode catalog has ${remainingTarget - remaining} eligible ${difficulty} problems after prioritizing the starter set; ${remainingTarget} are required.`);
    }
    for (const [topic, count] of allocation) {
      const candidates = topicCandidates.get(topic).get(difficulty);
      for (const candidate of candidates.slice(0, count)) selected.set(candidate.slug, candidate.problem);
    }
  }

  if (selected.size !== TARGET_SIZE) {
    throw new Error(`Curated LeetCode catalog contains ${selected.size} unique problems; ${TARGET_SIZE} are required.`);
  }
  return [...selected.values()].sort((a, b) => a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title));
}
