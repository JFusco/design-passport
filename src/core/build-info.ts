import packageMetadata from "../../package.json";
import { RULESET_VERSION } from "./constants";
import type { BuildChannel, ProducerIdentity } from "./contracts";

declare const __DESIGN_PASSPORT_BUILD_SHA__: string | undefined;
declare const __DESIGN_PASSPORT_BUILD_CHANNEL__: BuildChannel | undefined;

const injectedSha = typeof __DESIGN_PASSPORT_BUILD_SHA__ === "string" ? __DESIGN_PASSPORT_BUILD_SHA__ : "local";
const injectedChannel = typeof __DESIGN_PASSPORT_BUILD_CHANNEL__ === "string" ? __DESIGN_PASSPORT_BUILD_CHANNEL__ : "development";

export const PRODUCER_IDENTITY: ProducerIdentity = Object.freeze({
  pluginVersion: packageMetadata.version,
  rulesetVersion: RULESET_VERSION,
  buildSha: injectedSha,
  channel: injectedChannel,
});

export function producerLabel(producer: ProducerIdentity = PRODUCER_IDENTITY): string {
  const channel = producer.channel === "production" ? "Production" : "Development";
  return `Plugin ${producer.pluginVersion} · Ruleset ${producer.rulesetVersion} · ${producer.buildSha} · ${channel}`;
}
