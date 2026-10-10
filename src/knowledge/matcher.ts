import {KnowledgeEntry} from "./app";
import {verifiedFacts,VerifiedAppFact} from "./crybotsSource";
import {normalize} from "../brain";
const distance=(a:string,b:string)=>{const x=normalize(a),y=normalize(b);const d=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=y.length;j++){const q=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(x[i-1]===y[j-1]?0:1));p=q;}}return d[y.length];};
const scoreEntry=(input:string,questions:string[],keywords:string[],route?:string)=>{const text=normalize(input);let score=0;for(const q of questions){const n=normalize(q);if(text===n)score+=.96;else if(text.includes(n))score+=.72;else if(distance(text,n)<=2)score+=.28;}for(const k of keywords)if(text.includes(normalize(k)))score+=.10;
 const navigationRequest=/\b(open|go to|take me to|navigate to|bring up|switch to|visit|load|show me)\b/.test(text);
 if(navigationRequest&&route){const routeName=normalize(route.split("/").filter(Boolean).join(" "));const routeAliases=keywords.some(k=>{const keyword=normalize(k);return keyword.length>=4&&text.includes(keyword);});if((routeName&&text.includes(routeName))||routeAliases)score+=.72;}
 return Math.min(.99,score);};
export function findKnowledge(input:string,entries:KnowledgeEntry[]){let best:{entry:KnowledgeEntry;score:number}|null=null;for(const entry of entries){const score=scoreEntry(input,entry.questions,entry.keywords);if(!best||score>best.score)best={entry,score};}return best&&best.score>=.38?best:null;}
export function findVerifiedKnowledge(input:string,entries:VerifiedAppFact[]=verifiedFacts){let best:{entry:VerifiedAppFact;score:number}|null=null;for(const entry of entries){const score=scoreEntry(input,entry.questions,entry.keywords,entry.route);if(!best||score>best.score)best={entry,score};}return best&&best.score>=.42?best:null;}
