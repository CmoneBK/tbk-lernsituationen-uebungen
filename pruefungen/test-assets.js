/* Die Bausteine in assets/: Loesen ihre Verweise ueberall auf, und
   zeigen Ruecklink und Werkzeug-Link auf etwas, das es gibt? */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
const BASIS = MATERIAL;
const backNav = fs.readFileSync(BASIS + '/assets/back-nav.js', 'utf8');
const wzLink  = fs.readFileSync(BASIS + '/assets/werkzeug-link.js', 'utf8');

/* document.currentScript ist bei eval nicht gesetzt - genau dafür haben beide
   Bausteine den Rückfall über den Dateinamen. Der wird hier mitgeprüft. */
function seite({ url, tiefe, imPaket = false, attr = '' }) {
  const p = '../'.repeat(tiefe);
  const dom = new JSDOM(
    `<body><a class="werkzeug" data-werkzeug="tool.html"${attr}>x</a>
     <script src="${p}assets/back-nav.js"${imPaket ? ' data-ziel="./"' : ''}></script>
     <script src="${p}assets/werkzeug-link.js"></script></body>`,
    { url, runScripts: 'outside-only' });
  dom.window.eval(backNav);
  dom.window.eval(wzLink);
  // Der Link-Baustein wartet auf DOMContentLoaded; im Test direkt auslösen.
  dom.window.tbkWerkzeugLinks();
  return dom.window.document;
}

const faelle = [
  { name: 't-bk.de, Übung im Paket', imPaket: true, tiefe: 2,
    url:  'https://t-bk.de/unterrichtsmaterial/uebungen/paket/x.html',
    back: 'https://t-bk.de/unterrichtsmaterial/uebungen/paket/',
    wz:   'https://t-bk.de/werkzeuge/tools/tool.html' },
  { name: 't-bk.de, Lernsituation ohne Paket', tiefe: 1,
    url:  'https://t-bk.de/unterrichtsmaterial/lernsituationen/x.html',
    back: 'https://t-bk.de/unterrichtsmaterial/',
    wz:   'https://t-bk.de/werkzeuge/tools/tool.html' },
  { name: 'GitHub Pages, Übung im Paket', imPaket: true, tiefe: 2,
    url:  'https://cmonebk.github.io/tbk-lernsituationen-uebungen/uebungen/paket/x.html',
    back: 'https://cmonebk.github.io/tbk-lernsituationen-uebungen/uebungen/paket/',
    wz:   'https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/tools/tool.html' },
  { name: 'GitHub Pages, Lernsituation tief verschachtelt', tiefe: 3,
    url:  'https://cmonebk.github.io/tbk-lernsituationen-uebungen/lernsituationen/ls/teil/x.html',
    back: 'https://cmonebk.github.io/tbk-lernsituationen-uebungen/',
    wz:   'https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/tools/tool.html' },
];

let fehler = 0;
for (const f of faelle) {
  const d = seite(f);
  const back = d.getElementById('tbk-back').href;
  const wz = d.querySelector('a.werkzeug').href;
  const meld = [];
  if (back !== f.back) meld.push('Rücklink: ' + back + '\n         erwartet: ' + f.back);
  if (wz !== f.wz)     meld.push('Werkzeug: ' + wz + '\n         erwartet: ' + f.wz);
  console.log((meld.length ? 'FEHLER ' : 'ok     ') + f.name +
    (meld.length ? '\n         ' + meld.join('\n         ') : ''));
  fehler += meld.length;
}

const d = seite({ url: 'https://t-bk.de/unterrichtsmaterial/uebungen/p/x.html',
                  tiefe: 2, imPaket: true, attr: ' data-fach="1" data-sym="1"' });
const l = d.querySelector('a.werkzeug');
const okP = l.href.includes('fach=1') && l.href.includes('sym=1') &&
            l.target === '_blank' && l.rel === 'noopener';
console.log((okP ? 'ok     ' : 'FEHLER ') + 'Parameter fach/sym, target und rel');
if (!okP) { console.log('         ' + l.href + ' | target=' + l.target + ' rel=' + l.rel); fehler++; }

console.log(fehler ? '\n' + fehler + ' Fehler.' : '\nAlle Bausteine lösen richtig auf.');
process.exitCode = fehler ? 1 : 0;
