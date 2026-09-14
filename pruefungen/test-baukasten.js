/* Der Baukasten "Uebung anpassen": Ist der Knopf da, oeffnet sich die
   Tafel, und stimmt die Zahl der abwaehlbaren Teile? */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS } = require('./harness');

const dir = path.join(BASIS, 'uebungen/schraubverbindungen');
const SCHLUSS = '<' + '/script>';

/* Hier werden auch qr.js und baukasten.js gebraucht - anders als bei den
   übrigen Tests also alle assets einsetzen. */
function mitAllen(html) {
  return html.replace(
    /<script src="(?:\.\.\/)+(assets\/[a-z-]+\.js)"[^>]*>[\s\S]*?<\/script>/g,
    (_, datei) => {
      const quelle = fs.readFileSync(BASIS + '/' + datei, 'utf8')
        .split(SCHLUSS).join('<\\' + '/script>');
      return '<script>' + quelle + SCHLUSS;
    });
}

function seite(datei, suche) {
  const fehler = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => fehler.push('Laufzeit: ' + (e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAllen(fs.readFileSync(path.join(dir, datei), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/' + datei + (suche || ''),
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  return { dom, d: dom.window.document, fehler };
}

/* Der Baukasten baut sich erst bei DOMContentLoaded auf - darauf muss der Test
   warten, sonst prueft er eine leere Seite. */
function fertig(dom) {
  return new Promise(function (los) {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', function () { los(); });
    setTimeout(los, 2000);
  });
}

async function main() {
let fehlerGesamt = 0;

for (const datei of fs.readdirSync(dir).filter(f => /^\d/.test(f)).sort()) {
  const { dom, d, fehler } = seite(datei);
  await fertig(dom);
  const p = (was, ok) => { if (!ok) fehler.push(was); };

  const knopf = d.getElementById('bk-knopf');
  const tafel = d.getElementById('bk-tafel');
  p('kein Baukasten-Knopf', !!knopf);
  if (!knopf) { console.log('FEHLER ' + datei + '\n  ' + fehler.join('\n  ')); fehlerGesamt++; continue; }

  p('Tafel nicht verborgen', tafel.hidden);
  knopf.click();
  p('Tafel öffnet nicht', !tafel.hidden);

  const teile = [...tafel.querySelectorAll('.bk-teil')];
  const h2 = [...d.querySelectorAll('main h2')];
  p('Teile-Zahl stimmt nicht (' + teile.length + ' gegen ' + h2.length + ' Überschriften)',
    teile.length === h2.length);

  const kaestchen = [...tafel.querySelectorAll('.bk-liste input')];
  p('alle Häkchen müssten gesetzt sein', kaestchen.every(k => k.checked));

  // Kennungen müssen eindeutig sein - sonst zeigt ein Link auf zwei Dinge.
  const ids = kaestchen.map(k => k.dataset.id);
  p('Kennungen nicht eindeutig', new Set(ids).size === ids.length);

  // Ein Teil abwählen: Überschrift und Inhalt verschwinden, Link wächst.
  const erstesTeil = teile[0];
  const teilId = erstesTeil.querySelector('input').dataset.id;
  const ueberschrift = h2[0];
  p('Überschrift vorher schon verborgen', !ueberschrift.hidden);
  erstesTeil.querySelector('input').click();
  p('Überschrift bleibt sichtbar', ueberschrift.hidden);
  p('Link ohne Kennung', d.getElementById('bk-link').value.includes('ohne=' + teilId));
  p('kein QR-Code', !!d.querySelector('#bk-qr svg'));
  p('QR-Code ohne Module', (d.querySelector('#bk-qr path') || {}).getAttribute
    && d.querySelector('#bk-qr path').getAttribute('d').length > 100);

  // Unterpunkte eines abgewählten Teils sind gesperrt. Wichtig: ":scope >",
  // denn die ganze Liste ist selbst ein ul - sonst trifft der Selektor auch
  // das Kästchen des Teils.
  const unter = [...erstesTeil.querySelectorAll(':scope > ul input')];
  p('Unterpunkte nicht gesperrt', unter.every(u => u.disabled));

  // Wieder einschalten
  erstesTeil.querySelector('input').click();
  p('Überschrift kommt nicht zurück', !ueberschrift.hidden);
  p('Link behält Kennung', !d.getElementById('bk-link').value.includes('ohne='));

  // Nummerierung: nach dem Abwählen von Teil 1 muss Teil 2 die 1 tragen.
  const badges = () => h2.map(h => (h.querySelector('.nr') || {}).textContent);
  erstesTeil.querySelector('input').click();
  const nach = badges().filter((_, i) => !h2[i].hidden);
  p('Nummerierung nicht lückenlos (' + nach.join(',') + ')',
    nach.every((n, i) => n === String(i + 1)));
  erstesTeil.querySelector('input').click();

  console.log((fehler.length ? 'FEHLER ' : 'ok     ') + datei +
    (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
  fehlerGesamt += fehler.length;
}

/* Ein geteilter Link muss die Teile beim Laden weglassen. */
{
  const datei = '05-querkraft-durch-reibung.html';
  const roh = seite(datei);
  await fertig(roh.dom);
  const ids = [...roh.d.querySelectorAll('.bk-teil > label > input')].map(k => k.dataset.id);
  const zwei = ids.slice(0, 2).join('.');
  const geteilt = seite(datei, '?ohne=' + zwei);
  await fertig(geteilt.dom);
  const d = geteilt.d, fehler = geteilt.fehler;
  const p = (was, ok) => { if (!ok) fehler.push(was); };
  const h2 = [...d.querySelectorAll('main h2')];
  p('Teil 1 nicht ausgeblendet', h2[0].hidden);
  p('Teil 2 nicht ausgeblendet', h2[1].hidden);
  p('Teil 3 fälschlich ausgeblendet', !h2[2].hidden);
  p('Knopf ohne Zählung',
    d.getElementById('bk-knopf').textContent.includes('2 weniger'));
  const sichtbar = h2.filter(h => !h.hidden);
  p('Nummerierung startet nicht bei 1',
    sichtbar[0].querySelector('.nr').textContent === '1');
  console.log((fehler.length ? 'FEHLER ' : 'ok     ') + 'geteilter Link ?ohne=' + zwei +
    (fehler.length ? '\n         ' + fehler.join('\n         ') : ''));
  fehlerGesamt += fehler.length;
}

console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nBaukasten läuft überall.');
process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
