import {BrainContext,BrainResult} from "../types";
import {think} from "../brain";
import {buildLiveQuery,liveTopicForResult} from "./router";
import {LiveCryBotsBridge,LiveDataResult} from "./types";

export type ThinkLiveOptions={userId?:string};

const verifiedTopicMap:Record<string,ReturnType<typeof liveTopicForResult>>={
  "verified:portfolio":"account-state","verified:my-bots":"bots","verified:bot-performance":"bots","verified:bot-lifecycle":"bots",
  "verified:webhooks":"webhooks","verified:webhook-history":"webhooks","verified:notifications":"notifications","verified:history":"transactions","verified:trade":"market",
};

function topicFor(result:BrainResult){return liveTopicForResult(result)??verifiedTopicMap[result.intent??""];}
const asRecord=(value:unknown):Record<string,any>|null=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,any>:null;
const formatAmount=(value:unknown,currency?:unknown)=>{const n=Number(value);return Number.isFinite(n)?n.toFixed(2)+(currency?" "+String(currency):""):String(value??"");};

function reasonOverLiveData(input:string,live:LiveDataResult):string|undefined{
  const text=input.toLowerCase(); const data=live.data;
  if(live.topic==="transactions"&&Array.isArray(data)){
    if(!data.length)return "You do not have any recorded CryBots transactions yet."; const latest=asRecord(data[0]); if(!latest)return live.message;
    const title=String(latest.title??latest.category??latest.direction??"Transaction"); const amount=formatAmount(latest.amount,latest.currency);
    const status=latest.status?String(latest.status):""; const when=latest.createdAt?new Date(String(latest.createdAt)).toLocaleString():"";
    if(/latest|last|most recent|recent transaction/.test(text))return "Your latest transaction is "+title+" for "+amount+(status?", status: "+status:"")+(when?", recorded "+when: "")+".";
    return live.message;
  }
  if(live.topic==="bots"){
    const record=asRecord(data); const investments=Array.isArray(record?.investments)?record.investments:[];
    const active=investments.filter((item:any)=>item?.active===true||["activating","active"].includes(String(item?.lifecycleStatus??"").toLowerCase()));
    if(/which|what|show|list/.test(text)&&/active|running/.test(text)){
      if(!active.length)return "None of your bot investments are currently active or activating."; const ids=active.map((item:any)=>item?.botId).filter(Boolean);
      return ids.length?"Your active or activating bots are: "+ids.join(", ")+".":"You have "+active.length+" active or activating bot investment"+(active.length===1?"":"s")+".";
    }
    if(active.length===1&&/active|running|status/.test(text)){const id=active[0]?.botId;return id?"Bot "+id+" is currently active or activating.":live.message;}
    return live.message;
  }
  if(live.topic==="webhooks"){
    const record=asRecord(data); const webhooks=Array.isArray(record?.webhooks)?record.webhooks:[];
    if(/which|what|show|list/.test(text)&&/webhook/.test(text)){if(!webhooks.length)return "You do not have any webhooks yet.";return webhooks.map((item:any)=>String(item?.name??item?._id??"Webhook")+" — "+(item?.enabled?"enabled":"disabled")).join("; ");}
  }
  if(live.topic==="notifications"){
    const record=asRecord(data); const notifications=Array.isArray(record?.notifications)?record.notifications:[];
    if(/latest|recent|last/.test(text)&&notifications.length){const n=asRecord(notifications[0]);if(n)return "Your latest notification is: "+String(n.title??n.message??"Notification")+".";}
  }
  return live.message;
}

export async function thinkLive(input:string,context:BrainContext={},bridge:LiveCryBotsBridge,options:ThinkLiveOptions={}):Promise<BrainResult>{
  const result=think(input,context);
  const goal=result.context.activeGoal;
  const relatedTopics:Record<string,LiveDataResult["topic"][]>={
    "bot-performance":["bots","transactions"],
    "account-overview":["account-state","transactions"],
    "webhook-troubleshooting":["webhooks"],
  };
  const goalTopics=goal?relatedTopics[goal]:undefined;
  if(goalTopics?.length){
    const results=await Promise.all(goalTopics.map(async topic=>{
      try {
        const live=await bridge.query({topic,input,entities:result.entities as Record<string,string>,userId:options.userId});
        return {topic,live};
      } catch {
        return {topic,live:{topic,ok:false,data:null,message:"Live data request failed."} as LiveDataResult};
      }
    }));
    const available=results.filter(item=>item.live.ok);
    const missing=results.filter(item=>!item.live.ok);
    if(!available.length)return {...result,response:"I understood the goal, but I couldn't retrieve the connected CryBots records needed to investigate it. Please try again when the connection is available.",liveData:undefined};
    const liveData=Object.fromEntries(available.map(item=>[item.topic,item.live.data]));
    let response:string;
    if(goal==="bot-performance"){
      response="I checked the available bot and transaction records together. Bot status tells us whether a bot is active, while recorded trades and transaction movements provide different evidence; an active bot alone does not prove profitability. I won't rank bots unless the returned records contain comparable performance results.";
    } else if(goal==="account-overview"){
      response="I checked the available account-state and transaction records together. Portfolio data describes current holdings; transaction history helps explain deposits, withdrawals, and other recorded movements. These are related but not interchangeable, so exact changes should be reconciled against the returned records.";
    } else {
      response="I checked the available webhook configuration records. To diagnose delivery, compare each webhook's enabled state and endpoint with its recorded delivery results or logs; configuration alone does not prove an event was delivered.";
    }
    if(missing.length)response+=" Some related records could not be retrieved ("+missing.map(item=>item.topic).join(", ")+"), so this assessment is incomplete.";
    return {...result,response,liveData:{goal,checkedTopics:available.map(item=>item.topic),records:liveData,unavailableTopics:missing.map(item=>item.topic)},context:{...result.context,lastTarget:result.context.lastTarget}};
  }
  const topic=topicFor(result); if(!topic)return result;
  const query=buildLiveQuery(result,input,result.entities,options.userId); const liveQuery=query??{topic,input,entities:result.entities as Record<string,string>,userId:options.userId}; liveQuery.topic=topic;
  const live=await bridge.query(liveQuery);
  if(!live.ok)return {...result,response:live.message??"I could not retrieve your current CryBots data right now. Please try again.",action:result.action,liveData:undefined};
  return {...result,response:reasonOverLiveData(input,live)??"I checked the current CryBots data, but there is no live summary available yet.",action:result.action,liveData:live.data,context:{...result.context,lastTarget:result.context.lastTarget}};
}