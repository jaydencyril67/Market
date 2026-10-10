import {ActionPlan,ActionPlanStep,BrainReference,BrainStep} from "../types";

export function buildActionPlan(steps:BrainStep[],references:BrainReference[]=[]):ActionPlan{
 const plan:ActionPlanStep[]=steps.map((step,i)=>{
  const alternatives=step.alternatives??[];
  const runnerUp=alternatives[0];
  const ambiguous=step.confidence<.72&&!!runnerUp&&step.confidence-runnerUp.confidence<.12;
  if(step.confidence<.45||ambiguous){
   return{
    order:i+1,
    intent:step.intent,
    action:step.action,
    status:"blocked",
    ...(i>0?{dependsOn:[i]}:{}),
    reason:step.confidence<.45
     ?"This step is too uncertain to plan safely; clarify what you meant."
     :"Two possible intents are too close in confidence; clarify the intended action."
   };
  }
  if(i>0){
   return{
    order:i+1,
    intent:step.intent,
    action:step.action,
    status:"blocked",
    dependsOn:[i],
    reason:"Wait for step "+i+" to finish and verify its result before planning execution of this step."
   };
  }
  return{order:i+1,intent:step.intent,action:step.action,status:"ready"};
 });
 const blocked=plan.some(step=>step.status==="blocked");
 return{
  status:blocked?"partial":"ready",
  steps:plan,
  reason:blocked
   ?"The first safe step is identified; later or ambiguous steps are blocked until dependencies are verified or the request is clarified."
   :"The request has one clear first step ready for execution."
 };
}
