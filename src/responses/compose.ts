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
 const profiles:Record<string,{subject:string;method:string;evidence:string;caution:string}> = {
  "bot-performance":{subject:"bot performance",method:"compare",evidence:"recorded results over the same time period, bot status, and related trade activity",caution:"activity or an active status alone does not establish profitability"},
  "account-overview":{subject:"your account activity",method:"reconcile",evidence:"portfolio holdings with recorded deposits, withdrawals, and transfers",caution:"transaction history alone cannot establish your current balance"},
  "webhook-troubleshooting":{subject:"webhook delivery",method:"inspect",evidence:"the configured endpoint, enabled state, and latest available delivery records",caution:"an enabled configuration does not prove successful delivery"},
  "account-security":{subject:"account security",method:"review",evidence:"active sessions and integration permissions for unfamiliar access",caution:"authentication codes and integration secrets should remain private"}
 };
 const profile=profiles[goalId]??{subject:"the requested task",method:"verify",evidence:"the available records and current feature state",caution:"missing data should not be treated as proof"};

 const opening=choose(["For "+profile.subject+",","To investigate "+profile.subject+",","A useful way to approach "+profile.subject+" is to"],seed);
 const instruction=opening+" "+profile.method+" "+profile.evidence+".";
 const caution=" Keep in mind that "+profile.caution+".";
 const evidence=featureNames.length?" Relevant verified areas include "+[...new Set(featureNames)].join(", ")+".":"";
 return instruction+caution+evidence+" I can use connected records when available and won't infer missing values or outcomes. The relevant starting point is "+pageLabel(target,context)+".";
}


export function composeApiClarification(reason:"not-direct"|"missing-id"|"missing-amount",operation:string,botId?:string):string {
 const operationLabel=normalizeLabel(operation);
 const examples={
  "bot_activate":"activate bot BOT123 with 50 USDT",
  "bot_deactivate":"deactivate bot BOT123",
  "bot_withdraw":"withdraw from bot BOT123 with 50 USDT"
 } as Record<string,string>;
 const example=examples[operation]??operationLabel+" for bot BOT123";
 const request=reason==="not-direct"
  ? "State the operation as a direct command rather than a question about how it works."
  : reason==="missing-id"
   ? "Include the exact bot ID so the target can be validated."
   : "Include a valid positive USDT amount with the bot ID.";
 const tailored=reason==="missing-amount"&&botId
  ? " For example: "+(operation==="bot_deactivate"?"deactivate bot "+botId:operationLabel+" bot "+botId+" with 50 USDT")+"."
  : " For example: "+example+".";
 return request+tailored+" No operation has been sent.";
}

export function composePreparedApiResponse(operation:string,target?:string):string {
 const details=[normalizeLabel(operation),target?"target "+target:undefined].filter(Boolean).join(" for ");
 return "Prepared for confirmation: "+details+". Review the operation and its parameters in the confirmation panel; it has not been submitted or completed.";
}


export function composeSequenceResponse(inputs:string[],firstAction:BrainAction):string {
 const steps=inputs.map((value,index)=>(index+1)+". "+value.trim()).join("; ");
 const first=firstAction.type==="navigate"?"The first step is to open "+normalizeLabel(firstAction.target)+".":"The first step is ready to review.";
 return "I separated the request into "+inputs.length+" steps: "+steps+". "+first+" Verify its result before continuing; later steps remain uncompleted until individually confirmed.";
}

export function composeRuntimeControlResponse(label:string,kind:"matched"|"sensitive"|"ambiguous"):string {
 const control=label.trim()||"the requested control";
 if(kind==="sensitive")return "The visible control "+JSON.stringify(control)+" matches the request, but it can change account or application state. Use the app's dedicated confirmation flow before proceeding; no control was triggered.";
 if(kind==="ambiguous")return "More than one visible control matches "+JSON.stringify(control)+". Provide the full displayed label so the intended control can be identified without guessing.";
 return "The visible control "+JSON.stringify(control)+" matches the request. Its resulting state still needs to be verified by the app.";
}

export function composeAppMapChangeResponse(state:"no-baseline"|"unchanged"|"changed",changes:Array<{kind:string;name:string;route:string;details:string}>):string {
 if(state==="no-baseline")return "The latest verified app map is available, but no earlier snapshot is available for comparison. New or removed features cannot be established without that baseline.";
 if(state==="unchanged")return "The latest and previous verified app maps contain no detected route, feature-name, description, or keyword changes.";
 const groups=[
  {kind:"added",label:"New verified features"},
  {kind:"changed",label:"Updated feature knowledge"},
  {kind:"removed",label:"Features no longer present"}
 ];
 const parts=groups.map(group=>{
  const entries=changes.filter(change=>change.kind===group.kind);
  return entries.length?group.label+": "+entries.map(change=>change.name+" ("+change.route+(group.kind==="changed"&&change.details?": "+change.details:"")+")").join("; "):"";
 }).filter(Boolean);
 const removed=changes.some(change=>change.kind==="removed");
 return "App-map comparison found "+changes.length+" change"+(changes.length===1?"":"s")+". "+parts.join(". ")+(removed?". Removed routes must not be used for navigation.":".");
}

export function composeVerifiedFactFollowUp(topic:string,answer:string,hasRelated:boolean):string {
 const label=normalizeLabel(topic);
 return hasRelated?"Additional verified information about "+label+": "+answer:"The earlier verified information about "+label+" is still the relevant context: "+answer;
}

export function composeBalanceNavigationResponse(target:string):string {
 return "Opening "+pageLabel(target,{})+" to retrieve the current balance. The balance itself must come from the connected account data.";
}


export function composeLiveDataStatus(topic:"account-state"|"transactions"|"bots"|"market"|"webhooks"|"notifications",state:"unavailable"|"unrecognized",detail?:string):string {
 const labels:Record<typeof topic,string>={
  "account-state":"account and balance data",
  transactions:"transaction history",
  bots:"bot records",
  market:"market data",
  webhooks:"webhook configuration and delivery records",
  notifications:"notification records"
 };
 const limits:Record<typeof topic,string>={
  "account-state":"I cannot infer a balance or asset value from unrelated fields.",
  transactions:"I cannot identify a transaction outcome without recognizable transaction fields.",
  bots:"I cannot infer bot activity or profitability without recognizable status and performance evidence.",
  market:"I cannot infer a price or market movement from unrecognized fields.",
  webhooks:"An endpoint configuration alone does not prove that a delivery succeeded.",
  notifications:"I cannot determine notification status without recognizable notification fields."
 };
 const subject=labels[topic];
 if(state==="unavailable")return "I couldn't retrieve "+subject+" from the connected CryBots data source"+(detail&&detail.trim()?": "+detail.trim():"")+". No current value or successful outcome is being assumed.";
 return "CryBots returned data for "+subject+", but the response did not contain fields that can safely answer this request. "+limits[topic];
}

export function composeLiveGoalUnavailable(goal:string,topics:string[]):string {
 const label=goal==="bot-performance"?"bot performance":goal==="account-overview"?"your account overview":goal==="webhook-troubleshooting"?"webhook delivery troubleshooting":"this review";
 return "I couldn't retrieve any of the connected records needed for "+label+(topics.length?" ("+topics.join(", ")+")":"")+". I won't infer missing account values, bot profitability, or delivery outcomes; try again when the relevant data source is available.";
}
