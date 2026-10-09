import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

test('ThreeUI canonical source keeps the verified upstream renderer bytes', () => {
  const source = readFileSync('apps/web/public/effects/threeui/constellation-field.html');
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '1920ad4fe34f2ed2348e3a52110c37b4969bc45d71ff29f2738cb4542ad9f610');
});

test('ThreeUI Energy Orb renderer keeps its verified upstream source', () => {
  const source = readFileSync('apps/web/components/threeui-energy/EnergyOrb.tsx');
  assert.equal(createHash('sha256').update(source).digest('hex'),
    'be9ca83c7d158dd1366bd942aa4cc4c084b901d59156d047a601ebd9cca4a903');
});

test('ThreeUI Energy Orb preserves its complete authored GLSL shaders', () => {
  const source = readFileSync('apps/web/components/threeui-energy/energyOrbShaders.ts');
  assert.equal(createHash('sha256').update(source).digest('hex'),
    '03b1b8e2c44042ac1e880003e55016a641329028205c62dcd17e535b99496aec');
});
