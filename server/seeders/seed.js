import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import RoadmapDay from "../models/RoadmapDay.js";
import Problem from "../models/Problem.js";
import Company from "../models/Company.js";

const companies = [
  { name: "Adobe", slug: "adobe", industry: "Software", website: "https://www.adobe.com/", careersPage: "https://careers.adobe.com/", sourceUrl: "https://careers.adobe.com/" },
  { name: "Amazon", slug: "amazon", industry: "E-commerce and Cloud", website: "https://www.amazon.com/", careersPage: "https://www.amazon.jobs/", sourceUrl: "https://www.amazon.jobs/" },
  { name: "Atlassian", slug: "atlassian", industry: "Software", website: "https://www.atlassian.com/", careersPage: "https://www.atlassian.com/company/careers", sourceUrl: "https://www.atlassian.com/company/careers" },
  { name: "Flipkart", slug: "flipkart", industry: "E-commerce", website: "https://www.flipkart.com/", careersPage: "https://www.flipkartcareers.com/", sourceUrl: "https://www.flipkartcareers.com/" },
  { name: "Google", slug: "google", industry: "Software and Cloud", website: "https://www.google.com/", careersPage: "https://careers.google.com/", sourceUrl: "https://careers.google.com/" },
  { name: "Intuit", slug: "intuit", industry: "Financial Software", website: "https://www.intuit.com/", careersPage: "https://jobs.intuit.com/", sourceUrl: "https://jobs.intuit.com/" },
  { name: "Microsoft", slug: "microsoft", industry: "Software and Cloud", website: "https://www.microsoft.com/", careersPage: "https://careers.microsoft.com/", sourceUrl: "https://careers.microsoft.com/" },
  { name: "NVIDIA", slug: "nvidia", industry: "Semiconductors and AI", website: "https://www.nvidia.com/", careersPage: "https://www.nvidia.com/en-us/about-nvidia/careers/", sourceUrl: "https://www.nvidia.com/en-us/about-nvidia/careers/" },
  { name: "Oracle", slug: "oracle", industry: "Software and Cloud", website: "https://www.oracle.com/", careersPage: "https://www.oracle.com/careers/", sourceUrl: "https://www.oracle.com/careers/" },
  { name: "PhonePe", slug: "phonepe", industry: "FinTech", website: "https://www.phonepe.com/", careersPage: "https://www.phonepe.com/careers/", sourceUrl: "https://www.phonepe.com/careers/" },
  { name: "Razorpay", slug: "razorpay", industry: "FinTech", website: "https://razorpay.com/", careersPage: "https://razorpay.com/careers/", sourceUrl: "https://razorpay.com/careers/" },
  { name: "Salesforce", slug: "salesforce", industry: "Software and Cloud", website: "https://www.salesforce.com/", careersPage: "https://www.salesforce.com/company/careers/", sourceUrl: "https://www.salesforce.com/company/careers/" },
  { name: "ServiceNow", slug: "servicenow", industry: "Software and Cloud", website: "https://www.servicenow.com/", careersPage: "https://careers.servicenow.com/", sourceUrl: "https://careers.servicenow.com/" },
  { name: "Swiggy", slug: "swiggy", industry: "Technology and Delivery", website: "https://www.swiggy.com/", careersPage: "https://careers.swiggy.in/", sourceUrl: "https://careers.swiggy.in/" },
  { name: "Uber", slug: "uber", industry: "Technology and Mobility", website: "https://www.uber.com/", careersPage: "https://jobs.uber.com/en/", sourceUrl: "https://jobs.uber.com/en/" },
  { name: "Walmart Global Tech", slug: "walmart-global-tech", industry: "Retail Technology", website: "https://tech.walmart.com/", careersPage: "https://careers.walmart.com/", sourceUrl: "https://careers.walmart.com/" }
];

const companyDirectorySource = "https://github.com/remoteintech/remote-jobs";
const companyDirectoryApi = "https://api.github.com/repos/remoteintech/remote-jobs";

