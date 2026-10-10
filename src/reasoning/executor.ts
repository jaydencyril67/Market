import {ActionPlan,ExecutionCommand,ExecutionPlan,BrainEntities} from "../types";
const sensitive=new Set(["withdraw","bot_withdraw","bot_activate","bot_deactivate","bot_create","api_keys","webhooks","security"]);
export function compileExecution(plan:ActionPlan,entities:BrainEntities={}):ExecutionPlan{
 const commands:ExecutionCommand[]=plan.steps.map((step,i)=>{
  const parameters:Record<string,string>={};
  if(entities.botId)parameters.botId=entities.botId;
  if(entities.apiKeyId)parameters.apiKeyId=entities.apiKeyId;
  if(entities.webhookId)parameters.webhookId=entities.webhookId;
  if(entities.amount)parameters.amount=entities.amount;
  const risk=sensitive.has(step.intent)?(step.intent==="withdraw"||step.intent==="bot_withdraw"?"high":"medium"):"low";
  const blocked=step.status==="blocked";
  return{id:`cmd-${i+1}`,intent:step.intent,action:step.action,parameters,risk,requiresConfirmation:risk!=="low",status:blocked?"blocked":risk!=="low"?"needs_confirmation":"ready",reason:step.reason};
 });
 if(commands.some(c=>c.status==="blocked"))return{status:"partial",commands,reason:"Some commands are missing required information."};
 if(commands.some(c=>c.status==="needs_confirmation"))return{status:"needs_confirmation",commands,reason:"Sensitive commands require explicit confirmation before execution."};
 return{status:"ready",commands,reason:"Commands are structured and ready for the application executor."};
}
