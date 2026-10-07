import { ExecutionCommand, ExecutionResult } from "../types";
export type Executor = (command: ExecutionCommand) => Promise<ExecutionResult> | ExecutionResult;
export declare function executeCommand(command: ExecutionCommand, executor: Executor, confirmed?: boolean): Promise<ExecutionResult>;
export declare function executePlan(commands: ExecutionCommand[], executor: Executor, confirmedIds?: string[]): Promise<ExecutionResult[]>;
