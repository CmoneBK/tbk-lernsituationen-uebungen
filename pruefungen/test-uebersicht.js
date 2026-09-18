/* Die neue Werkzeug-Uebersicht: zwei Haupt-Tabs, Suche nur im offenen Tab,
   und in den Seiten selbst nichts mehr aus dem Jekyll-Weg. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { WERKZEUGE, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(WERKZEUGE, 'Werkzeug-Repo') || !dran(WEBSEITE, 'Webseite')) return;
const REPO = WERKZEUGE;
const TOOLS = path.join(REPO, 'tools');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* ---------- 1. Die Seiten selbst ---------- */
console.log('\nDie Werkzeugseiten');

const dateien = fs.readdirSync(TOOLS).filter(f => f.endsWith('.html')).sort();
/* Keine feste Zahl: Jede neue Lektion hat diese Pruefung sonst rot
   gemacht, ohne dass etwas kaputt war. Geprueft wird, dass die
   Uebersicht so viele Karten zeigt, wie Dateien da sind. */
p(dateien.length + ' Seiten gefunden', dateien.length > 20,
  dateien.length + ' Stueck');

const arten = {};
let ohneThema = [], ohneBack = [], mitFm = [], ohneTitel = [];
for (const f of dateien) {
  const s = fs.readFileSync(path.join(TOOLS, f), 'utf8');
  if (/^\uFEFF?---\r?\n/.test(s)) mitFm.push(f);
  if (!s.includes('assets/thema.js')) ohneThema.push(f);
  if (!s.includes('assets/back-nav.js')) ohneBack.push(f);
  const t = s.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!t || !t[1].includes(':')) ohneTitel.push(f);
  const a = s.match(/<meta[^>]*name=["']art["'][^>]*content=["']([^"']*)["']/i);
  const art = a ? a[1] : '(fehlt)';
  (arten[art] = arten[art] || []).push(f);
}
p('keine Front-Matter mehr', !mitFm.length, mitFm.join(', '));
p('ueberall der Umschalter', !ohneThema.length, ohneThema.join(', '));
p('ueberall der Ruecklink', !ohneBack.length, ohneBack.join(', '));
p('ueberall ein Titel mit Bereich', !ohneTitel.length, ohneTitel.join(', '));
p('jede Seite hat eine Art', !arten['(fehlt)'], (arten['(fehlt)'] || []).join(', '));
p((arten.simulation || []).length + ' Simulationen',
  (arten.simulation || []).length > 0,
  (arten.simulation || []).length + ' Stueck');
p((arten.lektion || []).length + ' Lektionen',
  (arten.lektion || []).length > 0,
  'gefunden: ' + (arten.lektion || []).join(', '));

p('kein Jekyll-Gerippe mehr',
  !['_config.yml', '_layouts', '_includes', '_data'].some(d => fs.existsSync(path.join(REPO, d))));
p('.nojekyll liegt bereit', fs.existsSync(path.join(REPO, '.nojekyll')));
p('Kategorien im neuen Ordner', fs.existsSync(path.join(REPO, 'daten', 'kategorien.csv')));

/* ---------- 2. Die Uebersicht ---------- */
console.log('\nDie Uebersicht');

const vc = new VirtualConsole();
const laut = [];
vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));

/* Die beiden Bausteine liegen neben der Seite; hier interessiert nur das
   Verhalten der Uebersicht, nicht der Umschalter. */
let html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8')
  .replace(/<script src="tools\/assets\/thema\.js"><\/script>/, '');

const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc });
const d = dom.window.document;

p('ohne Fehler geladen', !laut.length, laut.join(' | '));

const tabs = [...d.querySelectorAll('.tabs button')];
p('zwei Haupt-Tabs', tabs.length === 2, tabs.map(t => t.textContent).join(' / '));
p('Simulationen steht vorn', tabs[0] && tabs[0].getAttribute('data-art') === 'simulation');
p('Simulationen ist offen', tabs[0] && tabs[0].getAttribute('aria-selected') === 'true');
p('Lektionen ist zu', tabs[1] && tabs[1].getAttribute('aria-selected') === 'false');
/* Die Zahl am Reiter muss zur Zahl der Karten passen - welche Zahl es
   ist, entscheidet der Bestand. */
