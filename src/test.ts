import {think,normalize} from "./brain";
import {BrainSession} from "./session";
import {executeCommand} from "./execution/runtime";
import {ExecutionCommand} from "./types";

function assert(condition:unknown,message:string):asserts condition {
 if(!condition)throw new Error("Behavior test failed: "+message);
}
function test(name:string,run:()=>void):void {
 run();
 console.log("PASS "+name);
}
async function testAsync(name:string,run:()=>Promise<void>):Promise<void> {
 await run();
 console.log("PASS "+name);
}

async function main():Promise<void>{
 test("normalization handles casual language and common typos",()=>{
  assert(normalize("Wanna check my balnce pls") === "want to check my balance please","normalization should expand slang and correct supported typos");
  assert(normalize("  ") === "","blank input should normalize to an empty string");
 });

 test("brain returns a structured, non-empty result for a supported request",()=>{
  const result=think("open my bots");
  assert(typeof result.response==="string"&&result.response.trim().length>0,"response should be present");
  assert(typeof result.confidence==="number"&&result.confidence>=0&&result.confidence<=1,"confidence should be within 0..1");
  assert(result.action!==undefined&&typeof result.action.type==="string","an action shape should be present");
  assert(result.normalized==="open my bots","normalized input should be retained");
 });

 test("brain handles different user phrasings without crashing",()=>{
  const inputs=[
   "Can you show me what I have?",
   "I wanna put money in my account",
   "where can I manage my developer access",
   "I need a new bot",
   "is bot abc123 running",
   "how can I protect my account",
   "can I speak to Crybots",
   "show my portfolio and then open settings",
   "what webhook events are supported",
   "are bot profits guaranteed"
  ];
  for(const input of inputs){
   const result=think(input);
   assert(result.response.trim().length>0,"empty response for input: "+input);
   assert(result.context!==undefined,"context missing for input: "+input);
   assert(Array.isArray(result.alternatives),"alternatives should be an array for input: "+input);
  }
 });

 test("conversation session retains context and can reset",()=>{
  const session=new BrainSession();
  session.ask("open my bots");
  assert((session.history??[]).length>0,"first turn should enter session history");
  session.ask("is it running?");
  assert((session.history??[]).length>=2,"follow-up should be retained in history");
  session.reset();
  assert(session.history.length===0,"reset should clear history");
  assert(session.lastIntent===undefined,"reset should clear last intent");
 });

 test("multi-step requests produce a decision instead of throwing",()=>{
  const result=think("open my bots and check bot abc123");
  assert(result.context.decision!==undefined,"decision metadata should be attached");
  assert(["single","sequence","clarify"].includes(result.context.decision!.mode),"decision mode should be valid");
  assert(result.context.decision!.steps.length>=1,"decision should contain at least one step");
 });

 await testAsync("sensitive actions are rejected until explicitly confirmed",async()=>{
  const command:ExecutionCommand={
   id:"test-withdrawal",intent:"withdraw",
   action:{type:"api",operation:"bot_withdraw",target:"BOT123",parameters:{amount:"10"}},
   parameters:{amount:"10"},risk:"high",requiresConfirmation:true,status:"ready"
  };
  const executions={value:0};
  const executionCount=()=>executions.value;
  const executor=async()=>{executions.value++;return{commandId:command.id,status:"executed" as const,message:"accepted"};};
  const blocked=await executeCommand(command,executor);
  assert(blocked.status==="rejected","unconfirmed sensitive command should be rejected");
  assert(executionCount()===0,"executor must not run before confirmation");
  const approved=await executeCommand(command,executor,true);
  assert(approved.status==="executed","confirmed valid command should reach executor");
  assert(executionCount()===1,"executor should run exactly once after confirmation");
 });

 await testAsync("API execution refuses a missing bot identifier",async()=>{
  const command:ExecutionCommand={
   id:"test-missing-bot",intent:"bot_activate",
   action:{type:"api",operation:"bot_activate",parameters:{amount:"10"}},
   parameters:{amount:"10"},risk:"high",requiresConfirmation:true,status:"ready"
  };
  const result=await executeCommand(command,async()=>({commandId:command.id,status:"executed",message:"must not run"}),true);
  assert(result.status==="failed","missing bot ID should fail validation");
  assert(result.message.toLowerCase().includes("bot id"),"validation failure should explain the missing identifier");
 });

 await testAsync("executor errors become structured failures",async()=>{
  const command:ExecutionCommand={
   id:"test-executor-error",intent:"portfolio",
   action:{type:"navigate",target:"portfolio"},parameters:{},risk:"low",requiresConfirmation:false,status:"ready"
  };
  const result=await executeCommand(command,async()=>{throw new Error("simulated executor fault");});
  assert(result.status==="failed","thrown executor error should become a failed result");
  assert(result.message==="simulated executor fault","failure should preserve the useful error message");
 });

 console.log("All CryBots Brain behavior tests passed.");
}

void main().catch(error=>{
 console.error(error);
 throw error;
});
