import { calculateQuote, checkQuoteSend, matchOffers } from '../../../packages/domain/quote.ts';

export const DEMO_TIME = Date.parse('2026-10-08T07:30:00Z');
export const customers = [
  { id:'c1',name:'Omar Hassan',company:'Atlas Mobile Trading',country:'阿联酋',city:'迪拜',flag:'AE',initials:'OH',owner:'林悦',level:'重点客户',language:'英语',last:'今天 15:12',color:'#ede9df',history:'持续采购 Apple 中端机型，偏好整批出货。' },
  { id:'c2',name:'Daniel Okafor',company:'Westline Electronics',country:'尼日利亚',city:'拉各斯',flag:'NG',initials:'DO',owner:'陈晨',level:'活跃客户',language:'英语',last:'今天 14:48',color:'#e9efe5',history:'价格敏感，常采购 Samsung A 系列；接受相近型号。' },
  { id:'c3',name:'María García',company:'Nova Digital',country:'墨西哥',city:'墨西哥城',flag:'MX',initials:'MG',owner:'林悦',level:'重点客户',language:'西语',last:'今天 14:05',color:'#eee7e2',history:'偏好 Apple 高容量版本，需明确版本和交付地点。' },
  { id:'c4',name:'Ravi Mehta',company:'Meridian Devices',country:'印度',city:'孟买',flag:'IN',initials:'RM',owner:'周可',level:'活跃客户',language:'英语',last:'今天 13:37',color:'#e7ecf1',history:'采购 Xiaomi 系列，要求提供明确有效期。' },
  { id:'c5',name:'Ahmed Saleh',company:'Gulf Connect',country:'阿联酋',city:'沙迦',flag:'AE',initials:'AS',owner:'陈晨',level:'新客户',language:'阿语',last:'今天 12:15',color:'#f0ecdf',history:'新客户，交付条件及付款方式待业务员沟通。' },
  { id:'c6',name:'Lucas Ferreira',company:'Porto Tech',country:'巴西',city:'圣保罗',flag:'BR',initials:'LF',owner:'周可',level:'活跃客户',language:'葡语',last:'昨天 17:20',color:'#e8edeb',history:'询单尚未成交，需求已保留。' },
];
export function initialState() {
  const offers = [
    { id:'s1',supplier:'Supplier A',kind:'external',productId:'iphone13-128-midnight',product:'iPhone 13',spec:'128GB · Midnight · 国际版',quantity:260,reserved:0,costMinor:27800,currency:'USD',warehouse:'香港',expiresAt:DEMO_TIME+48*3600000,version:1,active:true,score:'履约记录稳定',updated:'今天 14:30' },
    { id:'s2',supplier:'Supplier B',kind:'external',productId:'iphone13-128-midnight',product:'iPhone 13',spec:'128GB · Midnight · 国际版',quantity:400,reserved:0,costMinor:28000,currency:'USD',warehouse:'香港',expiresAt:DEMO_TIME+48*3600000,version:1,active:true,score:'库存需再次确认',updated:'今天 13:50' },
    { id:'s3',supplier:'Supplier C',kind:'external',productId:'iphone13-128-midnight',product:'iPhone 13',spec:'128GB · Midnight · 国际版',quantity:300,reserved:0,costMinor:27400,currency:'USD',warehouse:'深圳',expiresAt:DEMO_TIME-3*3600000,version:1,active:true,score:'已停止推荐',updated:'10 月 6 日 12:30' },
    { id:'s4',supplier:'公司自有库存',kind:'internal',productId:'redmi-note13-256',product:'Redmi Note 13',spec:'256GB · 黑色 · 国际版',quantity:240,reserved:40,costMinor:14300,currency:'USD',warehouse:'深圳',expiresAt:DEMO_TIME+48*3600000,version:1,active:true,score:'可售数量已扣除锁定',updated:'今天 13:20' },
    { id:'s5',supplier:'Supplier D',kind:'external',productId:'iphone14-256-blue',product:'iPhone 14',spec:'256GB · Blue · 国际版',quantity:100,reserved:0,costMinor:36200,currency:'USD',warehouse:'香港',expiresAt:DEMO_TIME+30*3600000,version:1,active:true,score:'历史交付准时',updated:'今天 14:00' },
    { id:'s6',supplier:'Supplier B',kind:'external',productId:'galaxy-a15-128',product:'Galaxy A15',spec:'128GB · 蓝黑色 · 国际版',quantity:180,reserved:0,costMinor:11500,currency:'USD',warehouse:'深圳',expiresAt:DEMO_TIME+8*3600000,version:1,active:true,score:'有效期即将结束',updated:'今天 07:30' },
  ];
  const demands = [
    { id:'d1',customerId:'c1',productId:'iphone13-128-midnight',product:'iPhone 13',spec:'128GB · Midnight · 国际版',quantity:200,currency:'USD',target:285,fieldsConfirmed:false,stage:'collecting',priority:'优先',last:'15:12',delivery:'迪拜',conversation:{mode:'ai',controlVersion:1} },
    { id:'d2',customerId:'c2',productId:'galaxy-a25-128',product:'Galaxy A25',spec:'128GB · 蓝色 · 国际版',quantity:150,currency:'USD',target:175,stage:'waiting',priority:'到货跟进',last:'14:48',delivery:'拉各斯',conversation:{mode:'ai',controlVersion:1} },
    { id:'d3',customerId:'c3',productId:'iphone14-256-blue',product:'iPhone 14',spec:'256GB · Blue · 国际版',quantity:80,currency:'USD',target:370,stage:'matched',priority:'优先',last:'14:05',delivery:'墨西哥城',conversation:{mode:'ai',controlVersion:1} },
    { id:'d4',customerId:'c4',productId:'redmi-note13-256',product:'Redmi Note 13',spec:'256GB · 黑色 · 国际版',quantity:120,currency:'USD',target:150,stage:'matched',priority:'常规',last:'13:37',delivery:'孟买',conversation:{mode:'ai',controlVersion:1} },
    { id:'d5',customerId:'c5',productId:'galaxy-a15-128',product:'Galaxy A15',spec:'128GB · 蓝黑色 · 国际版',quantity:100,currency:'USD',target:123,stage:'matched',priority:'常规',last:'12:15',delivery:'沙迦',conversation:{mode:'ai',controlVersion:1} },
    { id:'d6',customerId:'c6',productId:'iphone15-128',product:'iPhone 15',spec:'128GB · 黑色 · 国际版',quantity:100,currency:'USD',target:480,stage:'waiting',priority:'到货跟进',last:'昨天',delivery:'圣保罗',conversation:{mode:'ai',controlVersion:1} },
  ];
  return { version:1,time:DEMO_TIME,offers,demands,verifications:{},quotes:[],events:[
    { id:3,time:DEMO_TIME-18*60000,action:'需求结构化并匹配货源',actor:'AI 接待助手',detail:'Omar · iPhone 13 / 200 台，匹配到 2 个有效货源',type:'match' },
    { id:2,time:DEMO_TIME-42*60000,action:'无货需求进入历史需求池',actor:'AI 接待助手',detail:'Daniel · Galaxy A25 / 150 台，保留供后续到货跟进',type:'demand' },
    { id:1,time:DEMO_TIME-60*60000,action:'过期货源停止推荐',actor:'报价规则',detail:'Supplier C · iPhone 13，有效期已结束',type:'risk' },
  ] };
}
export function customerById(id) { return customers.find(c=>c.id===id); }
export function candidates(state,demand) { return matchOffers(demand,state.offers,state.time); }
export function record(state,action,actor,detail,type='operation') {
  state.events.unshift({id:Math.max(0,...state.events.map(e=>e.id))+1,time:state.time,action,actor,detail,type});
}
export function verifySupply(state,demandId,offerId,quantity,costMinor) {
  const demand=state.demands.find(d=>d.id===demandId); const offer=state.offers.find(o=>o.id===offerId);
  if(demand?.fieldsConfirmed===false)throw new Error('请先补齐版本、颜色和交付要求');
  if(demand?.needsReconfirmation)throw new Error('请先确认历史客户仍有采购需求');
  if (!demand || !offer || !candidates(state,demand).some(o=>o.id===offerId)) throw new Error('货源不满足数量、型号或有效期条件');
  if (!Number.isSafeInteger(quantity) || quantity<demand.quantity || quantity>offer.quantity-offer.reserved) throw new Error('核验数量不足或超过当前可售数量');
  if (costMinor!==offer.costMinor) throw new Error('核验成本与货源记录不一致，请重新确认');
  state.verifications[demand.id]={offerId,offerVersion:offer.version,quantity,costMinor,currency:offer.currency,verifiedBy:'王磊 · 采购',expiresAt:Math.min(state.time+48*3600000,offer.expiresAt),revoked:false};
  for (const quote of state.quotes) if (quote.demandId===demandId && ['draft','expired'].includes(quote.status)) quote.status='superseded';
  demand.stage='verified';demand.offerId=offerId;
  record(state,'库存与底价已人工核验','王磊 · 采购',`${customerById(demand.customerId).name} · ${offer.supplier} / ${quantity} 台 / USD ${(costMinor/100).toFixed(2)}`,'verify');
}
export function generateQuote(state,demandId,finalPriceMinor) {
  const demand=state.demands.find(d=>d.id===demandId); if(!demand) throw new Error('询单不存在');
  if(demand.conversation.mode==='human') throw new Error('该会话已由人工接管');
  const verification=state.verifications[demandId]; const offer=state.offers.find(o=>o.id===verification?.offerId);
  if(!offer) throw new Error('请先由采购核验库存与底价');
  const floorPriceMinor=verification.costMinor+400;
  const suggestedPriceMinor=Math.max(Math.round(demand.target*100),floorPriceMinor);
  const price=finalPriceMinor??suggestedPriceMinor;
  if(!Number.isSafeInteger(price)||price<floorPriceMinor) throw new Error('最终报价不能低于内部底价');
  const quote=calculateQuote(demand,offer,verification,{version:'demo-sales-confirm-v2',markupMinor:price-verification.costMinor,minimumProfitMinor:200,validityMs:48*3600000},state.time);
  const old=state.quotes.find(q=>q.demandId===demandId&&q.status==='draft');
  if(old) return old;
  const item={...quote,discountLimitMinor:100,discountUsedMinor:0,floorPriceMinor,suggestedPriceMinor,customerTargetMinor:Math.round(demand.target*100),verificationSnapshot:{...verification},id:`QT-20261008-${String(state.quotes.length+1).padStart(3,'0')}`,status:'draft',controlVersion:demand.conversation.controlVersion};
  state.quotes.push(item);demand.stage='quoted';
  record(state,'已生成报价草稿',customerById(demand.customerId).owner+' · 销售',`${item.id} · USD ${(quote.unitPriceMinor/100).toFixed(2)} / 台，待人工确认`,'quote');return item;
}
export function sendQuote(state,id) {
  const quote=state.quotes.find(q=>q.id===id);if(!quote) throw new Error('报价不存在');
  if(quote.status==='sent') throw new Error('该报价已模拟发送，不重复发送');
  if(quote.status==='superseded') throw new Error('该报价已被新核验替代，请使用最新报价');
  const demand=state.demands.find(d=>d.id===quote.demandId);const offer=state.offers.find(o=>o.id===quote.offerId);
  checkQuoteSend(quote,offer,state.verifications[demand.id],demand.conversation,quote.controlVersion,state.time);
  quote.originalPriceMinor=quote.unitPriceMinor;
  quote.status='sent';demand.stage='sent';
  quote.messages=initialQuoteMessages(demand,quote);
  quote.replyScenarios=[];
  record(state,'报价已人工确认并模拟发送',customerById(demand.customerId).owner+' · 销售',`${id} · 本次发送前已复核库存、核验时效和报价截止时间`,'send');
}
function initialQuoteMessages(demand,quote){return [{role:'sales',text:`Hi, our quotation for ${demand.quantity} units of ${demand.product} is USD ${(quote.unitPriceMinor/100).toFixed(2)} per unit, totaling USD ${(quote.totalMinor/100).toFixed(2)}. Freight, taxes and delivery terms require separate confirmation. Please refer to the quotation for its validity.`},{role:'customer',text:'Thanks, I have received your quotation. Let me confirm our purchasing plans.'}];
}
export function handoff(state,demandId,reason='purchase') {
  const demand=state.demands.find(d=>d.id===demandId);if(!demand) throw new Error('询单不存在');
  if(demand.conversation.mode==='human') return;
  demand.conversation={mode:'human',controlVersion:demand.conversation.controlVersion+1};demand.stage='human';
  record(state,reason==='discount'?'超出议价权限已转人工审批':'购买意向已转人工接管',customerById(demand.customerId).owner+' · 销售',`${customerById(demand.customerId).name} · AI 停止对外回复，锁货和付款由业务员跟进`,'handoff');
}
export function newSupply(state) {
  if(state.offers.some(o=>o.id==='s7')) throw new Error('该批模拟新货源已录入');
  state.offers.push({id:'s7',supplier:'Supplier A',kind:'external',productId:'galaxy-a25-128',product:'Galaxy A25',spec:'128GB · 蓝色 · 国际版',quantity:300,reserved:0,costMinor:16800,currency:'USD',warehouse:'香港',expiresAt:state.time+24*3600000,version:1,active:true,score:'匹配历史未成交需求',updated:'刚刚'});
  const demand=state.demands.find(d=>d.id==='d2');if(demand.stage==='waiting'){demand.stage='matched';demand.needsReconfirmation=true;}
  record(state,'新货源召回历史询单','王磊 · 采购','Galaxy A25 到货，自动找回 Daniel 的 150 台未成交需求','match');
}
export function expireVerification(state,demandId) {
  const verification=state.verifications[demandId];if(!verification)throw new Error('请先完成核验与报价');
  verification.expiresAt=state.time-1;
  record(state,'模拟核验有效期结束','报价规则',`${customerById(state.demands.find(d=>d.id===demandId).customerId).name} · 旧报价停止发送，需重新核验`,'risk');
}

