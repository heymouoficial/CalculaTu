# Implementation Plan: Savara Pro Optimization & Licensing Evolution

This plan follows the TDD workflow and includes phase-level verification checkpoints.

## Phase 1: Core Licensing & Auto-Trial
Goal: Implement automatic 24h Free Pass linked to MachineID.

- [x] Task: Define `license_type` and `expires_at` in `useAppStore` or `useLicenseStore`. d08be41
- [ ] Task: Implement `autoActivateTrial` logic in `utils/deviceId.ts` or a new hook.
- [ ] Task: Write Tests: Verify `autoActivateTrial` creates a valid 24h trial token on first run.
- [ ] Task: Implement: `autoActivateTrial` with offline-first persistence in localStorage.
- [ ] Task: Task: Conductor - User Manual Verification 'Phase 1: Core Licensing & Auto-Trial' (Protocol in workflow.md)

## Phase 2: Structured JSON Intents & Cart Upsert
Goal: Transition Savara to structured JSON intents with upsert logic.

- [ ] Task: Define `SavaraIntent` type and closed set of actions (ADD_ITEM, etc.).
- [ ] Task: Update `useAppStore` cart actions to support upsert (incrementing quantity if item exists).
- [ ] Task: Write Tests: Verify `ADD_ITEM` intent correctly updates or increments cart items.
- [ ] Task: Implement: Refactor `useSavaraLive` to handle JSON intents from Gemini and dispatch to store.
- [ ] Task: Write Tests: Verify `SUMMARIZE_CART` returns accurate totals without modifying state.
- [ ] Task: Implement: `SUMMARIZE_CART` logic in the store or helper utility.
- [ ] Task: Task: Conductor - User Manual Verification 'Phase 2: Structured JSON Intents & Cart Upsert' (Protocol in workflow.md)

## Phase 3: Enhanced AI Context & Marketing Knowledge Base
Goal: Inject deep app context and marketing info into Gemini prompts.

- [ ] Task: Create `getSavaraSystemPrompt` utility that aggregates state, rates, and marketing KB.
- [ ] Task: Write Tests: Verify system prompt contains correct BCV rates and license status.
- [ ] Task: Implement: Update `ChatWidget.tsx` and `SavaraCallModal.tsx` to use the dynamic system prompt.
- [ ] Task: Task: Conductor - User Manual Verification 'Phase 3: Enhanced AI Context & Marketing Knowledge Base' (Protocol in workflow.md)

## Phase 4: Adaptive Latency Strategy
Goal: Implement RTT monitoring and Push-to-Talk fallback.

- [ ] Task: Implement RTT measurement in the WebSocket connection within `useSavaraLive`.
- [ ] Task: Add "Slow Connection Mode" UI label to `SavaraCallModal.tsx`.
- [ ] Task: Write Tests: Verify voice mode switches to PTT logic when latency exceeds threshold (e.g., 500ms).
- [ ] Task: Implement: Adaptive switching logic and UI signaling.
- [ ] Task: Task: Conductor - User Manual Verification 'Phase 4: Adaptive Latency Strategy' (Protocol in workflow.md)
