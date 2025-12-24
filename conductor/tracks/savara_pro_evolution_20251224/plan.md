# Implementation Plan: Savara Pro Optimization & Licensing Evolution

This plan follows the TDD workflow and includes phase-level verification checkpoints.

## Phase 1: Core Licensing & Auto-Trial
Goal: Implement automatic 24h Free Pass linked to MachineID.

- [x] Task: Define `license_type` and `expires_at` in `useAppStore` or `useLicenseStore`. d08be41
- [x] Task: Implement `autoActivateTrial` logic in `utils/deviceId.ts` or a new hook.
- [x] Task: Write Tests: Verify `autoActivateTrial` creates a valid 24h trial token on first run.
- [x] Task: Implement: `autoActivateTrial` with remote-first sync (Supabase contracts check).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Core Licensing & Auto-Trial' (Verified via Portality tests)

## Phase 2: Structured JSON Intents & Cart Upsert
Goal: Transition Savara to structured JSON intents with upsert logic.

- [x] Task: Define `SavaraIntent` type and closed set of actions (ADD_ITEM, etc.).
- [x] Task: Update `useAppStore` cart actions to support upsert (incrementing quantity if item exists).
- [x] Task: Write Tests: Verify `ADD_ITEM` intent correctly updates or increments cart items.
- [x] Task: Implement: Refactor `useSavaraLive` to handle JSON intents from Gemini and dispatch to store.
- [x] Task: Write Tests: Verify `SUMMARIZE_CART` logic injected in system prompt.
- [x] Task: Implement: JSON intent parsing in the live hook.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Structured JSON Intents & Cart Upsert'

## Phase 3: Enhanced AI Context & Marketing Knowledge Base
Goal: Inject deep app context and marketing info into Gemini prompts.

- [x] Task: Create `getSavaraSystemInstruction` utility that aggregates state, rates, and marketing KB.
- [x] Task: Write Tests: Verify system prompt contains correct BCV rates and license status.
- [x] Task: Implement: Update `ChatWidget.tsx` and `SavaraCallModal.tsx` to use the dynamic system prompt.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Enhanced AI Context & Marketing Knowledge Base'

## Phase 4: Adaptive Latency Strategy & Admin Dashboard
Goal: Implement RTT monitoring and Push-to-Talk fallback + Full Admin Control.

- [x] Task: Implement RTT measurement in the WebSocket connection within `useSavaraLive`.
- [x] Task: Add "Slow Connection Mode" UI warning to `SavaraCallModal.tsx`.
- [x] Task: Implement: Global User Management in Portality Dashboard (list profiles, load IDs).
- [x] Task: Implement: Manual Trial Extension with calendar selector.
- [x] Task: Fix: Migrated Chat API to official Google AI SDK to resolve 500 errors.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Adaptive Latency Strategy'
