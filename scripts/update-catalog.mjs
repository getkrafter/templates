#!/usr/bin/env node
/**
 * Writes `catalog.json` from the template packages under `templates/`.
 *
 *   node scripts/update-catalog.mjs            # regenerate catalog.json
 *   node scripts/update-catalog.mjs --check     # verify it, touch nothing
 *
 * One entry per `templates/<id>/template.json`, ordered by id so the file is
 * deterministic. Per entry:
 *
 * | field        | comes from                                                   |
 * |--------------|--------------------------------------------------------------|
 * | id           | the manifest (and it must equal the folder name)             |
 * | name         | the manifest                                                 |
 * | description  | the manifest (`""` when it has none — the field is optional)  |
 * | author       | the manifest, passed through unchanged                       |
 * | license      | the manifest                                                 |
 * | official     | whether the id is listed in `official.json`                  |
 * | layout       | the manifest's `layout.mode`                                 |
 * | source       | `gh:getkrafter/templates/templates/<id>`                     |
 * | commit       | `git log -1 --format=%H -- templates/<id>`                    |
 * | version      | the manifest                                                 |
 * | previewUrl   | GitHub raw URL for `preview.png` at `commit`, if it exists   |
 *
 * `commit` falls back to `git rev-parse HEAD` when the folder has no commit of
 * its own yet (a template added in the working tree), so a fresh clone still
 * produces a valid file. `--check` reads no git at all: a pull request is
 * checked for *manifest*-derived drift, and `commit`/`previewUrl` are CI's job
 * on merge (see .github/workflows/catalog.yml).
 *
 * No dependencies — the structural checks below are a hand-rolled subset of
 * `schema/catalog.schema.json`, and the catalog job also validates the written
 * file with `npx ajv-cli` against that schema.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_FILE = path.join(ROOT, "catalog.json");
const OFFICIAL_FILE = path.join(ROOT, "official.json");
const TEMPLATES_DIR = path.join(ROOT, "templates");

/** Keep in step with the `source` pattern in the schema. */
const REPO = "getkrafter/templates";
const SCHEMA_REF = "./schema/catalog.schema.json";

const PATTERN = {
  id: /^[a-z][a-z0-9-]{1,63}$/,
  version: /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
  commit: /^[0-9a-f]{40}$/,
  source: /^gh:[^/]+\/[^/]+\/templates\/[a-z0-9-]+$/,
  url: /^https?:\/\//,
  generatedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
};

const ENTRY_KEYS = [
  "id",
  "name",
  "description",
  "author",
  "license",
  "official",
  "layout",
  "source",
  "commit",
  "version",
  "previewUrl",
];
const OPTIONAL_ENTRY_KEYS = new Set(["previewUrl"]);
/** What a pull request owns. `commit` and `previewUrl` are written on merge. */
const AUTHORED_KEYS = ENTRY_KEYS.filter((key) => key !== "commit" && key !== "previewUrl");

// ── Reading ──────────────────────────────────────────────────────────

