export type LiveTopic="account-state"|"transactions"|"bots"|"market"|"webhooks"|"notifications";

export type LiveQuery={
  topic:LiveTopic;
  input:string;
  entities?:Record<string,string>;
  userId?:string;
};

export type LiveDataResult={
  topic:LiveTopic;
  ok:boolean;
  data:unknown;
  message?:string;
  fetchedAt?:string;
};

export type LiveCryBotsBridge={
  query:(query:LiveQuery)=>Promise<LiveDataResult>;
  discover?:()=>Promise<AppDiscoverySnapshot>;
};

/**
 * A verified snapshot of the app's navigable feature map. The host app supplies
 * this at runtime so Brain can refresh its understanding without redeploying
 * the Brain package whenever the host's discovery source changes.
 */
export type AppDiscoverySnapshot={
  version:string;
  updatedAt:string;
  features:BrainDiscoveredFeature[];
  facts?:BrainRuntimeFact[];
};

