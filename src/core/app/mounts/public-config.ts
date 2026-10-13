import { orbitConfig } from "../../../ext/config";
import { parseProductConfig } from "../../shared/public-config";

// The client composition mount is one of the two allowed core-to-extension imports.
export const publicProductConfig = parseProductConfig(orbitConfig).public;
