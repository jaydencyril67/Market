import {BrainContext,BrainResult} from "./types";
import {think} from "./brain";
export class BrainSession{
 context:BrainContext={history:[],entities:{}};
 ask(input:string):BrainResult{const result=think(input,this.context);this.context=result.context;return result;}
 reset(){this.context={history:[],entities:{}};}
 get history(){return this.context.history??[];}
 get entities(){return this.context.entities??{};}
 get lastIntent(){return this.context.lastIntent;}
 get lastTarget(){return this.context.lastTarget;}
}
