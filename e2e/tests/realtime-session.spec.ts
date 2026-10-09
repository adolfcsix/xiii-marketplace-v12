import {expect,test} from '@playwright/test';
import {JwtService} from '@nestjs/jwt';
import {ACCOUNT,loginRequest,URLS} from '../helpers/session';
const API=process.env.E2E_API_URL||'http://localhost:4000/api/v1';
test.skip(!process.env.JWT_ACCESS_SECRET,'Uses the disposable local API secret to test a short-lived token.');
for(const actor of ['buyer','seller'] as const){
 test(`${actor} realtime refreshes an expired token and reconnects without losing the browser session`,async({page,request})=>{
  await page.goto(URLS[actor]+'/login');
  const response=await loginRequest(request,API+'/auth/login',ACCOUNT[actor]);expect(response.ok()).toBe(true);
  const {data}=await response.json();const subject=data.user.id;
  const token=new JwtService().sign({sub:subject,roles:data.user.roles},{secret:process.env.JWT_ACCESS_SECRET!,expiresIn:'5s'});
  const prefix=actor==='buyer'?'xiii':'xiii_seller';
  await page.addInitScript(({prefix,token,data})=>{localStorage.setItem(prefix+'_access',token);localStorage.setItem(prefix+'_refresh',data.refreshToken);localStorage.setItem(prefix+'_user',JSON.stringify(data.user));},{prefix,token,data});
  let ready=0;page.on('websocket',socket=>socket.on('framereceived',event=>{if(String(event.payload).includes('realtime:ready'))ready++;}));
  await page.goto(URLS[actor]+'/');await expect.poll(()=>ready).toBeGreaterThanOrEqual(1);
  await expect.poll(()=>page.evaluate(prefix=>localStorage.getItem(prefix+'_access'),prefix),{timeout:15000}).not.toBe(token);
  await expect.poll(()=>ready).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(prefix=>Boolean(localStorage.getItem(prefix+'_access')&&localStorage.getItem(prefix+'_refresh')),prefix)).toBe(true);
 });
}
