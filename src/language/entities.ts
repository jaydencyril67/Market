import {BrainEntities} from "../types";
import {normalize} from "../brain";
export function extractEntities(input:string,previous:BrainEntities={}):BrainEntities{
 const text=normalize(input);const entities:BrainEntities={...previous};
 const bot=text.match(/(?:bot|bot id)\\s*(?:#|id)?\\s*([a-z0-9_-]{3,})/i);if(bot)entities.botId=bot[1];
 const api=text.match(/(?:api key|key)\\s*(?:#|id)?\\s*([a-z0-9_-]{3,})/i);if(api)entities.apiKeyId=api[1];
 const hook=text.match(/(?:webhook|hook)\\s*(?:#|id)?\\s*([a-z0-9_-]{3,})/i);if(hook)entities.webhookId=hook[1];
 const amount=text.match(/(?:\\$|₦|usd|usdt|ngn)?\\s*(\\d+(?:\\.\\d+)?)(?:\\s*(?:usd|usdt|ngn))?/i);if(amount)entities.amount=amount[1];
 return entities;
}
