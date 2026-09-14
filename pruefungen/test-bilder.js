/* Uebung 1 "Eine Bezeichnung lesen": Zeigen die drei Teile ihre
   Zeichnungen, und reagieren sie auf die Auswahl? */
const fs = require('fs');
const { BASIS, mitAssets } = require('./harness');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL } = require('./orte');
const P = MATERIAL + '/uebungen/schraubverbindungen/01-bezeichnung-lesen.html';

const fehler = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => fehler.push('Laufzeit: ' + (e.detail || e).toString().split('\n')[0]));

const dom = new JSDOM(mitAssets(fs.readFileSync(P, 'utf8')), {
  runScripts: 'dangerously', virtualConsole: vc,
  url: 'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/01-bezeichnung-lesen.html',
});
dom.window.Element.prototype.scrollIntoView = function () {};
const d = dom.window.document;
const p = (was, ok) => { if (!ok) fehler.push(was); };

// Alle sechs Bilder vorhanden und nicht leer
for (const id of ['bildBausteine','bildLaenge','bildNormen','bildMasse','bildVerbindung','bildLoesung']) {
  const f = d.getElementById(id);
  const svg = f && f.querySelector('svg');
  p(id + ' fehlt', !!svg);
  if (!svg) continue;
  p(id + ': keine Zeichenelemente', svg.querySelectorAll('line,rect,polygon,path,text').length > 8);
  p(id + ': kein aria-label', (svg.getAttribute('aria-label') || '').length > 20);
  p(id + ': keine Bildunterschrift', !!f.querySelector('figcaption'));
  // Nichts darf aus dem viewBox-Rahmen fallen
  const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
  for (const e of svg.querySelectorAll('line,rect,text')) {
    const w = [...['x','y','x1','y1','x2','y2'].map(a => [a, e.getAttribute(a)])].filter(([, v]) => v !== null);
    for (const [a, v] of w) {
      const n = Number(v);
      const grenze = a[0] === 'x' ? vw : vh;
      if (n < -2 || n > grenze + 2) fehler.push(id + ': ' + e.tagName + ' ' + a + '=' + n + ' außerhalb 0..' + grenze);
    }
  }
}

// Hervorhebung in Teil 1
const svgB = d.getElementById('bildBausteine').querySelector('svg');
p('Teil 1: zu wenige Teilgruppen', svgB.querySelectorAll('.teil').length === 5);
for (const t of ['form','norm','gew','laenge','klasse'])
  p('Teil 1: Gruppe ' + t + ' fehlt', !!svgB.querySelector('.teil[data-t="' + t + '"]'));
d.querySelector('#bez button[data-t="gew"]').click();
p('Teil 1: Hervorhebung nicht aktiv', svgB.classList.contains('hat-auswahl'));
p('Teil 1: falsche Gruppe aktiv',
  svgB.querySelector('.teil.aktiv') === svgB.querySelector('.teil[data-t="gew"]'));

// Teil 3 zeichnet neu und markiert das Urteil
const rot = () => [...d.getElementById('bildVerbindung').querySelectorAll('g[style]')]
  .some(g => g.getAttribute('style').includes('--bad'));
p('60 mm: kein roter Fehlbetrag', rot());
p('60 mm: Fehlbetrag nicht beziffert',
  d.getElementById('bildVerbindung').textContent.includes('fehlt'));
d.getElementById('lWahl').value = '65';
d.getElementById('lWahl').dispatchEvent(new dom.window.Event('change'));
p('65 mm: immer noch rot', !rot());
p('65 mm: kein Haken', d.getElementById('bildVerbindung').textContent.includes('\u2713'));

// Maßtexte, die stimmen müssen
const tB = svgB.textContent;
// Ueber Ecke gezeichnet ist der Umriss das Eckenmass; SW wird in der
// Sechskant-Ansicht von 'Die Masse' bemasst, wo sie messbar ist.
for (const m of ['e = 20,8', 'k = 7,5', 'b = 30', 'd = 12', 'l = 60', '8.8'])
  p('Teil 1: Maß "' + m + '" fehlt (' + tB + ')', tB.includes(m));

p('Die Masse: SW fehlt an der Sechskant-Ansicht',
  d.getElementById('bildMasse').textContent.includes('SW 18'));

const tL = d.getElementById('bildLoesung').textContent;
p('Lösung: 60er Fall fehlt', tL.includes('M12 \u00d7 60'));
p('Lösung: 65er Fall fehlt', tL.includes('M12 \u00d7 65'));
p('Lösung: Fehlbetrag 1,8 mm erwartet', tL.includes('fehlt 1,8 mm'));

console.log(fehler.length ? 'FEHLER:\n  ' + fehler.join('\n  ') : 'Alle Zeichnungen in Ordnung.');
process.exitCode = fehler.length ? 1 : 0;
