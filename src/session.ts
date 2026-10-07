import {BrainContext,BrainResult} from "./types";
import {think} from "./brain";
export class BrainSession{
  context:BrainContext={history:[]};
  ask(input:string):BrainResult{const result=think(input,this.context);this.context=result.context;return result;}
  reset(){this.context={history:[]};}
}
