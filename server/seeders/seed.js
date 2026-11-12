import "dotenv/config";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import RoadmapDay from "../models/RoadmapDay.js";
import Problem from "../models/Problem.js";
import Company from "../models/Company.js";

const companyDirectory = [
  { name: "Adobe", slug: "adobe", industry: "Software", website: "https://www.adobe.com/", careersPage: "https://careers.adobe.com/" },
  { name: "Amazon", slug: "amazon", industry: "E-commerce and Cloud", website: "https://www.amazon.com/", careersPage: "https://www.amazon.jobs/" },
  { name: "Atlassian", slug: "atlassian", industry: "Software", website: "https://www.atlassian.com/", careersPage: "https://www.atlassian.com/company/careers" },
  { name: "Flipkart", slug: "flipkart", industry: "E-commerce", website: "https://www.flipkart.com/", careersPage: "https://www.flipkartcareers.com/" },
  { name: "Google", slug: "google", industry: "Software and Cloud", website: "https://www.google.com/", careersPage: "https://careers.google.com/" },
  { name: "Intuit", slug: "intuit", industry: "Financial Software", website: "https://www.intuit.com/", careersPage: "https://jobs.intuit.com/" },
  { name: "Microsoft", slug: "microsoft", industry: "Software and Cloud", website: "https://www.microsoft.com/", careersPage: "https://careers.microsoft.com/" },
  { name: "NVIDIA", slug: "nvidia", industry: "Semiconductors and AI", website: "https://www.nvidia.com/", careersPage: "https://www.nvidia.com/en-us/about-nvidia/careers/" },
  { name: "Oracle", slug: "oracle", industry: "Software and Cloud", website: "https://www.oracle.com/", careersPage: "https://www.oracle.com/careers/" },
  { name: "PhonePe", slug: "phonepe", industry: "FinTech", website: "https://www.phonepe.com/", careersPage: "https://www.phonepe.com/careers/" },
  { name: "Razorpay", slug: "razorpay", industry: "FinTech", website: "https://razorpay.com/", careersPage: "https://razorpay.com/careers/" },
  { name: "Salesforce", slug: "salesforce", industry: "Software and Cloud", website: "https://www.salesforce.com/", careersPage: "https://www.salesforce.com/company/careers/" },
  { name: "ServiceNow", slug: "servicenow", industry: "Software and Cloud", website: "https://www.servicenow.com/", careersPage: "https://careers.servicenow.com/" },
  { name: "Swiggy", slug: "swiggy", industry: "Technology and Delivery", website: "https://www.swiggy.com/", careersPage: "https://careers.swiggy.in/" },
  { name: "Uber", slug: "uber", industry: "Technology and Mobility", website: "https://www.uber.com/", careersPage: "https://jobs.uber.com/en/" },
  { name: "Walmart Global Tech", slug: "walmart-global-tech", industry: "Retail Technology", website: "https://tech.walmart.com/", careersPage: "https://careers.walmart.com/" }
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
  const companies = [];
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
        companies.push({
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
  if (companies.length < 200) {
    throw new Error(`Company source provided only ${companies.length} entries with official links; at least 200 are required.`);
  }
  return companies;
}

const sheetData = JSON.parse(await readFile(new URL("../../client/src/data/studyPlanSheet.json", import.meta.url), "utf8"));
try {
  await connectDB();

  if (!process.argv.includes("--dsa-only")) {
    const sourcedCompanies = await communityTechCompanies();
    const catalog = [...new Map([...companyDirectory, ...sourcedCompanies].map(company => [company.slug, company])).values()];
    const companyResults = await Company.bulkWrite(catalog.map(company => ({
      updateOne: {
        filter: { slug: company.slug },
        update: { $setOnInsert: company },
        upsert: true
      }
    })));
    console.log(`Company directory source contains ${sourcedCompanies.length} employers; inserted ${companyResults.upsertedCount} new records.`);
  }

  await Problem.updateMany(
    {
      archived: false,
      platform: "LeetCode",
      createdBy: { $exists: false }
    },
    { $set: { archived: true } }
  );
  await Problem.bulkWrite(sheetData.dsaProblems.map(problem => ({
    updateOne: {
      filter: { sourceKey: problem.sourceKey },
      update: {
        $set: {
          title: problem.sheetTitle || problem.title,
          sourceKey: problem.sourceKey,
          topic: problem.topic,
          pattern: problem.pattern,
          difficulty: problem.difficulty,
          platform: problem.platform,
          url: problem.url,
          archived: false
        }
      },
      upsert: true
    }
  })), { ordered: true });

  const sourceKeys = sheetData.dsaProblems.map(problem => problem.sourceKey);
  const seededProblems = await Problem.find({ sourceKey: { $in: sourceKeys } }).select("_id sourceKey url").lean();
  const problemIdBySourceKey = new Map(seededProblems.map(problem => [problem.sourceKey, problem._id]));
  if (problemIdBySourceKey.size !== sheetData.dsaProblems.length) {
    throw new Error(`Only ${problemIdBySourceKey.size} of ${sheetData.dsaProblems.length} sheet problems are available after import.`);
  }

  const existingDays = new Map((await RoadmapDay.find().sort({ day: 1 })).map(day => [day.day, day]));
  const dsaByDay = new Map();
  for (const problem of sheetData.dsaProblems) {
    const problems = dsaByDay.get(problem.day) || [];
    problems.push(problem);
    dsaByDay.set(problem.day, problems);
  }

  for (const plan of sheetData.studyDays) {
    const day = existingDays.get(plan.day) || new RoadmapDay({ day: plan.day, tasks: [] });
    const lessons = plan.lessons || [];
    const topics = lessons.map(lesson => lesson.title);
    const lessonText = lessons.map(lesson => lesson.description).filter(Boolean).join(" ");
    day.phase = plan.phase;
    day.title = topics.join(" · ") || plan.title;
    day.studyDate = plan.date;
    day.resource = plan.resource;
    day.level = plan.day <= 40 ? "Beginner" : plan.day <= 90 ? "Intermediate" : "Advanced";
    day.topics = topics;
    day.lesson = lessonText;

    let studyTask = day.tasks.find(task => !task.problems?.length && task.title.startsWith("Study:"));
    if (!studyTask) studyTask = day.tasks.create({});
    studyTask.title = `Study: ${topics.join(" · ") || plan.title}`;
    studyTask.description = lessonText;
    studyTask.xp = 5;

    const dailyProblems = dsaByDay.get(plan.day) || [];
    if (dailyProblems.length !== 5) {
      throw new Error(`Study day ${plan.day} has ${dailyProblems.length} DSA problems; the sheet requires five.`);
    }
    let dsaTask = day.tasks.find(task => task.title.startsWith("DSA practice:"));
    if (!dsaTask) dsaTask = day.tasks.create({});
    dsaTask.title = `DSA practice: ${[...new Set(dailyProblems.map(problem => problem.topic))].join(", ")}`;
    dsaTask.description = "Solve the five problems assigned in the study-plan sheet.";
    dsaTask.xp = 0;
    dsaTask.problems = dailyProblems.map(problem => problemIdBySourceKey.get(problem.sourceKey));
    day.tasks = [studyTask, dsaTask];
    await day.save();
  }

  const activeSheetProblems = await Problem.countDocuments({
    archived: false,
    sourceKey: { $in: sourceKeys }
  });
  if (activeSheetProblems !== sheetData.dsaProblems.length) {
    throw new Error(`DSA library has ${activeSheetProblems} active sheet problems; ${sheetData.dsaProblems.length} are required.`);
  }
  console.log(`Imported ${activeSheetProblems} sheet DSA problems and ${sheetData.studyDays.length} study days.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
