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
    // gather all <t> (including rich text runs <r><t>)
    let text = '';
    const tRe = /<t(?: [^>]*)?>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(si)) !== null) {
      text += tm[1];
    }
    arr.push(text);
  }
  return arr;
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
  return n;
}

function parseSheet(file, shared) {
  const xml = fs.readFileSync(path.join(base, 'xl', 'worksheets', file), 'utf8');
  const cells = {};
  // match <c ...> ... </c> or self-closing <c .../>
  const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cRe.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2] || '';
    const rM = /(?:^|\s)r="([A-Z]+[0-9]+)"/.exec(attrs);
    if (!rM) continue;
    const ref = rM[1];
    const tM = /(?:^|\s)t="([^"]+)"/.exec(attrs);
    const t = tM ? tM[1] : 'n';
    let value = null;
    let formula = null;
    const fM = /<f(?: [^>]*)?>([\s\S]*?)<\/f>/.exec(inner);
    if (fM) formula = decodeXml(fM[1]);
    const vM = /<v>([\s\S]*?)<\/v>/.exec(inner);
    if (vM) value = vM[1];
    // inline string
    const isM = /<is>([\s\S]*?)<\/is>/.exec(inner);
    if (isM) {
      let txt = '';
      const tt = /<t(?: [^>]*)?>([\s\S]*?)<\/t>/g;
      let ttm;
      while ((ttm = tt.exec(isM[1])) !== null) txt += ttm[1];
      value = txt;
      // value stays decoded later
    }
    if (t === 's' && value !== null) {
      value = shared[parseInt(value, 10)];
    } else if (value !== null) {
      value = decodeXml(value);
    }
    cells[ref] = { value, formula, t };
  }
  return cells;
}

function refToRC(ref) {
  const m = /^([A-Z]+)([0-9]+)$/.exec(ref);
  return { c: colToNum(m[1]), r: parseInt(m[2], 10) };
}

function render(sheetName, file, shared) {
  const cells = parseSheet(file, shared);
  const maxR = 50, maxC = 17;
  console.log('\n==================== SHEET: ' + sheetName + ' ====================');
  for (let r = 1; r <= maxR; r++) {
    const row = [];
    let has = false;
    for (let c = 1; c <= maxC; c++) {
      const col = String.fromCharCode(64 + c);
      const key = col + r;
      const cell = cells[key];
      if (cell && (cell.value !== null && cell.value !== '')) {
        has = true;
        row.push(col + r + '=' + JSON.stringify(cell.value));
      }
    }
    if (has) console.log(row.join(' | '));
  }
}

const shared = loadSharedStrings();
const out = [];
const origLog = console.log;
console.log = (...a) => out.push(a.join(' '));
render('Miguel La M', 'sheet1.xml', shared);
render('Jhon Jimenez', 'sheet2.xml', shared);
render('Artistas Okan', 'sheet3.xml', shared);
render('X3', 'sheet4.xml', shared);
fs.writeFileSync(path.join(base, '..', '_dump.txt'), out.join('\n'), 'utf8');
origLog('written');
