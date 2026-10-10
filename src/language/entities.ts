import {BrainEntities} from "../types";
import {normalize} from "../brain";

export function extractEntities(input:string,previous:BrainEntities={}):BrainEntities{
 const text=normalize(input);
 const entities:BrainEntities={...previous};
 const bot=text.match(/\b(?:bot(?:\s+id)?)\s*(?:#|id\s*)?([a-z0-9][a-z0-9._-]{2,})\b/i);
 if(bot&&!new Set(["with","using","amount","for","usdt","usd","please","my","your","this","that","activate","deactivate","withdraw","funds","now"]).has(bot[1].toLowerCase()))entities.botId=bot[1];
 const api=text.match(/\b(?:api\s+key|key)\s*(?:#|id\s*)?([a-z0-9][a-z0-9_-]{2,})\b/i);
 if(api&&!new Set(["with","using","please","my","your","this","that"]).has(api[1].toLowerCase()))entities.apiKeyId=api[1];
 const hook=text.match(/\b(?:webhook|hook)\s*(?:#|id\s*)?([a-z0-9][a-z0-9._-]{2,})\b/i);
 if(hook&&!new Set(["with","using","please","my","your","this","that"]).has(hook[1].toLowerCase()))entities.webhookId=hook[1];
 const amountWithCue=input.match(/\b(?:with|amount(?:\s+of)?|for)\s+(?:\$|₦)?\s*(\d+(?:\.\d+)?)\s*(?:usdt|usd|ngn)?\b/i);
 const amountWithSymbol=input.match(/(?:\$|₦)\s*(\d+(?:\.\d+)?)/);
 const amountWithCurrency=input.match(/\b(\d+(?:\.\d+)?)\s*(?:usdt|usd|ngn)\b/i);
 const amount=amountWithCue??amountWithSymbol??amountWithCurrency;
 if(amount)entities.amount=amount[1];
 return entities;
}
