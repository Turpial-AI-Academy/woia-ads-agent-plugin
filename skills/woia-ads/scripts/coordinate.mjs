const paid = new Set(['ads.campaign.create','ads.campaign.update','ads.campaign.pause','ads.campaign.resume','ads.campaign.archive','ads.targeting.configure','ads.budget.set','ads.conversion.configure']);
const reads = new Set(['ads.signal.observe','ads.performance.read']);
export function coordinate(r,p,b) {
 const stop=reason=>({result:'BLOCKED',reason,effect_executed:false});
 if(!r||!p||!b)return stop('missing trusted context');
 const v=b.version?.match(/^(\d+)\.(\d+)\.(\d+)$/);
 if(b.name!=='woia-core'||b.qualified!==true||!v||Number(v[1])===0&&(Number(v[2])<5||Number(v[2])===5&&Number(v[3])<3)||!(/^[a-f0-9]{40}$/.test(b.commit??''))||!(/^[a-f0-9]{40}$/.test(b.tree??'')))return stop('qualified immutable Core >=0.5.3 required');
 if(r.department!=='ads'||p.accepted!==true||p.current!==true||p.revoked!==false||!p.authority_ref)return stop('competent Ads authority required');
 if(r.action==='ads.interaction.observe')return {result:'HANDOFF_REQUIRED',owner:'customer-service',provider:'woia-communications',effect_executed:false};
 if(reads.has(r.action))return {result:r.measurement_complete===true?'READ_ONLY':'UNKNOWN',effect_executed:false};
 if(!paid.has(r.action))return stop('action outside Ads paid scope');
 if(['account','resource','destination','currency','source_version','idempotency_key','organization','actor','purpose','payload_digest'].some(k=>typeof r[k]!=='string'||!r[k]))return stop('exact effect identity required');
 if(!Array.isArray(p.actions)||!p.actions.includes(r.action)||['account','resource','destination','currency','organization','actor','purpose','source_version','payload_digest'].some(k=>p[k]!==r[k]))return stop('exact authority scope mismatch');
 if(r.source_current!==true||r.asset_accepted!==true||r.provider_qualified!==true)return stop('current accepted source/assets and qualified provider required');
 if(r.previous_result==='UNKNOWN')return {result:'RECONCILE_REQUIRED',provider:'woia-ads-platforms',idempotency_key:r.idempotency_key,effect_executed:false};
 if(r.previous_result!=='NONE'&&r.previous_result!=='RECONCILED_NO_EFFECT')return stop('retain existing effect; no duplicate dispatch');
 if(!Number.isSafeInteger(r.amount_minor)||r.amount_minor<0||!Number.isSafeInteger(p.remaining_minor)||p.remaining_minor<r.amount_minor)return stop('exact bounded spend required');
 return {result:'DISPATCH_PROPOSAL',provider:'woia-ads-platforms',action:r.action,idempotency_key:r.idempotency_key,effect_executed:false};
}
