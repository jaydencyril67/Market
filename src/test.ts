import {think} from "./brain";
import {BrainSession} from "./session";
const tests=["Can you show me what I have?","I wanna put money in my account","where can I manage my developer access","I need a new bot","is bot abc123 running","how can I protect my account","can I speak to Crybots"];
for(const input of tests){const result=think(input);console.log(JSON.stringify({input,intent:result.intent,confidence:result.confidence,action:result.action,entities:result.entities,references:result.context.references,clarify:result.needsClarification}));}
const session=new BrainSession();
console.log("TURN 1",JSON.stringify(session.ask("check bot abc123")));
console.log("TURN 2",JSON.stringify(session.ask("is it running?")));
console.log("TURN 3",JSON.stringify(session.ask("take me there")));
session.reset();
console.log("RESET",JSON.stringify(session.ask("is it running?")));

const reasoningTests=["open my bots and check my bot","show my portfolio and then open settings","deposit and show my balance","open my bots and what is the weather"];
for(const input of reasoningTests){const result=think(input);console.log("REASONING",JSON.stringify({input,intent:result.intent,confidence:result.confidence,decision:result.context.decision,clarify:result.needsClarification}));}

const planningTests=["check my bot","open my bots and check bot abc123","show my portfolio and open settings"];
for(const input of planningTests){const result=think(input);console.log("PLAN",JSON.stringify({input,decision:result.context.decision,action:result.action,entities:result.entities}));}

const executionTests=["how do i withdraw","create a bot","open my bots and check bot abc123"];
for(const input of executionTests){const result=think(input);console.log("EXECUTION",JSON.stringify({input,decision:result.context.decision,entities:result.entities}));}

import {executeCommand} from "./execution/runtime";
(async()=>{const safe={id:"safe-1",intent:"portfolio",action:{type:"navigate" as const,target:"portfolio"},parameters:{},risk:"low" as const,requiresConfirmation:false,status:"ready" as const};const sensitive={...safe,id:"withdraw-1",intent:"withdraw",risk:"high" as const,requiresConfirmation:true};console.log("RUNTIME SAFE",await executeCommand(safe,async cmd=>({commandId:cmd.id,status:"executed",message:"Executor accepted command."})));console.log("RUNTIME BLOCKED",await executeCommand(sensitive,async cmd=>({commandId:cmd.id,status:"executed",message:"Executor accepted command."})));console.log("RUNTIME CONFIRMED",await executeCommand(sensitive,async cmd=>({commandId:cmd.id,status:"executed",message:"Executor accepted command."}),true));})();

const verifiedTests=["what is CryBots","how do I deposit crypto","what webhook events are supported","can i delete my account","how do bot rentals work","can voice open api keys","are bot profits guaranteed","where can i manage my assets"];
for(const input of verifiedTests){const result=think(input);console.log("VERIFIED",JSON.stringify({input,intent:result.intent,confidence:result.confidence,action:result.action,clarify:result.needsClarification}));}
