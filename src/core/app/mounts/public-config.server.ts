import { orbitConfig } from "../../../ext/config";
import { parseProductConfig } from "../../shared/public-config";

// The server composition mount is one of the two allowed core-to-extension imports.
const parsedProductConfig = parseProductConfig(orbitConfig);
export const publicProductConfig = parsedProductConfig.public;
export const publicDemoConfig = parsedProductConfig.demo;
