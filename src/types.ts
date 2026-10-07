export type BrainAction = { type:"navigate"; target:string } | { type:"none" };
export type Intent = { id:string; description:string; phrases:string[]; keywords:string[]; action?:BrainAction; priority?:number };
export type BrainEntities = { botId?:string; apiKeyId?:string; webhookId?:string; page?:string; amount?:string; raw?:Record<string,string> };
export type BrainReference = { type:"bot"|"apiKey"|"webhook"|"page"|"amount"; value:string; source:string };
export type BrainContext = { lastIntent?:string; lastTarget?:string; history?:string[]; pendingIntent?:string|null; entities?:BrainEntities };
export type BrainResult = { intent:string|null; confidence:number; response:string; action:BrainAction; normalized:string; alternatives:string[]; needsClarification:boolean; entities:BrainEntities; context:BrainContext };
