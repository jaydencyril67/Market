import {BrainAction,BrainReference,BrainStep,ReasoningDecision,Intent} from "../types";
export function splitRequests(input:string):string[]{
 const actionLead=/^(?:open|go to|take me to|navigate to|show|check|review|compare|scroll|click|tap|press|create|delete|remove|enable|disable|update|save|deposit|withdraw|transfer|buy|sell|rent|activate|deactivate|find|tell me|explain|list|view|inspect|then)\\b/i;
 return input.replace(/[.;]+/g,"|").split("|").flatMap(part=>{
  const pieces=part.split(/\\s+and\\s+/i);
  if(pieces.length<2)return[part.trim()].filter(Boolean);
  const out:string[]=[];let current=pieces[0];
  for(let i=1;i<pieces.length;i++){
   if(actionLead.test(pieces[i].trim())){out.push(current.trim());current=pieces[i];}
   else current+=" and "+pieces[i];
  }
  out.push(current.trim());return out.filter(Boolean);
 }).filter(Boolean);
}
export function decide(steps:BrainStep[],intents:Intent[]):ReasoningDecision{
 if(!steps.length)return{mode:"clarify",steps:[],reason:"No actionable request was detected."};
 const uncertain=steps.filter(s=>{const runnerUp=s.alternatives?.[0];return s.confidence<.45||Boolean(runnerUp&&s.confidence<.72&&s.confidence-runnerUp.confidence<.12);});
 if(uncertain.length)return{mode:"clarify",steps,reason:"At least one requested action is uncertain or has a near-tied alternative; clarify before planning execution."};
 if(steps.length===1)return{mode:"single",steps,reason:"One clear request was detected."};
 return{mode:"sequence",steps,reason:"Multiple clear requests were detected and will be handled in order, verifying each result before continuing."};
}
export function isCompatible(a:BrainAction,b:BrainAction){
 if(a.type==="none"||b.type==="none")return true;
 if(a.type==="navigate"&&b.type==="navigate")return a.target!==b.target;
 return a.type!==b.type;
}
