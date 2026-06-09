# Apex OS Level 3 External Action Preparation Plan

Last updated: 2026-06-06

Status: builder implemented as a response-only Level 3 packet helper and operator-only API route. This document does not approve execution, schema, auth/session changes, production behavior, connector calls, desktop/browser/music control, sends, spending, ordering, booking, posting, deploys, deletion, or customer-visible actions.

Implementation note: `shared/apexOsExternalPreparationPackets.js` and `POST /api/apex-os/external-preparation-packets` can create sanitized preparation packets for the allowed categories below. Packets are not persisted, no approval-submit endpoint exists, no execution endpoint exists, and every packet must force `canExecuteNow: false`, `canExecuteAfterApproval: false`, `executionLocked: true`, and `noExecutionTokens: true`.

Purpose: define Level 3 for Apex OS, where Apex can prepare exact external action packets for John but cannot execute them. Level 3 is the bridge between Level 2 private/internal act-by-default and future Level 4 one-time approved execution.

## Level 3 Boundary

Level 3 may:

- Prepare exact external action packets.
- Build a dry-run preview of what Apex would do.
- Identify target service, vendor, person, account, app, route, or environment.
- Show data that would leave Apex OS or be written to another system.
- Show costs, dates, times, locations, privacy risk, cancellation path, and fallback/manual steps.
- Produce a draft receipt that says the action was prepared but not executed.
- Create an approval phrase that would be required for a future Level 4 execution request.

Level 3 must not:

- Send email, SMS, chat, DMs, calls, comments, notifications, or customer messages.
- Spend money, pay, order, purchase, subscribe, upgrade, tip, or change billing/payment.
- Book appointments, reservations, meetings, travel, services, or calendar events.
- Post, publish, upload, submit, share publicly, or make customer-visible changes.
- Click, type, navigate, submit forms, scrape pages, download/upload files, or control desktop/browser/music/second-screen systems.
- Deploy, rollback, change production, change schema/database/auth/session/security/provider/billing/permissions, or delete data.
- Mint execution tokens, connect accounts, run OAuth, store credentials, or call external connectors.

## Supported Preparation Categories

Initial Level 3 design covers these packet categories:

| Category | Examples | Level 3 output | Still blocked |
| --- | --- | --- | --- |
| `order-plan` | Pizza, food, products, materials, software purchase | Vendor, items, quantity, delivery/pickup, estimated total, fees/tip/tax, payment label, cancellation/manual steps | Checkout, payment, submit order, subscription, add-ons |
| `booking-plan` | Reservation, appointment, service booking, travel booking | Provider, date/time, party/service details, location, deposit/cancel policy, contact data, manual steps | Booking, reservation submit, deposit/payment, calendar write |
| `message-draft` | Email, SMS, DM, chat, customer/vendor/person message | Recipients, channel, sender account label, subject/body/attachments, sensitivity labels, send-time plan | Send, schedule send, attachment upload, bulk/campaign sends |
| `calendar-draft` | Meeting/event/reminder in external calendar | Calendar/account label, title, guests, time zone, start/end, location, notes, reminders | Calendar write, invites, notifications, conferencing link creation |
| `browser-action-plan` | Search, page visit, form fill, account workflow | Target site, account context, generic steps, fields to review, untrusted-content notes, manual-only steps | Navigation, click/type/submit, login, scraping, download/upload |
| `desktop-action-plan` | Open app, configure local app, file/app workflow | App/window target, visible-session needs, steps, forbidden inputs, cancel/watch requirements | Keyboard/mouse control, hidden screen capture, file mutation, downloads/uploads |
| `music-second-screen-plan` | Focus music, dashboard on second screen, window layout | App/device/display target labels, playlist/layout suggestion, volume/display safety notes, manual steps | Playback, device/volume/window/screen control, account/session use |
| `deploy-production-checklist` | Deploy, rollback, production config, schema/auth review | Branch/commit/diff/test/build/backup/rollback checklist, approval blockers, exact release evidence needed | Deploy, production mutation, schema/auth/session/provider changes |

Future categories may be added only after the route permission map is updated and the same non-executing packet contract is preserved.

## Level 3 Packet Shape

Every Level 3 packet should use a stable, sanitized shape:

```json
{
  "packetId": "L3P-...",
  "readinessLevel": 3,
  "category": "order-plan | booking-plan | message-draft | calendar-draft | browser-action-plan | desktop-action-plan | music-second-screen-plan | deploy-production-checklist",
  "status": "prepared | blocked | needs-info | cancelled | expired",
  "operatorOnly": true,
  "canExecuteNow": false,
  "canExecuteAfterApproval": false,
  "executionLocked": true,
  "noExecutionTokens": true,
  "createdAt": "ISO-8601",
  "expiresAt": "ISO-8601",
  "actor": {
    "userId": "redacted-safe-id",
    "workspaceId": "default-apex-hq"
  },
  "target": {
    "service": "vendor/app/provider/site/person label",
    "accountContext": "account label only, no secrets",
    "recipientOrVendor": "safe label",
    "location": "safe location label when needed"
  },
  "exactActionPreview": {
    "title": "human-readable action",
    "wouldSendData": [],
    "wouldWriteData": [],
    "wouldCost": {
      "amount": 0,
      "currency": "USD",
      "taxes": "unknown | estimated | exact",
      "fees": "unknown | estimated | exact",
      "tip": "unknown | estimated | exact",
      "recurring": false,
      "confidence": "none | estimated | exact"
    },
    "timeWindow": {
      "date": "",
      "start": "",
      "end": "",
      "timezone": ""
    },
    "steps": [],
    "manualFallbackSteps": []
  },
  "risk": {
    "tier": "medium | high | critical",
    "reasons": [],
    "sensitiveDataInvolved": false,
    "privacySummary": "compact redacted summary",
    "untrustedContentSummary": "compact metadata only"
  },
  "gates": {
    "apexOsOperatorGate": "passed",
    "actionPermissionMatrix": "passed | blocked",
    "privacyFirewall": "passed | redacted | blocked",
    "promptInjectionFirewall": "passed | sanitized | blocked",
    "toolRouter": "planned-non-executing",
    "limitCheck": "not-configured | passed | blocked"
  },
  "futureLevel4Approval": {
    "required": true,
    "approvalPhrase": "I approve Apex to execute exactly preview [previewId] one time now",
    "previewId": "PREVIEW-...",
    "previewHash": "hash-reference",
    "payloadHash": "hash-reference"
  },
  "cancellation": {
    "canCancelBeforeExecution": true,
    "cancellationPath": "Archive/cancel the packet before Level 4 approval.",
    "undoExpectation": "No external action was executed; no external undo is needed."
  },
  "receiptDraft": {
    "summary": "Prepared only. No external action executed.",
    "externalActionExecuted": false,
    "customerVisible": false
  }
}
```

