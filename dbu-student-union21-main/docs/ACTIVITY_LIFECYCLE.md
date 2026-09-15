# Activity & Event Lifecycle

This document describes the lifecycle of an Activity/Event within the DBU Student Organization Operating System.

## Current vs New Lifecycle

**Previous (Legacy) Lifecycle:**
- `planned`: Event is created and immediately active. Check-in can start.
- `ongoing`: QR check-in session is active.
- `completed`: Check-in session ended. Attendance recorded.
- `cancelled`: Manually cancelled.

**New Institutional Lifecycle:**
- `draft`: Created by a club leader. Not yet submitted to the university. Editable.
- `pending_approval`: Submitted by the club leader. Awaiting coordinator/admin review. Locked from edits.
- `approved`: Approved by the university. Ready for operation/check-in.
- `rejected`: Denied by the university. Editable and can be resubmitted.
- `ongoing`: QR check-in session is active.
- `completed`: Event finished.
- `cancelled`: Cancelled by club leader or administration.
- `planned`: (Legacy support only). Treated identically to `approved` for operational purposes.

## Roles & Responsibilities

| Role | Actions Allowed |
| ---- | --------------- |
| **Club Leader** | Create (`draft`), Edit (`draft`/`rejected`), Submit (`pending_approval`), Start Session (`approved`/`planned`) |
| **Club Member** | View active events, Participate (Check-in) |
| **Admin / Coordinator** | View all events, Review (`approved`/`rejected`), Provide rejection reasons |

## API Endpoints

- `POST /api/clubs/:id/events`: Creates a `draft` event.
- `PATCH /api/clubs/:id/events/:eventId`: Edits a `draft` or `rejected` event.
- `PATCH /api/clubs/:id/events/:eventId/submit`: Submits event (`pending_approval`).
- `PATCH /api/clubs/:id/events/:eventId/review`: Admin reviews event (`approved` or `rejected`).
- `POST /api/clubs/:id/events/:eventId/checkin/start`: Requires event to be `approved` or `planned`.

## Data Relationships

The Event is the central anchor point for accountability:
- **Transaction**: `eventId` (nullable) - Links financial allocations directly to the event.
- **ActivityReport**: `eventId` (nullable) - Links post-event evidence directly to the event.
- **Attendance**: Managed via `activeCheckIn`, `attendanceCode`, and `attendees` array on the event record itself.

## Backward Compatibility
- Existing events remain at `status: 'planned'`.
- The `checkin/start` API endpoint explicitly permits `planned` events to start check-in, preventing disruption to historical workflows.
- `eventId` on `Transaction` and `ActivityReport` defaults to `null`, ensuring legacy ledgers and reports continue functioning without migration.

## Security Model
- All event routes are protected by the `protect` middleware.
- Club modification routes use the `clubLeader` middleware, which verifies the authenticated user exists in the target club's `leadership` array.
- The `review` endpoint strictly checks `req.user.isAdmin` and `req.user.roles.includes('coordinator')`, preventing role escalation or hidden-button exploits from standard club leaders.
- Cross-club isolation is maintained by the `Club.findById(req.params.id)` constraint in every endpoint.

## Future Extension Points (Priority #2)
- Enforce that a club cannot create a new `draft` event until the `ActivityReport` for their last `completed` event is submitted.
- Require `Transaction` reference when submitting an event that requests a university budget.
