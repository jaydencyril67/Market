import { KnowledgeEntry } from "./app";
import { VerifiedAppFact } from "./crybotsSource";
export declare function findKnowledge(input: string, entries: KnowledgeEntry[]): {
    entry: KnowledgeEntry;
    score: number;
} | null;
export declare function findVerifiedKnowledge(input: string, entries?: VerifiedAppFact[]): {
    entry: VerifiedAppFact;
    score: number;
} | null;
