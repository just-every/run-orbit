/** The one plain line that tells search and switchers what Orbit stands in for. Nominative use only. The hero bolds the brand segments; the plain string below is what the page's meta description carries. */
export const alternativeSegments = [
  "100% free, open source alternative to ",
  { brand: "HubSpot" },
  ", ",
  { brand: "Pipedrive" },
  " and ",
  { brand: "Salesforce" }
] as const;

export const alternativeLine = alternativeSegments.map((part) => (typeof part === "string" ? part : part.brand)).join("");
