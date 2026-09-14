/* Bestandsaufnahme aller Zeichnungen in beiden Repos.
 *
 * Geprueft wird, was sich maschinell pruefen laesst:
 *   - Linienbreiten: technische Zeichnungen kennen genau zwei (breit/schmal),
 *     Verhaeltnis 2:1. Alles dazwischen ist ein Versehen.
 *   - Pfeilspitzen an Masslinien: gefuelltes Dreieck, nicht zwei Striche.
 *   - Schraffurmuster: Winkel und ob benachbarte Teile verschiedene nutzen.
 *   - Mittellinien: Strichpunkt.
 *   - Alles innerhalb des viewBox-Rahmens.
 *   - Jedes Bild hat eine Beschreibung (aria-label).
 *
 * Ausgabe ist eine Liste, kein Urteil - die Einordnung mache ich danach.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, TOOLS, teilweise } = require('./orte');
const MAT = MATERIAL;

const SCHLUSS = '<' + '/script>';

function einsetzen(html, wurzel, praefix) {
  return html.replace(
    new RegExp('<script src="' + praefix + '(assets/[a-z-]+\\.js)"[^>]*></script>', 'g'),
    (ganz, datei) => {
      if (/thema\.js/.test(datei)) return '';
      const p = path.join(wurzel, datei);
      if (!fs.existsSync(p)) return ganz;
      return '<script>' + fs.readFileSync(p, 'utf8').split(SCHLUSS).join('<\\' + '/script>')
        + SCHLUSS;
    });
}

function laden(datei, wurzel, praefix, url) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(einsetzen(fs.readFileSync(datei, 'utf8'), wurzel, praefix), {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url,
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
  });
  return { dom, d: dom.window.document, w: dom.window, laut };
}

const warte = (ms) => new Promise((l) => setTimeout(l, ms));

/* Koordinaten aus einem Pfad ziehen. Wichtig: Bei A (Kreisbogen) stehen
   fuenf Werte vor den Koordinaten, die keine sind - wer stumpf paarweise
   liest, erfindet Punkte. */
const PARAM = { M:2, L:2, T:2, C:6, S:4, Q:4, A:7, H:1, V:1, Z:0 };
function pfadPunkte(d) {
  const teile = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  const punkte = [];
  let i = 0, befehl = 'M';
  while (i < teile.length) {
    if (/^[a-z]$/i.test(teile[i])) { befehl = teile[i].toUpperCase(); i++; continue; }
    const n = PARAM[befehl];
    if (n === undefined) { i++; continue; }
    const werte = teile.slice(i, i + n).map(Number);
    i += n || 1;
    if (befehl === 'H' || befehl === 'V' || befehl === 'Z') continue;
    /* Der Kreisbogen: nur die letzten beiden Werte sind ein Punkt. */
    if (befehl === 'A') { punkte.push([werte[5], werte[6]]); continue; }
    for (let j = 0; j + 1 < werte.length; j += 2) punkte.push([werte[j], werte[j + 1]]);
  }
  return punkte;
}

/* Verschiebungen der Elterngruppen mitrechnen - sonst sieht jedes Element in
   einer translate()-Gruppe aus, als stuende es woanders. */
function versatz(e) {
  let dx = 0, dy = 0, k = e;
  while (k && k.tagName !== 'svg') {
    const tr = k.getAttribute && k.getAttribute('transform');
    if (tr) {
      const m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)?/.exec(tr);
      if (m) { dx += Number(m[1]); dy += Number(m[2] || 0); }
      if (/rotate|scale|matrix/.test(tr)) return null;   /* nicht auswertbar */
    }
    k = k.parentNode;
  }
  return [dx, dy];
}

