# agents.md — Agentic Workflow Guide for SlotWise

This file describes how automated agents and AI tools should interact with
the SlotWise codebase safely. It is intended for use with coding agents
(Claude Code, Cursor, Copilot, etc.) and CI automation.

---

## Agent roles and boundaries

### Role: Code generation agent

**Permitted actions:**
- Read any file in the repository
- Generate new route handlers, service methods, validators, tests, models
- Suggest refactors that preserve all existing tests

**Prohibited actions:**
- Directly modifying `app/domain/validators.py` to remove or weaken an existing rule
- Removing or weakening existing tests
- Writing code that accesses `db.session` outside of a service method
- Adding new statuses to `BookingStatus` without also updating `allowed_transitions()`

---

### Role: Test runner agent

**Permitted actions:**
- Run `pytest` and report results
- Generate additional test cases for untested branches
- Identify missing coverage

**Prohibited actions:**
- Modifying production code to make tests pass
- Deleting or skipping failing tests
- Using the `production` config — always use `testing`

---

### Role: Database migration agent

**Permitted actions:**
- Generate Alembic migration scripts using `flask db migrate`
- Apply migrations to a staging or development DB

**Prohibited actions:**
- Applying migrations directly to a production database
- Dropping tables or columns without an explicit human approval step
- Seeding production data

---

## Decision tree for agents adding new features

```
New feature request
       │
       ▼
Does it involve writing booking data?
  YES → Must go through BookingService
  NO  → Continue
       │
       ▼
Does it change booking status?
  YES → Must call validate_status_transition first
       Must write AuditLog in same transaction
  NO  → Continue
       │
       ▼
Does it create or modify slots?
  YES → Must go through SlotService
       Must call validate_slot_is_future + validate_slot_duration
  NO  → Continue
       │
       ▼
Does it involve reading data for AI purposes?
  YES → Must use AIService (read-only, no DB writes)
  NO  → Proceed with standard implementation
```

---

## Context agents should always load

Before making changes, an agent should read:

1. `claude.md` — architectural rules and what to check in generated code
2. `app/domain/validators.py` — full list of current business rules
3. `app/models/booking.py` — state machine definition
4. `app/services/booking_service.py` — reference implementation of correct service pattern
5. Relevant test files — to understand expected behavior before changing anything

---

## Safe test-first workflow for agents

The recommended agentic workflow for adding features:

1. Read existing tests to understand the feature's expected behavior
2. Write a failing test that describes the new behavior
3. Implement the feature to make the test pass
4. Verify no existing tests were broken (`pytest`)
5. Check that the implementation respects the architectural rules in `claude.md`

---

## Environment variables agents must not touch

The following environment variables must never be logged, printed, or
included in generated code as hardcoded values:

- `SECRET_KEY`
- `JWT_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL` (when containing credentials)

---

## Output format for agent-generated code

When an agent generates code for this project, it should:

- State which files it is modifying and why
- List which domain rules the new code depends on
- List which tests were added or modified
- Flag any tradeoffs or risks in the implementation

---

## Codebase change impact guide

| Area changed | Likely impact | Must verify |
|---|---|---|
| `domain/validators.py` | High — affects all services | All service tests still pass |
| `models/booking.py` (BookingStatus) | High — affects all booking flows | State machine tests, migration exists |
| `services/booking_service.py` | Medium — affects booking routes | `test_booking_service.py` |
| `api/routes/bookings.py` | Low — thin HTTP layer | `test_api.py` |
| `services/ai_service.py` | Low — read-only, isolated | Falls back gracefully if broken |
| Frontend `api.js` | Low — frontend only | Manual test or Playwright test |