/** Parsed JSON, or `undefined` when the file does not exist. */
function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${path.relative(ROOT, file)} is not valid JSON — ${error.message}`);
  }
}

/** Template ids, ascending: every `templates/<id>/template.json` there is. */
function templateIds() {
  let entries;
  try {
    entries = fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(TEMPLATES_DIR, id, "template.json")))
    .sort();
}

/** The ids maintainers have marked official. Absent file means "none". */
function officialIds() {
  const list = readJson(OFFICIAL_FILE) ?? [];
  if (!Array.isArray(list) || list.some((id) => typeof id !== "string")) {
    fail("official.json must be an array of template ids");
  }
  return new Set(list);
}

// ── git ──────────────────────────────────────────────────────────────

function git(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/** Lazily resolved so a run with no templates never shells out to git. */
let headCommitCache;
function headCommit() {
  if (headCommitCache === undefined) {
    try {
      headCommitCache = git(["rev-parse", "HEAD"]);
    } catch {
      headCommitCache = "";
    }
  }
  return headCommitCache;
}

/** The last commit that touched `templates/<id>/`, or HEAD, or "". */
function commitFor(id) {
  let own = "";
  try {
    own = git(["log", "-1", "--format=%H", "--", `templates/${id}`]);
  } catch {
    own = "";
  }
  return own || headCommit();
}

// ── Building ─────────────────────────────────────────────────────────

/**
 * One catalog entry per template, in schema key order.
 *
 * With `withCommits: false` the two CI-written fields are left off, which is
 * what `--check` compares against.
 */
function buildEntries({ withCommits }) {
  const official = officialIds();

  return templateIds().map((id) => {
    const file = path.join(TEMPLATES_DIR, id, "template.json");
    const manifest = readJson(file);
    const where = `templates/${id}/template.json`;

    if (manifest === undefined || typeof manifest !== "object") fail(`${where} is missing or not an object`);
    if (manifest.id !== id) fail(`${where}: id "${manifest.id}" does not match its folder name "${id}"`);

    const entry = {
      id,
      name: manifest.name,
      description: manifest.description ?? "",
      author: manifest.author,
      license: manifest.license,
      official: official.has(id),
      layout: manifest.layout?.mode,
      source: `gh:${REPO}/templates/${id}`,
      version: manifest.version,
    };

    if (withCommits) {
      const commit = commitFor(id);
      if (!commit) {
        fail(
          `templates/${id}: no commit to record — commit the repository before writing the catalog ` +
            `(\`commit\` is the last commit that touched the folder)`,
        );
      }
      entry.commit = commit;
      if (fs.existsSync(path.join(TEMPLATES_DIR, id, "preview.png"))) {
        // raw.githubusercontent.com, not a third-party CDN: immutable at a
        // commit, sub-second, and the same host the app fetches packages from.
        entry.previewUrl = `https://raw.githubusercontent.com/${REPO}/${commit}/templates/${id}/preview.png`;
      }
    }

    // Schema key order, so the written file is byte-stable.
    return Object.fromEntries(
      ENTRY_KEYS.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]),
    );
  });
}

// ── Validating ───────────────────────────────────────────────────────

/** A hand-rolled subset of schema/catalog.schema.json. Returns the problems. */
function validateCatalog(catalog) {
  const problems = [];
  const bad = (message) => problems.push(message);

  if (catalog === null || typeof catalog !== "object" || Array.isArray(catalog)) {
    return ["catalog.json must be an object"];
  }
  for (const key of Object.keys(catalog)) {
    if (!["$schema", "generatedAt", "templates"].includes(key)) bad(`unknown top-level key "${key}"`);
  }
  if (typeof catalog.generatedAt !== "string" || !PATTERN.generatedAt.test(catalog.generatedAt)) {
    bad(`generatedAt must be an RFC 3339 date-time, got ${JSON.stringify(catalog.generatedAt)}`);
  }
  if (!Array.isArray(catalog.templates)) return [...problems, "templates must be an array"];

  const seen = new Set();
  catalog.templates.forEach((entry, index) => {
    const at = `templates[${index}]`;
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      bad(`${at} must be an object`);
      return;
    }
    for (const key of Object.keys(entry)) {
      if (!ENTRY_KEYS.includes(key)) bad(`${at}: unknown key "${key}"`);
    }
    for (const key of ENTRY_KEYS) {
      if (!OPTIONAL_ENTRY_KEYS.has(key) && entry[key] === undefined) bad(`${at}: missing "${key}"`);
    }

    const str = (key, pattern) => {
      const value = entry[key];
      if (value === undefined) return;
      if (typeof value !== "string" || value === "") {
        bad(`${at}.${key} must be a non-empty string, got ${JSON.stringify(value)}`);
        return;
      }
      if (pattern && !pattern.test(value)) bad(`${at}.${key} "${value}" does not match ${pattern}`);
    };

    str("id", PATTERN.id);
    str("name");
    str("license");
    str("source", PATTERN.source);
    str("commit", PATTERN.commit);
    str("version", PATTERN.version);
    str("previewUrl", PATTERN.url);

    if (typeof entry.description !== "string") bad(`${at}.description must be a string`);
    if (typeof entry.official !== "boolean") bad(`${at}.official must be a boolean`);
    if (!["flow", "grid"].includes(entry.layout)) {
      bad(`${at}.layout must be "flow" or "grid", got ${JSON.stringify(entry.layout)}`);
    }

    const author = entry.author;
    if (author === null || typeof author !== "object" || Array.isArray(author)) {
      bad(`${at}.author must be an object`);
    } else {
      if (typeof author.name !== "string" || author.name === "") bad(`${at}.author.name must be a non-empty string`);
      if (author.url !== undefined && (typeof author.url !== "string" || !PATTERN.url.test(author.url))) {
        bad(`${at}.author.url must be an http(s) URL`);
      }
      for (const key of Object.keys(author)) {
        if (!["name", "url"].includes(key)) bad(`${at}.author: unknown key "${key}"`);
      }
    }

    if (typeof entry.id === "string") {
      if (seen.has(entry.id)) bad(`${at}: duplicate id "${entry.id}"`);
      seen.add(entry.id);
      if (entry.source !== `gh:${REPO}/templates/${entry.id}`) {
        bad(`${at}.source must be "gh:${REPO}/templates/${entry.id}"`);
      }
    }
  });

  return problems;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Key-order-independent comparison, so a hand-edited entry still compares. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const pick = (entry, keys) => Object.fromEntries(keys.filter((k) => entry[k] !== undefined).map((k) => [k, entry[k]]));

