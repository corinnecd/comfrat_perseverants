import assert from 'node:assert/strict';
const origin=process.env.ORIGIN||'http://127.0.0.1:5188';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('Local isolated database only.');
async function request(path,body,cookie){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const stamp=Date.now();
const person={first:'Anniversaire',last:'Test'+stamp,email:`birthday${stamp}@example.invalid`,phone:'0600000000',city:'Paris',department:'75',status:'Membre'};
assert.equal((await request('/api/checkin',{...person,birthday_day:'31',birthday_month:'4'})).status,400);
assert.equal((await request('/api/checkin',{...person,birthday_day:'12'})).status,400);
assert.equal((await request('/api/checkin',{...person,age_range:'invalide'})).status,400);
const registered=await request('/api/checkin',{...person,birthday_day:'29',birthday_month:'2',age_range:'26 à 40 ans'});
assert.equal(registered.status,200,JSON.stringify(registered.data));
const legacy=await request('/api/checkin',{...person,last:'SansInfos'+stamp});assert.equal(legacy.status,200,'Old registration payloads remain compatible');
assert.equal((await request('/api/manage')).status,401,'Personal details remain protected');
const team=await request('/api/manage-access',{action:'unlock',code:'LocalTeamNew2026'});assert.equal(team.status,200);
const records=await request('/api/manage',null,team.cookie);assert.equal(records.status,200);
const p=records.data.people.find(p=>p.token===registered.data.token);assert.ok(p);assert.equal(p.birthday_day,29);assert.equal(p.birthday_month,2);assert.equal(p.age_range,'26 à 40 ans');
assert.equal(records.data.people.find(p=>p.token===legacy.data.token).birthday_day,null);
console.log('PASS: birthday and age persist in protected permanent profiles; invalid dates rejected; existing registrations compatible.');
