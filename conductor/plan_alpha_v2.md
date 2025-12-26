# Plan: CalculaTú Alpha v2 - Supermarket Survival

**Track:** `alpha_v2_refactor_20251226`
**Checkpoint:** [initial]

## Phase 1: Security & Licensing (The "Warp" Logic) [checkpoint: bbc4edc]
- [x] Task 1.1: Refactor `MachineID` generation to use SHA-256 and required device signals. [32bf8d0]
- [x] Task 1.2: Update `useLicenseStore` to implement cryptographic validation with JWT. [b554df9]
- [x] Task 1.3: Securely store `NEXT_PUBLIC_APP_PUBLIC_KEY` and verify signatures. [d87bc73]

## Phase 2: UI/UX Revolution (Mobile Layout Shift)
- [ ] Task 2.1: Implement `StickyPricingHeader` with massive VES/USD totals in `CalculatorView`.
- [ ] Task 2.2: Create `CommandDock` (Fixed Footer) for input and primary actions.
- [ ] Task 2.3: Build Custom Numeric Keypad inside the Dock to avoid native keyboard shifts.
- [ ] Task 2.4: Replace all Dialogs with Bottom Sheet Drawers (using ShadCN/Vaul).
- [ ] Task 2.5: Add pulsing vibration/ring animation to SAVARA FAB.

## Phase 3: Admin Factory & Offline Persistence
- [ ] Task 3.1: Create `/admin-factory` route for local token generation.
- [ ] Task 3.2: Integrate TanStack Query for exchange rates with localStorage persistence.
- [ ] Task 3.3: Implement "Bunker Mode" indicator for offline state.

## Phase 4: Verification & Checkpoint
- [ ] Task 4.1: Audit license lock (verify Premium triggers).
- [ ] Task 4.2: Verify Mobile layout ergonomics (Left-hand/Right-hand thumb zone).
- [ ] Task 4.3: Create documentation update in `walkthrough.md`.
