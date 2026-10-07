import {BrainContext,BrainResult} from "../types";
import {think} from "../brain";
import {buildLiveQuery,liveTopicForResult} from "./router";
import {LiveCryBotsBridge} from "./types";

export type ThinkLiveOptions={
  userId?:string;
};

const verifiedTopicMap:Record<string,ReturnType<typeof liveTopicForResult>>={
  "verified:portfolio":"account-state",
  "verified:my-bots":"bots",
  "verified:bot-performance":"bots",
  "verified:bot-lifecycle":"bots",
  "verified:webhooks":"webhooks",
  "verified:webhook-history":"webhooks",
  "verified:notifications":"notifications",
  "verified:history":"transactions",
  "verified:trade":"market",
};

function topicFor(result:BrainResult){
  return liveTopicForResult(result)??verifiedTopicMap[result.intent??""];
}

export async function thinkLive(
  input:string,
  context:BrainContext={},
  bridge:LiveCryBotsBridge,
  options:ThinkLiveOptions={}
):Promise<BrainResult>{
  const result=think(input,context);
  const topic=topicFor(result);
  if(!topic)return result;

  const query=buildLiveQuery(result,input,result.entities,options.userId);
  const liveQuery=query??{topic,input,entities:result.entities as Record<string,string>,userId:options.userId};
  liveQuery.topic=topic;

  const live=await bridge.query(liveQuery);
  if(!live.ok){
    return {
      ...result,
      response:live.message??"I couldn't retrieve your current CryBots data right now. Please try again.",
      action:result.action,
    };
  }

  return {
    ...result,
    response:live.message??"I checked the current CryBots data, but there is no live summary available yet.",
    action:result.action,
    context:{...result.context,lastTarget:result.context.lastTarget},
  };
}
