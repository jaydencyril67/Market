import {ExecutionCommand,ExecutionResult} from "../types";
export type Executor=(command:ExecutionCommand)=>Promise<ExecutionResult>|ExecutionResult;

const highRiskIntent=/\b(withdraw|transfer|deposit|buy|sell|delete|remove|close account|reset security|revoke|approve|purchase)\b/i;
const mediumRiskIntent=/\b(activate|deactivate|create|update|save|enable|disable|api key|webhook|security)\b/i;

function validateCommand(command:ExecutionCommand):string|undefined{
 const action=command.action;
 if(action.type==="api"){
  const botId=action.target??command.parameters.botId;
  if(!botId||!String(botId).trim())return "An exact bot ID is required before this API operation can execute.";
  if(action.operation==="bot_activate"||action.operation==="bot_withdraw"){
   const amount=action.parameters?.amount??command.parameters.amount;
   if(amount===undefined||amount===null||String(amount).trim()==="")return "A positive amount is required before this API operation can execute.";
   if(!Number.isFinite(Number(amount))||Number(amount)<=0)return "The amount must be a positive number.";
  }
 }
 return undefined;
}

export async function executeCommand(command:ExecutionCommand,executor:Executor,confirmed=false):Promise<ExecutionResult>{
 if(command.status==="blocked")return{commandId:command.id,status:"failed",message:command.reason??"Command is blocked."};
 const sensitiveAction=command.action.type==="api"||highRiskIntent.test(command.intent)||mediumRiskIntent.test(command.intent);
 if((command.requiresConfirmation||sensitiveAction)&&!confirmed)return{commandId:command.id,status:"rejected",message:"Explicit confirmation is required before this command can execute."};
 const invalid=validateCommand(command);
 if(invalid)return{commandId:command.id,status:"failed",message:invalid};
 try{return await executor(command);}catch(error){return{commandId:command.id,status:"failed",message:error instanceof Error?error.message:"Execution failed."};}
}
export async function executePlan(commands:ExecutionCommand[],executor:Executor,confirmedIds:string[]=[]):Promise<ExecutionResult[]>{
 const results:ExecutionResult[]=[];for(const command of commands){const confirmed=confirmedIds.includes(command.id);const result=await executeCommand(command,executor,confirmed);results.push(result);if(result.status==="failed"||result.status==="rejected")break;}return results;
}
