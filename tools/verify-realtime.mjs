import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  'services/api/src/chat/chat.module.ts','services/api/src/chat/chat.gateway.ts','services/api/src/chat/chat.service.ts','services/api/src/chat/chat.controller.ts','services/api/src/chat/chat.schema.ts',
  'services/api/src/notifications/notifications.module.ts','services/api/src/notifications/notifications.service.ts','services/api/src/notifications/notifications.controller.ts','services/api/src/notifications/notification.schema.ts','services/api/src/notifications/realtime-publisher.service.ts',
  'apps/web/app/account/messages/page.tsx','apps/web/app/account/notifications/page.tsx','apps/web/components/chat-client.tsx','apps/web/components/notifications-client.tsx','apps/web/lib/realtime.ts',
  'apps/seller/app/messages/page.tsx','apps/seller/app/notifications/page.tsx','apps/seller/components/seller-chat-client.tsx','apps/seller/components/seller-notifications-client.tsx','apps/seller/lib/realtime.ts',
  'docs/REALTIME_CHAT_NOTIFICATIONS.md',
];
for(const file of required){if(!fs.existsSync(path.join(root,file)))throw new Error(`Missing ${file}`)}
const app=fs.readFileSync(path.join(root,'services/api/src/app.module.ts'),'utf8');
for(const token of ['NotificationsModule','ChatModule'])if(!app.includes(token))throw new Error(`AppModule missing ${token}`);
const gateway=fs.readFileSync(path.join(root,'services/api/src/chat/chat.gateway.ts'),'utf8');
for(const token of ["namespace: '/realtime'","chat:join","chat:send","chat:read","verifyAsync","conversation:"])if(!gateway.includes(token))throw new Error(`Gateway missing ${token}`);
const chat=fs.readFileSync(path.join(root,'services/api/src/chat/chat.service.ts'),'utf8');
for(const token of ['CHAT_ACCESS_DENIED','sellerUnread','buyerUnread','notification','emitConversation'])if(!chat.includes(token))throw new Error(`Chat service missing ${token}`);
const schema=fs.readFileSync(path.join(root,'services/api/src/chat/chat.schema.ts'),'utf8');
if(!schema.includes("{ buyerId: 1, shopId: 1 }, { unique: true }"))throw new Error('Conversation uniqueness index missing');
const notif=fs.readFileSync(path.join(root,'services/api/src/notifications/notifications.service.ts'),'utf8');
for(const token of ['notification:new','notification:count','readAt: null'])if(!notif.includes(token))throw new Error(`Notification service missing ${token}`);
const apiPkg=JSON.parse(fs.readFileSync(path.join(root,'services/api/package.json'),'utf8'));
const webPkg=JSON.parse(fs.readFileSync(path.join(root,'apps/web/package.json'),'utf8'));
const sellerPkg=JSON.parse(fs.readFileSync(path.join(root,'apps/seller/package.json'),'utf8'));
if(!apiPkg.dependencies['@nestjs/platform-socket.io']||!apiPkg.dependencies['socket.io'])throw new Error('API realtime dependencies missing');
if(!webPkg.dependencies['socket.io-client']||!sellerPkg.dependencies['socket.io-client'])throw new Error('Client socket.io dependency missing');
const product=fs.readFileSync(path.join(root,'apps/web/components/product-detail-client.tsx'),'utf8');
if(!product.includes("/chat/conversations")||!product.includes('Chat với shop'))throw new Error('Product Detail chat entry missing');
const seed=fs.readFileSync(path.join(root,'services/api/src/database/seed.ts'),'utf8');
for(const token of ["collection('conversations')","collection('chatmessages')","collection('notifications')"])if(!seed.includes(token))throw new Error(`Seed missing ${token}`);
console.log(`Realtime verification passed: ${required.length} required files, JWT Socket.IO gateway, persisted chat/notifications, Buyer + Seller UI.`);
