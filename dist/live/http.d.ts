import { LiveCryBotsBridge } from "./types";
export type HttpCryBotsBridgeOptions = {
    endpoint: string;
    getAccessToken?: () => Promise<string | undefined> | string | undefined;
    fetchImpl?: typeof fetch;
};
export declare function createHttpCryBotsBridge(options: HttpCryBotsBridgeOptions): LiveCryBotsBridge;
