import {intents} from "./intents/core";
import {responses} from "./responses/core";
import {composeIntentResponse} from "./responses/compose";
import {BrainAction,BrainApiOperation,BrainContext,BrainResult,Intent} from "./types";
import {synonyms} from "./language/synonyms";
import {knowledge} from "./knowledge/app";
import {findKnowledge,findVerifiedKnowledge} from "./knowledge/matcher";
import {verifiedFacts} from "./knowledge/crybotsSource";
import {patterns} from "./language/patterns";
import {extractEntities} from "./language/entities";
import {resolveReferences} from "./language/references";
import {splitRequests,decide} from "./reasoning/decision";
import {buildActionPlan} from "./reasoning/planner";
import {compileExecution} from "./reasoning/executor";
const languageExpansions:Record<string,string>={
 "im":"i am","ive":"i have","ill":"i will","dont":"do not","doesnt":"does not","didnt":"did not",
 "cant":"cannot","couldnt":"could not","wouldnt":"would not","shouldnt":"should not","wont":"will not","isnt":"is not",
 "arent":"are not","wasnt":"was not","werent":"were not","whats":"what is","wheres":"where is","hows":"how is",
 "thats":"that is","theres":"there is","lets":"let us","wanna":"want to","gonna":"going to","gotta":"got to",
 "lemme":"let me","gimme":"give me","pls":"please","plz":"please","u":"you","ur":"your","ya":"you","rn":"right now",
 "kinda":"kind of","sorta":"sort of","abt":"about","bc":"because","cuz":"because"
};
const commonCorrections:Record<string,string>={
 "balnce":"balance","balace":"balance","transection":"transaction","transction":"transaction","transacton":"transaction",
 "webhok":"webhook","webhokks":"webhooks","wthdraw":"withdraw","widraw":"withdraw","withdrwal":"withdrawal",
 "portfoli":"portfolio","activte":"activate","deactvate":"deactivate","notifcation":"notification","securty":"security",
 "tranaction":"transaction","transacions":"transactions","botss":"bots"
};
export const normalize=(input:string)=>{
 const base=input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s-]/g," ").replace(/\s+/g," ").trim();
 if(!base)return "";
 return base.split(" ").map(word=>commonCorrections[word]??languageExpansions[word]??word).join(" ");
};
const variants=(value:string)=>{const n=normalize(value);const out=new Set([n]);for(const [key,items] of Object.entries(synonyms)){if(items.includes(n)||key===n)for(const item of items)out.add(normalize(item));}return [...out];};
const tokenSet=(text:string)=>new Set(normalize(text).split(" ").filter(Boolean));
const containsPhrase=(text:string,phrase:string)=>Boolean(phrase)&&(" "+normalize(text)+" ").includes(" "+normalize(phrase)+" ");
const responsePool=(intentId:string)=>{const map:Record<string,string>={back:"back_success",forward:"forward_success",scroll:"scroll_success",scroll_nowbar:"acknowledgement",expand_nowbar:"acknowledgement",collapse_nowbar:"acknowledgement"};return responses[map[intentId]??intentId]??responses.fallback;};
const hashText=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const responseOpening=(value:string)=>normalize(value).split(" ").slice(0,2).join(" ");
const chooseResponse=(pool:string[],history:string[]=[],seedText:string="")=>{
 if(!pool.length)return responses.fallback[0];
 const recent=history.slice(-8);
 const exactRecent=new Set(recent);
 let candidates=pool.filter(x=>!exactRecent.has(x));
 if(!candidates.length)candidates=pool;
 const recentOpenings=new Set(recent.map(responseOpening).filter(Boolean));
 const differentOpening=candidates.filter(x=>!recentOpenings.has(responseOpening(x)));
 if(differentOpening.length)candidates=differentOpening;
 const seed=hashText([seedText,...recent].join("|"));
 return candidates[seed%candidates.length];
};
const failureResponse=(kind:"unclear"|"fallback",input:string,context:BrainContext)=>{
 const hasContext=Boolean((context.history?.length??0)>0||(context.lastIntent&&context.lastIntent!==""));
 const shortReference=/\b(that|this|it|again|same|there|then|yes|no|okay|ok)\b/.test(normalize(input));
 const pool=kind==="unclear"
   ? (hasContext||shortReference?responses.context_unclear:responses.unclear)
   : (hasContext&&shortReference?responses.context_fallback:responses.fallback);
 return chooseResponse(pool,context.responseHistory??[],input);
};
const distance=(a:string,b:string)=>{const x=normalize(a),y=normalize(b),d=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let prev=d[0];d[0]=i;for(let j=1;j<=y.length;j++){const cur=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=cur;}}return d[y.length];};
function typoBoost(text:string,forms:string[]){let boost=0;for(const word of text.split(" ")){if(word.length<4)continue;for(const form of forms){if(form.includes(" ")||form===word)continue;const d=distance(word,form);if(d===1)boost=Math.max(boost,.10);else if(d===2&&word.length>=6)boost=Math.max(boost,.05);}}return boost;}
function patternScore(input:string,intentId:string){const text=normalize(input);let best=0;for(const item of patterns.filter(x=>x.intent===intentId))for(const p of item.patterns){const parts=p.split("*").map(normalize);if(parts.length===1){if(text.includes(parts[0]))best=Math.max(best,item.weight);}else{const first=parts[0],last=parts[1];if(text.startsWith(first)&&text.endsWith(last)&&text.length>=first.length+last.length)best=Math.max(best,item.weight);}}return best;}
function score(input:string,intent:Intent){const text=normalize(input);if(!text)return 0;let score=0;for(const p of intent.phrases){const n=normalize(p);if(text===n)score+=.85;else if(containsPhrase(text,n))score+=.58;}for(const k of intent.keywords){const forms=variants(k);if(forms.some(v=>containsPhrase(text,v)))score+=.18;score+=typoBoost(text,forms);}for(const k of intent.keywords)if(tokenSet(text).has(normalize(k)))score+=.08;return Math.min(.99,score+patternScore(input,intent.id)+(intent.priority??0));}
const rememberResponse=(context:BrainContext,response:string)=>[...(context.responseHistory??[]),response].slice(-8);
const isContextualFollowUp=(input:string)=>/^(tell me more|explain (that|it|this)|what do you mean|how does (that|it|this) work|why is that|go deeper|more details|continue|and then|what about it|what about that|elaborate|can you explain more|give me more details|say more)$/.test(normalize(input));
type GoalGuide={id:string;topics:string[];response:string;target:string};
const goalGuides:GoalGuide[]=[
 {id:"bot-performance",topics:["bots","trading","transactions"],target:"my-bots",response:"To understand bot performance, connect three pieces: My Bots shows which bots are active and their available status; Trade History helps you inspect recorded trading activity; transaction records can help explain account movements. An active bot is not necessarily a profitable one. I can help you review these areas, but I need actual records to identify the best or worst performer."},
 {id:"account-overview",topics:["portfolio","transactions"],target:"portfolio",response:"For a useful account overview, start with Portfolio for your current holdings, then compare Transaction History for deposits, withdrawals, and other recorded account movements. These answer different questions, and I should use current account data for exact amounts."},
 {id:"webhook-troubleshooting",topics:["webhooks","logs"],target:"webhooks",response:"To troubleshoot a webhook, connect its configuration with its delivery history: verify the endpoint and enabled state, then inspect the latest delivery result or available logs. Keep its secret private. I can explain the evidence you provide, but I won't assume a delivery succeeded."},
 {id:"account-security",topics:["security","api keys"],target:"security",response:"For account security, review your Security settings and active device sessions, then check API Keys and their permissions if you use integrations. Use the minimum permissions needed and revoke anything unfamiliar or no longer required."}
];
const detectGoal=(input:string):GoalGuide|undefined=>{
 const text=normalize(input);
 const goalFraming=/\b(help me understand|help me improve|help me review|help me evaluate|help me compare|i want to understand|i want to improve|i want to review|i want to compare|help me figure out|i am trying to understand|i'm trying to understand|i need to know|help me figure|i want to know|trying to find out|can you help me|how can i tell|how do i know)\b/.test(text);
 const botGoal=/\b(which|best|worst|profitable|profit|losing|performance|performing|results|returns|making money|earning)\b/.test(text)&&/\b(bot|bots|trading bot|trade history|trades)\b/.test(text);
 const accountGoal=/\b(why|explain|compare|review|missing|lower|dropped|changed|difference|movement|reconcile|where did .* go)\b/.test(text)&&/\b(account|money|funds|balance|assets|portfolio|transaction|transactions)\b/.test(text);
 const webhookGoal=/\b(not working|failed|failing|not delivering|delivery|deliver|missing|troubleshoot|debug|why|check|fix)\b/.test(text)&&/\b(webhook|webhooks|event|notification)\b/.test(text);
 const securityGoal=/\b(secure|security|protect|protection|safe|safety|suspicious|unfamiliar|risk)\b/.test(text)&&/\b(account|device|session|api key|keys|security|login|logged in)\b/.test(text);
 if((goalFraming&&/\b(bot|bots|trading bot|performance|performing|profitability|results)\b/.test(text))||botGoal)return goalGuides[0];
 if((goalFraming&&/\b(account|money|funds|balance|assets|portfolio)\b/.test(text))||accountGoal)return goalGuides[1];
 if((goalFraming&&/\b(webhook|webhooks|delivery)\b/.test(text))||webhookGoal)return goalGuides[2];
 if((goalFraming&&/\b(security|secure|protect|protection)\b/.test(text))||securityGoal)return goalGuides[3];
 return undefined;
};
const isGoalFollowUp=(input:string)=>/^(what should i check|what should i look at|what next|what do i check next|which one is best|which is best|which one is worst|why is it losing|how do i know|how can i tell|what does that mean|how do i improve|what should i do|and what about the results|what about my data|what do the records say|what should i compare|can you check that|check it for me|then what|what about now)$/.test(normalize(input));
const asksAboutCurrentPage=(input:string)=>/\b(what can i do here|what can i do on this page|what can you do here|what buttons are available|which buttons are available|what controls are available|what controls do i have|what is on this page|what can you see here|show me the controls|what actions are available)\b/.test(normalize(input));
const asksAboutBalance=(input:string)=>{
 const text=normalize(input);
 if(/\b(withdraw|cash out|transfer|send|deposit|buy|sell|activate|deactivate)\b/.test(text))return false;
 return /\b(usdt balance|balance of usdt|balance in usdt|account balance|available balance|my balance|show my balance|check my balance|check balance|show my usdt balance|check my usdt balance|what is my balance|what s my balance|what is my usdt balance|what s my usdt balance|how much usdt do i have|how much do i have|how much balance do i have)\b/.test(text);
};
const answerFromRuntimePage=(context:BrainContext)=>{
 const snapshot=context.runtimePageSnapshot;
 const page=(snapshot?.title||context.runtimePage||"current page").replace(/^\//,"").replace(/[-_/]+/g," ").trim()||"current page";
 const headings=(snapshot?.headings??[]).filter(Boolean).slice(0,8);
 const states=(snapshot?.states??[]).filter(Boolean).slice(0,8);
 const controls=(context.runtimeControls??[]).filter(control=>control&&typeof control.label==="string"&&control.label.trim()).slice(0,12);
 const forms=(snapshot?.forms??[]).slice(0,5);
 const fields=(snapshot?.fields??[]).filter(field=>field&&typeof field.label==="string"&&field.label.trim()).slice(0,12);
 const parts:string[]=[];
 parts.push("I inspected the current visible interface on "+page+".");
 if(headings.length)parts.push("Page sections: "+headings.join("; ")+".");
 if(forms.length){
  const descriptions=forms.map(form=>{
   const fields=form.fields.slice(0,8).map(field=>field.label+" ("+field.type+(field.required?", required":"")+(field.disabled?", disabled":"")+(field.hasValue?", already filled":"")+")");
   return form.label+": "+(fields.join(", ")||"no readable fields");
  });
  parts.push("Forms and fields: "+descriptions.join("; ")+". I read field labels and metadata only, not the entered values.");
 }
 if(states.length)parts.push("Visible status or selected-state indicators: "+states.join("; ")+".");
 if(fields.length)parts.push("Visible fields outside explicit forms: "+fields.map(field=>field.label+" ("+field.type+(field.required?", required":"")+(field.disabled?", disabled":"")+(field.hasValue?", already filled":"")+(field.section?", in "+field.section:"")+")").join("; ")+". I read field labels and metadata only, not entered values.");
 if(controls.length){
  const enabled=controls.filter(control=>!control.disabled).map(control=>control.label);
  const disabled=controls.filter(control=>control.disabled).map(control=>control.label);
  if(enabled.length)parts.push("Enabled visible controls: "+enabled.join("; ")+".");
  if(disabled.length)parts.push("Disabled visible controls: "+disabled.join("; ")+".");
 }
 if(!snapshot&&!controls.length)return "I can identify the current page as "+page+", but I couldn't read its visible structure just now.";
 parts.push("This snapshot describes what is currently visible; it does not prove a backend operation succeeded or reveal hidden/private data.");
 return parts.join(" ");
};
const matchDiscoveredFeature=(input:string,features:NonNullable<BrainContext["discoveredFeatures"]>)=>{
 const text=normalize(input);
 const tokens=new Set(text.split(" ").filter(x=>x.length>2&&!["where","what","when","show","open","take","me","the","can","you","please","find","page","section","feature","want","need"].includes(x)));
 let best:{feature:NonNullable<BrainContext["discoveredFeatures"]>[number];score:number}|undefined;
 for(const feature of features){
  if(feature.verified!==true||!feature.route||!/^\/[a-z0-9/_-]+$/i.test(feature.route))continue;
  const name=normalize(feature.name);const id=normalize(feature.id.replace(/[-_]/g," "));
  const phrases=[name,id,...feature.keywords.map(normalize)].filter(Boolean);
  let score=0;
  if(name&&text.includes(name))score=1;
  else if(id&&text.includes(id))score=.92;
  else if(phrases.some(phrase=>phrase.length>2&&text.includes(phrase)))score=.86;
  else{
   const featureTokens=new Set([name,...feature.keywords].flatMap(value=>normalize(value).split(" ")).filter(x=>x.length>2));
   let overlap=0;for(const token of featureTokens)if(tokens.has(token))overlap++;
   if(overlap>=2)score=Math.min(.78,.48+overlap*.08);
  }
  if(score>(best?.score??0))best={feature,score};
 }
 return best&&best.score>=.72?best:undefined;
};

export function think(input:string,context:BrainContext={}):BrainResult{
 const requests=splitRequests(input);
 if(requests.length>1){
  const steps=requests.map(part=>{const rankedPart=intents.map(intent=>({intent,confidence:score(part,intent)})).sort((a,b)=>b.confidence-a.confidence);const bestPart=rankedPart[0];const entitiesPart=extractEntities(part,context.entities);const refsPart=resolveReferences(part,context,entitiesPart);return{intent:bestPart?.intent.id??"",confidence:bestPart?.confidence??0,input:part,action:bestPart?.intent.action??{type:"none"},references:refsPart,alternatives:rankedPart.slice(1,3).map(x=>({intent:x.intent.id,confidence:x.confidence}))};});
  if(steps.some(step=>step.action.type==="api")){
   const response="I can prepare one bot API operation at a time so I can validate the exact bot and amount and request approval for that specific action. Please send the bot operation by itself. No action has been sent.";
   return{intent:null,confidence:Math.min(...steps.map(step=>step.confidence)),response,action:{type:"none"},normalized:normalize(input),alternatives:steps.map(step=>step.intent).filter(Boolean),needsClarification:true,entities:context.entities??{},context:{...context,history:[...(context.history??[]),normalize(input)].slice(-10)}};
  }
  const decision=decide(steps,intents);const actionPlan=buildActionPlan(steps,steps.flatMap(s=>s.references));const execution=compileExecution(actionPlan,context.entities??{});decision.reason+=" Action plan: "+actionPlan.status+". Execution: "+execution.status+". ";
  if(decision.mode==="clarify")return{intent:null,confidence:Math.min(...steps.map(s=>s.confidence)),response:failureResponse("unclear",input,context),action:{type:"none"},normalized:normalize(input),alternatives:steps.map(s=>s.intent).filter(Boolean),needsClarification:true,entities:context.entities??{},context:{...context,decision,entities:extractEntities(input,context.entities),references:steps.flatMap(step=>step.references),history:[...(context.history??[]),normalize(input)].slice(-10)}};
  const first=steps[0];
  const plannedSteps=steps.map((step,index)=>`${index+1}. ${step.input}`);
  const response=decision.mode==="sequence"
   ? "I mapped your request into this sequence: "+plannedSteps.join("; ")+". I'll handle the first step only, then we should verify the visible result before continuing. I won't treat later steps as completed yet."
   : composeIntentResponse(first.intent,first.action,first.input||input,context);
  return{intent:first.intent,confidence:first.confidence,response,action:first.action,normalized:normalize(input),alternatives:steps.map(s=>s.intent),needsClarification:false,entities:context.entities??{},context:{...context,lastIntent:first.intent,lastTarget:first.action.type==="navigate"?first.action.target:context.lastTarget,history:[...(context.history??[]),normalize(input)].slice(-10),responseHistory:rememberResponse(context,response),decision}};
 }
 const normalized=normalize(input);const entities=extractEntities(input,context.entities);const references=resolveReferences(input,context,entities);
 const asksAboutAppMapChanges=/\b(what changed in the app|what changed in crybots|what changed in crybots app|any new pages|new pages or controls|new controls|did the app change|did crybots change|app map updates|updated app map|how has the app changed|what did you discover|what have you discovered|adapt to app changes)\b/.test(normalized);
 if(asksAboutAppMapChanges){
  const changes=context.appMapChanges??[];
  let response:string;
  if(!context.appMapCompared){
   response="I loaded the latest verified CryBots app map, but I don't have a previous map snapshot in this conversation to compare against. I won't guess which pages or controls are new.";
  }else if(!changes.length){
   response="I compared the latest verified CryBots app map with the previous snapshot available to Brain. No route, feature name, description, or keyword changes were detected.";
  }else{
   const added=changes.filter(change=>change.kind==="added");
   const changed=changes.filter(change=>change.kind==="changed");
   const removed=changes.filter(change=>change.kind==="removed");
   const parts:string[]=[];
   if(added.length)parts.push("New verified features: "+added.map(change=>change.name+" ("+change.route+")").join(", "));
   if(changed.length)parts.push("Updated feature knowledge: "+changed.map(change=>change.name+" ("+change.route+": "+change.details+")").join("; "));
   if(removed.length)parts.push("No longer present in the verified map: "+removed.map(change=>change.name+" ("+change.route+")").join(", ")+". I will not navigate to these routes.");
   response="I compared the latest verified app map with the previous snapshot. "+parts.join(". ")+".";
  }
  return{intent:"app-map-adaptation",confidence:.96,response,action:{type:"none"},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities}};
 }
 if(asksAboutBalance(input)){
  const response="I’ll open Details to check your current USDT balance.";
  return{intent:"balance",confidence:.98,response,action:{type:"navigate",target:"details"},normalized,alternatives:[],needsClarification:false,entities,context:{...context,lastIntent:"balance",lastTarget:"details",history:[...(context.history??[]),normalized].slice(-10),responseHistory:rememberResponse(context,response),entities}};
 }
 const detectedGoal=detectGoal(input);
 if(context.activeGoal&&isGoalFollowUp(input)){
  const guide=goalGuides.find(item=>item.id===context.activeGoal);
  if(guide){
   const response=guide.id==="bot-performance"?"To judge which bot is performing best, compare each bot’s recorded results over the same time period, then check its status and related trades. I can’t rank your bots without those actual records. Start in My Bots, then use Trade History to verify the activity.":guide.response;
   return{intent:"goal-follow-up:"+guide.id,confidence:.84,response,action:{type:"navigate",target:guide.target},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities,activeGoal:guide.id,goalTopics:guide.topics,lastTarget:guide.target}};
  }
 }
 if(detectedGoal){
  return{intent:"goal:"+detectedGoal.id,confidence:.86,response:detectedGoal.response,action:{type:"navigate",target:detectedGoal.target},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities,activeGoal:detectedGoal.id,goalTopics:detectedGoal.topics,lastTarget:detectedGoal.target}};
 }
 if(context.lastKnowledgeId&&isContextualFollowUp(input)){
  const prior=(context.runtimeFacts?.length?context.runtimeFacts:verifiedFacts).find(entry=>entry.id===context.lastKnowledgeId);
  if(prior){
   const related=verifiedFacts.find(entry=>entry.topic===prior.topic&&entry.id!==prior.id);
   const selected=related??prior;
   const response=related?"A little more on "+prior.topic.replace(/-/g," ")+": "+related.answer:"Here is the context I was referring to: "+prior.answer;
   return{intent:`verified:${selected.id}`,confidence:.88,response,action:{type:"none"},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities,lastKnowledgeId:selected.id,lastKnowledgeTopic:selected.topic}};
  }
 }
 const clickRequest=/\b(?:click|tap|press|activate)\s+(.+?)\s*$/.exec(normalized);
 if(clickRequest){
  const requested=clickRequest[1].replace(/^(?:the|on)\s+/,"").trim();
  const controls=(context.runtimeControls??[]).filter(control=>control&&typeof control.id==="string"&&typeof control.label==="string"&&!control.disabled);
  const matches=controls.map(control=>({control,label:normalize(control.label)})).filter(item=>{
   const label=item.label;
   return label===requested||label.startsWith(requested+" ")||label.endsWith(" "+requested)||label.includes(" "+requested+" ");
  });
  if(matches.length===1){
   const selected=matches[0].control;
   const sensitive=/\b(withdraw|transfer|deposit|send|delete|remove|disable|enable|revoke|reset|password|security code|confirm|close account|submit|purchase|buy|sell|rent|activate|deactivate|create|generate|add|edit|update|save|approve)\b/i.test(selected.label);
   const response=sensitive
    ? "I found the "+selected.label+" control, but I won't trigger a financial, destructive, security-sensitive, or state-changing action by voice without a dedicated confirmation flow. Please review and use the control directly."
    : "I found the visible "+selected.label+" control on this page.";
   return{intent:sensitive?"runtime-control-needs-confirmation":"runtime-control-click",confidence:.94,response,action:sensitive?{type:"none"}:{type:"click",target:selected.id},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities}};
  }
  if(matches.length>1){
   return{intent:"runtime-control-ambiguous",confidence:.5,response:"I found more than one matching visible control. Please say the full button label so I don't activate the wrong one.",action:{type:"none"},normalized,alternatives:[],needsClarification:true,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities}};
  }
 }
 if(asksAboutCurrentPage(input)){
  const response=answerFromRuntimePage(context);
  return{intent:"runtime-page-overview",confidence:.9,response,action:{type:"none"},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities}};
 }
 const wantsFeatureNavigation=/\b(open|go to|take me to|navigate to|show me|bring me to|where is|where can i find|visit)\b/.test(normalized);
 const discoveredHit=wantsFeatureNavigation?matchDiscoveredFeature(input,context.discoveredFeatures??[]):undefined;
 if(discoveredHit){
  const feature=discoveredHit.feature;
  const response=feature.description.trim()||"I found this feature in the latest verified app map.";
  return{intent:"discovered:"+feature.id,confidence:discoveredHit.score,response,action:{type:"navigate",target:feature.route},normalized,alternatives:[],needsClarification:false,entities,context:{...context,history:[...(context.history??[]),normalized].slice(-10),entities,lastTarget:feature.route,discoveryVersion:context.discoveryVersion,discoveryUpdatedAt:context.discoveryUpdatedAt}};
 }
 const runtimeFacts=(context.runtimeFacts??[]).filter(fact=>fact&&typeof fact.id==="string"&&typeof fact.answer==="string"&&Array.isArray(fact.questions)&&Array.isArray(fact.keywords)&&typeof fact.source==="string"&&typeof fact.verifiedAt==="string");
 const verifiedHit=findVerifiedKnowledge(input,runtimeFacts.length?runtimeFacts:undefined);const knowledgeHit=findKnowledge(input,knowledge);
 if(verifiedHit&&verifiedHit.score>=.52){const nextContext={...context,history:[...(context.history??[]),normalized].slice(-10),pendingIntent:null};return{intent:`verified:${verifiedHit.entry.id}`,confidence:verifiedHit.score,response:verifiedHit.entry.answer,action:verifiedHit.entry.route?{type:"navigate",target:verifiedHit.entry.route}:{type:"none"},normalized,alternatives:[],needsClarification:false,entities,context:{...nextContext,entities,lastKnowledgeId:verifiedHit.entry.id,lastKnowledgeTopic:verifiedHit.entry.topic}};}
 if(knowledgeHit&&knowledgeHit.score>=.55){const nextContext={...context,history:[...(context.history??[]),normalized].slice(-10),pendingIntent:null};return{intent:`knowledge:${knowledgeHit.entry.id}`,confidence:knowledgeHit.score,response:knowledgeHit.entry.answer,action:{type:"none"},normalized,alternatives:[],needsClarification:false,entities,context:{...nextContext,entities,references}};}
 const ranked=intents.map(intent=>({intent,confidence:score(input,intent),action:intent.action})).sort((a,b)=>b.confidence-a.confidence);let best=ranked[0];
 if(context.lastTarget==="my-bots"&&/\b(status|activity|doing|running|active)\b/.test(normalized)){const candidate=intents.find(x=>x.id==="bot_status");if(candidate)best={intent:candidate,confidence:Math.max(best?.confidence??0,.82),action:candidate.action};}
 if(context.pendingIntent){const pending=intents.find(x=>x.id===context.pendingIntent);if(pending){const pendingScore=score(input,pending);if(pendingScore>.15)best={intent:pending,confidence:Math.min(.99,pendingScore+.15),action:pending.action};}}
 if(!best||best.confidence<.30){const response=failureResponse("fallback",input,context);return{intent:null,confidence:best?.confidence??0,response,action:{type:"none"},normalized,alternatives:ranked.slice(0,3).filter(x=>x.confidence>0).map(x=>x.intent.id),needsClarification:false,entities,context:{...context,entities,references,responseHistory:rememberResponse(context,response)}};}
 const alternatives=ranked.filter(x=>x.confidence>0).slice(0,3);const ambiguous=alternatives.length>1&&best.confidence<.7&&best.confidence-alternatives[1].confidence<.12;
 if(ambiguous){const response=chooseResponse(responses.unclear,context.responseHistory??[]);return{intent:null,confidence:best.confidence,response,action:{type:"none"},normalized,alternatives:alternatives.map(x=>x.intent.id),needsClarification:true,entities,context:{...context,pendingIntent:best.intent.id,entities,references,responseHistory:rememberResponse(context,response)}};}
 if(best.intent.id==="scroll"){const scrollTop=/\b(top|beginning)\b/.test(normalized);const scrollBottom=/\b(bottom|end)\b/.test(normalized);best={...best,action:{type:"scroll_page",direction:/\bup\b/.test(normalized)?"up":"down",position:scrollTop?"top":scrollBottom?"bottom":undefined}};}
 if(references.length){const ref=references[0];if(ref.type==="bot"&&best.intent.id==="bot_status"){const candidate=intents.find(x=>x.id==="bot_status")!;best={intent:candidate,confidence:Math.max(best.confidence,.88),action:best.action??candidate.action};}}
 let action:BrainAction=best.action??{type:"none"};
 let apiClarification:string|undefined;
 if(action.type==="api"){
  const operation:BrainApiOperation=action.operation;
  const targetMatch=input.match(/\bbot(?:\s+id)?\s*(?:#\s*|id\s*)?([a-z0-9][a-z0-9._-]{2,})\b/i);
  const targetCandidate=targetMatch?.[1]?.trim();
  const reservedTargets=new Set(["with","using","amount","for","usdt","usd","please","my","your","this","that","bot","bots","activate","deactivate","withdraw","funds","from","now"]);
  const botId=targetCandidate&&!reservedTargets.has(targetCandidate.toLowerCase())?targetCandidate:undefined;
  const amountMatch=input.match(/\b(?:with|amount(?:\s+of)?|for)\s+(?:\$|usdt\s+|usd\s+)?([0-9]+(?:\.[0-9]+)?)(?:\s*(?:usdt|usd))?\b/i);
  const amount=amountMatch?.[1]?Number(amountMatch[1]):NaN;
  const directCommand=/^(?:please\s+)?(?:activate|start|turn on|deactivate|stop|turn off|withdraw)\b/i.test(input.trim());
  if(!directCommand){
   apiClarification="I can prepare this through CryBots’ API, but I need to distinguish a direct command from a how-to question. To submit a request for review, phrase it directly, for example: “activate bot BOT123 with 50 USDT.” No operation has been sent.";
  }else if(!botId){
   apiClarification="I can prepare that through CryBots’ bot API, but I need the exact bot ID. Please repeat the request with the bot ID, for example: “activate bot BOT123 with 50 USDT.” No operation has been sent.";
  }else if((operation==="bot_activate"||operation==="bot_withdraw")&&(!Number.isFinite(amount)||amount<=0)){
   apiClarification="I found the bot request, but I need a valid USDT amount. Please repeat it with the bot ID and amount, for example: “"+(operation==="bot_activate"?"activate":"withdraw from")+" bot "+botId+" with 50 USDT.” No operation has been sent.";
  }else{
   action={type:"api",operation,target:botId,parameters:operation==="bot_deactivate"?{}:{amount:String(amount)},requiresConfirmation:true};
  }
 }
 if(apiClarification){
  const response=apiClarification;
  const nextContext={...context,lastIntent:best.intent.id,history:[...(context.history??[]),normalized].slice(-10),responseHistory:rememberResponse(context,response),pendingIntent:best.intent.id,entities};
  return{intent:best.intent.id,confidence:best.confidence,response,action:{type:"none"},normalized,alternatives:alternatives.map(x=>x.intent.id),needsClarification:true,entities,context:nextContext};
 }
 const response=action.type==="api"
  ?"I prepared a bot operation for review. Nothing has been changed yet. Check the bot and details in the confirmation panel, then confirm to send the request to CryBots."
  :composeIntentResponse(best.intent.id,action,input,context);
 const nextContext={...context,lastIntent:best.intent.id,lastTarget:action.type==="navigate"?action.target:context.lastTarget,lastKnowledgeId:context.lastKnowledgeId,lastKnowledgeTopic:context.lastKnowledgeTopic,activeGoal:context.activeGoal,goalTopics:context.goalTopics,history:[...(context.history??[]),normalized].slice(-10),responseHistory:rememberResponse(context,response),pendingIntent:null,entities,references};
 return{intent:best.intent.id,confidence:best.confidence,response,action,normalized,alternatives:alternatives.map(x=>x.intent.id),needsClarification:false,entities,context:nextContext};
}
