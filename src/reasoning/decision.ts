import {BrainAction,BrainReference,BrainStep,ReasoningDecision,Intent} from "../types";
export function splitRequests(input:string):string[]{return input.replace(/\\band\\b/gi,"|").replace(/[.;]+/g,"|").split("|").map(x=>x.trim()).filter(Boolean);}
export function decide(steps:BrainStep[],intents:Intent[]):ReasoningDecision{
 if(!steps.length)return{mode:"clarify",steps:[],reason:"No actionable request was detected."};
 const uncertain=steps.filter(s=>s.confidence<.45);
 if(uncertain.length)return{mode:"clarify",steps,reason:"At least one requested action is not confident enough to execute safely."};
 if(steps.length===1)return{mode:"single",steps,reason:"One clear request was detected."};
 return{mode:"sequence",steps,reason:"Multiple compatible requests were detected and can be handled in order."};
}
export function isCompatible(a:BrainAction,b:BrainAction){if(a.type==="none"||b.type==="none")return true;return a.target!==b.target;}
