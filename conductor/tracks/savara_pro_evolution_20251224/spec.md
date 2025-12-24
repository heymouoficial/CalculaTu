# Specification: Savara Pro Optimization & Licensing Evolution

## 1. Overview
This track focuses on upgrading **Savara Pro** (Voice & Chat) to handle complex cart operations through structured JSON intents, improving the licensing system with an automatic hardware-linked 24h trial, enhancing AI responses with deep contextual/marketing awareness, and implementing an adaptive latency strategy for voice interactions.

## 2. Functional Requirements

### 2.1 Structured Cart Intents (Savara Pro)
- **JSON Intents:** Improve NLP to extract structured JSON from Gemini Live.
- **Action Set (Type-Safe):** The system will use a closed set of actions:
    - `ADD_ITEM`: Add a new item or increment quantity.
    - `UPDATE_QUANTITY`: Set a specific quantity for an item.
    - `REMOVE_ITEM`: Remove an item from the cart.
    - `CLEAR_CART`: Empty the entire cart.
    - `SUMMARIZE_CART`: Read-only sweep of the cart for totals and count.
- **Upsert Logic:** If an item already exists in the cart, update the quantity instead of creating a duplicate line.
- **Summarize Cart Intent:** Triggers a read-only sweep of the Zustand store. It must return:
    - Total in VES, USD, and EUR.
    - Total item count.
- **Privacy:** Savara must never expose technical IDs; it should only refer to "your cart" or "your current items."

### 2.2 Device-Linked Licensing (Trial 24h & Marketing)
- **Auto-Activation:** On first launch, a 24h "Free Pass" is created and signed, linked to the `MachineID`.
- **Dynamic Policy:** The licensing system must support remote extensions of `expires_at` and tier changes (`trial` -> `freemium` -> `lifetime`) without requiring a new app build.
- **Christmas Offer:** The system must recognize and prioritize the "$9.99 Lifetime until Jan 31" campaign.
- **Tone:** Savara should refer to licensing status as "your current access" or "your trial period," avoiding technical jargon like "JWT" or "Hash."

### 2.3 Enhanced AI Context & Marketing Knowledge Base
- **System Context Injection:** Provide Gemini with:
    - **App State:** Current cart and real-time BCV rates.
    - **License State:** Trial expiration time and current tier.
    - **Marketing KB:** Standardized answers for:
        - "What is CalculaTú?" (Financial survival tool).
        - "Why is it better than a normal calculator?" (Currency conversion, voice, and offline-first).
        - "What does the 24h Free Pass include?" (Full Savara Pro access).
        - "Lifetime Offer:" $9.99 USD until January 31, 2026.
    - **Summarized History:** Context of the last 3-5 user intents to maintain continuity.

### 2.4 Adaptive Latency Strategy (Voice)
- **RTT Monitoring:** Monitor WebSocket Round Trip Time continuously.
- **Dynamic Fallback:** 
    - **Normal:** Full bidirectional streaming.
    - **High Latency:** Switch to "Push-to-Talk" mode. The UI must display a "Slow Connection Mode" label.
- **Auto-Recovery:** Automatic return to full-duplex mode once RTT stabilizes.

## 3. Non-Functional Requirements
- **Latency:** AI intent processing and state update should happen in <200ms (browser-side).
- **Security:** License tokens must remain signed and verified offline.
- **UX:** Seamless transition between voice modes without interrupting the user's flow.

## 4. Acceptance Criteria
- [ ] Saying "Agrega dos harinas" adds exactly 2 items to the cart or updates the existing quantity.
- [ ] New users see "24h Free Pass Active" immediately upon first use.
- [ ] When asked "What rate are you using?", Savara responds with the exact BCV values currently in the UI.
- [ ] Asking "Summarize my cart" returns a correct breakdown in Bs/USD/EUR without modifying the cart.
- [ ] Savara explains the $9.99 Lifetime offer correctly when asked about pricing or "Savara Pro."
- [ ] Voice assistant displays "Slow Connection Mode" and switches to PTT logic when simulated latency is high.

## 5. Out of Scope
- Integration with external payment gateways (Manual WhatsApp verification remains).
