# claude.md — AI Agent Instructions for SlotWise

This file constrains how AI agents (Claude or otherwise) should interact
with this codebase. These rules exist to protect system integrity, enforce
domain invariants, and keep generated code reviewable and correct.

---

## Project summary

SlotWise is a Flask + React appointment booking system. The core invariants
are: no double-booking, future-only slots, slot durations must match provider
config, strict booking state machine (PENDING → CONFIRMED → CANCELLED),
cancellation windows, and overlap prevention per client.

---

## Architectural rules — never violate these

### 1. Never bypass the service layer

All booking creation and status transitions MUST go through `BookingService`.
All slot creation MUST go through `SlotService`. Do not write directly to
`Booking`, `Slot`, or `AuditLog` from route handlers or anywhere outside
a service method.

```python
# WRONG — direct DB write from a route
booking = Booking(slot_id=slot_id, client_id=client_id, status='pending')
db.session.add(booking)
db.session.commit()

# CORRECT — always go through the service
booking = BookingService.create_booking(slot_id=slot_id, client_id=client_id)
```

### 2. Never skip domain validation

All business rules live in `app/domain/validators.py`. Before any persisted
write in a service method, all relevant validators must be called.
Do not add shortcuts that skip validation "just for this case".

```python
# WRONG — skipping availability check
slot.is_available = False
db.session.commit()

# CORRECT — validate first, then persist
validate_slot_is_available(slot.is_available)
# ... then proceed
```

### 3. Booking state transitions must use the state machine

Never set `booking.status` directly to a new value without first calling
`validate_status_transition(current, new)`. The state machine is the
single source of truth for what transitions are legal.

```python
# WRONG
booking.status = BookingStatus.CONFIRMED

# CORRECT
validate_status_transition(booking.status, 'confirmed')
booking.status = BookingStatus.CONFIRMED
```

### 4. Always write an audit log entry for every status change

Every call to `BookingService.transition_status` must produce exactly one
`AuditLog` row in the same transaction. Do not commit a status change
without committing the audit log entry in the same `db.session.commit()`.

### 5. AI writes data — never

The `AIService` is read-only. It receives slot data and returns filtered
IDs or structured output. It must never be called to create, update, or
delete any database record. Do not add write operations to `ai_service.py`.

---

## Code quality rules

### Naming and structure

- Services go in `app/services/` and may import from `app/models/` and `app/domain/`
- Routes go in `app/api/routes/` and may only import from `app/services/` and `app/models/`
- Domain validators in `app/domain/validators.py` must import nothing from Flask or SQLAlchemy
- Models go in `app/models/` and contain only schema definitions and `to_dict()` helpers

### Validation in routes

Routes are responsible for parsing and type-checking HTTP input before
passing it to services. Use explicit type coercion and return 422 with a
`{ "error": "...", "field": "..." }` payload for validation failures.

### No silent failures

Services must raise `ValidationError` for any domain rule violation.
Routes must catch `ValidationError` and return it as a 422 JSON response.
Do not swallow exceptions silently or return HTTP 200 with an error inside.

---

## Testing rules

- Every new domain rule added to `validators.py` must have at least one
  passing test and one failing test in `tests/test_validators.py`
- Every new service method must have integration tests in
  `tests/test_booking_service.py` or a new `test_<service>.py` file
- Tests must use the `testing` config (in-memory SQLite) — never the dev DB
- Do not mock the database in service tests; use real SQLAlchemy fixtures

---

## What AI-generated code must be checked for

When AI generates code for this project, the human reviewer must verify:

1. **No service bypass** — does the generated code call services, not models directly?
2. **No skipped validators** — are all relevant validators called before DB writes?
3. **State machine respected** — does any status change go through `validate_status_transition`?
4. **Audit log included** — is a corresponding `AuditLog` row committed in the same transaction?
5. **Error handling present** — are `ValidationError`s caught and returned as 422?
6. **Tests written** — does the generated code have corresponding test coverage?

---

## Prompt patterns that are NOT acceptable

Do not ask the AI to:

- "Skip validation for now, we'll add it later" → validations are not optional
- "Write directly to the DB to simplify this" → always use services
- "Just set the status directly" → always use the state machine
- "Add a new status without updating the transition map" → transition map is the contract
- "Have the AI service create a booking based on the search result" → AI is read-only

---

## Safe scope for AI assistance

AI assistance is appropriate for:

- Generating new route handlers (must go through services)
- Writing pytest test cases for validators and services
- Adding new validators in `domain/validators.py`
- Generating `to_dict()` methods on new models
- Writing SQL migration scripts
- Improving error messages or adding field-level validation
- Frontend component styling and layout changes
- Writing docstrings and comments
