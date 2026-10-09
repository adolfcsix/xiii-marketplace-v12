import {test} from 'node:test';import assert from 'node:assert/strict';
import {renderProfile,bufferSize,advanceClock} from '../apps/web/lib/threeui-runtime';
import {STREET_ORB_FRAGMENT} from '../apps/web/lib/street-orb-shader';
test('auto mobile resolution removes the original 2x overdraw and obeys the pixel budget',()=>{
 const p=renderProfile('auto',true),s=bufferSize(288,288,3,p);assert.equal(s.width,288);assert.equal(s.height,288);assert.equal(s.width*s.height/(576*576),.25);
 for(const q of ['auto','light','detail'] as const)for(const compact of [true,false])for(const size of [288,440,1200]){const p=renderProfile(q,compact),s=bufferSize(size,size,3,p);assert.ok(s.width*s.height<=p.pixels);assert.ok(s.dpr<=p.dpr);}
});
test('shader time integrates speed changes continuously and clamps resume gaps',()=>{
 const c={shader:10,stars:3};advanceClock(c,50,.65,.6);assert.ok(Math.abs(c.shader-10.0325)<1e-8);advanceClock(c,50,1.6,.6);assert.ok(Math.abs(c.shader-10.1125)<1e-8);advanceClock(c,10000,1,.6);assert.ok(c.shader<10.22);advanceClock(c,-100,1,1);assert.ok(c.shader<10.22);
});
test('derived shader adds actual 3D surface rotation while retaining sphere/noise/lighting logic',()=>{
 for(const marker of ['uniform vec2 uLook','rot*ry*rx*n','float fbm','sqrt(R*R-r*r)','gradeColor','uGlow'])assert.ok(STREET_ORB_FRAGMENT.includes(marker));
});

import {adaptConstellationSource} from '../apps/web/lib/constellation-runtime';
import {readFileSync} from 'node:fs';
test('Constellation motion normalizes both velocity and pointer pull across quality frame rates',()=>{
 const adapted=adaptConstellationSource(readFileSync('apps/web/public/effects/threeui/constellation-field.html','utf8'),1);
 for(const marker of ['node.vx*xiiiStep','node.vy*xiiiStep','Math.pow(0.995,xiiiStep)','Math.min(window.devicePixelRatio || 1, 1)'])assert.ok(adapted.includes(marker));
 assert.throws(()=>adaptConstellationSource('wrong source',1));
});