function fail(message) {
  process.stderr.write(`catalog: ${message}\n`);
  process.exit(1);
}

function serialize(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

// ── Modes ────────────────────────────────────────────────────────────

/** Fails when an authored field of an existing entry drifted from its manifest. */
function check() {
  const current = readJson(CATALOG_FILE);
  if (current === undefined) fail("catalog.json is missing");

  const problems = validateCatalog(current).map((p) => `catalog.json: ${p}`);
  const expected = new Map(buildEntries({ withCommits: false }).map((entry) => [entry.id, entry]));
  const listed = new Set();

  for (const entry of Array.isArray(current.templates) ? current.templates : []) {
    if (typeof entry?.id !== "string") continue;
    listed.add(entry.id);
    const want = expected.get(entry.id);
    if (want === undefined) {
      problems.push(`catalog.json lists "${entry.id}", but templates/${entry.id}/template.json does not exist`);
      continue;
    }
    for (const key of AUTHORED_KEYS) {
      if (!same(pick(entry, [key]), pick(want, [key]))) {
        problems.push(
          `catalog.json: ${entry.id}.${key} is ${JSON.stringify(entry[key])}, ` +
            `the manifest says ${JSON.stringify(want[key])} — run \`npm run catalog\``,
        );
      }
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`catalog: ${problem}\n`);
    process.stderr.write(`catalog: ${problems.length} problem(s)\n`);
    process.exit(1);
  }

  const pending = [...expected.keys()].filter((id) => !listed.has(id));
  for (const id of pending) {
    process.stderr.write(`catalog: ${id} is not in catalog.json yet — the catalog job adds it on merge\n`);
  }
  process.stderr.write(
    `catalog: ok — ${listed.size} entr${listed.size === 1 ? "y" : "ies"} match their manifests` +
      `${pending.length > 0 ? `, ${pending.length} pending` : ""}\n`,
  );
}

function write() {
  const templates = buildEntries({ withCommits: true });
  const previousText = fs.existsSync(CATALOG_FILE) ? fs.readFileSync(CATALOG_FILE, "utf8") : undefined;
  const previous = readJson(CATALOG_FILE);

  const catalog = {
    $schema: SCHEMA_REF,
    // Only moves when the content does, so the catalog job's "did anything
    // change?" guard stays meaningful.
    generatedAt:
      previous !== undefined && same(previous.templates, templates) && PATTERN.generatedAt.test(previous.generatedAt ?? "")
        ? previous.generatedAt
        : new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    templates,
  };

  const problems = validateCatalog(catalog);
  if (problems.length > 0) {
    for (const problem of problems) process.stderr.write(`catalog: ${problem}\n`);
    fail(`refusing to write an invalid catalog (${problems.length} problem(s))`);
  }

  const text = serialize(catalog);
  const count = `${templates.length} template${templates.length === 1 ? "" : "s"}`;
  if (text === previousText) {
    process.stderr.write(`catalog: unchanged — ${count}\n`);
    return;
  }
  fs.writeFileSync(CATALOG_FILE, text);
  process.stderr.write(`catalog: wrote catalog.json — ${count}\n`);
}

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== "--check");
if (unknown.length > 0) fail(`unknown argument${unknown.length === 1 ? "" : "s"}: ${unknown.join(" ")}`);

if (args.includes("--check")) check();
else write();