function pruefeSvg(svg, name, befunde) {
  const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
  const vw = vb[2], vh = vb[3];

  if (!(svg.getAttribute('aria-label') || '').trim()) {
    befunde.push([name, 'ohne aria-label']);
  }

  /* Linienbreiten sammeln - ohne Marker-Inhalte und Muster. */
  const breiten = new Map();
  svg.querySelectorAll('line,rect,path,circle,polygon,polyline,ellipse').forEach((e) => {
    if (e.closest('marker') || e.closest('pattern') || e.closest('.erklaer')) return;
    const st = e.getAttribute('stroke');
    if (!st || st === 'none') return;
    const w = Number(e.getAttribute('stroke-width') || 1);
    breiten.set(w, (breiten.get(w) || 0) + 1);
  });
  const liste = [...breiten.keys()].sort((a, b) => a - b);
  if (liste.length > 2) {
    befunde.push([name, 'mehr als zwei Linienbreiten: '
      + liste.map((w) => w + ' (' + breiten.get(w) + 'x)').join(', ')]);
  } else if (liste.length === 2) {
    const v = liste[1] / liste[0];
    if (Math.abs(v - 2) > 0.35) {
      befunde.push([name, 'Verhaeltnis breit:schmal = ' + v.toFixed(2) + ':1 statt 2:1 ('
        + liste.join(' / ') + ')']);
    }
  }

  /* Offene Pfeilspitzen: zwei kurze Linien im spitzen Winkel gibt es nicht
     mehr; gepruefte Kennzeichen sind Marker oder gefuellte Dreiecke. */
  const marker = svg.querySelectorAll('marker').length;
  const dreiecke = [...svg.querySelectorAll('polygon')]
    .filter((e) => (e.getAttribute('points') || '').trim().split(/\s+/).length === 3).length;

  /* Schraffuren */
  const muster = [...svg.querySelectorAll('pattern')]
    .map((e) => e.id + '@' + (e.getAttribute('patternTransform') || '-'));

  /* Mittellinien: Strichpunkt erkennt man am Muster mit vier Werten. */
  const strichpunkt = [...svg.querySelectorAll('[stroke-dasharray]')]
    .filter((e) => (e.getAttribute('stroke-dasharray') || '').split(/[\s,]+/).length >= 4).length;

  /* Rahmen */
  let raus = 0;
  svg.querySelectorAll('line,rect,text,circle,path,polygon').forEach((e) => {
    if (e.closest('marker') || e.closest('pattern') || e.closest('.erklaer')) return;
    const v = versatz(e);
    if (!v) return;
    const pruefe = (x, y) => {
      if (x + v[0] < -3 || x + v[0] > vw + 3 || y + v[1] < -3 || y + v[1] > vh + 3) raus++;
    };
    if (e.tagName === 'line') {
      pruefe(+e.getAttribute('x1'), +e.getAttribute('y1'));
      pruefe(+e.getAttribute('x2'), +e.getAttribute('y2'));
    } else if (e.tagName === 'rect') {
      pruefe(+e.getAttribute('x'), +e.getAttribute('y'));
      pruefe(+e.getAttribute('x') + +e.getAttribute('width'),
        +e.getAttribute('y') + +e.getAttribute('height'));
    } else if (e.tagName === 'text') {
      pruefe(+e.getAttribute('x'), +e.getAttribute('y'));
    } else if (e.tagName === 'circle') {
      pruefe(+e.getAttribute('cx'), +e.getAttribute('cy'));
    } else if (e.tagName === 'path') {
      pfadPunkte(e.getAttribute('d') || '').forEach(([x, y]) => pruefe(x, y));
    } else if (e.tagName === 'polygon') {
      const z = (e.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < z.length; i += 2) pruefe(z[i], z[i + 1]);
    }
  });
  if (raus) befunde.push([name, raus + ' Element(e) ausserhalb des Rahmens']);

  return { breiten: liste, marker, dreiecke, muster, strichpunkt,
    teile: svg.querySelectorAll('line,rect,path,circle,polygon,text').length };
}