export function simulateCustomerReply(state,quoteId,scenario) {
 const q=state.quotes.find(q=>q.id===quoteId);if(!q||q.status!=='sent')throw new Error('请先模拟发送报价');
 const d=state.demands.find(d=>d.id===q.demandId);
 if(d.conversation.mode==='human')throw new Error('已转人工，AI 不再自动回复');
 const replies={
  negotiate:['Could you offer a better price for this quantity?', ''],
  negotiateMore:['Can you do USD 283 per unit if we take the full batch?', ''],
  delivery:[`Can you ship this order to ${deliveryCity(d.delivery)}? When could it be dispatched?`,`For ${deliveryCity(d.delivery)}, would you prefer to use your own freight forwarder, or have us check a shipping option? Please share the delivery postcode and your required arrival date. The quotation covers the units only, so I will keep freight separate and have the team confirm the dispatch schedule before you commit.`],
  purchase:[`The price works for us. We would like to purchase ${d.quantity} units. Please reserve the stock and send the payment details.`,`Great, let us move this forward: ${d.quantity} units of ${d.product} at USD ${(q.unitPriceMinor/100).toFixed(2)} each, with a goods subtotal of USD ${(q.totalMinor/100).toFixed(2)}. Please send your company billing name and confirm whether you will use your own forwarder. I am bringing ${salesName(d.customerId)} into the conversation to confirm availability, arrange the pro forma invoice and provide verified payment instructions. The stock is not reserved yet; ${salesName(d.customerId)} will confirm that directly.`]
 };
 if(!replies[scenario])throw new Error('未知演示场景');
 q.replyScenarios??=[];if(q.replyScenarios.includes(scenario))throw new Error('这段客户回复已演示');
 if(scenario==='negotiate'||scenario==='negotiateMore'){
  if(!q.dialogueReplay){const offer=state.offers.find(o=>o.id===q.offerId);checkQuoteSend(q,offer,state.verifications[d.id],d.conversation,q.controlVersion,state.time);}
  const floor=q.floorPriceMinor??q.verificationSnapshot.costMinor+400;
  const remaining=Math.max(0,(q.discountLimitMinor??0)-(q.discountUsedMinor??0));
  const concession=scenario==='negotiate'?Math.min(remaining,Math.max(0,q.unitPriceMinor-floor)):0;
  if(scenario==='negotiateMore'&&!q.replyScenarios.includes('negotiate'))throw new Error('请先演示第一轮议价');
  if(concession>0){
   q.priceHistory??=[];q.priceHistory.push({unitPriceMinor:q.unitPriceMinor,totalMinor:q.totalMinor,time:state.time});
   q.unitPriceMinor-=concession;q.totalMinor=q.unitPriceMinor*q.quantity;q.discountUsedMinor=(q.discountUsedMinor??0)+concession;
   q.discountCondition=`Full batch of ${q.quantity} units; freight and taxes excluded.`;
   replies.negotiate[1]=`For the full batch of ${q.quantity} units, I can bring this down to USD ${(q.unitPriceMinor/100).toFixed(2)} per unit — a saving of USD ${(concession*q.quantity/100).toFixed(2)} on the order. That makes the goods total USD ${(q.totalMinor/100).toFixed(2)}, excluding freight and taxes. This price applies to the full quantity within the existing quotation validity; stock reservation still needs final confirmation. Does that work for you?`;
   record(state,'AI 在授权额度内让价并模拟更新报价','演示议价规则',`${q.id} · 每台让价 USD ${(concession/100).toFixed(2)}；新单价 USD ${(q.unitPriceMinor/100).toFixed(2)}；总额 USD ${(q.totalMinor/100).toFixed(2)}；整批 ${q.quantity} 台`,'discount');
  }else{
   replies[scenario][1]=`USD ${(q.unitPriceMinor/100).toFixed(2)} is the best price I can offer within my current authority for this batch. I understand you are looking for a sharper price, so I am bringing ${salesName(d.customerId)} in to review your request. The current quotation stays at USD ${(q.unitPriceMinor/100).toFixed(2)} per unit unless a revised offer is approved.`;
  }
 }
 q.messages??=[];q.messages.push({role:'customer',text:replies[scenario][0]},{role:'ai',text:replies[scenario][1]});q.replyScenarios.push(scenario);
 record(state,'模拟客户回复','预设对话演示',`${q.id} · ${replies[scenario][0]}`,'conversation');
 if(scenario==='purchase')handoff(state,d.id);
 else if(scenario==='negotiateMore'||scenario==='negotiate'&&!(q.discountUsedMinor>0)){q.handoffReason='discount';handoff(state,d.id,'discount');}
}
export function simulateSalesReply(state,quoteId) {
 const q=state.quotes.find(q=>q.id===quoteId);if(!q||q.status!=='sent')throw new Error('请先模拟发送报价');
 const d=state.demands.find(d=>d.id===q.demandId);if(d.conversation.mode!=='human')throw new Error('请先转人工接管');
 if(q.salesReplied)throw new Error('业务员回复已演示');
 q.messages??=[];q.messages.push({role:'sales',text:q.handoffReason==='discount'?`Hi ${customerById(d.customerId).name.split(' ')[0]}, ${salesName(d.customerId)} here. I have your price request and the current USD ${(q.unitPriceMinor/100).toFixed(2)} offer for ${d.quantity} units. Let me review the full-batch terms with our team. The current quotation remains in place while I check; please confirm your intended order date and freight arrangement.`:`Hi, ${customerById(d.customerId).name.split(' ')[0]}, ${salesName(d.customerId)} here. I have your ${d.quantity}-unit ${d.product} enquiry and quotation ${q.id}, so you do not need to repeat the details. I will confirm the stock allocation with purchasing and prepare the pro forma invoice once we have your billing details and shipping arrangement. Please wait for my confirmation before treating the stock as reserved or making payment.`});q.salesReplied=true;
 record(state,'模拟业务员接手回复',customerById(d.customerId).owner+' · 销售',`${q.id} · 尚未实际锁货或收款`,'conversation');
}

