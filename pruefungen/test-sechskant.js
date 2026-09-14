/* Der Bereich Zeichnung der Lektion Schraubverbindungen:
   die Sechskant-Andeutung an Kopf und Mutter und die Schraube allein. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo')) return;
const DATEI = 'maschinenelemente-schrauben-schraubverbindungen.html';

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

function laden() {
  let h = fs.readFileSync(path.join(TOOLS, DATEI), 'utf8');
  h = h.replace(/<script src="assets\/thema\.js"><\/script>/, '');
  h = h.replace(/<script src="assets\/([a-z-]+)\.js"([^>]*)><\/script>/g, (ganz, n) => {
    const pfad = path.join(TOOLS, 'assets', n + '.js');
    if (!fs.existsSync(pfad)) return ganz;
    return '<script>' + fs.readFileSync(pfad, 'utf8').split('<' + '/script>').join('<\\/script>')
      + '</script>';
  });
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(h, {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    url: 'https://t-bk.de/werkzeuge/tools/' + DATEI,
  });
  return { dom, d: dom.window.document, w: dom.window, laut };
}

/* Ein Bogen der Fase ist ein Pfad mit quadratischer Bezierkurve - daran
   lassen sie sich zaehlen, ohne den Pfad nachzurechnen. */
const boegen = (svg) => [...svg.querySelectorAll('path')]
  .filter((e) => /Q/.test(e.getAttribute('d') || '')).length;

/* Alles muss im viewBox-Rahmen bleiben. */
function imRahmen(svg, name) {
  const teile = svg.getAttribute('viewBox').split(' ').map(Number);
  const vw = teile[2], vh = teile[3];
  let raus = [];
  for (const e of svg.querySelectorAll('line,rect,text,circle')) {
    [['x', vw], ['y', vh], ['x1', vw], ['y1', vh], ['x2', vw], ['y2', vh],
     ['cx', vw], ['cy', vh]].forEach(([a, grenze]) => {
      const v = e.getAttribute(a);
      if (v === null) return;
      const n = Number(v);
      if (n < -2 || n > grenze + 2) raus.push(e.tagName + ' ' + a + '=' + Math.round(n));
    });
  }
  p(name + ': alles im Rahmen', !raus.length, raus.slice(0, 4).join(', '));
}

/* Die Seite baut ihre Auswahlfelder erst beim Laden auf - vorher hat
   zGewinde keinen Wert, und jede Zeichnung liefe ins Leere. */
function fertig(dom) {
  return new Promise((los) => {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', () => los());
    setTimeout(los, 2500);
  });
}

