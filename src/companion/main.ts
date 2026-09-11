// This entry is compiled separately for Node by esbuild. Runtime inputs are
// validated by the shared versioned contracts before they are persisted.
// @ts-nocheck
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  assertKnowledgeCandidate,
  assertKnowledgeDecision,
  assertLearningEnvelope,
  buildKnowledgeDecision,
  buildMultiFileReviewReport,
  buildReferencePack,
  compileTeamKnowledgePack,
  knowledgeDomainForContext,
  generateCandidateDrafts,
  reviseKnowledgeCandidate,
} from "../core/knowledge-loop";
import { parseFigmaSourceUrl, referencePackFromFigmaRest, validateReviewBatch } from "../core/review-source";
import { assertContract } from "../core/schema";
import { hashValue } from "../core/stable";

const ROOT = process.cwd();
const KNOWLEDGE_ROOT = join(ROOT, "knowledge");
const CANDIDATES_PATH = join(KNOWLEDGE_ROOT, "candidates", "current.json");
const TEAM_PACK_PATH = join(KNOWLEDGE_ROOT, "releases", "team-knowledge-pack.v1.json");
const BUNDLED_TEAM_PACK_PATH = join(ROOT, "src", "generated", "team-knowledge.pack.json");

function args(argv) {
  const [area, action, ...tail] = argv;
  const values = {};
  const positional = [];
  for (let index = 0; index < tail.length; index += 1) {
    const value = tail[index];
    if (value?.startsWith("--")) {
      const key = value.slice(2);
      const next = tail[index + 1];
      if (!next || next.startsWith("--")) values[key] = true;
      else { values[key] = next; index += 1; }
    } else positional.push(value);
  }
  return { area, action, values, positional };
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
}

async function jsonFiles(path) {
  let entries = [];
  try { entries = await readdir(path, { withFileTypes: true }); } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).sort((a, b) => a.name.localeCompare(b.name)).map((entry) => json(join(path, entry.name))));
}

async function figmaFetch(fileKey, endpoint = "") {
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error("FIGMA_TOKEN is required by the local companion");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`https://api.figma.com/v1/files/${encodeURIComponent(fileKey)}${endpoint}`, {
      headers: { "X-Figma-Token": token, Accept: "application/json" },
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Figma API returned HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 25_000_000) throw new Error("Figma response exceeds the 25 MB safety limit");
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > 25_000_000) throw new Error("Figma response exceeds the 25 MB safety limit");
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSource(rawUrl, includeVariables) {
  const { fileKey } = parseFigmaSourceUrl(rawUrl);
  const file = await figmaFetch(fileKey);
  let localVariables;
  let variableWarning;
  if (includeVariables) {
    try { localVariables = await figmaFetch(fileKey, "/variables/local"); }
    catch (error) { variableWarning = error instanceof Error ? error.message : String(error); }
  }
  return { file, localVariables, variableWarning };
}

async function makePack(options) {
  if (!options.url || !options["source-id"] || !options["project-scope"] || !options.role || !options.out) {
    throw new Error("pack requires --url, --source-id, --project-scope, --role, and --out");
  }
  if (options.role !== "style-guide" && options.role !== "reference") throw new Error("pack role must be style-guide or reference");
  const fetched = await fetchSource(options.url, true);
  const pack = referencePackFromFigmaRest({
    sourceId: options["source-id"],
    projectScope: options["project-scope"],
    role: options.role,
    file: fetched.file,
    localVariables: fetched.localVariables,
    packVersion: options["pack-version"] ?? "1.0.0",
  });
  await atomicJson(resolve(options.out), pack);
  process.stdout.write(`${resolve(options.out)}\n`);
}

