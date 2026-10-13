import rawSampleData from "../orbit-sample.v1.json";

import { sampleDataSchema, type SampleData } from "./schema";

const now=Date.now();
export const sampleData: SampleData = sampleDataSchema.parse(JSON.parse(JSON.stringify(rawSampleData),(_key,value)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))return value;
  // Shift the complete review story together, preserving its ordering and intervals.
  const anchor=Date.parse('2026-09-15T00:00:00.000Z');
  return new Date(Date.parse(value)+now-anchor-86400000).toISOString();
}));
