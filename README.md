# Crybots Brain

A purpose-built knowledge, intent, language, response, context, and action engine for Crybots.

## Goal
Crybots Brain is not a general-purpose AI. It is designed to understand Crybots users, explain Crybots features, handle light app-related conversation, and return safe structured actions for the Crybots app.

## Core pipeline
1. Normalize user input.
2. Match language and synonyms.
3. Score candidate intents.
4. Apply conversation context.
5. Resolve a response or app action.
6. Ask for clarification when confidence is too low.

## Structure
- src/brain.ts — core engine
- src/knowledge/ — Crybots knowledge
- src/intents/ — supported intents and example phrases
- src/language/ — synonyms and conversational language
- src/responses/ — reusable responses
- src/actions/ — safe app action definitions
- src/index.ts — public API

This repository intentionally contains no external AI dependency.
