import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REPORTS_DIR = join(import.meta.dirname, "../../reports");
const OUTPUT = join(import.meta.dirname, "../src/data/projects.json");

interface Project {
  rank: number;
  name: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  track: string;
  trackNumber: number;
  scores: {
    technicity: number;
    creativity: number;
    usefulness: number;
    alignment: number;
    total: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  specialChallenges: string[];
  flags: string[];
  reportFile: string;
}

function extractBetween(text: string, startMarker: string, endMarker: string): string {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return "";
  const contentStart = startIdx + startMarker.length;
  const endIdx = text.indexOf(endMarker, contentStart);
  if (endIdx === -1) return text.slice(contentStart).trim();
  return text.slice(contentStart, endIdx).trim();
}

function extractBullets(text: string, sectionHeader: string, nextHeader: string): string[] {
  const section = extractBetween(text, sectionHeader, nextHeader);
  return section
    .split("\n")
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l.length > 0);
}

function parseTrack(trackLine: string): { track: string; trackNumber: number } {
  const match = trackLine.match(/Track\s+(\d)/);
  const trackNumber = match ? parseInt(match[1]) : 0;

  if (trackLine.includes("Anything Goes")) return { track: "Anything Goes (AWS)", trackNumber: 1 };
  if (trackLine.includes("Fine-Tuning")) return { track: "Fine-Tuning (W&B)", trackNumber: 2 };
  if (trackLine.includes("On Device")) return { track: "On Device (NVIDIA)", trackNumber: 3 };
  return { track: trackLine.replace(/^\*\*Track:\*\*\s*/, ""), trackNumber };
}

function parseScores(text: string): Project["scores"] {
  const scores = { technicity: 0, creativity: 0, usefulness: 0, alignment: 0, total: 0 };
  const tableSection = extractBetween(text, "## Scores", "**Total:");

  for (const line of tableSection.split("\n")) {
    const match = line.match(/\|\s*(\w[\w\s]*?)\s*\|\s*(\d+)\s*\|/);
    if (!match) continue;
    const [, criterion, score] = match;
    const s = parseInt(score!);
    const key = criterion!.toLowerCase().trim();
    if (key.startsWith("techni")) scores.technicity = s;
    else if (key.startsWith("creati")) scores.creativity = s;
    else if (key.startsWith("useful")) scores.usefulness = s;
    else if (key.startsWith("track") || key.startsWith("align")) scores.alignment = s;
  }

  const totalMatch = text.match(/\*\*Total:\s*(\d+)\/100\*\*/);
  scores.total = totalMatch ? parseInt(totalMatch[1]) : scores.technicity + scores.creativity + scores.usefulness + scores.alignment;

  return scores;
}

function parseSpecialChallenges(text: string): string[] {
  const section = extractBetween(text, "## Special Challenge Eligibility", "---");
  if (!section || section.toLowerCase().includes("none identified")) return [];

  return section
    .split("\n")
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

async function parseReport(filePath: string, fileName: string): Promise<Project | null> {
  const text = await readFile(filePath, "utf-8");

  // Extract repo URL
  const repoMatch = text.match(/\*\*Repository:\*\*\s*(https:\/\/github\.com\/[^\s\n]+)/);
  if (!repoMatch) return null;
  const repoUrl = repoMatch[1];
  const urlParts = repoUrl.replace("https://github.com/", "").split("/");
  const repoOwner = urlParts[0];
  const repoName = urlParts[1];

  // Extract name from title
  const titleMatch = text.match(/^#\s+Judge Report:\s*(.+?)$/m);
  const name = titleMatch ? titleMatch[1].replace(/\s*[—–-]\s*.+$/, "").trim() : repoName;

  // Extract track
  const trackMatch = text.match(/\*\*Track:\*\*\s*(.+?)$/m);
  const { track, trackNumber } = trackMatch ? parseTrack(trackMatch[1]) : { track: "Unknown", trackNumber: 0 };

  // Extract scores
  const scores = parseScores(text);

  // Extract summary
  const summary = extractBetween(text, "## Summary\n", "\n## Scores");

  // Extract strengths and improvements
  const strengths = extractBullets(text, "## Strengths\n", "\n## Areas for Improvement");
  const improvements = extractBullets(text, "## Areas for Improvement\n", "\n## Detailed Reasoning");

  // Extract special challenges
  const specialChallenges = parseSpecialChallenges(text);

  // Detect flags
  const flags: string[] = [];
  if (text.toLowerCase().includes("conflict of interest")) flags.push("COI");
  if (text.match(/no mistral/i) || text.match(/does not use mistral/i) || text.match(/uses (?:claude|openai|azure)/i)) flags.push("No Mistral");
  if (text.match(/frontend only/i) || text.match(/partial submission/i)) flags.push("Partial");

  return {
    rank: 0,
    name,
    repoUrl,
    repoOwner,
    repoName,
    track,
    trackNumber,
    scores,
    summary,
    strengths,
    improvements,
    specialChallenges,
    flags,
    reportFile: fileName,
  };
}

async function main() {
  const files = (await readdir(REPORTS_DIR)).filter((f) => f.startsWith("judge_") && f.endsWith(".md"));

  const projects: Project[] = [];
  for (const file of files) {
    const project = await parseReport(join(REPORTS_DIR, file), file);
    if (project) projects.push(project);
  }

  // Sort by total score descending; for ties, COI-flagged projects go after non-flagged
  projects.sort((a, b) => {
    if (b.scores.total !== a.scores.total) return b.scores.total - a.scores.total;
    const aCoi = a.flags.includes("COI") ? 1 : 0;
    const bCoi = b.flags.includes("COI") ? 1 : 0;
    return aCoi - bCoi;
  });
  let rank = 1;
  for (let i = 0; i < projects.length; i++) {
    if (i > 0 && projects[i].scores.total < projects[i - 1].scores.total) {
      rank = i + 1;
    }
    projects[i].rank = rank;
  }

  await writeFile(OUTPUT, JSON.stringify(projects, null, 2));
  console.log(`Parsed ${projects.length} projects -> ${OUTPUT}`);
}

main();
