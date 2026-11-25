import { hashValue } from "../src/core/stable.ts";
import Ajv2020 from "ajv/dist/2020.js";
import {createRequire} from "node:module";
import {createHash,randomUUID} from "node:crypto";
import {readFile,writeFile,rename} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";

const require=createRequire(import.meta.url);
const validator=new Ajv2020({formats:{"date-time":/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/}});
validator.addSchema(require("../schemas/definitions.schema.json"));
const validatePack=validator.compile(require("../schemas/team-knowledge-pack.schema.json"));

const endpoint="https://conductor.verndale.com/api/design-passport/releases";
const packFiles=["knowledge/releases/team-knowledge-pack.v1.json","src/generated/team-knowledge.pack.json"];
const receiptFile="knowledge/releases/conductor-export.json";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

export function unpackRelease(data) {
  if(data?.version!==1 || typeof data.exportId!=="string" || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(data.exportId) ||
    typeof data.packBase64!=="string" || data.packBase64.length>8_000_000) throw Error("Invalid Conductor export.");
  const bytes=Buffer.from(data.packBase64,"base64");
  if(bytes.toString("base64")!==data.packBase64 || sha256(bytes)!==data.sha256) throw Error("The Conductor export digest does not match its bytes.");
  const pack=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if (!validatePack(pack)) throw Error("The export does not meet the public team knowledge schema.");
  // The v1 Conductor export is already in canonical candidate/context order.
  const {schemaVersion,knowledgeVersion,entries}=pack;
  if (hashValue({schemaVersion,knowledgeVersion,entries}) !== pack.digest)
    throw Error("The public guidance semantic digest does not match the approved content.");
  const ids=pack.entries.map(e=>e.decisionId);
  if(pack.schemaVersion!==1 ||new Set(ids).size!==ids.length || JSON.stringify(ids)!==JSON.stringify(data.approvalIds))throw Error("The export approval bindings do not match the pack.");
  return {bytes,receipt:{version:1,exportId:data.exportId,sha256:data.sha256,approvalIds:ids}};
}

async function retrieve(id) {
  const token=process.env.DESIGN_PASSPORT_RELEASE_TOKEN;
  if(!token)throw Error("The release maintainer credential is required.");
  const url=new URL(endpoint);
  if(id)url.searchParams.set("export",id);
  const res=await fetch(url,{method:id?"GET":"POST",redirect:"error",cache:"no-store",signal:AbortSignal.timeout(20_000),headers:{Authorization:"Bearer "+token}});
  if(!res.ok)throw Error("Conductor refused release verification (HTTP "+res.status+"). Prepare a currently eligible export before publishing.");
  return unpackRelease(await res.json());
}
async function replaceFile(file,value){
  const temp=file+"."+randomUUID()+".tmp";
  await writeFile(temp,value,{flag:"wx"});await rename(temp,file);
}
export async function prepareRelease(root = process.cwd()) {
  const {bytes,receipt}=await retrieve();
  for(const path of packFiles)await replaceFile(join(root,path),bytes);
  await replaceFile(join(root,receiptFile),JSON.stringify(receipt,null,2)+"\n");
}
export async function verifiedReleaseInput(root = process.cwd()) {
  const saved=JSON.parse(await readFile(join(root,receiptFile),"utf8"));
  if(typeof saved.exportId!=="string"||!saved.exportId)throw Error("Prepare a Conductor export first.");
  const {bytes,receipt}=await retrieve(saved.exportId);
  if(receipt.exportId!==saved.exportId || receipt.sha256!==saved.sha256 || JSON.stringify(receipt.approvalIds)!==JSON.stringify(saved.approvalIds))throw Error("The release receipt has changed.");
  for(const path of packFiles)if(!bytes.equals(await readFile(join(root,path))))throw Error("The bundled guidance differs from the verified Conductor export.");
  return {bytes,receipt};
}

export async function verifyRelease(root=process.cwd()) {
  return (await verifiedReleaseInput(root)).receipt;
}

export function releaseBanner(receipt) {
  return "/* Design Passport Conductor export " + receipt.exportId + " " + receipt.sha256 + " */";
}

export async function verifyBuiltGuidance(code,root=process.cwd()) {
  const receipt = await verifyRelease(root);
  if (!code.subarray(0, Buffer.byteLength(releaseBanner(receipt)) + 1).equals(Buffer.from(releaseBanner(receipt) + "\n"))) {
    throw Error("The compiled plugin contains a different Conductor export. Rebuild it before publishing.");
  }
  return receipt;
}
export async function verifyForPublication(root = process.cwd()) {
  const metadata=JSON.parse(await readFile(join(root,"dist/build-metadata.json"),"utf8"));
  const [code,ui]=await Promise.all([readFile(join(root,"dist/code.js")),readFile(join(root,"dist/index.html"))]);
  if(metadata.schemaVersion!==1||metadata.channel!=="production"||metadata.dirty!==false||!metadata.buildSha)
    throw Error("A clean production build is required.");
  if(sha256(code)!==metadata.artifacts?.codeSha256 || sha256(ui)!==metadata.artifacts?.uiSha256)
    throw Error("The plugin artifact changed after the verified production build.");
  const receipt=await verifyBuiltGuidance(code,root);
  if(metadata.guidance?.exportId!==receipt.exportId || metadata.guidance?.sha256!==receipt.sha256 || JSON.stringify(metadata.guidance?.approvalIds)!==JSON.stringify(receipt.approvalIds))
    throw Error("A production build bound to this eligible export is required.");

}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==="prepare")await prepareRelease();
  else if(process.argv[2]==="publish-check")await verifyForPublication();
  else throw Error("Use prepare or publish-check.");
}
