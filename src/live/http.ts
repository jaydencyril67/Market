import {LiveCryBotsBridge,LiveDataResult,LiveQuery} from "./types";

export type HttpCryBotsBridgeOptions={
  endpoint:string;
  getAccessToken?:()=>Promise<string|undefined>|string|undefined;
  fetchImpl?:typeof fetch;
};

export function createHttpCryBotsBridge(options:HttpCryBotsBridgeOptions):LiveCryBotsBridge{
  const fetchImpl=options.fetchImpl??fetch;
  return {
    async query(query:LiveQuery):Promise<LiveDataResult>{
      try{
        const token=await options.getAccessToken?.();
        const headers:Record<string,string>={"content-type":"application/json"};
        if(token)headers.authorization=`Bearer ${token}`;
        const response=await fetchImpl(options.endpoint,{
          method:"POST",
          headers,
          body:JSON.stringify(query),
        });
        const body=await response.json().catch(()=>null) as Partial<LiveDataResult>|null;
        if(!response.ok){
          return{
            topic:query.topic,
            ok:false,
            data:null,
            message:typeof body?.message==="string"?body.message:"CryBots live data request failed.",
          };
        }
        return{
          topic:query.topic,
          ok:body?.ok!==false,
          data:body?.data??null,
          message:typeof body?.message==="string"?body.message:undefined,
          fetchedAt:typeof body?.fetchedAt==="string"?body.fetchedAt:new Date().toISOString(),
        };
      }catch{
        return{topic:query.topic,ok:false,data:null,message:"CryBots live data is temporarily unavailable."};
      }
    },
  };
}
