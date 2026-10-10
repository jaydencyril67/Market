import {BrainAction,BrainContext} from "../types";
import {intents} from "../intents/core";
import {verifiedFacts} from "../knowledge/crybotsSource";

/**
 * Builds ordinary assistant replies from the matched intent, the requested action,
 * verified runtime feature metadata, and recent conversation context.
 * This intentionally avoids selecting a complete canned sentence for each intent.
 * Verified knowledge answers remain authored facts; this composer handles action replies.
 */
const normalizeLabel=(value:string)=>value.replace(/^\/+/, "").replace(/[-_/]+/g," ").replace(/\s+/g," ").trim();
const titleCase=(value:string)=>normalizeLabel(value).replace(/\b[a-z]/g,letter=>letter.toUpperCase());
const hash=(value:string)=>{let result=2166136261;for(let i=0;i<value.length;i++){result^=value.charCodeAt(i);result=Math.imul(result,16777619);}return result>>>0;};
const choose=<T,>(items:T[],seed:string):T=>items[hash(seed)%items.length];

function pageLabel(target:string,context:BrainContext):string {
 const discovered=context.discoveredFeatures?.find(feature=>feature.verified===true&&(feature.route===target||feature.id===target));
 return discovered?.name??titleCase(target||"requested page");
}

export function composeIntentResponse(intentId:string,action:BrainAction,input:string,context:BrainContext={}):string {
 const intent=intents.find(item=>item.id===intentId);
 const seed=[intentId,input,...(context.history??[]).slice(-3)].join("|");
 const target=action.type==="navigate"?pageLabel(action.target,context):"";
 if(intentId==="greeting"){
  const openings=["What would you like to","What are you trying to","What should we"];
  const endings=["work through","get done","look into first"];
  return choose(openings,seed)+" "+choose(endings,seed+"-end")+"?";
 }
 if(action.type==="navigate"){
  const lead=choose(["Opening","Taking you to","Heading to","Bringing up"],seed);
  return lead+" "+target+".";
 }
 if(action.type==="back")return "Moving "+choose(["back one page","to the previous page","one step back"],seed)+".";
 if(action.type==="forward")return "Moving "+choose(["forward one page","to the next page in history","one step forward"],seed)+".";
 if(action.type==="scroll_page"){
  const destination=action.position?" to the "+action.position:"";
  return "Moving the page "+action.direction+destination+".";
 }
 if(action.type==="scroll_nowbar")return "Shifting the navigation bar "+action.direction+".";
 if(action.type==="expand_nowbar")return "Expanding the navigation bar to expose more options.";
 if(action.type==="collapse_nowbar")return "Collapsing the navigation bar to reduce the visible options.";
 if(action.type==="click")return "I matched the visible control "+JSON.stringify(action.target)+" to your request. The app must confirm the resulting state before I can report completion.";
 if(action.type==="api")return "The "+normalizeLabel(action.operation)+" operation is prepared for review. No change is complete until the app confirms it.";
 if(intentId==="help"){
  const features=(context.discoveredFeatures??[]).filter(feature=>feature.verified).slice(0,5).map(feature=>feature.name);
  const available=features.length?features.join(", "):"the supported pages, controls, and connected data";
  return "I can interpret requests, navigate supported features, and work with connected data when available. Verified features currently include "+available+".";
 }
 if(action.type==="none"&&intent){
  const description=intent.description.replace(/[.]$/,"");
  return "I interpreted your request as "+description+".";
 }
 const request=input.trim()? " (“"+input.trim()+"”)":"";
 return "I couldn't map that request"+request+" to a supported action. Specify the feature, item, or outcome you want me to work with.";
}

export function composeClarificationResponse(kind:"unclear"|"fallback",input:string,context:BrainContext={}):string {
 const normalized=input.trim();
 const reference=/\b(that|this|it|again|same|there|then|yes|no|okay|ok)\b/i.test(normalized);
 const recentTarget=context.lastTarget?pageLabel(context.lastTarget,context):"";
 const request=normalized?" (“"+normalized+"”)":"";
 if(kind==="unclear"){
  const focus=reference&&recentTarget?"the reference to "+recentTarget:"the intended action";
  const contextNote=recentTarget?" The most recent destination I know is "+recentTarget+".":"";
  return "I couldn't determine "+focus+" from your request"+request+"."+contextNote+" Identify the page, item, or outcome you mean so I can continue without guessing.";
 }
 const available=(context.discoveredFeatures??[]).filter(feature=>feature.verified).slice(0,5).map(feature=>feature.name);
 const capability=available.length?" Current verified features include "+available.join(", ")+".":"";
 return "I couldn't match your request"+request+" to a supported capability. Describe the result you want, and I'll match it against the available features and actions."+capability;
}

export function composeGoalResponse(goalId:string,topics:string[],target:string,input:string,context:BrainContext={}):string {
 const seed=[goalId,input,...(context.history??[]).slice(-4)].join("|");
 const facts=verifiedFacts.filter(fact=>topics.some(topic=>fact.topic===topic||fact.keywords.some(keyword=>keyword.toLowerCase().includes(topic.toLowerCase()))));
 const featureNames=facts.filter(fact=>fact.route).slice(0,3).map(fact=>titleCase(fact.route!));
 const guidance:Record<string,string[]> = {
  "bot-performance":["Compare recorded results over the same period, then verify each bot’s status and related trade activity.","Use bot status and actual trade records together; activity alone does not establish profitability."],
  "account-overview":["Compare holdings with recorded deposits, withdrawals, and transfers; these represent different parts of account activity.","Use live account records for exact values rather than estimating balances from transaction history."],
  "webhook-troubleshooting":["Compare webhook configuration with delivery history and inspect the latest recorded result before deciding what failed.","A configured webhook does not prove that an event was delivered successfully."],
  "account-security":["Review active sessions and integration permissions, and investigate anything you do not recognize.","Grant integrations only the permissions they need, and keep authentication codes and secrets private."]
 };
 const focus=choose(guidance[goalId]??["Use the available records to verify the current state before drawing a conclusion."],seed);
 const evidence=featureNames.length?" Relevant areas include "+[...new Set(featureNames)].join(", ")+".":"";
 return focus+evidence+" I can check connected records when they are available, but I won’t infer missing values or outcomes. We can start with "+pageLabel(target,context)+".";
}
