import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState as rawInitialState,candidates,verifySupply,generateQuote,sendQuote,handoff,newSupply,expireVerification,simulateCustomerReply,simulateSalesReply,englishConversation,confirmDemand,decideDiscount,closeOutcome } from '../apps/web/demo/model.js';
const initialState=()=>{const s=rawInitialState();s.demands[0].fieldsConfirmed=true;return s;};
test('demo excludes expired low-price supplier and does not overwrite suppliers',()=>{
 const s=initialState();assert.deepEqual(candidates(s,s.demands[0]).map(o=>o.id),['s1','s2']);assert.equal(s.offers.filter(o=>o.productId===s.demands[0].productId).length,3);
});
test('demo progresses through verified quote, simulated send, and handoff',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');assert.equal(q.unitPriceMinor,28500);assert.equal(q.totalMinor,5700000);assert.equal(q.expiresAt,s.time+48*3600000);sendQuote(s,q.id);handoff(s,'d1');assert.equal(s.demands[0].stage,'human');assert.equal(s.demands[0].conversation.mode,'human');assert.equal(s.events.length,7);
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

test('post quote conversation preserves price, routes purchase to human and stops AI',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');
 assert.throws(()=>simulateCustomerReply(s,q.id,'purchase'),/先模拟发送/);sendQuote(s,q.id);
 simulateCustomerReply(s,q.id,'negotiate');assert.equal(q.unitPriceMinor,28400);assert.throws(()=>simulateCustomerReply(s,q.id,'negotiate'),/已演示/);
 simulateCustomerReply(s,q.id,'delivery');simulateCustomerReply(s,q.id,'purchase');assert.equal(s.demands[0].stage,'human');
 assert.throws(()=>simulateCustomerReply(s,q.id,'delivery'),/不再自动回复/);simulateSalesReply(s,q.id);assert.equal(q.messages.at(-1).role,'sales');assert.throws(()=>simulateSalesReply(s,q.id),/已演示/);
});

test('English dialogue renders older saved progress without changing price, expiry or audit',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');sendQuote(s,q.id);
 simulateCustomerReply(s,q.id,'delivery');simulateCustomerReply(s,q.id,'purchase');simulateSalesReply(s,q.id);expireVerification(s,'d1');
 q.messages=[{role:'sales',text:'旧中文回复'}];const before=JSON.stringify(s),messages=englishConversation(s,q);
 assert.equal(JSON.stringify(s),before);assert.ok(messages.some(m=>m.text.includes('Dubai')));assert.ok(messages.every(m=>!/[\u4e00-\u9fff]/.test(m.text)));assert.equal(messages.at(-1).role,'sales');
});

test('authorized concession is capped, audited, expires and escalates further bargaining',()=>{
 const s=initialState();verifySupply(s,'d1','s1',200,27800);const q=generateQuote(s,'d1');sendQuote(s,q.id);simulateCustomerReply(s,q.id,'negotiate');
 assert.equal(q.unitPriceMinor,28400);assert.equal(q.totalMinor,5680000);assert.equal(q.discountUsedMinor,100);assert.equal(q.priceHistory[0].unitPriceMinor,28500);
 assert.ok(englishConversation(s,q).some(m=>m.text.includes('284.00')));assert.equal(q.discountUsedMinor,100);
 simulateCustomerReply(s,q.id,'negotiateMore');assert.equal(q.unitPriceMinor,28400);assert.equal(s.demands[0].stage,'human');
 const expired=initialState();verifySupply(expired,'d1','s1',200,27800);const old=generateQuote(expired,'d1');sendQuote(expired,old.id);expireVerification(expired,'d1');assert.throws(()=>simulateCustomerReply(expired,old.id,'negotiate'),/verification_expired/);assert.equal(old.unitPriceMinor,28500);
 const floor=initialState();verifySupply(floor,'d1','s1',200,27800);const minimum=generateQuote(floor,'d1',28200);sendQuote(floor,minimum.id);simulateCustomerReply(floor,minimum.id,'negotiate');assert.equal(minimum.unitPriceMinor,28200);assert.equal(floor.demands[0].stage,'human');
});

test('SOP and historic reconfirmation gate verification; supervisor decisions and outcomes are audited',()=>{
 const s=rawInitialState();assert.throws(()=>verifySupply(s,'d1','s1',200,27800),/补齐/);confirmDemand(s,'d1');verifySupply(s,'d1','s1',200,27800);
 const q=generateQuote(s,'d1');sendQuote(s,q.id);simulateCustomerReply(s,q.id,'negotiate');simulateCustomerReply(s,q.id,'negotiateMore');
 assert.throws(()=>decideDiscount(s,q.id,true,''),/原因/);decideDiscount(s,q.id,true,'整批采购，利润符合底线');assert.equal(q.unitPriceMinor,28300);closeOutcome(s,'d1',true);assert.equal(s.demands[0].outcome,'won');
 newSupply(s);assert.throws(()=>verifySupply(s,'d2','s7',150,16800),/历史客户/);confirmDemand(s,'d2');verifySupply(s,'d2','s7',150,16800);
});