function frontmatterField(frontmatter, field) {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"));
  return match?.[1].replace(/^["']|["']$/g, "").trim() || "";
}

async function communityTechCompanies() {
  const response = await fetch(`${companyDirectoryApi}/contents/src/companies?ref=main`, {
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "DEVQUEST company directory importer" }
  });
  if (!response.ok) throw new Error(`Company directory source request failed (${response.status}).`);
  const entries = await response.json();
  if (!Array.isArray(entries)) throw new Error("Company directory source returned an invalid response.");
  const files = entries.filter(entry => typeof entry.name === "string" && entry.name.endsWith(".md") && entry.download_url);
  let cursor = 0;
  const companiesWithLinks = [];
  const errors = [];
  async function worker() {
    while (cursor < files.length) {
      const file = files[cursor++];
      try {
        const page = await fetch(file.download_url, {
          signal: AbortSignal.timeout(15000),
          headers: { "User-Agent": "DEVQUEST company directory importer" }
        });
        if (!page.ok) throw new Error(`Company profile request failed (${page.status}).`);
        const markdown = await page.text();
        const frontmatter = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
        if (!frontmatter) continue;
        const fields = frontmatter[1];
        const name = frontmatterField(fields, "title");
        const slug = frontmatterField(fields, "slug") || file.name.replace(/\.md$/, "");
        const website = frontmatterField(fields, "website");
        const careersPage = frontmatterField(fields, "careers_url");
        if (!name || !slug || !/^https:\/\//i.test(website) || !/^https:\/\//i.test(careersPage)) continue;
        companiesWithLinks.push({
          name,
          slug: slug.toLowerCase(),
          industry: "Software & Technology",
          website,
          careersPage,
          sourceUrl: `${companyDirectorySource}/blob/main/src/companies/${file.name}`
        });
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 20 }, worker));
  if (errors.length) throw new Error(`Could not load ${errors.length} company profile(s): ${errors.slice(0, 3).join("; ")}`);
  if (companiesWithLinks.length < 200) {
    throw new Error(`Company source provided only ${companiesWithLinks.length} entries with official links; at least 200 are required.`);
  }
  return companiesWithLinks;
}

const phases = [
  { start: 1, end: 20, name: "Foundation", subjects: ["Programming fundamentals", "Complexity analysis", "Arrays", "Strings", "OOP"] },
  { start: 21, end: 40, name: "Core DSA", subjects: ["Hashing", "Recursion", "Linked Lists", "Stacks", "Queues"] },
  { start: 41, end: 60, name: "Advanced DSA", subjects: ["Trees", "BST", "Heaps", "Graphs", "Dynamic Programming", "Greedy"] },
  { start: 61, end: 75, name: "Core CS", subjects: ["DBMS", "Operating Systems", "Computer Networks", "SQL", "OOP revision"] },
  { start: 76, end: 90, name: "Development", subjects: ["HTML/CSS", "JavaScript", "React", "Node.js", "Express", "MongoDB", "REST APIs", "Git"] },
  { start: 91, end: 100, name: "System Design", subjects: ["LLD", "SOLID", "Design Patterns", "HLD", "Scalability"] },
  { start: 101, end: 110, name: "Projects", subjects: ["Project planning", "Backend", "Frontend", "Testing", "Deployment", "Documentation"] },
  { start: 111, end: 120, name: "Interview Sprint", subjects: ["DSA revision", "Core CS revision", "Mock interviews", "Resume", "Applications", "Behavioral interviews"] }
];

const learningGuides = {
  "Programming fundamentals": [
    { title: "Variables, types, and input/output", topics: ["Variables and assignment", "Numbers, strings, and booleans", "Reading input and printing output"], lesson: "Choose one programming language and learn how to store values, convert between common types, read input, and print clear output. Trace each value through a short program.", practice: "Write small programs that read input, transform values, and print the expected result." },
    { title: "Conditions and boolean logic", topics: ["if / else branches", "Comparison operators", "Combining conditions"], lesson: "Practice branching with if/else, comparison operators, and boolean expressions. Trace which branch runs for boundary values and explain why.", practice: "Implement range checks, sign checks, and simple decision rules; test boundary cases." },
    { title: "Loops and iteration", topics: ["for and while loops", "Loop counters", "Off-by-one boundaries"], lesson: "Use loops to repeat work, track a changing state, and stop at the right boundary. Dry-run each iteration on paper before coding.", practice: "Write count, sum, minimum, and maximum loops over a sequence." },
    { title: "Functions and decomposition", topics: ["Parameters and return values", "Scope", "Small reusable functions"], lesson: "Break a problem into named functions with clear inputs and outputs. Distinguish returned values from printed output and avoid hidden shared state.", practice: "Refactor one longer program into small functions and test each function independently." },
    { title: "Arrays and strings", topics: ["Indexing", "Length and bounds", "Mutation vs. copying"], lesson: "Learn indexed access and sequence traversal. Check array/string bounds carefully and understand which operations mutate or copy data.", practice: "Build a frequency counter and a routine that transforms a sequence without losing edge cases." }
  ],
  "Complexity analysis": [
    { title: "Counting operations", topics: ["Input size", "Constant-time work", "Dominant operations"], lesson: "Estimate how work grows with input size by counting the main operations. Ignore constants only after identifying the dominant term.", practice: "Count iterations in short loops and compare the work for doubled input sizes." },
    { title: "Big O for loops", topics: ["Single loops", "Nested loops", "Triangular iteration"], lesson: "Translate loop structure into time complexity. Nested independent loops often multiply; dependent bounds may form a sum.", practice: "Analyze single, nested, and triangular loops and justify each bound." },
    { title: "Space complexity", topics: ["Input vs. auxiliary space", "Temporary arrays", "Call stack"], lesson: "Track extra memory separately from the input. Include temporary collections and recursive call-stack depth.", practice: "Compare in-place and extra-array solutions for the same task." },
    { title: "Trade-offs and constraints", topics: ["Time-space trade-offs", "Constraint reading", "Choosing an approach"], lesson: "Use problem constraints to reject approaches that are too slow or too large. Explain the time and space cost before implementation.", practice: "Estimate whether O(n²), O(n log n), or O(n) fits several input limits." }
  ],
  Arrays: [
    { title: "Traversal and invariants", topics: ["Index traversal", "Running totals", "Loop invariants"], lesson: "Traverse arrays safely and maintain a clear invariant such as the sum or best answer seen so far. Test empty, one-item, and boundary cases.", practice: "Implement sum, min/max, and in-place reversal." },
    { title: "Prefix sums", topics: ["Prefix construction", "Range sum queries", "Off-by-one handling"], lesson: "Build prefix sums so a range query becomes the difference of two prefixes. Define whether each prefix includes the current index and handle the left boundary.", practice: "Answer range-sum queries and solve a subarray-sum exercise." },
    { title: "Two pointers", topics: ["Opposite-direction pointers", "Same-direction pointers", "Sorted-array reasoning"], lesson: "Use two indices to shrink or scan a search space without revisiting elements. State why moving one pointer cannot discard a valid answer.", practice: "Solve a pair-sum or in-place deduplication exercise." },
    { title: "Sliding windows", topics: ["Fixed-size windows", "Variable-size windows", "Window invariants"], lesson: "Maintain a contiguous window by adding the new right element and removing the old left element. Keep the condition true after every move.", practice: "Solve one fixed-size and one variable-size window problem." },
    { title: "Sorting and intervals", topics: ["Sort keys", "Merge intervals", "Stable ordering"], lesson: "Sort by the key that simplifies the next step. For intervals, compare each start with the current merged end and preserve inclusive-boundary rules.", practice: "Merge overlapping intervals and explain the chosen sort key." },
    { title: "Matrix traversal", topics: ["Rows and columns", "Bounds", "Spiral or diagonal patterns"], lesson: "Treat a matrix as row and column indices with explicit bounds. Track visited directions or layers when traversing in a pattern.", practice: "Implement row/column scans and one spiral or diagonal traversal." }
  ],
  Strings: [
    { title: "Character traversal", topics: ["Character indexing", "Normalization", "Empty strings"], lesson: "Iterate through characters while accounting for case, spaces, and empty inputs. Normalize only what the problem allows.", practice: "Check palindrome and character-count conditions." },
    { title: "Frequency counting", topics: ["Arrays as counters", "Maps", "Anagrams"], lesson: "Count character occurrences with an array or map, selecting the structure based on the input alphabet. Compare counts rather than sorting when appropriate.", practice: "Check anagrams and find the first unique character." },
    { title: "Two pointers on strings", topics: ["Left/right scan", "Skipping characters", "Palindrome checks"], lesson: "Scan from both ends or move a fast and slow pointer. Keep pointer movement explicit when skipping punctuation or repeated characters.", practice: "Solve a normalized palindrome or subsequence check." },
    { title: "Substring windows", topics: ["Window counts", "Distinct characters", "Shrinking conditions"], lesson: "Use a sliding window for contiguous substring constraints. Expand until valid, then shrink while updating character counts.", practice: "Find the longest substring with a stated character constraint." }
  ],
  "Operating Systems": [
    { title: "Processes and threads", topics: ["Process state", "Thread sharing", "Context switching"], lesson: "A process owns an address space and resources; threads share process memory but have their own execution state. Learn the lifecycle and why context switches cost time.", practice: "Compare processes and threads for two workloads and identify shared versus isolated state." },
    { title: "CPU scheduling", topics: ["FCFS", "Round Robin", "Waiting and turnaround time"], lesson: "Compare scheduling policies by response time, waiting time, throughput, and fairness. Calculate a small schedule by hand.", practice: "Compute waiting and turnaround times for a short process set under two algorithms." },
    { title: "Synchronization", topics: ["Race conditions", "Mutexes", "Semaphores"], lesson: "Concurrent access to shared state can race. Understand critical sections, mutual exclusion, and how semaphores coordinate bounded resources.", practice: "Trace a producer-consumer example and identify the race and required lock." },
    { title: "Deadlocks", topics: ["Four necessary conditions", "Prevention", "Avoidance and detection"], lesson: "Deadlock requires mutual exclusion, hold-and-wait, no preemption, and circular wait. Learn how prevention, avoidance, and detection differ.", practice: "Draw a resource-allocation graph and test whether a cycle can deadlock." },
    { title: "Memory and virtual memory", topics: ["Paging", "Page tables", "Page faults"], lesson: "Virtual addresses map through page tables to physical frames. Understand paging, locality, page faults, and why replacement policies affect performance.", practice: "Translate sample virtual addresses and trace FIFO versus LRU page replacement." },
    { title: "Files and I/O", topics: ["File descriptors", "System calls", "Buffering"], lesson: "Applications request file and device work through system calls. Learn file descriptors, buffering, and the difference between user and kernel space.", practice: "Trace a file read from application call to buffered data and identify failure cases." }
  ],
  DBMS: [
    { title: "Relational model and keys", topics: ["Tables and rows", "Primary keys", "Foreign keys"], lesson: "Model entities as relations, choose stable primary keys, and use foreign keys to represent relationships and enforce referential integrity.", practice: "Design a small schema for users, orders, and order items." },
    { title: "Normalization", topics: ["Functional dependencies", "1NF to 3NF", "Update anomalies"], lesson: "Normalization separates facts to reduce duplication and update anomalies. Identify functional dependencies before splitting tables.", practice: "Normalize a denormalized customer-order table and explain the anomalies removed." },
    { title: "Indexes and query plans", topics: ["B-tree indexes", "Selectivity", "Read/write trade-offs"], lesson: "Indexes speed selected lookups but consume storage and slow writes. Think about selectivity, column order, and the query plan.", practice: "Choose indexes for a few filter-and-sort queries and explain the trade-offs." },
    { title: "Transactions and isolation", topics: ["ACID", "Isolation levels", "Anomalies"], lesson: "Transactions group changes atomically. Compare isolation levels by the anomalies they permit and understand commit and rollback.", practice: "Trace two concurrent transactions and identify dirty reads or lost updates." }
  ],
  "Computer Networks": [
    { title: "Network layers and packets", topics: ["Encapsulation", "IP", "Ports"], lesson: "Follow data from application payload through transport and IP headers to a link frame. Distinguish addresses, ports, and the roles of the layers.", practice: "Trace a browser request and label the key headers and endpoints." },
    { title: "TCP and UDP", topics: ["Connections", "Reliability", "Flow and congestion control"], lesson: "TCP provides ordered reliable delivery with connection setup and congestion control; UDP is a lightweight datagram transport. Choose based on application needs.", practice: "Explain which transport fits a file transfer, live voice call, and DNS lookup." },
    { title: "DNS and HTTP", topics: ["Name resolution", "HTTP methods", "Status codes"], lesson: "DNS resolves names to records; HTTP defines request/response semantics. Learn common methods, status-code classes, headers, and caching behavior.", practice: "Trace DNS resolution and write sample requests for read and update operations." },
    { title: "TLS and web security basics", topics: ["Certificates", "Handshake", "Encryption in transit"], lesson: "TLS authenticates the server and negotiates encrypted transport. Understand certificate validation and why encryption does not replace application authorization.", practice: "Describe the steps that establish an HTTPS connection." }
  ],
  JavaScript: [
    { title: "Values, scope, and functions", topics: ["Primitive values", "Lexical scope", "Closures"], lesson: "Understand JavaScript values, lexical scope, and closures. Track which binding a function reads and avoid accidental global state.", practice: "Write small functions that use parameters, closures, and predictable return values." },
    { title: "Arrays and objects", topics: ["Array methods", "Object properties", "References"], lesson: "Use arrays and objects to model data. Distinguish copying a reference from copying a value and choose immutable updates where useful.", practice: "Transform a list with map/filter/reduce and safely update nested object data." },
    { title: "Promises and async/await", topics: ["Promise states", "Error propagation", "Parallel work"], lesson: "Promises represent eventual results. Use async/await for readable control flow, catch failures explicitly, and run independent work concurrently when appropriate.", practice: "Fetch two independent resources concurrently and handle rejected requests." },
    { title: "Modules and errors", topics: ["ES modules", "Imports and exports", "Exceptions"], lesson: "Split code into focused modules with explicit exports. Validate inputs and propagate errors with useful context instead of hiding failures.", practice: "Create a small module and test its success and error paths." }
  ],
  React: [
    { title: "Components and props", topics: ["Component boundaries", "Props", "Rendering lists"], lesson: "Build UI from small components that receive data through props. Keep keys stable when rendering lists and avoid copying derived values into state.", practice: "Split a page into reusable list, item, and summary components." },
    { title: "State and events", topics: ["useState", "Controlled inputs", "State updates"], lesson: "State represents changing UI data. Update it immutably, use functional updates when the next value depends on the previous one, and keep forms controlled.", practice: "Build a small form and list with add, edit, and validation behavior." },
    { title: "Effects and data loading", topics: ["useEffect", "Dependencies", "Loading and error states"], lesson: "Use effects to synchronize with external systems, not to recompute values that can be derived. Handle dependencies, cleanup, loading, and failures.", practice: "Load data with explicit loading, success, empty, and error states." },
    { title: "Routing and composition", topics: ["Routes", "Layouts", "Protected pages"], lesson: "Compose routes and shared layouts while keeping navigation state clear. Protect private views and make fallback routes intentional.", practice: "Create a small multi-page app with a shared layout and not-found route." }
  ],
  "Node.js": [
    { title: "Runtime and modules", topics: ["Event loop", "Modules", "Environment configuration"], lesson: "Understand Node's event loop and asynchronous I/O. Separate configuration from code and keep secrets out of client bundles and version control.", practice: "Create a small command-line script that reads environment configuration and reports missing values." },
    { title: "HTTP server basics", topics: ["Requests and responses", "Methods and status codes", "Headers"], lesson: "An HTTP handler maps method and path to a response. Validate input, set appropriate status codes, and return predictable JSON.", practice: "Build a small JSON endpoint with validation and clear error responses." },
    { title: "Middleware and errors", topics: ["Middleware order", "Async errors", "Logging"], lesson: "Middleware composes cross-cutting request behavior. Order authentication, parsing, and routes carefully, and centralize explicit error handling.", practice: "Add request logging and an error handler to a small API." }
  ],
  "REST APIs": [
    { title: "Resource design", topics: ["Resource URLs", "HTTP methods", "Status codes"], lesson: "Model endpoints around resources and use HTTP methods consistently. Return useful status codes and keep request and response shapes predictable.", practice: "Design CRUD endpoints for one resource and document example payloads." },
    { title: "Validation and pagination", topics: ["Input validation", "Filtering", "Pagination"], lesson: "Validate untrusted input at the API boundary. Bound page sizes, apply filters consistently, and return enough metadata to navigate results.", practice: "Add validated search and capped pagination to a list endpoint." },
    { title: "Authentication and authorization", topics: ["Identity", "Access checks", "Least privilege"], lesson: "Authentication establishes who is making a request; authorization checks what they may do. Verify ownership on every private resource operation.", practice: "Protect a private endpoint and test access with two different users." }
  ],
  Git: [
    { title: "Working tree and commits", topics: ["Staging", "Commit history", "Focused changes"], lesson: "Use the staging area to create focused commits. Inspect diffs before committing and write messages that explain the change.", practice: "Make a small change, inspect its diff, and create a descriptive commit." },
    { title: "Branches and merging", topics: ["Branches", "Merge conflicts", "Conflict resolution"], lesson: "Branches isolate work. When histories conflict, understand both edits and resolve deliberately rather than overwriting work blindly.", practice: "Create a branch, make parallel edits, and resolve a small merge conflict." }
  ],
  "Dynamic Programming": [
    { title: "State and recurrence", topics: ["Subproblem definition", "Base cases", "Transition"], lesson: "Define a state that captures exactly the information needed for a subproblem. Derive a recurrence, set base cases, then choose memoization or tabulation.", practice: "Solve a one-dimensional recurrence both recursively with memoization and iteratively." },
    { title: "1D and 2D DP", topics: ["State dimensions", "Iteration order", "Space optimization"], lesson: "Use additional state dimensions only when needed. Choose an iteration order that computes dependencies first and reduce space only after the recurrence is correct.", practice: "Implement a sequence or grid DP and explain its state and complexity." }
  ],
  Graphs: [
    { title: "Graph representations and traversal", topics: ["Adjacency lists", "BFS", "DFS"], lesson: "Represent sparse graphs with adjacency lists and traverse with BFS or DFS. Mark nodes when enqueued or first visited to avoid repeated work.", practice: "Count connected components in an undirected graph." },
    { title: "Shortest paths and topological order", topics: ["BFS shortest path", "Dijkstra", "Topological sort"], lesson: "Use BFS for unweighted shortest paths, Dijkstra for nonnegative weights, and topological sorting for dependency order in a DAG.", practice: "Choose and implement the correct traversal for a dependency or path problem." }
  ]
};

function guideFor(topic, visit) {
  const guides = learningGuides[topic] || [
    { title: "Core concepts and vocabulary", topics: [`Key terms in ${topic}`, `Main components of ${topic}`, `Common use cases`], lesson: `Learn the purpose and core vocabulary of ${topic}. Identify its main components, how they interact, and when this topic is useful. Write a short example in your own words.`, practice: `Create a small example of ${topic} and explain each step or design choice.` },
    { title: "Common patterns and trade-offs", topics: [`Typical ${topic} patterns`, "Edge cases", "Trade-offs and use cases"], lesson: `Study a common ${topic} workflow, its edge cases, and the trade-offs behind the main design choices. Compare two approaches and explain when each fits.`, practice: `Apply ${topic} to a small scenario and test a normal case plus an edge case.` }
  ];
  return guides[visit % guides.length];
}

const problems = [
  ["Two Sum","Arrays","Hash Map","Easy","LeetCode","https://leetcode.com/problems/two-sum/"],
  ["Best Time to Buy and Sell Stock","Arrays","Single Pass","Easy","LeetCode","https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"],
  ["Contains Duplicate","Arrays","Hash Set","Easy","LeetCode","https://leetcode.com/problems/contains-duplicate/"],
  ["Valid Anagram","Strings","Frequency Count","Easy","LeetCode","https://leetcode.com/problems/valid-anagram/"],
  ["Valid Palindrome","Strings","Two Pointers","Easy","LeetCode","https://leetcode.com/problems/valid-palindrome/"],
  ["Product of Array Except Self","Arrays","Prefix/Suffix","Medium","LeetCode","https://leetcode.com/problems/product-of-array-except-self/"],
  ["3Sum","Arrays","Sorting + Two Pointers","Medium","LeetCode","https://leetcode.com/problems/3sum/"],
  ["Container With Most Water","Arrays","Two Pointers","Medium","LeetCode","https://leetcode.com/problems/container-with-most-water/"],
  ["Group Anagrams","Hashing","Hash Map","Medium","LeetCode","https://leetcode.com/problems/group-anagrams/"],
  ["Longest Substring Without Repeating Characters","Strings","Sliding Window","Medium","LeetCode","https://leetcode.com/problems/longest-substring-without-repeating-characters/"],
  ["Reverse Linked List","Linked List","Pointer Reversal","Easy","LeetCode","https://leetcode.com/problems/reverse-linked-list/"],
  ["Merge Two Sorted Lists","Linked List","Two Pointers","Easy","LeetCode","https://leetcode.com/problems/merge-two-sorted-lists/"],
  ["Valid Parentheses","Stack","Monotonic/Matching Stack","Easy","LeetCode","https://leetcode.com/problems/valid-parentheses/"],
  ["Daily Temperatures","Stack","Monotonic Stack","Medium","LeetCode","https://leetcode.com/problems/daily-temperatures/"],
  ["Binary Tree Level Order Traversal","Trees","BFS","Medium","LeetCode","https://leetcode.com/problems/binary-tree-level-order-traversal/"],
  ["Maximum Depth of Binary Tree","Trees","DFS","Easy","LeetCode","https://leetcode.com/problems/maximum-depth-of-binary-tree/"],
  ["Kth Largest Element in an Array","Heap","Quickselect/Heap","Medium","LeetCode","https://leetcode.com/problems/kth-largest-element-in-an-array/"],
  ["Number of Islands","Graphs","DFS/BFS","Medium","LeetCode","https://leetcode.com/problems/number-of-islands/"],
  ["Course Schedule","Graphs","Topological Sort","Medium","LeetCode","https://leetcode.com/problems/course-schedule/"],
  ["Climbing Stairs","Dynamic Programming","1D DP","Easy","LeetCode","https://leetcode.com/problems/climbing-stairs/"],
  ["House Robber","Dynamic Programming","1D DP","Medium","LeetCode","https://leetcode.com/problems/house-robber/"],
  ["Coin Change","Dynamic Programming","Unbounded Knapsack","Medium","LeetCode","https://leetcode.com/problems/coin-change/"],
  ["Jump Game","Greedy","Greedy","Medium","LeetCode","https://leetcode.com/problems/jump-game/"],
  ["Search in Rotated Sorted Array","Binary Search","Modified Binary Search","Medium","LeetCode","https://leetcode.com/problems/search-in-rotated-sorted-array/"]
];

const codeforcesTopicMap = [
  [["two pointers"], "Two Pointers"],
  [["binary search"], "Binary Search"],
  [["strings"], "Strings"],
  [["hashing"], "Hashing"],
  [["trees"], "Trees"],
  [["graphs", "dfs and similar", "bfs and similar", "shortest paths"], "Graphs"],
  [["dp"], "Dynamic Programming"],
  [["greedy"], "Greedy"],
  [["sortings"], "Sorting"],
  [["data structures"], "Data Structures"],
  [["bitmasks"], "Bit Manipulation"],
  [["dsu"], "Disjoint Set Union"],
  [["number theory", "combinatorics", "math"], "Math"],
  [["brute force"], "Brute Force"],
  [["implementation"], "Implementation"],
  [["constructive algorithms"], "Constructive Algorithms"]
];

const roadmapTopicMap = [
  [["array", "two pointers", "sliding window", "prefix"], "Arrays"],
  [["string", "substring"], "Strings"],
  [["hash", "frequency"], "Hashing"],
  [["linked list"], "Linked List"],
  [["stack"], "Stack"],
  [["queue"], "Queues"],
  [["bst", "binary search tree"], "Trees"],
  [["tree"], "Trees"],
  [["heap"], "Heap"],
  [["graph"], "Graphs"],
  [["dynamic programming", " dp ", "dp practice"], "Dynamic Programming"],
  [["binary search"], "Binary Search"],
  [["recursive", "recursion"], "Recursion"],
  [["backtracking"], "Backtracking"],
  [["greedy"], "Greedy"],
  [["bit manipulation"], "Bit Manipulation"],
  [["sorting"], "Sorting"],
  [["searching"], "Searching"]
];
const dailyDsaRotation = [
  "Arrays", "Strings", "Hashing", "Two Pointers", "Binary Search",
  "Linked Lists", "Stacks", "Trees", "Graphs", "Dynamic Programming"
];

function getRoadmapProblemTopic(day) {
  const text = `${day.title} ${day.topics.join(" ")}`.toLowerCase();
  return roadmapTopicMap.find(([aliases]) => aliases.some(alias => text.includes(alias)))?.[1];
}

async function curatedCodeforcesProblems(limit, excludedUrls = new Set()) {
  const response = await fetch("https://codeforces.com/api/problemset.problems", {
    signal: AbortSignal.timeout(30000),
    headers: { "User-Agent": "DEVQUEST DSA seed metadata importer" }
  });
  if (!response.ok) throw new Error(`Codeforces metadata request failed (${response.status}).`);
  const payload = await response.json();
  if (payload.status !== "OK" || !Array.isArray(payload.result?.problems)) {
    throw new Error("Codeforces returned an invalid problem metadata response.");
  }

  const candidates = payload.result.problems
    .filter(problem => Number(problem.rating) >= 800 && Number(problem.rating) <= 2200 && problem.contestId && problem.index && problem.tags?.length)
    .map(problem => {
      const tags = problem.tags.map(tag => tag.toLowerCase());
      const topicMatch = codeforcesTopicMap.find(([aliases]) => aliases.some(alias => tags.includes(alias)));
      if (!topicMatch) return null;
      const rating = Number(problem.rating);
      return {
        title: problem.name,
        topic: topicMatch[1],
        pattern: problem.tags.join(", ").slice(0, 100),
        difficulty: rating <= 1200 ? "Easy" : rating <= 1700 ? "Medium" : "Hard",
        platform: "Codeforces",
        url: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`,
        rating,
        contestId: Number(problem.contestId),
        index: problem.index,
        tagOrder: codeforcesTopicMap.indexOf(topicMatch)
      };
    })
    .filter(problem => problem && !excludedUrls.has(problem.url))
    .sort((a, b) => a.rating - b.rating || a.contestId - b.contestId || a.index.localeCompare(b.index));

  const groups = codeforcesTopicMap.map((_, index) => candidates.filter(problem => problem.tagOrder === index));
  const selected = [];
  const used = new Set();
  for (let cursor = 0; selected.length < limit; cursor++) {
    const group = groups[cursor % groups.length];
    const next = group.find(problem => !used.has(problem.url));
    if (next) {
      used.add(next.url);
      selected.push(next);
    } else if (groups.every(items => items.every(problem => used.has(problem.url)))) {
      break;
    }
  }
  if (selected.length < limit) {
    throw new Error(`Codeforces metadata only provided ${selected.length} new suitable unique problems; ${limit} are required.`);
  }
  return selected.map(({ rating, contestId, index, tagOrder, ...problem }) => problem);
}

try {
  await connectDB();
  const sourcedCompanies = await communityTechCompanies();
  const companyCatalog = [...new Map([...companies, ...sourcedCompanies].map(company => [company.slug, company])).values()];
  const companyResults = await Company.bulkWrite(companyCatalog.map(company => ({
    updateOne: {
      filter: { slug: company.slug },
      update: { $setOnInsert: company },
      upsert: true
    }
  })));
  console.log(`Company directory source contains ${sourcedCompanies.length} employers; inserted ${companyResults.upsertedCount} new records.`);

  const existingDays = new Map((await RoadmapDay.find().sort({ day: 1 })).map(day => [day.day, day]));
  const topicVisits = new Map();
  for (let dayNumber = 1; dayNumber <= 120; dayNumber++) {
    const phase = phases.find(item => dayNumber >= item.start && dayNumber <= item.end);
    const topic = phase.subjects[(dayNumber - phase.start) % phase.subjects.length];
    const visit = topicVisits.get(topic) || 0;
    topicVisits.set(topic, visit + 1);
    const guide = guideFor(topic, visit);
    const day = existingDays.get(dayNumber) || new RoadmapDay({ day: dayNumber, tasks: [] });
    day.phase = phase.name;
    day.title = `${topic}: ${guide.title}`;
    day.level = dayNumber <= 40 ? "Beginner" : dayNumber <= 90 ? "Intermediate" : "Advanced";
    day.topics = guide.topics;
    day.lesson = guide.lesson;
    let studyTask = day.tasks.find(task => task.title.startsWith("Study ") || task.title.startsWith("Study:"));
    if (!studyTask) {
      studyTask = day.tasks.create({});
      day.tasks.push(studyTask);
    }
    studyTask.title = `Study: ${guide.title}`;
    studyTask.description = guide.lesson;
    studyTask.xp = 5;
    let practiceTask = day.tasks.find(task => task.title.startsWith("Practice "));
    if (!practiceTask) {
      practiceTask = day.tasks.create({});
      day.tasks.push(practiceTask);
    }
    practiceTask.title = `Practice: ${guide.title}`;
    practiceTask.description = guide.practice;
    practiceTask.xp = 5;
    let applicationTask = day.tasks.find(task => task.title.startsWith("Review and reflect"))
      || day.tasks.find(task => task.title.startsWith("Apply:"));
    if (!applicationTask) {
      applicationTask = day.tasks.create({});
      day.tasks.push(applicationTask);
    }
    applicationTask.title = `Apply: ${topic}`;
    applicationTask.description = `Implement today's idea from memory and test one normal case and one edge case.`;
    applicationTask.xp = 3;
    await day.save();
  }
  console.log("Created or updated the curated 120-day starter roadmap.");

  const starterProblems = problems.map(([title, topic, pattern, difficulty, platform, url]) => ({ title, topic, pattern, difficulty, platform, url }));
  await Problem.bulkWrite(starterProblems.map(problem => ({
    updateOne: {
      filter: { url: problem.url },
      update: { $setOnInsert: problem },
      upsert: true
    }
  })), { ordered: false });
  const currentProblemCount = await Problem.countDocuments({ archived: false });
  const starterProblemCount = await Problem.countDocuments({
    archived: false,
    platform: "LeetCode",
    url: { $in: starterProblems.map(problem => problem.url) }
  });
  const problemTarget = Math.max(1000, starterProblemCount);
  let insertedProblemCount = 0;
  if (currentProblemCount < problemTarget) {
    const existingCodeforces = await Problem.find({ platform: "Codeforces", archived: false }).select("url").lean();
    const codeforces = await curatedCodeforcesProblems(
      problemTarget - currentProblemCount,
      new Set(existingCodeforces.map(problem => problem.url))
    );
    const problemResults = await Problem.bulkWrite(codeforces.map(problem => ({
      updateOne: {
        filter: { url: problem.url },
        update: { $setOnInsert: problem },
        upsert: true
      }
    })), { ordered: false });
    insertedProblemCount = problemResults.upsertedCount;
  }
  const finalProblemCount = await Problem.countDocuments({ archived: false });
  if (finalProblemCount < problemTarget) throw new Error(`DSA library contains ${finalProblemCount} problems; ${problemTarget} are required.`);
  console.log(`DSA library metadata: ${finalProblemCount} total problems; inserted ${insertedProblemCount} new records.`);

  const roadmapDays = await RoadmapDay.find().sort({ day: 1 });
  const topicOffsets = new Map();
  const allDsaProblems = await Problem.find({ archived: false }).sort({ title: 1 }).select("_id topic").lean();
  if (allDsaProblems.length < 5) throw new Error("At least five DSA problems are required to seed daily practice.");
  const problemsByTopic = new Map();
  for (const problem of allDsaProblems) {
    if (!problemsByTopic.has(problem.topic)) problemsByTopic.set(problem.topic, []);
    problemsByTopic.get(problem.topic).push(problem);
  }
  for (const day of roadmapDays) {
    let topic = getRoadmapProblemTopic(day) || dailyDsaRotation[(day.day - 1) % dailyDsaRotation.length];
    let problemsForTopic = problemsByTopic.get(topic) || [];
    if (problemsForTopic.length < 5) {
      topic = dailyDsaRotation[(day.day - 1) % dailyDsaRotation.length];
      problemsForTopic = problemsByTopic.get(topic) || [];
    }
    if (problemsForTopic.length < 5) {
      topic = "General DSA";
      problemsForTopic = [...new Map([...problemsForTopic, ...allDsaProblems].map(problem => [String(problem._id), problem])).values()];
    }
    const offset = topicOffsets.get(topic) || 0;
    const selected = Array.from({ length: 5 }, (_, index) =>
      problemsForTopic[(offset + index) % problemsForTopic.length]._id
    );
    topicOffsets.set(topic, (offset + 5) % problemsForTopic.length);
    let dsaTask = day.tasks.find(task => task.title.startsWith("DSA practice:"));
    if (!dsaTask) {
      day.tasks.push({
        title: `DSA practice: ${topic}`,
        description: "",
        xp: 0,
        problems: selected
      });
      dsaTask = day.tasks[day.tasks.length - 1];
    }
    dsaTask.title = `DSA practice: ${topic}`;
    dsaTask.description = "Solve each linked problem from its problem page, then check it off here or in the DSA library. Easy problems earn 1 XP, Medium 2 XP and Hard 3 XP.";
    dsaTask.xp = 0;
    dsaTask.problems = selected;
    await day.save();
  }
  console.log("Assigned five linked DSA problems to each of the 120 roadmap days.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
