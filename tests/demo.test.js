import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState,candidates,verifySupply,generateQuote,sendQuote,handoff,newSupply,expireVerification } from '../apps/web/demo/model.js';
test('demo excludes expired low-price supplier and does not overwrite suppliers',()=>{
 const s=initialState();assert.deepEqual(candidates(s,s.demands[0]).map(o=>o.id),['s1','s2']);assert.equal(s.offers.filter(o=>o.productId===s.demands[0].productId).length,3);
});
test('demo progresses through verified quote, simulated send, and handoff',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');assert.equal(q.unitPriceMinor,28500);assert.equal(q.totalMinor,5700000);assert.equal(q.expiresAt,s.time+6*3600000);sendQuote(s,q.id);handoff(s,'d1');assert.equal(s.demands[0].stage,'human');assert.equal(s.demands[0].conversation.mode,'human');assert.equal(s.events.length,7);
});
test('unverified or insufficient stock cannot progress into quote',()=>{
 const s=initialState();assert.throws(()=>generateQuote(s,'d1'),/先由采购核验/);assert.throws(()=>verifySupply(s,'d1','s1',199,27800),/数量/);assert.equal(s.events.length,3);
});
test('expired verification prevents send without changing status',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');expireVerification(s,'d1');assert.throws(()=>sendQuote(s,q.id),/verification_expired/);assert.notEqual(q.status,'sent');
});
test('a new offer recalls waiting demand once and still requires human verification',()=>{
 const s=initialState();newSupply(s);assert.equal(s.demands[1].stage,'matched');assert.equal(candidates(s,s.demands[1]).length,1);assert.throws(()=>generateQuote(s,'d2'),/先由采购核验/);assert.throws(()=>newSupply(s),/已录入/);assert.equal(s.offers.length,7);
});
test('human takeover blocks a pending send and duplicate send is blocked',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');handoff(s,'d1');assert.throws(()=>sendQuote(s,q.id),/human_control/);
 const second=initialState();verifySupply(second,'d1','s1',200,27800);const q2=generateQuote(second,'d1');sendQuote(second,q2.id);assert.throws(()=>sendQuote(second,q2.id),/不重复/);
});
test('reverification supersedes the invalidated quote rather than reviving it',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');expireVerification(s,'d1');verifySupply(s,'d1','s1',200,27800);const newQuote=generateQuote(s,'d1');assert.notEqual(newQuote.id,q.id);assert.equal(q.status,'superseded');sendQuote(s,newQuote.id);
});

test('sales price honors target, permits negotiated price and blocks below internal floor',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);
 assert.throws(()=>generateQuote(s,'d1',28199),/内部底价/);assert.equal(s.quotes.length,0);
 const q=generateQuote(s,'d1',28400);assert.equal(q.unitPriceMinor,28400);assert.equal(q.floorPriceMinor,28200);assert.equal(q.suggestedPriceMinor,28500);
 const low=initialState();low.demands[0].target=270;verifySupply(low,'d1','s1',200,27800);assert.equal(generateQuote(low,'d1').unitPriceMinor,28200);
});
