import type { Axis, ReadinessProfile, SourceRef } from "./contracts";

export const RULESET_VERSION = "1.0.0-beta.1";
export const PRODUCT_NAME = "Design Passport";
export const AI_SOURCE_FRAME_ANNOTATION = "AI source frame";
export const CERTIFICATION_ANNOTATION_PREFIX = "[Design Passport]";
export const VARIANT_COVERAGE_ANNOTATION_PREFIX = "[Design Passport] Covered by";
export const LEGACY_CERTIFICATION_ANNOTATION_PREFIX = "[Figma AI Ready]";
export const SHARED_PLUGIN_DATA_NAMESPACE = "verndaleAiReady";
export const PROFILE_DATA_KEY = "profile-v1";
export const CERTIFICATION_DATA_KEY = "certification-v1";

export const AXIS_LABELS: Record<Axis, string> = {
  "token-foundation": "Token foundation",
  "token-application": "Token application",
  "layer-naming": "Layer naming",
  "structure-auto-layout": "Structure / Auto Layout",
  "component-hygiene": "Component hygiene",
  "responsive-completeness": "Responsive completeness",
  accessibility: "Accessibility",
  "pipeline-readiness": "Pipeline readiness",
};

export const AXIS_MULTIPLIERS: Record<Axis, 1 | 2> = {
  "token-foundation": 1,
  "token-application": 2,
  "layer-naming": 2,
  "structure-auto-layout": 1,
  "component-hygiene": 1,
  "responsive-completeness": 1,
  accessibility: 1,
  "pipeline-readiness": 2,
};

export const SOURCES = {
  figmaStructure: {
    kind: "figma",
    label: "Figma: Structure your Figma file for a better MCP response",
    url: "https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/",
  },
  figmaDynamic: {
    kind: "figma",
    label: "Figma: Accessing the document",
    url: "https://developers.figma.com/docs/plugins/accessing-document/",
  },
  wcagContrast: {
    kind: "wcag",
    label: "WCAG 2.2 — 1.4.3 Contrast (Minimum)",
    url: "https://www.w3.org/TR/WCAG22/#contrast-minimum",
  },
  wcagTarget: {
    kind: "wcag",
    label: "WCAG 2.2 — 2.5.8 Target Size (Minimum)",
    url: "https://www.w3.org/TR/WCAG22/#target-size-minimum",
  },
  uiBrain: {
    kind: "ui-design-brain",
    label: "@verndale/ui-design-brain naming catalog",
    url: "https://www.npmjs.com/package/@verndale/ui-design-brain",
  },
  article: {
    kind: "medium",
    label: "Figma Recommended Practices in the Age of AI (non-normative)",
    url: "https://arie-m-prasetyo.medium.com/figma-recommended-practices-in-the-age-of-ai-e766b098ef9f",
  },
  plugin: {
    kind: "plugin",
    label: `${PRODUCT_NAME} ruleset ${RULESET_VERSION}`,
  },
} satisfies Record<string, SourceRef>;

export const DEFAULT_PROFILE: ReadinessProfile = {
  schemaVersion: 1,
  profileId: "verndale-web-v1",
  artifactKind: "product",
  pageRoles: {
    foundations: { pageIds: [], externalLibraryKeys: [] },
    components: { pageIds: [], externalLibraryKeys: [] },
    screens: { pageIds: [], externalLibraryKeys: [] },
  },
  breakpoints: [
    { name: "Desktop", width: 1440 },
    { name: "Tablet", width: 768 },
    { name: "Mobile", width: 375 },
  ],
  tokenSourceCollectionKeys: [],
  namingPolicy: "code-aligned-strict",
  requireCodeConnect: false,
};
