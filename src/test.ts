import {think} from "./brain";
const tests=["How do I deposit?","I need to top up","take me to my botz","show my balance","open api key","where are webhooks","how do I buy","how secure is this","hey crybots","what is the weather?"];
for(const input of tests){const result=think(input);console.log(JSON.stringify({input,intent:result.intent,confidence:result.confidence,action:result.action,clarify:result.needsClarification}));}
