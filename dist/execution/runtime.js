"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = executeCommand;
exports.executePlan = executePlan;
async function executeCommand(command, executor, confirmed = false) {
    if (command.status === "blocked")
        return { commandId: command.id, status: "failed", message: command.reason ?? "Command is blocked." };
    if (command.requiresConfirmation && !confirmed)
        return { commandId: command.id, status: "rejected", message: "Explicit confirmation is required before this command can execute." };
    try {
        return await executor(command);
    }
    catch (error) {
        return { commandId: command.id, status: "failed", message: error instanceof Error ? error.message : "Execution failed." };
    }
}
async function executePlan(commands, executor, confirmedIds = []) {
    const results = [];
    for (const command of commands) {
        const confirmed = confirmedIds.includes(command.id);
        const result = await executeCommand(command, executor, confirmed);
        results.push(result);
        if (result.status === "failed" || result.status === "rejected")
            break;
    }
    return results;
}