async function ingest(options) {
  if (!options.config || !options.out) throw new Error("ingest requires --config and --out");
  const batch = validateReviewBatch(await json(resolve(options.config)));
  const output = resolve(options.out);
  const results = [];
  const targets = [];
  const references = [];
  for (const sourceInput of batch.sources) {
    try {
      if (sourceInput.role === "target") {
        const readinessProfile = sourceInput.readinessProfilePath
          ? await json(resolve(dirname(resolve(options.config)), sourceInput.readinessProfilePath))
          : sourceInput.readinessProfile;
        assertContract("readiness-profile", readinessProfile);
      }
      const fetched = await fetchSource(sourceInput.url, sourceInput.role !== "target");
      if (sourceInput.role === "target") {
        if (!sourceInput.reportPath) throw new Error("Remote target facts are insufficient for grading; provide reportPath from an unchanged local plugin review");
        const report = await json(resolve(dirname(resolve(options.config)), sourceInput.reportPath));
        assertContract("readiness-report", report);
        const source = {
          schemaVersion: 1,
          sourceId: sourceInput.sourceId,
          projectScope: sourceInput.projectScope,
          role: "target",
          contentDigest: hashValue({ sourceId: sourceInput.sourceId, documentVersion: fetched.file.version ?? "unavailable" }),
          completeness: { complete: true, availableDomains: ["tokens", "components", "naming", "layout", "breakpoints", "accessibility"], warnings: [] },
        };
        assertContract("review-source", source);
        targets.push({ source, report });
        await atomicJson(join(output, "sources", `${source.sourceId}.json`), source);
      } else {
        const pack = referencePackFromFigmaRest({ sourceId: sourceInput.sourceId, projectScope: batch.projectScope, role: sourceInput.role, file: fetched.file, localVariables: fetched.localVariables });
        await atomicJson(join(output, "packs", `${sourceInput.sourceId}.json`), pack);
        references.push({ sourceId: sourceInput.sourceId, packDigest: pack.digest });
      }
      results.push({ sourceId: sourceInput.sourceId, role: sourceInput.role, status: "complete" });
    } catch (error) {
      results.push({ sourceId: sourceInput.sourceId, role: sourceInput.role, status: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }
  let report;
  if (targets.length > 0 && targets.length === batch.sources.filter((source) => source.role === "target").length) {
    report = buildMultiFileReviewReport({ projectScope: batch.projectScope, targets, references, warnings: results.filter((result) => result.status === "failed").map((result) => `${result.sourceId} failed`) });
    await atomicJson(join(output, "multi-file-review.json"), report);
  }
  const manifest = { schemaVersion: 1, projectScope: batch.projectScope, results, ...(report ? { reportDigest: report.digest } : {}) };
  await atomicJson(join(output, "batch-result.json"), manifest);
  process.stdout.write(`${join(output, "batch-result.json")}\n`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 2;
}

async function importLearning(files) {
  if (files.length === 0) throw new Error("learning import requires at least one envelope file");
  let imported = 0;
  for (const path of files) {
    const envelope = await json(resolve(path));
    assertLearningEnvelope(envelope);
    const destination = join(KNOWLEDGE_ROOT, "observations", `${envelope.digest.replace(":", "-")}.json`);
    try {
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
      imported += 1;
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
  }
  await rebuildKnowledge();
  process.stdout.write(`${imported} new unique contribution${imported === 1 ? "" : "s"}\n`);
}

async function loadCandidates() {
  try {
    const candidates = await json(CANDIDATES_PATH);
    for (const candidate of candidates) assertKnowledgeCandidate(candidate);
    return candidates;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function loadDecisions() {
  const decisions = await jsonFiles(join(KNOWLEDGE_ROOT, "decisions"));
  for (const decision of decisions) assertKnowledgeDecision(decision);
  return decisions;
}

async function rebuildKnowledge() {
  const envelopes = await jsonFiles(join(KNOWLEDGE_ROOT, "observations"));
  for (const envelope of envelopes) assertLearningEnvelope(envelope);
  const envelopeTime = [...envelopes].map((envelope) => envelope.generatedAt).sort().at(-1) ?? "1970-01-01T00:00:00.000Z";
  const generated = generateCandidateDrafts(envelopes, new Date(envelopeTime));
  const current = await loadCandidates();
  const currentByGroup = new Map(current.map((candidate) => [candidate.groupKey, candidate]));
  const candidates = generated.map((candidate) => {
    const existing = currentByGroup.get(candidate.groupKey);
    if (!existing) return candidate;
    const evidenceUnchanged = JSON.stringify(existing.evidenceEnvelopeDigests) === JSON.stringify(candidate.evidenceEnvelopeDigests)
      && existing.supportCount === candidate.supportCount && existing.contradictCount === candidate.contradictCount;
    return evidenceUnchanged ? existing : candidate;
  });
  await atomicJson(CANDIDATES_PATH, candidates);
  const decisions = await loadDecisions();
  const buildTime = [...decisions.map((decision) => decision.decidedAt), ...candidates.map((candidate) => candidate.generatedAt)].sort().at(-1) ?? "1970-01-01T00:00:00.000Z";
  const teamPack = compileTeamKnowledgePack({ knowledgeVersion: "1.0.0", candidates, decisions, now: new Date(buildTime) });
  await atomicJson(TEAM_PACK_PATH, teamPack);
  await atomicJson(BUNDLED_TEAM_PACK_PATH, teamPack);

  const latest = new Map();
  for (const decision of [...decisions].sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))) latest.set(decision.candidateId, decision);
  const scopes = [...new Set(candidates.map((candidate) => candidate.projectScope))].sort();
  for (const scope of scopes) {
    const approved = candidates.filter((candidate) => {
      const decision = latest.get(candidate.candidateId);
      return candidate.projectScope === scope && decision?.action === "approve" && decision.scope === "project" && decision.candidateDigest === candidate.digest;
    });
    const facts = approved.map((candidate) => ({
      factId: candidate.candidateId,
      domain: knowledgeDomainForContext(candidate.context),
      label: "Approved project guidance",
      guidance: candidate.wording,
      matcher: { kind: "informational" },
      provenance: "approved-project",
      candidateDigest: candidate.digest,
    }));
    const source = {
      schemaVersion: 1,
      sourceId: `project-guidance:${scope}`,
      projectScope: scope,
      role: "style-guide",
      contentDigest: hashValue(approved.map((candidate) => candidate.digest).sort()),
      completeness: { complete: true, availableDomains: [...new Set(facts.map((fact) => fact.domain))].sort(), warnings: [] },
    };
    const pack = buildReferencePack({ packVersion: "1.0.0", source, facts }, new Date(buildTime));
    await atomicJson(join(KNOWLEDGE_ROOT, "project-packs", `${scope}.json`), pack);
  }
  return { envelopes, candidates, decisions, teamPack };
}

function html() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Design Passport Knowledge Review</title><style>
  :root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#21201c;background:#f4f2eb;font-synthesis:none;--ink:#21201c;--muted:#6f6b5e;--line:#ded9c9;--paper:#fffdfa;--brand:#ff5900;--green:#157347;--red:#b42318;--amber:#9a6700}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 75% -10%,#fff0d9 0,transparent 34%),#f4f2eb}button,input,select,textarea{font:inherit}button{cursor:pointer}.topbar{height:82px;padding:0 32px;display:flex;align-items:center;justify-content:space-between;color:#fff;background:var(--ink);border-bottom:4px solid var(--brand)}.brand{display:flex;align-items:center;gap:14px}.mark{width:38px;height:38px;display:grid;place-items:center;color:var(--ink);background:var(--brand);border-radius:10px;font-size:22px;font-weight:900}.eyebrow{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#c7c3b7}.brand h1{margin:2px 0 0;font-size:21px;letter-spacing:-.03em}.local{padding:8px 11px;border:1px solid #5e5b53;border-radius:999px;color:#d7d4ca;font-size:11px}.summary{max-width:1220px;margin:24px auto 16px;padding:0 24px;display:grid;grid-template-columns:1fr repeat(3,minmax(120px,170px));gap:12px}.summary-copy,.metric{padding:16px 18px;background:rgba(255,253,250,.88);border:1px solid var(--line);border-radius:14px}.summary-copy strong,.metric strong{display:block;font-size:17px}.summary-copy span,.metric span{display:block;margin-top:4px;color:var(--muted);font-size:11px;line-height:1.45}.workspace{max-width:1220px;margin:0 auto;padding:0 24px 32px;display:grid;grid-template-columns:292px minmax(0,1fr);gap:16px;align-items:start}.queue,.review{background:var(--paper);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 45px rgba(54,48,31,.08);overflow:hidden}.queue{position:sticky;top:16px}.queue-head{padding:18px;border-bottom:1px solid var(--line)}.queue-head h2{margin:0;font-size:15px}.queue-head p{margin:5px 0 0;color:var(--muted);font-size:11px}.queue-list{max-height:calc(100vh - 230px);overflow:auto;padding:8px}.queue-item{width:100%;padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:4px 8px;text-align:left;color:var(--ink);background:transparent;border:0;border-radius:10px}.queue-item:hover{background:#f5f1e8}.queue-item.active{background:#fff0e6;box-shadow:inset 3px 0 var(--brand)}.queue-item strong{font-size:12px}.queue-item span,.queue-item small{color:var(--muted);font-size:10px}.queue-item .state{align-self:start;padding:3px 6px;border-radius:999px;background:#ede9dd;color:var(--muted)}.queue-item .state.approve{color:var(--green);background:#e8f5ed}.queue-item .state.reject{color:var(--red);background:#feeceb}.queue-item .state.defer{color:var(--amber);background:#fff4cf}.review{min-height:620px}.review-empty{padding:90px 30px;text-align:center;color:var(--muted)}.review-head{padding:22px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:20px}.review-head h2{margin:3px 0 0;font-size:24px;letter-spacing:-.035em}.review-head p{margin:5px 0 0;color:var(--muted);font-size:11px}.draft-ref{height:max-content;padding:6px 9px;color:var(--muted);background:#f1eee6;border-radius:999px;font-size:10px}.review-body{padding:24px;display:grid;gap:20px}.field{display:grid;gap:7px}.field>span{font-size:11px;font-weight:700}.field>small{color:var(--muted);font-size:10px;line-height:1.4}textarea,input,select{width:100%;color:var(--ink);background:#fff;border:1px solid #bdb7a6;border-radius:9px;outline:none}textarea:focus,input:focus,select:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(255,89,0,.12)}textarea{min-height:116px;padding:12px;resize:vertical;line-height:1.5}.wording{font-size:16px;min-height:132px}.exceptions{min-height:84px;font-size:12px}input,select{height:42px;padding:0 11px}.split{display:grid;grid-template-columns:1fr 1fr;gap:14px}.info-card{padding:15px;border:1px solid var(--line);border-radius:12px;background:#faf8f2}.info-card h3{margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.evidence-grid div{padding:9px;background:#fff;border:1px solid var(--line);border-radius:8px}.evidence-grid strong{display:block;font-size:18px}.evidence-grid span{color:var(--muted);font-size:9px}.privacy{margin-top:10px;color:var(--green);font-size:10px;font-weight:700}.decision{padding:18px 24px;background:#f7f4ed;border-top:1px solid var(--line)}.decision-row{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:12px;align-items:end}.actions{display:flex;gap:8px}.button{height:42px;padding:0 14px;border:1px solid #aaa493;border-radius:9px;background:#fff;color:var(--ink);font-weight:650}.button:hover{border-color:#625e53}.button.primary{color:#fff;background:var(--ink);border-color:var(--ink)}.button.danger{color:var(--red)}.previous{margin:12px 0 0;color:var(--muted);font-size:10px}.error{max-width:1220px;margin:24px auto;padding:16px;color:var(--red);background:#feeceb;border:1px solid #f3b6b2;border-radius:12px}@media(max-width:780px){.summary{grid-template-columns:1fr 1fr}.summary-copy{grid-column:1/-1}.workspace{grid-template-columns:1fr}.queue{position:static}.queue-list{max-height:240px}.split,.decision-row{grid-template-columns:1fr}.topbar{padding:0 20px}.local{display:none}}
  </style></head><body><header class="topbar"><div class="brand"><div class="mark">×</div><div><div class="eyebrow">Cumulative · local companion</div><h1>Knowledge Review</h1></div></div><div class="local">Private · loopback only</div></header><section class="summary" id="summary"><div class="summary-copy"><strong>Preparing review queue…</strong><span>Generated guidance stays project-only until a maintainer decides otherwise.</span></div></section><main class="workspace"><aside class="queue"><div class="queue-head"><h2>Draft queue</h2><p>Select one draft to review.</p></div><div class="queue-list" id="queue"></div></aside><section class="review" id="review"><div class="review-empty">Loading generated drafts…</div></section></main><script>
  const cap=new URLSearchParams(location.search).get('cap');const api=(path,options={})=>fetch(path+'?cap='+encodeURIComponent(cap),{...options,headers:{'content-type':'application/json',...(options.headers||{})}}).then(async r=>{const v=await r.json();if(!r.ok)throw new Error(v.error||'Request failed');return v});
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const words=s=>String(s).replace(/^[^:]+:/,'').replace(/styleguide/gi,'style guide').replace(/[._-]+/g,' ').trim().replace(/\\bui\\b/gi,'UI').replace(/\\b\\w/g,c=>c.toUpperCase());
  const ref=s=>{const v=String(s).replace(/^[^:]+:/,'').replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,8).padEnd(8,'0');return v.slice(0,4)+'-'+v.slice(4)};
  const date=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(d):'Date unavailable'};
  const statusLabel=action=>({approve:'Approved',reject:'Rejected',defer:'Deferred'}[action]||words(action));
  const sourceLabel=roles=>roles.includes('style-guide')?'Style guide evidence':roles.includes('reference')?'Reference evidence':'Passport review evidence';
  let state={candidates:[],envelopes:[],decisions:[]};let selectedId;
  const latestDecision=c=>state.decisions.filter(d=>d.candidateId===c.candidateId).sort((a,b)=>a.decidedAt.localeCompare(b.decidedAt)).at(-1);
  const currentDecision=c=>{const d=latestDecision(c);return d&&d.candidateDigest===c.digest?d:undefined};
  function drawSummary(){const reviewed=state.candidates.filter(currentDecision).length;const waiting=state.candidates.length-reviewed;document.querySelector('#summary').innerHTML='<div class="summary-copy"><strong>Human review required</strong><span>Counts show recurrence only. They never approve, rank, publish, or change a grade.</span></div><div class="metric"><strong>'+state.candidates.length+'</strong><span>Generated drafts</span></div><div class="metric"><strong>'+state.envelopes.length+'</strong><span>Unique contributions</span></div><div class="metric"><strong>'+waiting+'</strong><span>Awaiting decision</span></div>'}
  function drawQueue(){const queue=document.querySelector('#queue');queue.innerHTML='';for(const c of state.candidates){const d=currentDecision(c);const stale=latestDecision(c)&&!d;const button=document.createElement('button');button.className='queue-item'+(c.candidateId===selectedId?' active':'');button.innerHTML='<strong>'+esc(words(c.context))+'</strong><span class="state '+(d?d.action:'')+'">'+(d?statusLabel(d.action):stale?'Changed':'Review')+'</span><small>Draft '+ref(c.candidateId)+'</small><small>'+c.evidenceEnvelopeDigests.length+' contribution'+(c.evidenceEnvelopeDigests.length===1?'':'s')+'</small>';button.onclick=()=>{selectedId=c.candidateId;drawQueue();drawReview()};queue.append(button)}}
  function drawReview(){const c=state.candidates.find(item=>item.candidateId===selectedId);const review=document.querySelector('#review');if(!c){review.innerHTML='<div class="review-empty">No generated drafts need review.</div>';return}const decision=currentDecision(c);const stale=latestDecision(c)&&!decision;const decisionLabel=decision?statusLabel(decision.action):'';const decisionScope=decision?.scope==='shared'?'Shared, client-neutral':'Project only';review.innerHTML='<div class="review-head"><div><span class="eyebrow" style="color:#7a7568">Generated guidance · '+esc(sourceLabel(c.sourceRoles))+'</span><h2>'+esc(words(c.context))+'</h2><p>Review the wording, choose its scope, and record a human decision.</p></div><span class="draft-ref">Draft '+ref(c.candidateId)+'</span></div><div class="review-body"><label class="field"><span>Guidance</span><textarea class="wording"></textarea><small>This draft was generated from sanitized evidence. Edit it into clear, reusable guidance.</small></label><div class="split"><label class="field info-card"><span>Publication scope</span><select class="scope"><option value="project">Project only</option><option value="shared">Shared, client-neutral</option></select><small>Project only is the default. Shared guidance requires an explicit choice and repository review.</small></label><div class="info-card"><h3>Evidence summary</h3><div class="evidence-grid"><div><strong>'+c.supportCount+'</strong><span>Supporting</span></div><div><strong>'+c.contradictCount+'</strong><span>Contradictory</span></div><div><strong>'+c.evidenceEnvelopeDigests.length+'</strong><span>Unique contributions</span></div></div><div class="privacy">✓ Privacy validation passed</div></div></div><label class="field"><span>Exceptions</span><textarea class="exceptions" placeholder="Add one exception per line"></textarea><small>Document where this guidance should not apply.</small></label></div><div class="decision"><div class="decision-row"><label class="field"><span>Decision note</span><input class="rationale" placeholder="Why are you making this decision?"></label><div class="actions"><button class="button save">Save edits</button><button class="button primary approve">Approve</button><button class="button danger reject">Reject</button><button class="button defer">Defer</button></div></div>'+(decision?'<p class="previous">Current decision: '+decisionLabel+' · '+decisionScope+' · '+esc(date(decision.decidedAt))+' · Revision '+ref(decision.candidateDigest)+'</p>':stale?'<p class="previous">The draft changed after its last decision and requires review again.</p>':'')+'</div>';review.querySelector('.wording').value=c.wording;review.querySelector('.scope').value=decision?.scope??c.proposedScope;review.querySelector('.exceptions').value=c.exceptions.join('\\n');review.querySelector('.save').onclick=()=>edit(c,review);for(const action of ['approve','reject','defer'])review.querySelector('.'+action).onclick=()=>decide(c,review,action)}
  async function render(){state=await api('/api/state');if(!state.candidates.some(c=>c.candidateId===selectedId))selectedId=state.candidates[0]?.candidateId;drawSummary();drawQueue();drawReview()}
  async function edit(c,review){await api('/api/candidate',{method:'POST',body:JSON.stringify({candidateId:c.candidateId,digest:c.digest,wording:review.querySelector('.wording').value,proposedScope:review.querySelector('.scope').value,exceptions:review.querySelector('.exceptions').value.split('\\n').filter(Boolean)})});await render()}
  async function decide(c,review,action){const input=review.querySelector('.rationale');input.setCustomValidity('');const rationale=input.value.trim();if(!rationale){input.setCustomValidity('Add a short decision note.');input.reportValidity();return}await api('/api/decision',{method:'POST',body:JSON.stringify({candidateId:c.candidateId,candidateDigest:c.digest,action,scope:review.querySelector('.scope').value,rationale})});await render()}
  render().catch(e=>{document.querySelector('#summary').innerHTML='<div class="error">'+esc(e.message)+'</div>'});
  </script></body></html>`;
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body, "utf8") > 100_000) throw new Error("Request body too large");
  }
  return JSON.parse(body || "{}");
}

async function review(options) {
  const token = randomBytes(24).toString("hex");
  await rebuildKnowledge();
  const server = createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address()?.port}`;
    const requestUrl = new URL(request.url ?? "/", origin);
    const fail = (status, message) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify({ error: message })); };
    try {
      if (!/^127\.0\.0\.1(?::\d+)?$/u.test(request.headers.host ?? "")) return fail(403, "Invalid host");
      if (request.headers.origin && request.headers.origin !== origin) return fail(403, "Invalid origin");
      if (requestUrl.searchParams.get("cap") !== token) return fail(403, "Invalid capability token");
      const headers = { "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
      if (request.method === "GET" && requestUrl.pathname === "/") { response.writeHead(200, { ...headers, "content-type": "text/html; charset=utf-8" }); return response.end(html()); }
      if (request.method === "GET" && requestUrl.pathname === "/api/state") {
        const state = await rebuildKnowledge(); response.writeHead(200, { ...headers, "content-type": "application/json" }); return response.end(JSON.stringify(state));
      }
      if (request.method === "POST" && requestUrl.pathname === "/api/candidate") {
        const input = await readBody(request); const candidates = await loadCandidates(); const index = candidates.findIndex((candidate) => candidate.candidateId === input.candidateId && candidate.digest === input.digest);
        if (index < 0) return fail(409, "Candidate changed; reload before editing");
        candidates[index] = reviseKnowledgeCandidate(candidates[index], { wording: input.wording, proposedScope: input.proposedScope, exceptions: input.exceptions });
        await atomicJson(CANDIDATES_PATH, candidates); response.writeHead(200, { ...headers, "content-type": "application/json" }); return response.end(JSON.stringify(candidates[index]));
      }
      if (request.method === "POST" && requestUrl.pathname === "/api/decision") {
        const input = await readBody(request); const candidates = await loadCandidates(); const candidate = candidates.find((item) => item.candidateId === input.candidateId && item.digest === input.candidateDigest);
        if (!candidate) return fail(409, "Candidate changed; reload before deciding");
        if (!["approve", "reject", "defer"].includes(input.action) || !["project", "shared"].includes(input.scope)) return fail(400, "Invalid decision");
        const decision = buildKnowledgeDecision({ decisionId: `decision:${randomUUID()}`, candidateId: candidate.candidateId, candidateDigest: candidate.digest, action: input.action, scope: input.scope, rationale: input.rationale });
        const destination = join(KNOWLEDGE_ROOT, "decisions", `${decision.decisionId}.json`); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, `${JSON.stringify(decision, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" }); await rebuildKnowledge();
        response.writeHead(200, { ...headers, "content-type": "application/json" }); return response.end(JSON.stringify(decision));
      }
      return fail(404, "Not found");
    } catch (error) { return fail(400, error instanceof Error ? error.message : String(error)); }
  });
  server.listen(Number(options.port ?? 0), "127.0.0.1", () => {
    const address = server.address();
    process.stdout.write(`Knowledge Review: http://127.0.0.1:${address.port}/?cap=${token}\n`);
  });
}

function usage() {
  return `Design Passport local companion\n\nCommands:\n  pack create --url URL --source-id ID --project-scope ID --role style-guide|reference --out FILE\n  batch ingest --config FILE --out DIR\n  learning import FILE [FILE...]\n  knowledge build\n  knowledge review [--port 0]\n`;
}

async function main() {
  const command = args(process.argv.slice(2));
  if (command.area === "pack" && command.action === "create") return makePack(command.values);
  if (command.area === "batch" && command.action === "ingest") return ingest(command.values);
  if (command.area === "learning" && command.action === "import") return importLearning([command.action, ...command.positional].filter((value) => value !== "import"));
  if (command.area === "knowledge" && command.action === "build") { const state = await rebuildKnowledge(); process.stdout.write(`${state.candidates.length} candidate draft${state.candidates.length === 1 ? "" : "s"}\n`); return; }
  if (command.area === "knowledge" && command.action === "review") return review(command.values);
  process.stdout.write(usage());
}

main().catch((error) => { process.stderr.write(`Companion error: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
