const fs=require('fs');
const d=require('./founder_data.json'); const s=require('./stocks_data.json');
const html=fs.readFileSync('founder.html','utf8');
const m=[...html.matchAll(/data-ticker="([^"]+)"/g)].map(x=>x[1]);
const uniq=[...new Set(m)];
console.log('chips:', uniq.length);
for(const t of uniq){ console.log(t, 'founder:', !!d[t], 'stocks:', !!s[t]); }