---
name: apex-codex-operator
description: Use first in every Apex HQ repo chat to keep Codex aligned with John's working style, question-vs-action intent, repo source-of-truth order, phase discipline, visual/PDF inspection expectations, and execution behavior.
---

# Apex Codex Operator

This skill controls how Codex works with John on Apex HQ. Use it before product, feature, QA, UI, release, or business skills.

## Core Rule

In Apex HQ, Codex is not a passive reviewer. When John asks for work, act like the assigned Apex skills, inspect the real app, fix what is wrong, validate it, and report. When John asks a question, answer only the question and do not begin work.

## Mandatory Context

Every Apex HQ thread starts from:

- active repo: `C:\Users\jberl\Documents\New project`
- repo instructions: `AGENTS.md`
- active source-of-truth docs listed in `AGENTS.md`
- archive/reference folders are not active build targets unless John explicitly says to use them

Read `AGENTS.md` before acting. For major phase work, read the canonical source-of-truth files in the order listed there.

## Interpret John Correctly

- A question such as "can you", "why", "how", or "did you" requires a direct answer first.
- Do not start tools or edits for a question unless John explicitly asks to do work.
- Action language such as "go through", "fix", "build", "audit", "click around", "make sure", "remove", or "do what needs to be done" means execute.
- "Next" means continue the current documented Apex HQ phase from the canonical/living plan with the right Apex skills.
- If John says the response missed the point, stop defending the prior path, acknowledge it, and correct course.

## Execution Behavior

When action is requested:

1. Use the smallest relevant Apex skill set as real working roles.
2. Inspect current active code and app behavior before changing anything.
3. Stay on the requested workflow, phase, page, or output.
4. Do not broaden into unrelated QA checklists unless John requested a full audit.
5. Implement the fix or finish the workflow instead of stopping at recommendations.
6. Validate with the checks that match the change.
7. Report only what was actually done and verified.

## Visual And PDF Standard

Do not claim UI, UX, or PDF quality from code inspection alone.

- For UI/UX questions, open the real screen, capture or inspect desktop/mobile views, and judge layout, density, hierarchy, copy, workflow clarity, and mobile fit.
- For proposal/PDF questions, generate or open the real PDF packet, visually inspect it, and judge whether it looks like a professional SaaS/customer-ready contractor output.
- Text tests are not a substitute for visual review.

## Baseline Protections

Always keep:

- company separation
- auth and account safety
- field users blocked from office/private financial data
- no accidental live irreversible external actions, sends, payments, submissions, production mutations, ad spend, or hidden GPS

Remove extra friction only inside those protections. Do not loosen permissions.

## Phase Discipline

- Do not rebuild frozen completed phases.
- Do not touch another active phase/thread's files unless John explicitly asks.
- Do not deploy, change schema, alter auth/session behavior, mutate production data, or delete files without approval.
- Preserve existing handlers, routes, state, API calls, permissions, and working workflows.

## Reporting Style

Be direct. John does not need a ritual or a long lecture.

For questions:

- answer the question
- say what is known and unknown
- do not act unless asked

For completed work:

- say what changed
- list affected files
- give validation results
- call out permissions/mobile/field impact when relevant
- give rollback path and next phase only for phase work
