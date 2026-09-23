import "server-only";

import { CompanionError } from "../../../../src/companion/errors";

const fixtureFile = {
  document: {
    type: "DOCUMENT",
    children: [{
      type: "FRAME",
      name: "Passport Guidance :: layout :: Spacing :: Use the documented spacing scale.",
      itemSpacing: 8,
      paddingTop: 16,
      absoluteBoundingBox: { width: 1440 },
    }],
  },
};

const fixtureVariables = {
  meta: {
    variables: {
      "VariableID:1": { name: "spacing/8", resolvedType: "FLOAT" },
    },
  },
};

export function figmaTransport(): typeof fetch {
  if (process.env.DESIGN_PASSPORT_TEST_FIXTURES !== "figma") return fetch;
  return (async (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.origin !== "https://api.figma.com" || !url.pathname.startsWith("/v1/files/")) {
      throw new CompanionError("upstream", "The Figma request used an unexpected destination.", 502);
    }
    return Response.json(url.pathname.endsWith("/variables/local") ? fixtureVariables : fixtureFile);
  }) as typeof fetch;
}
