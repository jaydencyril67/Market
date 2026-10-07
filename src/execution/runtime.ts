import {ExecutionCommand,ExecutionResult} from "../types";
export type Executor=(command:ExecutionCommand)=>Promise<ExecutionResult>|ExecutionResult;
export async function executeCommand(command:ExecutionCommand,executor:Executor,confirmed=false):Promise<ExecutionResult>{
 if(command.status==="blocked")return{commandId:command.id,status:"failed",message:command.reason??"Command is blocked."};
 if(command.requiresConfirmation&&!confirmed)return{commandId:command.id,status:"rejected",message:"Explicit confirmation is required before this command can execute."};
 try{return await executor(command);}catch(error){return{commandId:command.id,status:"failed",message:error instanceof Error?error.message:"Execution failed."};}
}
export async function executePlan(commands:ExecutionCommand[],executor:Executor,confirmedIds:string[]=[]):Promise<ExecutionResult[]>{
 const results:ExecutionResult[]=[];for(const command of commands){const confirmed=confirmedIds.includes(command.id);const result=await executeCommand(command,executor,confirmed);results.push(result);if(result.status==="failed"||result.status==="rejected")break;}return results;
}
