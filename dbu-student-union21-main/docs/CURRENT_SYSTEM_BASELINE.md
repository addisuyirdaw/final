# Current System Baseline

This document serves as an inventory of the existing DBU Student Union Management System's architecture, working modules, and user roles prior to Phase 1 development.

## 1. Existing Working Modules

### Authentication & Profiles
- **Status:** Fully functional.
- **Frontend Routes:** `/login`, `/register` (removed from UI, but API exists), `/forgot-password`, `/reset-password`, `/profile`
- **Backend Routes:** `/api/auth/*`
- **Models:** `User`
- **Roles:** All roles.
- **Notes:** Uses standard JWT stored in localStorage. Validated securely via `express-validator` middleware.

### Club Directory & Profiles
- **Status:** Fully functional.
- **Frontend Routes:** `/clubs`, `/clubs/:id`
- **Backend Routes:** `/api/clubs/*`
- **Models:** `Club`
- **Roles:** Publicly visible to all authenticated users.

### Club Membership & Leadership
- **Status:** Fully functional.
- **Frontend Routes:** Nested within Club profiles.
- **Backend Routes:** `/api/clubs/:id/join`, `/api/clubs/:id/members/:memberId/status`
- **Models:** `Club.members` (embedded array), `Club.leadership` (embedded object).
- **Roles:** Student (request to join), Club Officers (approve/reject).

### Events & QR Attendance
- **Status:** Fully functional.
- **Frontend Routes:** `/attendance`, `/transcript`
- **Backend Routes:** `/api/attendance/*`
- **Models:** `AttendanceSession`, `Attendance`, `TranscriptRecord`
- **Roles:** Club Leaders (generate QR), Students (scan QR).
- **Notes:** Highly integrated and critical workflow. Should not be rewritten.

### Elections
- **Status:** Fully functional (toggleable visibility via Config).
- **Frontend Routes:** `/elections`
- **Backend Routes:** `/api/elections/*`
- **Models:** `Election`
- **Roles:** Students (vote), Admin (manage candidates/results).

### Budget / Ledger
- **Status:** Fully functional.
- **Frontend Routes:** `/budget`
- **Backend Routes:** `/api/budget/*`
- **Models:** `Transaction`
- **Roles:** `CLUB_REP` (scoped view, submit requests), `CLUB_ADMIN` (global view, approve requests, record allocations).

### Complaints
- **Status:** Fully functional.
- **Frontend Routes:** `/complaints`
- **Backend Routes:** `/api/complaints/*`
- **Models:** `Complaint`
- **Roles:** Students (submit), Admins (resolve/reply).

### Admin Dashboard & User Management
- **Status:** Fully functional.
- **Frontend Routes:** `/admin`, `/admin/users`
- **Backend Routes:** `/api/users/*`, `/api/config/*`
- **Models:** `User`, `SystemConfig`
- **Roles:** `admin`, `system_admin`, `superadmin`

## 2. Roles Inventory

The `User.role` field is validated via enum and includes the following existing roles:
- `student`: Standard access.
- `admin`: Elevated platform access.
- `president`: Top-level union executive.
- `council_president`: Council executive.
- `council_secretary`: Council operations.
- `clubs_coordinator`: Oversees all club compliance and reports.
- `academic_affairs`: Manages academic-related complaints or transcripts.
- `system_admin` / `superadmin`: Developer-level configurations.

Additionally, non-enum dynamically verified roles (via username/status checks):
- `CLUB_ADMIN` (`dbu10101040`): Central authority for the clubs ecosystem.
- `CLUB_REP` (`club_rep` strings): Representatives for individual clubs.
