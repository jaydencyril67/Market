import {think} from "./brain";
import {BrainSession} from "./session";
const tests=["Can you show me what I have?","I wanna put money in my account","where can I manage my developer access","I need a new bot","is bot abc123 running","how can I protect my account","can I speak to Crybots","take me to my botz"];
for(const input of tests){const result=think(input);console.log(JSON.stringify({input,intent:result.intent,confidence:result.confidence,action:result.action,entities:result.entities,clarify:result.needsClarification}));}
const session=new BrainSession();
console.log("CONTEXT 1",JSON.stringify(session.ask("open bot abc123")));
console.log("CONTEXT 2",JSON.stringify(session.ask("is it running?")));
