import {BrainEntities,BrainResult} from "../types";
import {LiveQuery,LiveTopic} from "./types";

const topicByIntent:Record<string,LiveTopic|undefined>={
  balance:"account-state",
  portfolio:"account-state",
  bot_status:"bots",
  bots:"bots",
  webhooks:"webhooks",
};

export function liveTopicForResult(result:BrainResult):LiveTopic|undefined{
  return topicByIntent[result.intent??""];
}

export function buildLiveQuery(result:BrainResult,input:string,entities:BrainEntities={},userId?:string):LiveQuery|undefined{
  const topic=liveTopicForResult(result);
  if(!topic)return undefined;
  const query:LiveQuery={topic,input,entities:entities as Record<string,string>,userId};
  return query;
}