async function main() {
const { dom, d, w, laut } = laden();
await fertig(dom);
console.log('\nZeichnung – Sechskant und Einzelteil');
p('lädt ohne Fehler', !laut.length, laut.join(' | '));

w.reiterSetzen('zeichnung');

/* ---------- Die Verbindung ---------- */
{
  const svg = d.getElementById('svgVerbindung');
  p('Verbindung gezeichnet', !!svg && svg.querySelectorAll('path,rect,line').length > 20);
  /* Kopf und Mutter: je drei Boegen. */
  p('Kopf und Mutter je drei Bögen', boegen(svg) === 6, boegen(svg) + ' Bögen');
  const text = svg.textContent;
  p('Eckenmaß bemaßt', /e\s*≈/.test(text), text);
  p('Schlüsselweite nicht mehr am Umriss', !/SW\s*=/.test(text) && !/\bs\s*=/.test(text), text);
  imRahmen(svg, 'Verbindung');

  /* Der Umriss des Kopfes ist e, nicht s. */
  const m = w.gewindeMasse(d.getElementById('zGewinde').value);
  p('eckenmass rechnet richtig',
    Math.abs(w.eckenmass(m.s) - m.s * 2 / Math.sqrt(3)) < 1e-9);

  /* Regel 10 steht in der Tabelle - bei beiden Arten. */
  ['durchsteck', 'einschraub'].forEach((art) => {
    const wahl = d.getElementById('zArt');
    wahl.value = art;
    wahl.dispatchEvent(new w.Event('change', { bubbles: true }));
    const t = d.getElementById('tabRegeln').textContent;
    p(art + ': Regel zum Sechskant steht da', /Eckenma/.test(t));
    p(art + ': Bögen auch hier',
      boegen(d.getElementById('svgVerbindung')) === (art === 'einschraub' ? 3 : 6),
      boegen(d.getElementById('svgVerbindung')) + ' Bögen');
  });
  d.getElementById('zArt').value = 'durchsteck';
  d.getElementById('zArt').dispatchEvent(new w.Event('change', { bubbles: true }));
}

/* ---------- Die Schraube allein ---------- */
{
  const svg = d.getElementById('svgSchraubeNorm');
  p('Einzelteilzeichnung da', !!svg);
  p('hat eine Beschreibung', (svg.getAttribute('aria-label') || '').length > 30);
  p('hat Inhalt', svg.querySelectorAll('path,rect,line,circle').length > 15,
    svg.querySelectorAll('path,rect,line,circle').length + ' Teile');
  p('Kopf mit drei Bögen', boegen(svg) >= 3, boegen(svg) + ' Bögen');

  /* Die Stirnansicht: Sechseck, voller Kreis, Dreiviertelbogen.
     Der Umriss des Kopfes hat ebenfalls sechs Punkte - gesucht ist der, der
     rechts in der zweiten Ansicht liegt. */
  const sechsPunkte = [...svg.querySelectorAll('path')]
    .filter((e) => ((e.getAttribute('d') || '').match(/L/g) || []).length === 5
      && /Z$/.test(e.getAttribute('d') || ''));
  const xWerte = (e) => (e.getAttribute('d').match(/-?\d+(?:\.\d+)?(?=,)/g) || [])
    .map(Number);
  const sechseck = sechsPunkte.filter((e) => Math.min.apply(null, xWerte(e)) > 500);
  p('Sechseck in der zweiten Ansicht', sechseck.length === 1,
    sechsPunkte.length + ' Pfade mit sechs Punkten, davon rechts: ' + sechseck.length);
  /* hinweis() setzt kleine Punkte an die Linienanfaenge - die zaehlen nicht. */
  const kreise = [...svg.querySelectorAll('circle')]
    .filter((e) => Number(e.getAttribute('r')) > 5);
  p('genau ein Vollkreis für d', kreise.length === 1, kreise.length + ' Kreise');
  const bogen = [...svg.querySelectorAll('path')]
    .filter((e) => /A/.test(e.getAttribute('d') || ''));
  p('Kerndurchmesser als Bogen, nicht als Kreis', bogen.length === 1);
  if (bogen.length) {
    p('Bogen ist der Dreiviertelkreis (großer Bogen)',
      / 0 1 1 /.test(bogen[0].getAttribute('d')), bogen[0].getAttribute('d'));
    p('Bogen ist schmal', Number(bogen[0].getAttribute('stroke-width')) < 1.5);
  }
  p('Vollkreis ist breit', Number(kreise[0].getAttribute('stroke-width')) >= 2);

  const text = svg.textContent;
  ['SW', 'e ≈', 'd =', 'l =', 'b =', 'k ='].forEach((m) => {
    p('Maß steht da: ' + m, text.indexOf(m) >= 0, text);
  });
  p('Benennung der drei Bögen', /drei Bögen/.test(text));
  p('offenes Viertel benannt', /offenes Viertel/.test(text));
  imRahmen(svg, 'Einzelteil');

  const hinweis = d.getElementById('znHinweis').textContent;
  p('Hinweis nennt beide Maße', /Eckenma/.test(hinweis) && /Schlüsselweite/.test(hinweis));
  p('Hinweis sagt, dass l ohne Kopf gilt', /ohne Kopf/.test(hinweis));
}

/* ---------- Beide Zeichnungen ziehen mit ---------- */
{
  const g = d.getElementById('zGewinde');
  const vorher = d.getElementById('svgSchraubeNorm').textContent;
  const andere = [...g.options].map((o) => o.value).filter((v) => v !== g.value)[0];
  g.value = andere;
  g.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Einzelteil zeichnet neu',
    d.getElementById('svgSchraubeNorm').textContent !== vorher);
  p('Verbindung zeichnet mit',
    d.getElementById('svgVerbindung').querySelectorAll('path').length > 4);
  imRahmen(d.getElementById('svgSchraubeNorm'), 'Einzelteil nach Wechsel');
}

/* ---------- Jede Gewindegroesse ---------- */
{
  const g = d.getElementById('zGewinde');
  const groessen = [...g.options].map((o) => o.value);
  let schief = [];
  groessen.forEach((gr) => {
    g.value = gr;
    g.dispatchEvent(new w.Event('change', { bubbles: true }));
    [['svgVerbindung', 6], ['svgSchraubeNorm', 3]].forEach(([id, mind]) => {
      const svg = d.getElementById(id);
      if (boegen(svg) < mind) schief.push(gr + ': ' + id + ' hat nur ' + boegen(svg) + ' Bögen');
      const teile = svg.getAttribute('viewBox').split(' ').map(Number);
      for (const e of svg.querySelectorAll('line,rect,text,circle')) {
        [['x', teile[2]], ['y', teile[3]], ['x1', teile[2]], ['y1', teile[3]],
         ['x2', teile[2]], ['y2', teile[3]], ['cx', teile[2]], ['cy', teile[3]]]
          .forEach(([a, grenze]) => {
            const v = e.getAttribute(a);
            if (v === null) return;
            const n = Number(v);
            if (n < -2 || n > grenze + 2) {
              schief.push(gr + ': ' + id + ' ' + e.tagName + ' ' + a + '=' + Math.round(n));
            }
          });
      }
    });
  });
  p('alle ' + groessen.length + ' Größen bleiben im Rahmen', !schief.length,
    schief.slice(0, 5).join(' | '));
}

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exitCode = fehler ? 1 : 0;
}

main();

