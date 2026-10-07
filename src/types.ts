export type BrainAction = { type:"navigate"; target:string } | { type:"none" };
export type Intent = { id:string; description:string; phrases:string[]; keywords:string[]; action?:BrainAction; priority?:number };
export type BrainResult = { intent:string|null; confidence:number; response:string; action:BrainAction; normalized:string; alternatives:string[]; needsClarification:boolean };
export type BrainContext = { lastIntent?:string; lastTarget?:string; history?:string[] };
