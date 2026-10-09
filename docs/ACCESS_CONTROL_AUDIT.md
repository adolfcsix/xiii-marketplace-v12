# XIII Access Control & Audit

This module adds fine-grained authorization on top of the existing JWT roles.

## Shop roles

A shop has `OWNER`, `MANAGER`, and `STAFF` memberships. Authorization is permission-based rather than trusting the role label alone. The owner always receives every shop permission. Manager and staff defaults can be overridden per member.

Important permissions include product/catalog management, inventory, order fulfilment, promotions, chat/review/return operations, analytics, finance visibility, finance withdrawal, shop settings, and team management. `FINANCE_VIEW` and `FINANCE_WITHDRAW` are deliberately separate.

Seller services resolve the current user's shop membership before accessing shop-owned resources. Staff actions still record the real acting user while financial ledger ownership remains attached to the shop owner principal.

## Admin access

`SUPER_ADMIN` bypasses fine-grained admin permission checks. Ordinary `ADMIN` accounts require an active `AdminAccess` profile with the permission required by the route. Permissions include product moderation, CMS, seller approval, after-sales, review moderation, finance, analytics, users, admin management, and audit visibility.

A regular admin cannot modify its own admin-access profile and cannot modify a `SUPER_ADMIN` access profile through the access API.

## Audit log

Authenticated HTTP mutations (`POST`, `PATCH`, `PUT`, `DELETE`) are written to `auditlogs` through a global interceptor. Records include actor, roles, shop context when available, route/action, status, success/failure, resource identifiers, IP/user-agent, duration, and only request/query **key names**. Request-body values are not copied into the audit metadata, reducing the chance of logging passwords, payout numbers, tokens, or other secrets.

Audit writes are fail-safe: an audit storage error does not replace the business response. In a production deployment the audit sink should be monitored separately and ideally exported to immutable/append-only storage.

## UI

Seller Center:
- `/team` — view shop members, add an existing XIII user, change role/status/permissions, remove non-owner members.

Admin:
- `/admins` — manage ordinary admin permission profiles.
- `/audit-logs` — search and page through mutation audit records.

## Seed accounts

All demo passwords are `Xiii12345!`:
- `seller@xiii.local` — shop OWNER
- `manager@xiii.local` — MANAGER (no `FINANCE_WITHDRAW` by default)
- `staff@xiii.local` — STAFF operational permissions
- `admin@xiii.local` — `SUPER_ADMIN`
- `ops@xiii.local` — restricted `ADMIN`

The seed credentials are development-only and must never be used for a deployed environment.
