export type BrainAction = { type: "navigate"; target: string } | { type: "none" };
export type Intent = { id:string; description:string; phrases:string[]; keywords:string[]; action?:BrainAction };
export type BrainResult = { intent:string|null; confidence:number; response:string; action:BrainAction };
