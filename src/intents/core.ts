import { Intent } from "../types";
export const intents:Intent[] = [
{id:"greeting",description:"User is greeting Crybots.",phrases:["hello","hi","hey","hey crybots","good morning","good evening"],keywords:["hello","hi","hey"],action:{type:"none"}},
{id:"deposit",description:"User wants to deposit or add funds.",phrases:["how do i deposit","where can i add funds","i want to deposit","how can i fund my account"],keywords:["deposit","fund","top up","add funds"],action:{type:"navigate",target:"deposit"}},
{id:"withdraw",description:"User wants to withdraw funds.",phrases:["how do i withdraw","i want to cash out","where is withdrawal"],keywords:["withdraw","cash out","withdrawal"],action:{type:"navigate",target:"withdraw"}},
{id:"portfolio",description:"User wants to view portfolio/assets.",phrases:["show my portfolio","open my assets","how much do i have"],keywords:["portfolio","assets","holdings"],action:{type:"navigate",target:"portfolio"}},
{id:"bots",description:"User wants to access My Bots.",phrases:["show my bots","open my bots","take me to my bots"],keywords:["my bots","bots"],action:{type:"navigate",target:"my-bots"}},
{id:"api_keys",description:"User wants API Keys.",phrases:["open api keys","where are my api keys","manage api keys"],keywords:["api keys","api key"],action:{type:"navigate",target:"api-keys"}},
{id:"webhooks",description:"User wants Webhooks.",phrases:["open webhooks","where are webhooks","manage webhooks"],keywords:["webhooks","webhook"],action:{type:"navigate",target:"webhooks"}},
{id:"help",description:"User requests Crybots help.",phrases:["help me","what can you do","what can i ask"],keywords:["help","support"],action:{type:"navigate",target:"help"}}
];
