"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpCryBotsBridge = exports.compareAppMap = exports.thinkLive = exports.dynamicDataRules = exports.verifiedRelationships = exports.verifiedRoutes = exports.crybotsAudit = exports.verifiedFacts = exports.crybotsSource = exports.executePlan = exports.executeCommand = exports.compileExecution = exports.buildActionPlan = exports.isCompatible = exports.decide = exports.splitRequests = exports.resolveReferences = exports.findVerifiedKnowledge = exports.findKnowledge = exports.knowledge = exports.appKnowledge = exports.BrainSession = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./brain"), exports);
var session_1 = require("./session");
Object.defineProperty(exports, "BrainSession", { enumerable: true, get: function () { return session_1.BrainSession; } });
var app_1 = require("./knowledge/app");
Object.defineProperty(exports, "appKnowledge", { enumerable: true, get: function () { return app_1.appKnowledge; } });
Object.defineProperty(exports, "knowledge", { enumerable: true, get: function () { return app_1.knowledge; } });
var matcher_1 = require("./knowledge/matcher");
Object.defineProperty(exports, "findKnowledge", { enumerable: true, get: function () { return matcher_1.findKnowledge; } });
Object.defineProperty(exports, "findVerifiedKnowledge", { enumerable: true, get: function () { return matcher_1.findVerifiedKnowledge; } });
var references_1 = require("./language/references");
Object.defineProperty(exports, "resolveReferences", { enumerable: true, get: function () { return references_1.resolveReferences; } });
var decision_1 = require("./reasoning/decision");
Object.defineProperty(exports, "splitRequests", { enumerable: true, get: function () { return decision_1.splitRequests; } });
Object.defineProperty(exports, "decide", { enumerable: true, get: function () { return decision_1.decide; } });
Object.defineProperty(exports, "isCompatible", { enumerable: true, get: function () { return decision_1.isCompatible; } });
var planner_1 = require("./reasoning/planner");
Object.defineProperty(exports, "buildActionPlan", { enumerable: true, get: function () { return planner_1.buildActionPlan; } });
var executor_1 = require("./reasoning/executor");
Object.defineProperty(exports, "compileExecution", { enumerable: true, get: function () { return executor_1.compileExecution; } });
var runtime_1 = require("./execution/runtime");
Object.defineProperty(exports, "executeCommand", { enumerable: true, get: function () { return runtime_1.executeCommand; } });
Object.defineProperty(exports, "executePlan", { enumerable: true, get: function () { return runtime_1.executePlan; } });
var crybotsSource_1 = require("./knowledge/crybotsSource");
Object.defineProperty(exports, "crybotsSource", { enumerable: true, get: function () { return crybotsSource_1.crybotsSource; } });
Object.defineProperty(exports, "verifiedFacts", { enumerable: true, get: function () { return crybotsSource_1.verifiedFacts; } });
var crybotsAudit_1 = require("./knowledge/crybotsAudit");
Object.defineProperty(exports, "crybotsAudit", { enumerable: true, get: function () { return crybotsAudit_1.crybotsAudit; } });
Object.defineProperty(exports, "verifiedRoutes", { enumerable: true, get: function () { return crybotsAudit_1.verifiedRoutes; } });
Object.defineProperty(exports, "verifiedRelationships", { enumerable: true, get: function () { return crybotsAudit_1.verifiedRelationships; } });
Object.defineProperty(exports, "dynamicDataRules", { enumerable: true, get: function () { return crybotsAudit_1.dynamicDataRules; } });
var think_1 = require("./live/think");
Object.defineProperty(exports, "thinkLive", { enumerable: true, get: function () { return think_1.thinkLive; } });
var adaptation_1 = require("./knowledge/adaptation");
Object.defineProperty(exports, "compareAppMap", { enumerable: true, get: function () { return adaptation_1.compareAppMap; } });
__exportStar(require("./live/types"), exports);
__exportStar(require("./live/router"), exports);
var http_1 = require("./live/http");
Object.defineProperty(exports, "createHttpCryBotsBridge", { enumerable: true, get: function () { return http_1.createHttpCryBotsBridge; } });