const SEITEN = [
  ...['uebungen/schraubverbindungen/01-bezeichnung-lesen.html',
    'uebungen/schraubverbindungen/02-schnittdarstellung-pruefen.html',
    'uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html',
    'uebungen/schraubverbindungen/04-gleiches-drehmoment-andere-spannkraft.html',
    'uebungen/schraubverbindungen/05-querkraft-durch-reibung.html',
    'uebungen/fuegeverfahren/01-wo-geht-die-kraft-ueber.html',
    'uebungen/fuegeverfahren/03-die-verbindung-haelt-nicht.html',
    'trainings/schraubverbindungen/03-schraffur-schnellcheck.html',
    'trainings/fuegeverfahren/01-prinzip-schnellcheck.html',
    'trainings/fuegeverfahren/03-eigenschaften-zuordnen.html',
    'lernsituationen/konsole-am-foerderband/index.html',
    'lernsituationen/gehaeusedeckel/index.html',
  ].map((r) => ({ rel: r, wurzel: MAT, praefix: '(?:\\.\\./)+',
    url: 'https://t-bk.de/unterrichtsmaterial/' + r })),
];

const REITER = ['grundlagen', 'aufbau', 'zeichnung', 'funktion', 'fortgeschritten'];
const LEKTIONEN = ['maschinenelemente-schrauben-schraubverbindungen.html',
  'fertigungstechnik-fuegeverfahren-schweissen.html',
  'fertigungstechnik-fuegeverfahren-ueberblick.html',
  'fertigungstechnik-prueftechnik-einfuehrung.html'];

async function main() {
  const befunde = [];
  console.log('# Bestandsaufnahme der Zeichnungen\n');

  for (const s of SEITEN) {
    const { d, laut } = laden(path.join(MAT, s.rel), MAT, s.praefix, s.url);
    await warte(700);
    console.log('## ' + s.rel);
    if (laut.length) befunde.push([s.rel, 'Laufzeitfehler: ' + laut[0]]);
    const svgs = [...d.querySelectorAll('main svg')];
    if (!svgs.length) console.log('   (keine Zeichnung)');
    svgs.forEach((svg, i) => {
      const name = s.rel.split('/').pop() + ' #' + (svg.closest('[id]') ? (svg.closest('[id]').id || i) : i);
      const r = pruefeSvg(svg, name, befunde);
      console.log('   ' + name + ': ' + r.teile + ' Teile, Breiten ['
        + r.breiten.join(', ') + '], Marker ' + r.marker + ', Dreiecke ' + r.dreiecke
        + ', Muster [' + r.muster.join(' ') + '], Strichpunkt ' + r.strichpunkt);
    });
  }

  /* Die Lektionen liegen im Nachbar-Repo; fehlt es, endet der Bericht hier. */
  for (const datei of (teilweise(TOOLS, 'Werkzeuge') ? LEKTIONEN : [])) {
    const { d, w, laut } = laden(path.join(TOOLS, datei), TOOLS, '',
      'https://t-bk.de/werkzeuge/tools/' + datei);
    await warte(900);
    console.log('## ' + datei);
    if (laut.length) befunde.push([datei, 'Laufzeitfehler: ' + laut[0]]);
    for (const r of REITER) {
      if (!d.getElementById('p-' + r)) continue;
      try { w.reiterSetzen(r); } catch (e) { befunde.push([datei, r + ': ' + e.message]); continue; }
      [...d.querySelectorAll('#p-' + r + ' svg')].forEach((svg) => {
        const name = datei.slice(0, 22) + '… ' + r + '/' + (svg.id || '?');
        const res = pruefeSvg(svg, name, befunde);
        console.log('   ' + name + ': ' + res.teile + ' Teile, Breiten ['
          + res.breiten.join(', ') + '], Marker ' + res.marker + ', Dreiecke ' + res.dreiecke
          + ', Muster [' + res.muster.join(' ') + '], Strichpunkt ' + res.strichpunkt);
      });
    }
  }

  console.log('\n# Befunde (' + befunde.length + ')\n');
  befunde.forEach(([wo, was]) => console.log('  - ' + wo + ': ' + was));
}

main();
