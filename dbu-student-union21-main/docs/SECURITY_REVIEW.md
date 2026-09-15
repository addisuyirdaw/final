# Security & Architecture Review

## 1. Authentication & JWT Storage

### Current Implementation
- **JWT Generation:** Token is generated in `backend/routes/auth.js` upon successful login/registration with a `2h` expiration.
- **Storage:** Frontend stores the JWT in `localStorage` and `sessionStorage`.
- **Retrieval & Transmission:** `api.js` pulls the token from `localStorage` and injects it into the `Authorization: Bearer <token>` header for every request.

### Security Risk
- **Critical:** Storing JWTs in `localStorage` makes the application highly vulnerable to Cross-Site Scripting (XSS). Any malicious script injected into the frontend (e.g., via user input in Complaints or Posts if not properly sanitized) can steal the token.

### Safest Migration Strategy (Future Phase)
1. **Move to HTTP-Only Cookies:** Update the backend `/login` route to send the JWT in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie rather than returning it in the JSON body.
2. **Update Frontend API Wrapper:** Remove the `Authorization` header injection logic from `api.js`. Ensure Axios is configured with `withCredentials: true` so the cookie is sent automatically.
3. **Logout:** Create a `/logout` endpoint to clear the cookie.
*Note: This migration touches the core `api.js` file (which wraps all API calls) and thus poses a high regression risk. It must be tested thoroughly before merging in a future phase.*

## 2. Authorization (RBAC)

### Current Implementation
- **Middlewares:** `backend/middleware/auth.js` provides excellent guardrails (`protect`, `adminOnly`, `authorize(roles)`, `clubLeader`).
- **Backend Enforcement:** Crucially, sensitive routes (like approving budgets, deleting members) enforce checks server-side by matching `req.user.id` against database leadership arrays, not just frontend claims.

### Security Risk
- **Low:** The current implementation is robust. The primary concern is ensuring that *newly added* features remember to use these middlewares instead of assuming `req.user` implies broad access.

## 3. Input Validation

### Current Implementation
- **Express-Validator:** Strongly implemented in `backend/middleware/validation.js` for major routes (`/auth/register`, `/auth/login`, `/clubs`, `/complaints`, `/elections`).
- **Mongoose Validation:** Serves as a strong secondary safety net.

### Security Risk
- **Low:** Good coverage. The main risk is unvalidated updates via dynamic `req.body` spreads in `PATCH` requests. Developers should explicitly destructure allowed fields instead of doing `Object.assign(doc, req.body)`.
