'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function hashSkillFolder(directory) {
  const files = [];
  function collect(current, prefix = '') {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') collect(fullPath, relativePath);
      else if (entry.isFile()) files.push({ relativePath, content: fs.readFileSync(fullPath) });
    }
  }
  collect(directory);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest('hex');
}

function skillDirectories(skillsRoot) {
  return fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

function checkSkills(root = ROOT) {
  const errors = [];
  const lockPath = path.join(root, 'skills-lock.json');
  let lock;
  try { lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); }
  catch { return ['skills-lock.json is missing or invalid']; }
  if (lock.version !== 1 || !lock.sourceSnapshot || !lock.skills || typeof lock.skills !== 'object') return ['skills-lock.json has an unsupported shape'];
  const skillsRoot = path.join(root, '.agents', 'skills');
  const locked = Object.keys(lock.skills).sort();
  const present = skillDirectories(skillsRoot);
  for (const name of present.filter((name) => !locked.includes(name))) errors.push(`${name}: canonical skill is not locked`);
  for (const name of locked.filter((name) => !present.includes(name))) errors.push(`${name}: locked skill folder is missing`);
  for (const [name, entry] of Object.entries(lock.skills)) {
    const directory = path.join(skillsRoot, name);
    if (!entry.source || !entry.sourcePath || !entry.license || !entry.computedHash) errors.push(`${name}: provenance metadata is incomplete`);
    if (!fs.existsSync(path.join(directory, 'SKILL.md'))) { errors.push(`${name}: SKILL.md is missing`); continue; }
    if (hashSkillFolder(directory) !== entry.computedHash) errors.push(`${name}: committed content differs from its locked hash`);
    const link = path.join(root, '.claude', 'skills', name);
    const expected = `../../.agents/skills/${name}`;
    try {
      if (fs.readlinkSync(link) !== expected || !fs.existsSync(link)) errors.push(`${name}: Claude link does not resolve to ${expected}`);
    } catch { errors.push(`${name}: Claude link is missing`); }
  }
  return errors;
}

if (process.argv.includes('--hash')) {
  const root = path.join(ROOT, '.agents', 'skills');
  for (const name of skillDirectories(root)) process.stdout.write(`${name} ${hashSkillFolder(path.join(root, name))}\n`);
} else {
  const errors = checkSkills();
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else process.stdout.write('Skill provenance, hashes, and Claude links match.\n');
}

module.exports = { checkSkills, hashSkillFolder };
