import {think,normalize} from "./brain";
import {BrainSession} from "./session";
import {executeCommand} from "./execution/runtime";
import {ExecutionCommand} from "./types";
import {thinkLive} from "./live/think";
import {LiveCryBotsBridge,LiveQuery} from "./live/types";

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
 test("natural account-deletion wording resolves through verified app knowledge",()=>{
  const requests=["I want to delete my account","How can I permanently close my account?","please remove my account"];
  for(const request of requests){
   const result=think(request);
   assert(result.action.type==="navigate"&&result.action.target==="/danger","account-deletion intent should discover the verified Danger workflow for: "+request+"; got "+JSON.stringify(result.action));
   assert(result.intent?.startsWith("verified:"),"account deletion should be grounded in a verified source fact rather than a guessed generic intent");
  }
 });

 test("current date and time use the supplied live clock and device timezone",()=>{
  const clock={runtimeClock:{now:"2026-10-10T10:00:00.000Z",timeZone:"Africa/Lagos",locale:"en-GB"}};
  const time=think("what time is it?",clock);
  assert(time.intent==="current-date-time","time question should use the dedicated clock handler");
  assert(time.response.includes("11:00"),"10:00 UTC should be 11:00 in Africa/Lagos; got "+time.response);
  assert(time.response.includes("Africa/Lagos"),"time reply should name the timezone");
  const date=think("what's today's date?",clock);
  assert(date.response.includes("Saturday, 10 October 2026"),"date reply should use the supplied timestamp; got "+date.response);
  const missing=think("what time is it?");
  assert(missing.response.includes("won't guess"),"missing clock context must not trigger an invented time");
 });

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
  assert(result.action.type==="navigate"&&result.action.target==="/bots","request should resolve to the My Bots route; got "+JSON.stringify(result.action));
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

 test("greeting can use prior navigation context without claiming current page state",()=>{
  const result=think("hello",{lastTarget:"/bots"});
  assert(result.response.includes("Bots"),"greeting should mention the last known destination");
  assert(result.response.toLowerCase().includes("what would you like"),"greeting should invite the next request");
  assert(!result.response.toLowerCase().includes("you are currently"),"last known destination must not be presented as verified current page state");
 });

 test("verified product guidance preserves factual safety details",()=>{
  const result=think("how do i deposit");
  assert(result.response.toLowerCase().includes("network"),"deposit guidance should preserve asset/network safety detail");
  assert(result.response.toLowerCase().includes("address"),"deposit guidance should preserve address verification detail");
  assert(result.action.type==="navigate"&&result.action.target==="/deposit","verified deposit guidance should use the verified deposit route");
 });

 test("verified runtime feature metadata changes the navigation response",()=>{
  const context={discoveredFeatures:[{id:"bot-center",name:"Bot Command Center",route:"/bots",description:"Manage bots and inspect their current state.",keywords:["my bots","bot management"],verified:true as const}]};
  const result=think("open my bots",context);
  assert(result.response.includes("Bot Command Center")||result.response.includes("Manage bots"),"reply should use verified runtime feature metadata");
  assert(result.action.type==="navigate"&&result.action.target==="/bots","runtime feature should resolve to its verified route");
 });

 test("a balance request resolves without navigating away",()=>{
  const result=think("check my balance");
  assert(result.intent==="balance","balance intent should win for a direct balance request");
  assert(result.action.type==="none","balance questions should be answered in the assistant, not by navigating to a page");
 });

 test("meaningful follow-up repeats a known safe destination but does not invent one",()=>{
  const session=new BrainSession();
  session.ask("open my bots");
  const repeated=session.ask("do it again");
  assert(repeated.action.type==="navigate"&&repeated.action.target==="/bots","repeat should reuse the concrete previous destination");
  const empty=new BrainSession().ask("do it again");
  assert(empty.needsClarification&&empty.action.type==="none","repeat without a prior target must ask instead of guessing");
 });

 test("unresolved demonstratives ask for the missing item instead of guessing",()=>{
  const result=think("what about the other one",{history:["compare bot A and bot B"]});
  assert(result.needsClarification&&result.action.type==="none","the other one must not select an item when the candidates are not represented as structured entities");
 });

 test("intent-confusion cases preserve materially different actions",()=>{
  const cases=[
   {input:"open my bots",type:"navigate",target:"/bots"},
   {input:"open my portfolio",type:"navigate",target:"/portfolio"},
   {input:"show my webhooks",type:"navigate",target:"/webhooks"},
   {input:"show my transaction history",type:"navigate",target:"/transactions"}
  ];
  for(const item of cases){
   const result=think(item.input);
   assert(result.action.type==="navigate"&&result.action.target===item.target,"meaning mismatch for "+JSON.stringify(item.input)+": got "+JSON.stringify(result.action));
  }
  const unsafe=think("activate bot BOT-123");
  assert(unsafe.action.type==="none"&&unsafe.needsClarification,"a sensitive bot command without its required details must not be guessed into execution");
 });

 test("conversation session retains context and can reset",()=>{
  const session=new BrainSession();
  session.ask("open my bots");
  assert((session.history??[]).length>0,"first turn should enter session history");
  session.ask("open my portfolio");
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

 await testAsync("live-data fetch timestamps are human-readable and use the supplied timezone",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>({topic:query.topic,ok:true,data:{balance:125.5},fetchedAt:"2026-10-10T10:00:00.000Z"})};
  const result=await thinkLive("check my balance",{runtimeClock:{now:"2026-10-10T10:00:00.000Z",timeZone:"Africa/Lagos",locale:"en-GB"}},bridge);
  assert(result.response.includes("Data retrieved"),"live response should use natural retrieval wording");
  assert(result.response.includes("11:00:00"),"UTC fetch time should be shown in Africa/Lagos local time; got "+result.response);
  assert(!result.response.includes("2026-10-10T10:00:00.000Z"),"raw ISO timestamps must not leak into the conversational reply");
 });
 
 await testAsync("live balance question answers directly with verified account amounts and no navigation",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>({topic:query.topic,ok:true,data:{balance:125.5,available:100.25,reserved:25.25},fetchedAt:"2026-10-10T10:00:00.000Z"})};
  const result=await thinkLive("what's my current balance?",{runtimeClock:{now:"2026-10-10T10:00:00.000Z",timeZone:"Africa/Lagos",locale:"en-GB"}},bridge,{userId:"user-1"});
  assert(result.action.type==="none","answering a balance must not trigger navigation");
  assert(result.response.includes("125.50 USDT"),"reply should state the live balance; got "+result.response);
  assert(result.response.includes("100.25 USDT"),"reply should state the live available amount; got "+result.response);
  assert(result.response.includes("25.25 USDT"),"reply should state reserved funds; got "+result.response);
 });
 
 await testAsync("live balance reasoning never infers a missing financial value",async()=>{
  const seen:LiveQuery[]=[];
  const bridge:LiveCryBotsBridge={query:async query=>{seen.push(query);return{topic:query.topic,ok:true,data:{accountId:"account-1",unrelatedMetric:500},fetchedAt:"2026-10-10T00:00:00Z"};}};
  const result=await thinkLive("check my balance",{},bridge);
  assert(seen.length===1&&seen[0].topic==="account-state","balance request should query account-state data");
  assert(result.response.toLowerCase().includes("cannot be inferred")||result.response.toLowerCase().includes("cannot infer")||result.response.toLowerCase().includes("won't guess"),"response should explain that missing balance cannot be inferred");
  assert(!result.response.includes("500"),"unrelated numeric data must not be presented as a balance");
 });

 await testAsync("bot performance assessment states the evidence limit even when profit-like fields exist",async()=>{
  const topics:string[]=[];
  const bridge:LiveCryBotsBridge={query:async query=>{topics.push(query.topic);return query.topic==="bots"?{topic:query.topic,ok:true,data:{investments:[{botId:"BOT-9",status:"active",profit:99}]}}:{topic:query.topic,ok:true,data:{transactions:[]}};}};
  const result=await thinkLive("which bots are profitable",{},bridge);
  assert(topics.includes("bots")&&topics.includes("transactions"),"performance assessment should request bot and transaction evidence");
  assert(result.response.toLowerCase().includes("do not establish profitability"),"summary must state that status/counts alone do not prove profitability");
  assert(result.response.includes("BOT-9")||result.response.includes("active or activating investments"),"summary should disclose which available evidence was returned");
 });

 await testAsync("bot and transaction evidence validates numeric fields before comparison",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>query.topic==="bots"
   ?{topic:query.topic,ok:true,data:{investments:[{botId:"BOT-9",status:"active",profit:"not-a-number",investment:-5}]}}
   :{topic:query.topic,ok:true,data:{transactions:[{botId:"BOT-9",amount:"unknown"}]}}};
  const result=await thinkLive("which bots are profitable",{},bridge);
  assert(result.response.includes("non-numeric profit"),"malformed bot profit must be flagged rather than treated as a valid number");
  assert(result.response.includes("negative investment"),"negative investment amount must be flagged");
  assert(result.response.includes("non-numeric amount"),"malformed transaction amount must be flagged");
  assert(result.response.toLowerCase().includes("incomplete")||result.response.toLowerCase().includes("limitation"),"assessment should disclose evidence limits");
 });

 await testAsync("webhook configuration is not misreported as successful delivery",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>({topic:query.topic,ok:true,data:{webhooks:[{name:"Primary endpoint",enabled:true,url:"https://hooks.example.test/crybots"}]}})};
  const result=await thinkLive("show webhooks",{},bridge);
  assert(result.response.includes("Primary endpoint"),"summary should use the returned webhook configuration");
  assert(!/delivered successfully|delivery succeeded|successfully delivered/i.test(result.response),"enabled configuration must not be reported as proof of delivery");
 });

 await testAsync("live data failures identify the unavailable source without implying success",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>({topic:query.topic,ok:false,data:null,message:"service timeout"})};
  const result=await thinkLive("check my balance",{},bridge);
  assert(result.response.toLowerCase().includes("account and balance data"),"failure should name the unavailable data domain");
  assert(result.response.includes("service timeout"),"useful source error detail should be preserved");
  assert(!/balance is|balance was|successfully retrieved/i.test(result.response),"failure must not imply that current data was retrieved");
 });

 await testAsync("live bot summaries report returned status without claiming profitability",async()=>{
  const bridge:LiveCryBotsBridge={query:async query=>({topic:query.topic,ok:true,data:{investments:[{botId:"BOT-7",status:"active",profit:99}]}})};
  const result=await thinkLive("show my active bots",{},bridge);
  assert(result.response.includes("BOT-7"),"active bot response should include the returned bot ID");
  assert(!/profitable|profit is|earned|guaranteed/i.test(result.response),"status alone must not become a profitability claim");
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
