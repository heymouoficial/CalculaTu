# Implementation Plan: Savara Pro Optimization & Licensing Evolution

This plan follows the TDD workflow and includes phase-level verification checkpoints.

## Phase 1: Core Licensing & Auto-Trial
Goal: Implement automatic 24h Free Pass linked to MachineID.

- [x] Task: Define `license_type` and `expires_at` in `useAppStore` or `useLicenseStore`. d08be41
- [x] Task: Implement `autoActivateTrial` logic in `utils/deviceId.ts` or a new hook.
- [x] Task: Write Tests: Verify `autoActivateTrial` creates a valid 24h trial token on first run.
- [x] Task: Implement: `autoActivateTrial` with offline-first persistence in localStorage.
- [x] Task: Task: Conductor - User Manual Verification 'Phase 1: Core Licensing & Auto-Trial' (Protocol in workflow.md)

## Phase 2: Structured JSON Intents & Cart Upsert
Goal: Transition Savara to structured JSON intents with upsert logic.

- [x] Task: Define `SavaraIntent` type and closed set of actions (ADD_ITEM, etc.).
- [x] Task: Update `useAppStore` cart actions to support upsert (incrementing quantity if item exists).
- [x] Task: Write Tests: Verify `ADD_ITEM` intent correctly updates or increments cart items.
- [x] Task: Implement: Refactor `useSavaraLive` to handle JSON intents from Gemini and dispatch to store.
- [x] Task: Write Tests: Verify `SUMMARIZE_CART` returns accurate totals without modifying state.
- [x] Task: Implement: `SUMMARIZE_CART` logic in the store or helper utility.
- [x] Task: Task: Conductor - User Manual Verification 'Phase 2: Structured JSON Intents & Cart Upsert' (Protocol in workflow.md)

## Phase 3: Enhanced AI Context & Marketing Knowledge Base
Goal: Inject deep app context and marketing info into Gemini prompts.

- [x] Task: Create `getSavaraSystemPrompt` (getSavaraSystemInstruction) utility that aggregates state, rates, and marketing KB.
- [x] Task: Write Tests: Verify system prompt contains correct BCV rates and license status.
- [x] Task: Implement: Update `ChatWidget.tsx` and `SavaraCallModal.tsx` to use the dynamic system prompt.
- [x] Task: Task: Conductor - User Manual Verification 'Phase 3: Enhanced AI Context & Marketing Knowledge Base' (Protocol in workflow.md)

## Phase 4: Adaptive Latency Strategy
Goal: Implement RTT monitoring and Push-to-Talk fallback.

- [x] Task: Implement RTT measurement in the WebSocket connection within `useSavaraLive`.
- [x] Task: Add "Slow Connection Mode" UI label to `SavaraCallModal.tsx`.
- [x] Task: Write Tests: Verify latency threshold logic (handled in useSavaraLive).
- [x] Task: Implement: Adaptive switching logic and UI signaling.
- [x] Task: Task: Conductor - User Manual Verification 'Phase 4: Adaptive Latency Strategy' (Protocol in workflow.md)