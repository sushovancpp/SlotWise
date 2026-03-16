# SlotWise

A provider-based appointment booking system with enforced scheduling rules,
a state-machine booking lifecycle, full audit trail, and AI-powered natural
language slot search.

---

## Quick start

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit as needed
python run.py               # starts on http://localhost:5000
flask seed                  # optional: seed demo data
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:3000
```

### Run tests

```bash
cd backend
pytest
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React Frontend (Vite)                          │
│  pages / components / zustand store / api.js   │
└──────────────────────┬──────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────┐
│  Flask REST API                                 │
│  app/api/routes/  ← thin: parse HTTP, call svc │
├─────────────────────────────────────────────────┤
│  Services layer                                 │
│  booking_service.py  slot_service.py            │
│  ai_service.py                                  │
├─────────────────────────────────────────────────┤
│  Domain layer (pure Python, no Flask)           │
│  domain/validators.py  ← all business rules    │
├─────────────────────────────────────────────────┤
│  Models (SQLAlchemy)                            │
│  User  Provider  Slot  Booking  AuditLog        │
├─────────────────────────────────────────────────┤
│  SQLite (dev) / PostgreSQL (prod)               │
└─────────────────────────────────────────────────┘
```

**Key principle:** Flask routes are thin. All business logic lives in the
service layer, which calls pure-Python domain validators before any DB write.
This means every rule is testable without HTTP or a running database.

---

## Domain invariants

These rules are always enforced — they cannot be bypassed by any API call:

| # | Rule | Enforced in |
|---|------|-------------|
| 1 | Slots must be in the future | `validate_slot_is_future` |
| 2 | Slot duration must match provider's configured duration | `validate_slot_duration` |
| 3 | A slot cannot be double-booked | `validate_slot_is_available` |
| 4 | A client cannot have two overlapping bookings | `validate_no_client_overlap` |
| 5 | Bookings follow a strict state machine: `PENDING → CONFIRMED → CANCELLED` | `validate_status_transition` / `BookingStatus.can_transition_to` |
| 6 | Cancellation is only allowed outside the configured window (default: 24 hrs) | `validate_cancellation_window` |

---

## Booking state machine

```
        ┌──────────┐
        │  PENDING │ ◄── created on booking
        └────┬─────┘
             │ provider confirms
    ┌────────▼─────────┐
    │    CONFIRMED     │
    └────────┬─────────┘
             │ provider or client cancels
        ┌────▼─────┐
        │CANCELLED │  ◄── terminal state, no further transitions
        └──────────┘
```

`PENDING` can also go directly to `CANCELLED` (client self-cancels early,
or provider declines). `CANCELLED` has no outgoing transitions — it is a
terminal state. Every transition is validated by `BookingStatus.can_transition_to()`
before any DB write, and logged to `audit_logs`.

---

## Key technical decisions

### 1. Layered architecture with a pure domain layer

The domain validators in `app/domain/validators.py` have zero imports from
Flask or SQLAlchemy. This means they can be unit-tested instantly, without
spinning up a server or database. It also means the rules are impossible to
accidentally bypass in a new route — every write must go through a service.

**Tradeoff:** More files than a flat Flask app. Worth it for testability and
the ability to reason about rules in isolation.

### 2. Booking status as a Python Enum with transition logic

`BookingStatus` carries its own allowed-transition map. The state machine
lives on the model — not scattered across route handlers or service methods.
Adding a new status in the future is a single-file change.

**Tradeoff:** Slightly more complex than plain string columns. A future
migration is required if a new status is added.

### 3. Immutable audit log

Every booking status change writes a row to `audit_logs` in the same
transaction. This gives full observability for free: if something goes wrong,
the full history is there. The audit log is never updated or deleted.

**Tradeoff:** Slightly more DB writes per transition. Acceptable at this scale.

### 4. AI used only for read operations (slot search)

The AI (Claude via Anthropic API) is used only to parse intent from a
natural-language query and return a filtered list of slot IDs. It never
writes to the database, never bypasses validation, and the app degrades
gracefully if the API key is absent or the call fails (falls back to
returning all slots).

**Tradeoff:** Requires an `ANTHROPIC_API_KEY`. The feature is additive —
the core booking flow works without it.

### 5. SQLite for development, PostgreSQL for production

SQLite requires zero setup for local development and testing. The
`DATABASE_URL` env var switches to PostgreSQL in production. The only
limitation is SQLite's lack of timezone-aware datetime storage — this is
handled by normalizing all datetimes to UTC at the application layer.

---

## AI feature — natural language slot search

Users can type a freeform query like *"Thursday afternoon"* or *"next Monday
morning"* into the search bar on the booking page. The query, along with
the full list of available slots, is sent to Claude via the Anthropic API.
Claude returns a JSON object with a filtered list of slot IDs and a brief
explanation. The frontend displays only the matching slots.

The AI is intentionally constrained: it receives only available slot data
(no PII, no booking history), it returns only slot IDs (no free-form
actions), and its response is validated before use. See `ai_service.py` and
`claude.md` for the full prompt constraints.

---

## Risks and known limitations

| Risk | Mitigation |
|------|------------|
| SQLite write contention under concurrent load | Use PostgreSQL in production (connection pooling handles this) |
| AI search unavailable (no API key / outage) | Graceful fallback: returns all slots with an explanation message |
| JWT tokens are not revocable | Acceptable for this scope; add a token blocklist (Redis) for production |
| No rate limiting on booking endpoint | Add Flask-Limiter in production to prevent slot-squatting |
| Cancellation window is enforced server-side only | Frontend shows the button; the API will reject if inside the window |

---

## Extending the system

**Adding a new booking status (e.g. `NO_SHOW`)**
1. Add `NO_SHOW` to `BookingStatus` enum
2. Add allowed transitions: `confirmed → no_show`
3. Add a migration
4. The audit log captures it automatically — no other changes needed

**Adding email notifications**
1. Create `app/services/notification_service.py`
2. Call it from `BookingService.transition_status` after the DB commit
3. No other code changes — the service boundary is already clean

**Adding recurring slots**
1. Add a `RecurringRule` model (RRULE format)
2. Add a `SlotGeneratorService` that materialises concrete `Slot` rows
3. All booking rules remain unchanged

---

## Project structure

```
slotwise/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # thin HTTP handlers
│   │   ├── domain/          # pure business rules
│   │   ├── models/          # SQLAlchemy models
│   │   └── services/        # orchestration layer
│   ├── tests/
│   │   ├── test_validators.py      # pure unit tests
│   │   ├── test_booking_service.py # service integration tests
│   │   └── test_api.py             # HTTP integration tests
│   ├── config.py
│   ├── run.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── services/api.js
│       └── store/authStore.js
├── claude.md
└── agents.md
```
