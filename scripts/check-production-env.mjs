const required=['MONGODB_URI','REDIS_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','PAYOUT_ENCRYPTION_KEY','CORS_ORIGINS','NEXT_PUBLIC_API_URL','NEXT_PUBLIC_SOCKET_URL','STORAGE_BUCKET','STORAGE_ACCESS_KEY_ID','STORAGE_SECRET_ACCESS_KEY','STORAGE_PUBLIC_BASE_URL'];
let bad=false;
for(const key of required){const v=process.env[key]||'';if(!v){console.error(`MISSING ${key}`);bad=true}if(/SECRET|KEY/.test(key)&&(/^change-me/i.test(v)||v.length<32)){console.error(`WEAK ${key}`);bad=true}}
if((process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).includes('*')){console.error('CORS_ORIGINS must not contain *');bad=true}
if(bad)process.exit(1);console.log('Production environment check: PASS');
