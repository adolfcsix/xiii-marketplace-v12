import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSizeChart, suggestSize } from '../apps/web/lib/size-advice';
import { validSellerSizeRows } from '../shared/size-chart';
const chart=[{size:'M',heightMin:160,heightMax:175,weightMin:50,weightMax:70},{size:'L',heightMin:165,heightMax:185,weightMin:60,weightMax:85}];
test('shop ranges include boundaries and loose preference only chooses among matching rows',()=>{
 assert.equal(suggestSize(chart,160,50,false,['M'])?.size,'M');
 assert.equal(suggestSize(chart,170,65,true,['M','L'])?.size,'L');
 assert.equal(suggestSize(chart,170,65,false,['M','L'])?.size,'M');
 assert.equal(suggestSize(chart,160,50,true,['M','L'])?.size,'M');
});
test('unmatched, invalid and absent chart data never produce an invented size',()=>{
 for(const [height,weight] of [[99,65],[170,19],[NaN,65],[200,65]])assert.equal(suggestSize(chart,height,weight,false,['M']),null);
 assert.equal(suggestSize([],170,65,false,['M']),null);
});
test('out of stock advice retains the matched size instead of recommending an unrelated one',()=>{
 assert.deepEqual(suggestSize(chart,160,50,false,['L']),{size:'M',available:false});
});
test('Buyer ignores malformed rows and Seller rejects invalid chart submissions',()=>{
 const invalid={size:'XL',heightMin:180,heightMax:160,weightMin:65,weightMax:90};
 assert.deepEqual(readSizeChart([...chart,invalid]),chart);
 assert.equal(validSellerSizeRows([...chart,invalid]),false);
 assert.equal(validSellerSizeRows(chart),true);
 assert.equal(validSellerSizeRows([]),true);
 assert.deepEqual(readSizeChart({size:'M'}),[]);
});
