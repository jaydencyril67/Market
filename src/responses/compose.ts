import {BrainAction,BrainContext} from "../types";
import {intents} from "../intents/core";

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
  return choose(["What would you like to work through?","What are you trying to get done?","What should we look into first?","What do you need a hand with?"],seed);
 }
 if(action.type==="navigate"){
  const lead=choose(["Opening","Taking you to","Heading to","Bringing up"],seed);
  return lead+" "+target+".";
 }
 if(action.type==="back")return choose(["Moving back one page.","Returning to the previous page.","Going back in the current navigation history."],seed);
 if(action.type==="forward")return choose(["Moving forward one page.","Going to the next page in navigation history.","Continuing forward through the current page history."],seed);
 if(action.type==="scroll_page"){
  const direction=action.direction==="up"?"up":"down";
  const position=action.position;
  if(position)return choose(["Moving to the "+position+" of the page.","Taking the page to its "+position+"."],seed);
  return choose(["Scrolling "+direction+".","Moving the page "+direction+".","Adjusting the page view "+direction+"."],seed);
 }
 if(action.type==="scroll_nowbar")return choose(["Moving the navigation bar "+action.direction+".","Shifting the navigation bar "+action.direction+"."],seed);
 if(action.type==="expand_nowbar")return choose(["Expanding the navigation bar.","Showing the expanded navigation options."],seed);
 if(action.type==="collapse_nowbar")return choose(["Collapsing the navigation bar.","Hiding the expanded navigation options."],seed);
 if(action.type==="click")return "I’ve matched the visible control "+JSON.stringify(action.target)+" to your request. The app still needs to confirm the resulting state.";
 if(action.type==="api")return "The "+action.operation.replace(/_/g," ")+" request is prepared for review; no change should be treated as complete until the app confirms it.";
 if(intentId==="help"){
  const features=(context.discoveredFeatures??[]).filter(feature=>feature.verified).slice(0,5).map(feature=>feature.name);
  const available=features.length?features.join(", "):"the supported pages and controls";
  return "I can help interpret your request, navigate to a supported feature, and work with connected data when available. The current verified feature map includes "+available+".";
 }
 if(action.type==="none"&&intent){
  const description=intent.description.replace(/^User /i,"").replace(/[.]$/,"");
  return choose(["I interpreted that as: "+description+".","The closest supported interpretation is: "+description+".","I matched your request to this intent: "+description+"."],seed);
 }
 return choose(["I couldn’t map that request to a supported action yet. Add the page, item, or outcome you mean and I can narrow it down.","I need a clearer target before choosing an action. Mention the feature or result you want, and I’ll reassess it.","I haven’t selected an action because the request doesn’t identify a supported target clearly enough."],seed);
}
