import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buildPlugin } from "../scripts/build-plugin.mjs";
import { prepareRelease, verifyBuiltGuidance, verifyForPublication, verifyRelease } from "../scripts/conductor-release.mjs";
import { hashValue } from "../src/core/stable";
import { assertTeamKnowledgePack } from "../src/core/knowledge-loop";
import type { PluginToUiMessage } from "../src/plugin/messages";
import { contextFixture } from "./context-cache-fixtures";

const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const firstId = "cc211430-b282-46af-b70d-f510e8749a2c";
const secondId = "8c6ea08d-dcfc-4843-8783-3087bed25062";

function approvedExport(id: string) {
  const entry = {
    candidateId: "candidate:99999999-9999-4999-9999-999999999999", candidateDigest: "h53:00000000000011",
    decisionId: "decision:" + id, domain: "layout", wording: "Use consistent spacing between repeated sections.",
    exceptions: ["The designer may document a deliberate variation."], contexts: ["axis:layout"],
  };
  const material = { schemaVersion: 1, knowledgeVersion: "1.0.0", entries: [entry] };
  const pack = { ...material, generatedAt: "2026-11-25T12:00:00.000Z", digest: hashValue(material) };
  assertTeamKnowledgePack(pack);
  const bytes = Buffer.from(JSON.stringify(pack, null, 2) + "\n");
  return { version:1, exportId:id, packBase64:bytes.toString("base64"), sha256:sha(bytes), approvalIds:[entry.decisionId] };
}

let root: string;
let current: ReturnType<typeof approvedExport>;
let eligible: boolean;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(),"passport-release-"));
  await mkdir(join(root,"knowledge/releases"), {recursive:true});
  await cp("src", join(root,"src"), {recursive:true});
  await cp("package.json",join(root,"package.json"));
  await symlink(join(process.cwd(),"node_modules"),join(root,"node_modules"));
  current=approvedExport(firstId);
  eligible=true;
  vi.stubEnv("DESIGN_PASSPORT_RELEASE_TOKEN","synthetic-maintainer");
  vi.stubGlobal("fetch",vi.fn(async (input:URL,init:RequestInit) => {
    expect(input.origin).toBe("https://conductor.verndale.com");
    expect(input.pathname).toBe("/api/design-passport/releases");
    expect(init.redirect).toBe("error");
    expect(init.headers).toEqual({Authorization:"Bearer synthetic-maintainer"});
    if(init.method==="GET") expect(input.searchParams.get("export")).toBe(current.exportId);
    else expect(init.method).toBe("POST");
    return eligible ? Response.json(current) : new Response(null,{status:409});
  }));
});
afterEach(async () => {
  vi.unstubAllGlobals(); vi.unstubAllEnvs();
  await rm(root,{recursive:true,force:true});
});

