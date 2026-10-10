import {ActionPlan,ExecutionCommand,ExecutionPlan,BrainEntities} from "../types";

const highRiskIntents=new Set(["withdraw","bot_withdraw","transfer","deposit","sell","buy","delete","remove","close_account","reset_security"]);
const mediumRiskIntents=new Set(["bot_activate","bot_deactivate","bot_create","api_keys","webhooks","security","create_bot","update","save","enable","disable"]);

export function compileExecution(plan:ActionPlan,entities:BrainEntities={}):ExecutionPlan{
 const commands:ExecutionCommand[]=plan.steps.map((step,i)=>{
  const parameters:Record<string,string>={};
  const action=step.action;
  if(action.type==="api"){
   if(action.operation==="bot_activate"||action.operation==="bot_withdraw"){
    const botId=action.target??entities.botId;
    const amount=action.parameters?.amount??entities.amount;
    if(botId)parameters.botId=botId;
    if(amount)parameters.amount=amount;
   }else if(action.operation==="bot_deactivate"){
    const botId=action.target??entities.botId;
    if(botId)parameters.botId=botId;
   }
  }else{
   if(entities.botId)parameters.botId=entities.botId;
   if(entities.apiKeyId)parameters.apiKeyId=entities.apiKeyId;
   if(entities.webhookId)parameters.webhookId=entities.webhookId;
   if(entities.amount)parameters.amount=entities.amount;
  }
  const operation=action.type==="api"?action.operation:"";
  const risk=highRiskIntents.has(step.intent)||operation==="bot_withdraw"||step.intent==="withdraw"
   ?"high"
   :mediumRiskIntents.has(step.intent)||operation==="bot_activate"||operation==="bot_deactivate"
    ?"medium":"low";
  const blocked=step.status==="blocked";
  const missingBotTarget=action.type==="api"&&!action.target&&!entities.botId;
  const missingAmount=action.type==="api"&&(action.operation==="bot_activate"||action.operation==="bot_withdraw")&&!parameters.amount;
  const invalidAmount=parameters.amount!==undefined&&(!Number.isFinite(Number(parameters.amount))||Number(parameters.amount)<=0);
  const unsafeParameters=missingBotTarget||missingAmount||invalidAmount;
  return{
   id:`cmd-${i+1}`,intent:step.intent,action,parameters,risk,
   requiresConfirmation:risk!=="low",
   status:blocked||unsafeParameters?"blocked":risk!=="low"?"needs_confirmation":"ready",
   reason:blocked?step.reason:missingBotTarget?"An exact bot ID is required before this API operation can be prepared.":missingAmount?"A positive amount is required for this API operation.":invalidAmount?"The amount must be a positive number.":step.reason
  };
 });
 if(commands.some(c=>c.status==="blocked"))return{status:"partial",commands,reason:"Some commands are blocked because the plan is uncertain or required parameters are missing or invalid."};
 if(commands.some(c=>c.status==="needs_confirmation"))return{status:"needs_confirmation",commands,reason:"Sensitive commands require explicit confirmation before execution."};
 return{status:"ready",commands,reason:"Commands are structured and ready for the application executor."};
}