p('Anzahl am Tab',
  tabs[0].textContent.indexOf(String((arten.simulation || []).length)) >= 0
  && tabs[1].textContent.indexOf(String((arten.lektion || []).length)) >= 0,
  tabs.map(t => t.textContent.trim()).join(' / '));
p('erklaert, was einen erwartet', d.getElementById('was').textContent.length > 40);

const sim = d.getElementById('p-simulation'), lek = d.getElementById('p-lektion');
p('nur ein Bereich sichtbar', !sim.hidden && lek.hidden);
p('so viele Karten wie Simulationen',
  sim.querySelectorAll('a.card').length === (arten.simulation || []).length,
  sim.querySelectorAll('a.card').length + ' gegen '
    + (arten.simulation || []).length);
p('so viele Karten wie Lektionen',
  lek.querySelectorAll('a.card').length === (arten.lektion || []).length,
  lek.querySelectorAll('a.card').length + ' gegen '
    + (arten.lektion || []).length);

/* Jede Karte zeigt auf eine Datei, die es gibt. */
const tot = [...d.querySelectorAll('a.card')]
  .map(a => a.getAttribute('href'))
  .filter(h => !fs.existsSync(path.join(REPO, h)));
p('kein toter Link', !tot.length, tot.join(', '));

/* Reihenfolge: Fertigungstechnik vor Maschinenelemente (daten/kategorien.csv). */
const bereiche = [...sim.querySelectorAll('.bereich')].map(h => h.textContent);
p('Bereiche in der Reihenfolge der CSV',
  bereiche[0] === 'Fertigungstechnik', bereiche.join(' → '));

/* Umschalten */
tabs[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
p('Klick wechselt den Tab', sim.hidden && !lek.hidden);
p('Beschriftung wechselt mit', tabs[1].getAttribute('aria-selected') === 'true');

/* Suche - nur im offenen Tab. */
const suche = d.getElementById('suche');
const tippen = (t) => {
  suche.value = t;
  suche.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
};
const sichtbar = (sec) => [...sec.querySelectorAll('a.card')].filter(a => !a.hidden).length;

tippen('schwei');
p('Suche findet in den Lektionen', sichtbar(lek) === 1, sichtbar(lek) + ' Treffer');
p('leer-Hinweis bleibt weg', d.getElementById('leer').hidden);

tippen('messschieber');
p('Suche greift nicht in den anderen Tab', sichtbar(lek) === 0);
p('leer-Hinweis erscheint', !d.getElementById('leer').hidden);

tabs[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
p('Suche gilt nach dem Wechsel weiter', sichtbar(sim) === 1, sichtbar(sim) + ' Treffer');

tippen('');
/* Wie viele es sind, sagt die Seite selbst. Eine feste Zahl hier waere eine
   zweite Wahrheit, die bei jedem neuen Werkzeug nachgezogen werden muesste -
   und die dann nicht die Suche prueft, sondern das Zaehlen. */
const alleKarten = sim.querySelectorAll('a.card').length;
p('Leeren zeigt wieder alles', sichtbar(sim) === alleKarten,
  sichtbar(sim) + ' von ' + alleKarten);
const kopfWeg = [...sim.querySelectorAll('.bereich, .cat')].filter(h => h.hidden).length;
p('keine Ueberschrift bleibt versteckt', kopfWeg === 0, kopfWeg + ' versteckt');

/* ---------- 3. Was deploy.sh noch tut ---------- */
console.log('\nAusliefern');
const deploy = fs.readFileSync(WEBSEITE + '/deploy.sh', 'utf8');
p('erzeugt die Uebersicht nicht mehr selbst', !/gen_werkzeuge/.test(deploy));
p('kopiert die index.html aus dem Repo',
  /cp "\$MAT_DIR\/index\.html" "\$\{WERKZEUGE\}index\.html"/.test(deploy));
p('kein Front-Matter-Schnitt mehr', !/strip_fm|inject_back/.test(deploy));
p('kein Verweis auf _data mehr', !/_data|_includes|_layouts/.test(deploy));

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exit(fehler ? 1 : 0);