it("refuses withdrawn, substituted, corrupt and changed publication artifacts", async () => {
  await prepareRelease(root);
  const define = {__DESIGN_PASSPORT_BUILD_CHANNEL__:JSON.stringify("production"),__DESIGN_PASSPORT_BUILD_SHA__:JSON.stringify("clean-test")};
  await buildPlugin(root,define);
  const code = await readFile(join(root,"dist/code.js"));
  const guidance = await verifyBuiltGuidance(code,root);
  const ui = "<html><title>Test UI</title></html>";
  await writeFile(join(root,"dist/index.html"),ui);
  await writeFile(join(root,"dist/build-metadata.json"),JSON.stringify({schemaVersion:1,buildSha:"clean-test",channel:"production",dirty:false,guidance,artifacts:{codeSha256:sha(code),uiSha256:sha(ui)}}));
  await expect(verifyForPublication(root)).resolves.toBeUndefined();
  eligible=false;
  await expect(verifyForPublication(root)).rejects.toThrow("409");
  eligible=true;
  await writeFile(join(root,"dist/index.html"),ui+"x");
  await expect(verifyForPublication(root)).rejects.toThrow("artifact changed");
  await writeFile(join(root,"dist/index.html"),ui);
  current=approvedExport(secondId);
  await prepareRelease(root);
  await expect(verifyBuiltGuidance(code,root)).rejects.toThrow("different Conductor export");
  current.approvalIds=[];
  await expect(verifyRelease(root)).rejects.toThrow("approval bindings");
  current=approvedExport(secondId);
  current.sha256="0".repeat(64);
  await expect(verifyRelease(root)).rejects.toThrow("digest");
  current=approvedExport(secondId);
  const invalidPack=JSON.parse(Buffer.from(current.packBase64,"base64").toString());
  invalidPack.entries[0].wording="Changed after approval.";
  const bytes=JSON.stringify(invalidPack);
  current.packBase64=Buffer.from(bytes).toString("base64");
  current.sha256=sha(bytes);
  await expect(verifyRelease(root)).rejects.toThrow("semantic digest");
  current=approvedExport(secondId);
  await writeFile(join(root,"src/generated/team-knowledge.pack.json"),"{}");
  await expect(verifyRelease(root)).rejects.toThrow("bundled guidance differs");
},30_000);

it("uses an approved entry and its exception during an offline audit in a built development plugin", async () => {
  await prepareRelease(root);
  await buildPlugin(root,{__DESIGN_PASSPORT_BUILD_CHANNEL__:'"development"',__DESIGN_PASSPORT_BUILD_SHA__:'"offline-fixture"'});
  const previous=Object.getOwnPropertyDescriptor(globalThis,"figma");
  const fixture=contextFixture();
  // The Figma document and client storage are in memory. The compiled plugin
  // runs its actual controller, adapter, audit rules and bundled knowledge.
  const store=new Map<string,unknown>();
  const events:PluginToUiMessage[]=[];
  const offline=vi.fn(()=>{throw Error("Offline");});
  const ui={postMessage:(message:PluginToUiMessage)=>events.push(message),onmessage:undefined as undefined|((message:unknown)=>Promise<void>)};
  const page=fixture.pages[0]!;
  Object.assign(page,{selection:[page.children[0]]});
  const figma={
    ...fixture.figma,
    root:{...fixture.figma.root,getPluginData:()=>"",getSharedPluginData:(_space:string,key:string)=>key==="profile-v3"?JSON.stringify(fixture.readinessProfile):""},
    currentPage:page,editorType:"figma",ui,showUI:()=>{},on:()=>{},loadAllPagesAsync:async()=>{},
    clientStorage:{getAsync:async(key:string)=>store.get(key),setAsync:async(key:string,value:unknown)=>{store.set(key,value);},
      deleteAsync:async(key:string)=>{store.delete(key);},keysAsync:async()=>[...store.keys()]},
  };
  try {
    runInNewContext(await readFile(join(root,"dist/code.js"),"utf8"),{figma,__html__:"",fetch:offline,
      URL,AbortController,TextDecoder,TextEncoder,console:{...console,info:()=>{}},setTimeout,clearTimeout,performance});
    await ui.onmessage!({type:"initialize"});
    await ui.onmessage!({type:"generate-context",regenerate:false});
    await ui.onmessage!({type:"scan",request:{scope:"page",refreshKnowledge:false}});
    const result=events.find(e=>e.type==="scan-result");
    expect(events.filter(e=>e.type==="error")).toEqual([]);
    expect(result?.insights).toEqual(expect.arrayContaining([expect.objectContaining({
      origin:"shared",factId:"candidate:99999999-9999-4999-9999-999999999999",
      message:expect.stringContaining("The designer may document a deliberate variation."),
    })]));
    expect(offline).not.toHaveBeenCalled();
  } finally {
    if (previous) Object.defineProperty(globalThis,"figma",previous);
    else Reflect.deleteProperty(globalThis,"figma");
  }
},30_000);
