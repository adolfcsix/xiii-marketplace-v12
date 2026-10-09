# XIII Marketplace — Realtime Chat + Notifications

This slice adds authenticated Buyer ↔ Seller chat and a persisted notification center on top of the existing marketplace codebase.

## Runtime pieces

- NestJS + Socket.IO namespace: `/realtime`
- JWT access token is supplied in the Socket.IO handshake `auth.token`
- Every connected socket joins only its own `user:<userId>` room
- Conversation rooms use `conversation:<conversationId>` and are joined only after server-side ownership checks
- Chat messages are persisted in MongoDB before realtime emission
- Notification records are persisted in MongoDB before `notification:new` is emitted
- REST APIs remain available so chat history and reads survive reconnects/reloads

## Buyer APIs

```text
POST  /api/v1/chat/conversations
GET   /api/v1/chat/conversations
GET   /api/v1/chat/unread-count
GET   /api/v1/chat/conversations/:id/messages
POST  /api/v1/chat/conversations/:id/messages
PATCH /api/v1/chat/conversations/:id/read

GET   /api/v1/notifications
GET   /api/v1/notifications/unread-count
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

A buyer starts or reopens the single conversation with a shop by posting `shopId`, optionally with `productId` or `orderCode` context. Product/order context is validated against that shop and buyer.

## Seller APIs

```text
GET   /api/v1/seller/chat/conversations
GET   /api/v1/seller/chat/unread-count
GET   /api/v1/seller/chat/conversations/:id/messages
POST  /api/v1/seller/chat/conversations/:id/messages
PATCH /api/v1/seller/chat/conversations/:id/read
```

Seller access is role-protected and also checked against `Conversation.sellerId`; a seller cannot open another shop's conversation by guessing an ID.

## Socket.IO events

Client → server:

```text
chat:join { conversationId, actorRole }
chat:send { conversationId, actorRole, text, ... }
chat:read { conversationId, actorRole }
```

Server → client:

```text
realtime:ready
chat:message
chat:read
chat:unread
notification:new
notification:count
```

The current UI sends text through REST and uses Socket.IO for realtime delivery/read-count updates. This gives a simple fallback model: persisted history is still correct if the realtime connection drops.

## Implemented UI

Buyer:

```text
/account/messages
/account/notifications
Product Detail → Chat với shop
Header unread badges for chat + notifications
```

Seller:

```text
/messages
/notifications
Seller sidebar/topbar unread badges
```

## Persisted domain notifications

The current code creates notifications for these implemented flows:

- new order → seller
- seller fulfillment status → buyer
- buyer cancellation/completion → seller
- verified online payment success/failure/expiry → buyer
- return request/approval/rejection/shipment/refund-pending → buyer or seller as appropriate
- confirmed refund → buyer
- new verified-purchase review → seller
- seller review reply → buyer
- new chat message → receiving participant

Notifications are delivery aids, not the source of truth. Orders, payments, returns, reviews and chat messages remain authoritative in their own collections.

## Seed demo

After:

```powershell
npm run seed --workspace services/api
```

`buyer@xiii.local` and `seller@xiii.local` already have one demo conversation and unread notifications so the UI can be inspected immediately.

## Environment

Optional explicit socket origin:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

If omitted, Buyer/Seller clients derive the Socket.IO origin from `NEXT_PUBLIC_API_URL`.

## Production notes

For multi-instance deployment, Socket.IO rooms need a shared adapter (commonly Redis) so a user connected to instance A can receive an event created on instance B. The current local implementation uses the in-process Socket.IO adapter. Existing Redis in `docker-compose.yml` remains available for a later Redis adapter/queue phase.
