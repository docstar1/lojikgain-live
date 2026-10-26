const fs=require('fs');
const d=require('./founder_data.json');
for(const k of Object.keys(d)){
  if(!Array.isArray(d[k].points)) continue;
  for(const p of d[k].points){
    if(p.value_display===undefined) p.value_display = (p.value===undefined||p.value===null?'—':String(p.value));
    if(p.explanation===undefined) p.explanation = (p.note || p.verdict || p.question || '').toString().slice(0,500);
    // ensure score 0/1 numeric
    if(typeof p.score !== 'number') p.score = (p.score==='1'||p.score===1)?1:0;
  }
}
fs.writeFileSync('founder_data.json', JSON.stringify(d, null, 0));
console.log('done');
"