export function deliveryCity(city){return {'迪拜':'Dubai','拉各斯':'Lagos','墨西哥城':'Mexico City','孟买':'Mumbai','沙迦':'Sharjah','圣保罗':'São Paulo'}[city]||city;}
function salesName(customerId){return {'林悦':'Lin Yue','陈晨':'Chen Chen','周可':'Zhou Ke'}[customerById(customerId).owner];}
// Regenerate only preset dialogue on read so older saved demo progress uses English too.
export function englishConversation(state,quote) {
 const copy=structuredClone(state),q=copy.quotes.find(x=>x.id===quote.id),d=copy.demands.find(x=>x.id===q.demandId);
 const scenarios=q.replyScenarios||[];const salesReplied=q.salesReplied;
 d.conversation.mode='ai';q.status='sent';q.dialogueReplay=true;q.unitPriceMinor=q.originalPriceMinor??q.unitPriceMinor;q.totalMinor=q.unitPriceMinor*q.quantity;q.discountUsedMinor=0;q.messages=initialQuoteMessages(d,q);q.replyScenarios=[];q.salesReplied=false;
 for(const scenario of scenarios)simulateCustomerReply(copy,q.id,scenario);
 if(salesReplied){d.conversation.mode='human';simulateSalesReply(copy,q.id);}
 if(quote.approvalDecision)q.messages.push({role:'sales',text:quote.approvalDecision==='approved'?`Our manager has approved USD ${(quote.unitPriceMinor/100).toFixed(2)} per unit for the full batch of ${quote.quantity} units, totaling USD ${(quote.totalMinor/100).toFixed(2)}, excluding freight and taxes. The original validity and stock confirmation requirements still apply.`:`Our manager has reviewed the request. We cannot approve a further reduction; the current USD ${(quote.unitPriceMinor/100).toFixed(2)} quotation remains available within its validity.`});
 return q.messages;
}