The packet must not include raw secrets, passwords, cookies, tokens, API keys, database URLs, auth headers, payment card data, MFA codes, private credential material, or unnecessary raw prompt/browser/email/document content.

## Exact-Action Preview Requirements

Every packet must show:

- Readiness level and category.
- Target service/vendor/person/app/site/account label.
- Exact message body, order items, booking details, calendar details, browser steps, desktop steps, music/display plan, or deploy checklist.
- Data that would leave Apex OS or be written to another system.
- Cost/price/tip/tax/fees/subscription impact when applicable.
- Date/time/location/time zone when applicable.
- Privacy/sensitive-data summary.
- Risk tier and reason codes.
- What Apex will not do.
- Cancellation/manual fallback path.
- Future Level 4 approval phrase.
- Draft receipt that clearly says prepared only and no external action executed.

## Gate Order

Level 3 packet generation must run the same control plane every time:

1. Existing Apex OS operator-only permission gate.
2. Action Permission Matrix risk/category classification.
3. Privacy Firewall redaction/block decision before model/tool planning.
4. Prompt-Injection Firewall on untrusted web/browser/email/document/file/clipboard/tool/model output.
5. Tool Router route classification with `executionLocked: true`.
6. Cost/limit check with default spend limit `$0`.
7. Exact-action preview builder.
8. Packet sanitizer and receipt-draft sanitizer.
9. Audit metadata write with no secrets or raw unsafe content if persistence is implemented.

Failure at any gate produces `blocked` or `needs-info`, not execution.

## Future Level 4 Approval Language

Level 3 may generate copyable future approval phrases, but those phrases do not execute anything in Level 3.

Baseline phrases:

- General external action: `I approve Apex to execute exactly preview [previewId] one time now`
- Spend/order: `I approve Apex to spend up to $[amount] for exactly preview [previewId] one time now`
- Message send: `I approve Apex to send exactly preview [previewId] to the listed recipients one time now`
- Booking/reservation: `I approve Apex to place exactly preview [previewId] one time now`
- Calendar write: `I approve Apex to create exactly calendar preview [previewId] one time now`
- Browser/desktop/music/second-screen control: `I approve Apex to perform exactly preview [previewId] in visible control mode one time now`
- Deploy/production: `I approve Apex to run exactly release preview [previewId] one time now after the listed rollback evidence is present`

Future Level 4 must validate the preview id, actor, workspace, preview hash, payload hash, cost/recipient/time/provider/account state, expiration, approval phrase, and emergency-stop state before minting a one-action execution token.

## Implementation Recommendation

If John requests implementation next, keep it small:

- Keep `shared/apexOsExternalPreparationPackets.js` and focused tests as the first enforcement point.
- Use deterministic builders and sanitizers before adding any UI.
- Add an operator-only server endpoint only if packet persistence is needed; it must use existing private Apex OS storage unless a separate schema phase is approved.
- Keep `canExecuteNow: false`, `canExecuteAfterApproval: false`, `executionLocked: true`, and `noExecutionTokens: true`.
- Add a compact Control Room review surface only after the packet builder and permission tests pass.
- Do not add Level 4 execute endpoints, connector tokens, OAuth, browser/desktop/music control, or provider calls.

## Blockers Before Level 3 Implementation

- Confirm exact categories for the first implementation slice.
- Decide whether packets are stored through existing Apex OS private company settings or returned response-only for the first pass.
- Add packet sanitizer tests before UI.
- Add role tests proving normal admins, field users, customers, demos, switched-company operators, and non-operators cannot create/read packets.
- Add privacy and prompt-injection tests for each category.
- Add route permission map entries for any new route before merging.
- Run docs checks, focused tests, build, and visual QA if UI is added.

## Blockers Before Level 4 Execution

Level 4 is not approved by this plan. Before any live execution exists, Apex OS still needs:

- Server-enforced emergency stop.
- Short-lived one-action execution tokens bound to preview hash and actor/session.
- Per-category limits for spend, sending, booking/order, browser/desktop/music, connector, and production classes.
- Connector/account authorization policy and redaction-before-cloud proof.
- Stale-preview, changed-cost, changed-recipient, changed-time, changed-provider, expired-approval, and kill-switch tests.
- Desktop/mobile visual QA for confirmation UI.
- Explicit approval from John for the exact Level 4 capability.
