"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrainSession = void 0;
const brain_1 = require("./brain");
class BrainSession {
    constructor() {
        this.context = { history: [], entities: {} };
    }
    ask(input) { const result = (0, brain_1.think)(input, this.context); this.context = result.context; return result; }
    reset() { this.context = { history: [], entities: {} }; }
    get history() { return this.context.history ?? []; }
    get entities() { return this.context.entities ?? {}; }
    get lastIntent() { return this.context.lastIntent; }
    get lastTarget() { return this.context.lastTarget; }
}
exports.BrainSession = BrainSession;