export function initialSalesReply(d,hasCandidates){
 const name=customerById(d.customerId).name.split(' ')[0],city=deliveryCity(d.delivery);
 if(d.fieldsConfirmed===false)return `Hi ${name}, I can check options for ${d.quantity} units of ${d.product}, 128GB, around USD ${d.target.toFixed(2)} for ${city}. Which regional version and colour do you need? Is your budget for the phones only, and when would you need them delivered? This will help me check the right stock before quoting.`;
 return hasCandidates
 ? `Hi ${name}, ${d.quantity} units of ${d.product} for ${city}, with a target around USD ${d.target.toFixed(2)} per unit — understood. We have matching supply options to check, and I will verify the available quantity and latest price before quoting. Is your target for the phones only, or including freight to ${city}? Also, are you using your own forwarder, and when do you need the goods? That will help us compare the right offer.`
 : `Hi ${name}, I have your requirement for ${d.quantity} units of ${d.product} at around USD ${d.target.toFixed(2)} for ${city}. We do not have a matching verified offer today. Is this exact model essential, or would you consider an alternative? Let me know your buying deadline too, so we can keep the search focused and check back when a suitable offer comes in.`;
}

export function confirmDemand(state,id){
 const d=state.demands.find(x=>x.id===id);if(!d)throw new Error('询单不存在');
 d.fieldsConfirmed=true;d.needsReconfirmation=false;if(d.stage==='collecting')d.stage='matched';d.requiredArrival='14 days, subject to logistics confirmation';d.freight='Customer forwarder';
 record(state,'客户需求已按 SOP 确认','预设客户回复',`${customerById(d.customerId).name} · 版本、容量、颜色、数量、目标市场、目标价和交付要求已确认`,'demand');
}
export function decideDiscount(state,id,approved,reason){
 const q=state.quotes.find(x=>x.id===id),d=state.demands.find(x=>x.id===q?.demandId);if(!q||q.handoffReason!=='discount')throw new Error('没有待审批的特殊报价');
 if(q.approvalDecision)throw new Error('审批已处理');if(!reason?.trim())throw new Error('请填写审批原因');
 if(approved){const offer=state.offers.find(o=>o.id===q.offerId);checkQuoteSend(q,offer,state.verifications[d.id],{mode:'ai',controlVersion:q.controlVersion},q.controlVersion,state.time);
 const proposed=q.unitPriceMinor-100;if(proposed<(q.floorPriceMinor??q.verificationSnapshot.costMinor+400))throw new Error('特殊报价仍不能低于内部底价');
 q.priceHistory??=[];q.priceHistory.push({unitPriceMinor:q.unitPriceMinor,totalMinor:q.totalMinor,time:state.time});q.unitPriceMinor=proposed;q.totalMinor=proposed*q.quantity;
 }
 q.approvalDecision=approved?'approved':'rejected';q.approvalReason=reason.trim();
 record(state,approved?'主管批准特殊报价':'主管拒绝特殊报价','赵经理 · 主管',`${q.id} · ${reason.trim()} · USD ${(q.unitPriceMinor/100).toFixed(2)} / 台`,'approval');
}
export function closeOutcome(state,id,won){
 const d=state.demands.find(x=>x.id===id);if(d?.conversation.mode!=='human')throw new Error('最终结果由人工接管后记录');if(d.outcome)throw new Error('结果已记录');
 const quote=[...state.quotes].reverse().find(x=>x.demandId===id);if(won&&quote?.handoffReason==='discount'&&!quote.approvalDecision)throw new Error('请先完成主管审批，再记录成交结果');
 d.outcome=won?'won':'lost';d.lossReason=won?null:'客户暂缓采购，保留历史需求';
 record(state,won?'模拟成交结果回写 CRM':'未成交原因回写历史需求池',customerById(d.customerId).owner+' · 销售',`${customerById(d.customerId).name} · ${d.product} / ${d.quantity} 台；仅记录模拟结果，未锁货或收款`,'outcome');
}
