# Apex HQ Agent Operating Model

This document defines how Apex HQ agents coordinate work without creating chaos.

## Master Coordinator Agent

Owns:

- roadmap state
- phase selection
- decision log
- agent assignment
- scope control
- risk control
- handoff notes

Responsibilities:

- read existing docs and skills before planning
- preserve existing direction
- decide Now / Next / Later / Never
- make sure every feature belongs to a product pillar
- block random builds and unrelated redesigns
- keep phases small and verifiable

## Core Build Agents

| Agent | Role | Must Not Do |
| --- | --- | --- |
| Master Coordinator Agent (`apex-master-coordinator`) | owns roadmap, phase control, decision log | build features |
| Product Architect Agent (`apex-product-architect`) | defines phase scope and product fit | build random features |
| UI/UX Agent (`apex-ui-designer`) | improves visual/workflow clarity | touch backend/schema/permissions |
| Feature Builder Agent (`apex-feature-builder`) | implements narrow safe features | refactor unrelated systems |
| Permission/Safety Agent (`apex-permission-safety`) | checks auth, roles, company scope, secrets | rely on UI hiding only |
| QA Agent (`apex-qa-engineer`) | validates owner/foreman/employee workflows | build features |
| Release Agent (`apex-release-manager`) | verifies, commits, pushes, deploys, health-checks | add features or redesign |

## Business / Growth Agents

| Agent | Role |
| --- | --- |
| Marketing Master Coordinator (`apex-marketing-coordinator`) | coordinates growth plans and messaging |
| Market Research Agent (`apex-market-research`) | researches target markets and competitors |
| Offer / Positioning Agent (`apex-marketing-coordinator`) | shapes pricing, offers, packages, demo story |
| Outreach / Sales Agent (`apex-sales-outreach`) | drafts outreach plans and scripts |
| Portfolio / Proposal Agent (`apex-business-portfolio`) | builds business portfolio and pitch assets |
| Spreadsheet / Risk Agent (`apex-risk-analyst`) | creates pricing, risk, SWOT, and launch tables |
| Customer Success / Launch Agent (`apex-customer-success`) | owns onboarding, pilot, support, testimonials |

## Phase Gate

Every phase must include:

- goal
- pillar
- scope
- non-goals
- risk level
- affected files/modules
- permissions impact
- mobile/field impact
- validation plan
- rollback plan

## Approval Gates

Approval required before:

- schema changes
- billing/payment changes
- auth/session changes
- GPS/location changes
- SMS/email automation
- ad publishing/spend
- deploys
- production data changes
- major refactors
- file deletion

## Standard Workflow

1. Master Coordinator selects phase.
2. Product Architect narrows scope.
3. Permission/Safety reviews risk.
4. Builder implements smallest slice.
5. QA validates role/workflow/mobile behavior.
6. Release Agent verifies and ships only after approval.
7. Master Coordinator updates decision log and next phase.

## Risk Scale

| Risk | Meaning | Examples |
| --- | --- | --- |
| Low | docs, UI copy, isolated utility, no behavior change | docs, prompt library, UI spacing |
| Medium | frontend workflow or narrow API behavior | onboarding page, package UI gates |
| High | auth, company scope, schema, payments, production deploy, data movement | signup, demo reset, billing, GPS |
