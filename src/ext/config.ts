/**
 * Buyer-owned Orbit configuration.
 *
 * Example: replace `name` and `description` to set the identity shown on
 * the public identity plate.
 */
import type { ProductConfig } from "../core/shared/public-config";

export const orbitConfig = {
  public: {
    name: "Orbit",
    description: "When a customer replies, Orbit puts that deal in your NOW queue, scores it from real signals, and shows you why. Every customer email is reviewed before it's sent.",
    imageUrl: null,
    showPoweredByCredit: false
  },
  // A read-only fictional workspace; no owner records are exposed.
  demo: { enabled: true }
} satisfies ProductConfig;
