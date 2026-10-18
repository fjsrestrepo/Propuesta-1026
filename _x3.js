const fs = require('fs');
const path = require('path');
const base = 'C:\\Users\\user\\Documents\\Desarrollo\\Okan 1026\\_unzip';

function loadSharedStrings() {
  const xml = fs.readFileSync(path.join(base, 'xl', 'sharedStrings.xml'), 'utf8');
  const arr = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml)) !== null) {
    const si = m[1];
    let text = '';
    const tRe = /<t(?: [^>]*)?>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(si)) !== null) text += tm[1];
    arr.push(text);
  }
  return arr;
}
function decodeXml(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
function colToNum(col) { let n=0; for (let i=0;i<col.length;i++) n=n*26+(col.charCodeAt(i)-64); return n; }
function parseSheet(file, shared) {
  const xml = fs.readFileSync(path.join(base, 'xl', 'worksheets', file), 'utf8');
  const cells = {};
  const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cRe.exec(xml)) !== null) {
    const attrs = m[1], inner = m[2] || '';
    const rM = /(?:^|\s)r="([A-Z]+[0-9]+)"/.exec(attrs);
    if (!rM) continue;
    const ref = rM[1];
    const tM = /(?:^|\s)t="([^"]+)"/.exec(attrs);
    const t = tM ? tM[1] : 'n';
    let value = null, formula = null;
    const fM = /<f(?: [^>]*)?>([\s\S]*?)<\/f>/.exec(inner);
    if (fM) formula = decodeXml(fM[1]);
    const vM = /<v>([\s\S]*?)<\/v>/.exec(inner);
    if (vM) value = vM[1];
    const isM = /<is>([\s\S]*?)<\/is>/.exec(inner);
    if (isM) { let txt=''; const tt=/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g; let ttm; while((ttm=tt.exec(isM[1]))!==null) txt+=ttm[1]; value=txt; }
    if (t === 's' && value !== null) value = shared[parseInt(value,10)];
    else if (value !== null) value = decodeXml(value);
    cells[ref] = { value, formula, t };
  }
  return cells;
}
const shared = loadSharedStrings();
const sheets = [['sheet2', 'Jhon']];
for (const [f, name] of sheets) {
  const cells = parseSheet(f + '.xml', shared);
  console.log('\n========== ' + name + ' (' + f + ') rows 1-41 ==========');
  for (let r = 1; r <= 41; r++) {
    const row = [];
    for (let c = 1; c <= 17; c++) {
      const col = String.fromCharCode(64 + c);
      const cell = cells[col + r];
      if (cell && cell.value !== null && cell.value !== '') {
        row.push(col + r + '=' + JSON.stringify(cell.value));
      }
    }
    if (row.length) console.log(row.join(' | '));
  }
}
