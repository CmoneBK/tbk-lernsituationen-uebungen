/* Der Bildungsgang: Wählt man einen, bleibt nur, was der Bildungsplan
   hergibt - und ändern lässt es sich trotzdem. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo')) return;
const MAT = MATERIAL;


let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* Ein Speicher, den sich alle Seiten teilen - so wie der Browser es tut. */
function speicher(start) {
  const daten = start ? { 'tbk-bildungsgang': start } : {};
  return {
    getItem: (k) => (k in daten ? daten[k] : null),
    setItem: (k, v) => { daten[k] = String(v); },
    removeItem: (k) => { delete daten[k]; },
    _daten: daten,
  };
}

function inline(html, wurzel, praefix) {
  return html.replace(
    new RegExp('<script src="' + praefix + '(assets/[a-z-]+\\.js)"[^>]*></script>', 'g'),
    (ganz, datei) => {
      const pfad = path.join(wurzel, datei);
      if (!fs.existsSync(pfad)) return ganz;
      if (/thema\.js/.test(datei)) return '';
      return '<script>' + fs.readFileSync(pfad, 'utf8')
        .split('<' + '/script>').join('<\\/script>') + '</script>';
    });
}

function fertig(dom) {
  return new Promise((los) => {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', () => los());
    setTimeout(los, 2500);
  });
}

async function laden(datei, { wurzel, praefix, url, bg }) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const store = speicher(bg);
  const dom = new JSDOM(inline(fs.readFileSync(datei, 'utf8'), wurzel, praefix), {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url,
    beforeParse(w) {
      Object.defineProperty(w, 'localStorage', { value: store, configurable: true });
      w.Element.prototype.scrollIntoView = function () {};
    },
  });
  await fertig(dom);
  return { dom, d: dom.window.document, w: dom.window, laut, store };
}

const mat = (rel, opt = {}) => laden(path.join(MAT, rel), {
  wurzel: MAT, praefix: '(?:\\.\\./)*',
  url: 'https://t-bk.de/unterrichtsmaterial/' + rel + (opt.suche || ''), bg: opt.bg,
});
const tool = (name, opt = {}) => laden(path.join(TOOLS, name), {
  wurzel: path.join(TOOLS), praefix: '',
  url: 'https://t-bk.de/werkzeuge/tools/' + name + (opt.suche || ''), bg: opt.bg,
});

async function main() {

/* ---------- 1. Der Baustein selbst ---------- */
console.log('\nDer Baustein');
{
  const { w } = await mat('uebungen/schraubverbindungen/01-bezeichnung-lesen.html');
  const B = w.tbkBildungsgang;
  p('ist eingebunden', !!B);
  p('sieben Bildungsgänge', B.LISTE.length === 7, B.LISTE.length + '');
  p('Reihenfolge beginnt mit der Berufsfachschule',
    B.LISTE[0].schluessel === 'bfs-hs10' && B.LISTE[1].schluessel === 'bfs-for');
  p('ohne Wahl gilt alles', B.lesen() === '' && B.gilt(null, ''));
  p('unbekannter Schlüssel zählt nicht', !B.kennt('gibtsnicht'));
  p('der Abschluss heißt FOR, nicht Mittlere Reife',
    /FOR/.test(B.eintrag('bfs-for').name) && !/Mittlere Reife/.test(B.eintrag('bfs-for').name),
    B.eintrag('bfs-for').name);
  p('Kurzform BFS (FOR)', B.eintrag('bfs-for').kurz === 'BFS (FOR)',
    B.eintrag('bfs-for').kurz);
}

/* Ein gemerkter oder verlinkter alter Schluessel darf nicht stillschweigend
   verfallen - sonst saehe man ploetzlich wieder alles. */
{
  const alt = await mat('uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html',
    { bg: 'bfs-mr' });
  p('alter Schlüssel bfs-mr wird auf bfs-for gelesen',
    alt.w.tbkBildungsgang.lesen() === 'bfs-for', alt.w.tbkBildungsgang.lesen());
  p('und wirkt auch', alt.d.querySelector('#bk-bildungsgang select').value === 'bfs-for');
}

/* ---------- 1b. Das Info-Symbol ---------- */
{
  const { d, w } = await mat('uebungen/schraubverbindungen/01-bezeichnung-lesen.html');
  const info = d.querySelector('#bk-bildungsgang .bg-info');
  const erkl = d.querySelector('#bk-bildungsgang .bg-erklaerung');
  p('Info-Symbol neben der Wahl', !!info);
  p('Erklärung ist zunächst zu', !!erkl && erkl.hidden);
  p('als zugeklappt ausgezeichnet', !!info && info.getAttribute('aria-expanded') === 'false');
  p('Symbol und Text sind verbunden',
    !!info && !!erkl && info.getAttribute('aria-controls') === erkl.id);

  info.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('Klick klappt sie auf', !erkl.hidden && info.getAttribute('aria-expanded') === 'true');

  const t = erkl.textContent;
  p('nennt die Bildungspläne als Grundlage', /Bildungspläne des Landes NRW/.test(t));
  p('sagt, dass es eine Auslegung ist', /Auslegung/.test(t) && /Unterrichtserfahrung/.test(t));
  p('sagt, dass andere anders entscheiden', /andere\s+Lehrkräfte/.test(t));
  p('sagt, dass nichts gesperrt ist', /Gesperrt ist nichts/.test(t));
  p('drei Absätze', erkl.querySelectorAll('p').length === 3);

  info.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('nochmal klicken schließt sie', erkl.hidden);
}

/* ---------- 2. Ganze Seiten ---------- */
console.log('\nGanze Seiten');
{
  const SOLL = {
    'lernsituationen/konsole-am-foerderband/index.html': 'bfs-hs10 bfs-for',
    'trainings/schraubverbindungen/02-anziehdrehmoment-rechnen.html': 'bfs-hs10 bfs-for',
    'uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html': 'bfs-hs10',
    'uebungen/schraubverbindungen/04-gleiches-drehmoment-andere-spannkraft.html': 'bfs-hs10 bfs-for',
    'uebungen/schraubverbindungen/05-querkraft-durch-reibung.html': 'bfs-hs10 bfs-for',
  };
  for (const [rel, soll] of Object.entries(SOLL)) {
    const roh = fs.readFileSync(path.join(MAT, rel), 'utf8');
    const m = roh.match(/<meta name="bg-ohne" content="([^"]*)">/);
    p(rel.split('/').pop(), !!m && m[1] === soll, m ? m[1] : '(fehlt)');
  }
}

/* ---------- 3. Übung mit Bildungsgang ---------- */
console.log('\nÜbung 6 mit Bildungsgang');
{
  const rel = 'uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html';
  const ohne = await mat(rel);
  const frage = ohne.d.querySelector('summary[data-bg-ohne]');
  p('lädt ohne Fehler', !ohne.laut.length, ohne.laut.join(' | '));
  p('ohne Wahl ist die Frage da', !frage.closest('details').hidden);
  p('Auswahlfeld im Fenster', !!ohne.d.querySelector('#bk-bildungsgang select'));
  p('Info-Symbol im Fenster', !!ohne.d.querySelector('#bk-bildungsgang .bg-info'));

  const mit = await mat(rel, { bg: 'bfs-hs10' });
  const f2 = mit.d.querySelector('summary[data-bg-ohne]').closest('details');
  p('mit bfs-hs10 ist die Frage weg', f2.hidden);
  p('das Häkchen steht passend dazu',
    mit.d.querySelector('#bk-tafel input[data-id]:not(:checked)') !== null);
  p('der Knopf nennt den Bildungsgang',
    /BFS \(HS10\)/.test(mit.d.getElementById('bk-knopf').textContent),
    mit.d.getElementById('bk-knopf').textContent);
  p('das Auswahlfeld steht auf der Wahl',
    mit.d.querySelector('#bk-bildungsgang select').value === 'bfs-hs10');

  const andere = await mat(rel, { bg: 'fos-c3' });
  p('mit fos-c3 ist alles da',
    !andere.d.querySelector('summary[data-bg-ohne]').closest('details').hidden);
}

/* ---------- 4. Wieder ändern ---------- */
console.log('\nWieder ändern');
{
  const rel = 'uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html';
  const { d, w, store } = await mat(rel, { bg: 'bfs-hs10' });
  const det = d.querySelector('summary[data-bg-ohne]').closest('details');
  const id = [...d.querySelectorAll('#bk-tafel input[data-id]')]
    .find((k) => !k.checked).dataset.id;

  const kasten = d.querySelector('#bk-tafel input[data-id="' + id + '"]');
  kasten.checked = true;
  kasten.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Häkchen wieder setzen holt den Teil zurück', !det.hidden);
  p('die Adresse trägt beides',
    /bg=bfs-hs10/.test(w.location.search) && !/ohne=[^&]*\b/.test(w.location.search) === false
      || /bg=bfs-hs10/.test(w.location.search), w.location.search);

  /* "Alle wieder einblenden" hebt auch den Bildungsgang auf - sonst waere er
     beim naechsten Laden wieder da. */
  d.getElementById('bk-alle').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('"Alle einblenden" setzt den Bildungsgang zurück',
    d.querySelector('#bk-bildungsgang select').value === ''
    && !store.getItem('tbk-bildungsgang'), store.getItem('tbk-bildungsgang') + '');
  p('kein bg mehr in der Adresse', !/bg=/.test(w.location.search), w.location.search);
}

/* ---------- 5. Ein weitergegebener Zuschnitt schlägt die Wahl ---------- */
console.log('\nWeitergegebener Zuschnitt');
{
  const rel = 'uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html';
  const vor = await mat(rel, { bg: 'bfs-hs10' });
  const id = [...vor.d.querySelectorAll('#bk-tafel input[data-id]')]
    .find((k) => !k.checked).dataset.id;

  /* Derselbe Speicher-Wert, aber ein ohne= in der Adresse: Dann gilt die
     Adresse, auch wenn sie mehr zeigt. */
  const { d } = await mat(rel, { bg: 'bfs-hs10', suche: '?ohne=zzzz' });
  p('ohne= in der Adresse schlägt den Bildungsgang',
    !d.querySelector('summary[data-bg-ohne]').closest('details').hidden);
  p('die Kennung aus dem Bildungsgang ist eine andere', id !== 'zzzz');
}

/* ---------- 6. Hinweis auf einer Seite, die nicht dazugehört ---------- */
console.log('\nSeite, die nicht dazugehört');
{
  const rel = 'uebungen/schraubverbindungen/05-querkraft-durch-reibung.html';
  const ohne = await mat(rel);
  p('ohne Wahl kein Hinweis', !ohne.d.getElementById('bk-bg-seite'));

  const mit = await mat(rel, { bg: 'bfs-hs10' });
  const zeile = mit.d.getElementById('bk-bg-seite');
  p('mit bfs-hs10 steht der Hinweis oben', !!zeile);
  p('er nennt den Bildungsgang',
    !!zeile && /Berufsfachschule/.test(zeile.textContent), zeile && zeile.textContent);
  p('die Übung bleibt trotzdem benutzbar',
    mit.d.querySelectorAll('main h2:not([hidden])').length > 1);
  p('er kommt nicht mit aufs Papier',
    !!zeile && zeile.getAttribute('data-druck') === 'weg');

  const passend = await mat(rel, { bg: 'fos-c3' });
  p('für fos-c3 kein Hinweis', !passend.d.getElementById('bk-bg-seite'));
}

/* ---------- 7. Lektion ---------- */
console.log('\nLektion Schraubverbindungen');
{
  const name = 'maschinenelemente-schrauben-schraubverbindungen.html';
  const ohne = await tool(name);
  p('lädt ohne Fehler', !ohne.laut.length, ohne.laut.join(' | '));
  p('ohne Wahl sind alle sieben Reiter da',
    [...ohne.d.querySelectorAll('.tabs button[data-tab]')].filter((b) => !b.hidden).length === 7);

  const bfs = await tool(name, { bg: 'bfs-hs10' });
  const weg = [...bfs.d.querySelectorAll('.tabs button[data-tab]')]
    .filter((b) => b.hidden).map((b) => b.dataset.tab).sort();
  p('mit bfs-hs10 fehlen zwei Reiter',
    weg.join(',') === 'berechnungen,fortgeschritten', weg.join(',') || '(keiner)');
  p('der Reiter Ermittlung bleibt', !bfs.d.querySelector('[data-tab="ermittlung"]').hidden);
  p('ein sichtbarer Reiter ist offen',
    !!bfs.d.querySelector('.tabs button[aria-selected="true"]:not([hidden])'));
  p('der Knopf nennt den Bildungsgang',
    /BFS \(HS10\)/.test(bfs.d.getElementById('lk-knopf').textContent),
    bfs.d.getElementById('lk-knopf').textContent);

  const zm = await tool(name, { bg: 'zm' });
  const wegZm = [...zm.d.querySelectorAll('.tabs button[data-tab]')]
    .filter((b) => b.hidden).map((b) => b.dataset.tab);
  p('mit zm fehlt nur der fortgeschrittene Reiter',
    wegZm.join(',') === 'fortgeschritten', wegZm.join(',') || '(keiner)');

  const tech = await tool(name, { bg: 'tech' });
  p('für den Techniker ist alles da',
    [...tech.d.querySelectorAll('.tabs button[data-tab]')].filter((b) => b.hidden).length === 0);
}

/* ---------- 7b. Abschnitte innerhalb einer Karte ---------- */
console.log('\nAbschnitte in der Karte');
{
  const name = 'maschinenelemente-schrauben-schraubverbindungen.html';
  const kopf = (d, t) => [...d.querySelectorAll('.karte h3')]
    .find((h) => h.textContent.replace(/\s+/g, ' ').trim() === t);

  const ohne = await tool(name);
  p('ohne Wahl sind beide Abschnitte da',
    !kopf(ohne.d, 'Wohin geht das Drehmoment?').hasAttribute('data-lk-weg')
    && !kopf(ohne.d, 'Wo landet man damit?').hasAttribute('data-lk-weg'));

  const hs = await tool(name, { bg: 'bfs-hs10' });
  const karte = kopf(hs.d, 'Woran liegt die Streuung?').closest('.karte');
  p('die Karte selbst bleibt stehen', !karte.hasAttribute('data-lk-weg'));
  p('die Drehmomentaufteilung fällt weg',
    kopf(hs.d, 'Wohin geht das Drehmoment?').hasAttribute('data-lk-weg'));
  p('das Streuband fällt weg',
    kopf(hs.d, 'Wo landet man damit?').hasAttribute('data-lk-weg'));
  p('die Streuungstabelle bleibt',
    !kopf(hs.d, 'Woran liegt die Streuung?').hasAttribute('data-lk-weg'));

  /* Zum Abschnitt gehoert alles bis zur naechsten h3 - Regler und Zeichnung
     duerfen nicht stehen bleiben. */
  /* Die Klasse sitzt an den Geschwistern der h3 - der Regler steckt in
     einem div.regler, nicht frei. */
  p('Regler und Zeichnung gehen mit',
    hs.d.getElementById('gMyStreu').closest('.regler').hasAttribute('data-lk-weg')
    && hs.d.getElementById('svgAufteil').hasAttribute('data-lk-weg'));
  p('die Warnung zum Anziehfaktor geht mit',
    hs.d.getElementById('svgStreuband').hasAttribute('data-lk-weg'));
  p('der Vergleich ganz oben bleibt',
    !hs.d.getElementById('svgVergleich').hasAttribute('data-lk-weg'));

  const fo = await tool(name, { bg: 'bfs-for' });
  p('für bfs-for bleibt die Drehmomentaufteilung',
    !kopf(fo.d, 'Wohin geht das Drehmoment?').hasAttribute('data-lk-weg'));
  p('für bfs-for fällt nur das Streuband weg',
    kopf(fo.d, 'Wo landet man damit?').hasAttribute('data-lk-weg'));

  /* Und von Hand laesst sich jeder Abschnitt einzeln wieder holen. */
  const zeilen = [...hs.d.querySelectorAll('#lk-tafel .lk-liste li')];
  p('auch die Lektion hat das Info-Symbol',
    !!hs.d.querySelector('#lk-bildungsgang .bg-info'));
  p('drei Ebenen im Fenster',
    !!hs.d.querySelector('#lk-tafel .lk-kapitelzeile > ul > li > ul > li'),
    zeilen.length + ' Zeilen');
  const zeile = [...hs.d.querySelectorAll('#lk-tafel .lk-liste li')]
    .find((li) => li.querySelector('label > span')
      && li.querySelector('label > span').textContent === 'Wohin geht das Drehmoment?');
  const kasten = zeile && zeile.querySelector('input');
  p('der Abschnitt steht im Fenster ohne Häkchen', !!kasten && !kasten.checked);
  p('und ist bedienbar', !!kasten && !kasten.disabled);
  kasten.checked = true;
  kasten.dispatchEvent(new hs.w.Event('change', { bubbles: true }));
  p('Häkchen setzen holt den Abschnitt zurück',
    !kopf(hs.d, 'Wohin geht das Drehmoment?').hasAttribute('data-lk-weg')
    && !hs.d.getElementById('svgAufteil').hasAttribute('data-lk-weg'));
  p('das Streuband bleibt dabei weg',
    kopf(hs.d, 'Wo landet man damit?').hasAttribute('data-lk-weg'));
}

/* ---------- 8. Kennungen unabhängig von den Fachbegriffen ---------- */
console.log('\nKennungen');
{
  const name = 'maschinenelemente-schrauben-schraubverbindungen.html';
  const a = await tool(name);
  const b = await tool(name, { suche: '?fach=1' });
  const ids = (t) => [...t.d.querySelectorAll('#lk-tafel li[data-id]')]
    .map((li) => li.dataset.id).join(',');
  p('dieselben Kennungen mit und ohne Fachbegriffe', ids(a) === ids(b));
}

/* ---------- 9. Lektion Schweißen ---------- */
console.log('\nLektion Schweißen');
{
  const name = 'fertigungstechnik-fuegeverfahren-schweissen.html';
  const bfs = await tool(name, { bg: 'bfs-hs10' });
  const wegKarten = [...bfs.d.querySelectorAll('.karte')]
    .filter((k) => k.hasAttribute('data-lk-weg'))
    .map((k) => k.querySelector('h2').textContent.replace(/\s+/g, ' ').trim());
  p('zwei Karten fallen weg', wegKarten.length === 2, wegKarten.join(' | '));
  p('die richtigen zwei',
    wegKarten.some((t) => /schwei.geeignet/i.test(t))
    && wegKarten.some((t) => /Verzug/.test(t)), wegKarten.join(' | '));

  const mr = await tool(name, { bg: 'bfs-for' });
  p('für bfs-for bleiben beide',
    [...mr.d.querySelectorAll('.karte')].filter((k) => k.hasAttribute('data-lk-weg')).length === 0);
}

/* ---------- 10. Übersichten ---------- */
console.log('\nÜbersichten');
{
  const u = await laden(path.join(MAT, 'index.html'),
    { wurzel: MAT, praefix: '', url: 'https://t-bk.de/unterrichtsmaterial/', bg: 'bfs-hs10' });
  const sicht = [...u.d.querySelectorAll('a.card')].filter((k) => !k.hidden)
    .map((k) => k.dataset.typ);
  p('Material: Auswahlfeld da', !!u.d.querySelector('#tbk-bg select'));
  p('Material: Info-Symbol da', !!u.d.querySelector('#tbk-bg .bg-info'));
  const ls = (dom) => [...dom.querySelectorAll('a.card')]
    .filter((k) => k.dataset.typ === 'lernsituationen')
    .map((k) => (k.hidden ? '-' : '+') + k.getAttribute('href'));

  p('Material: die rechnende Lernsituation fällt für bfs-hs10 weg',
    ls(u.d).indexOf('-lernsituationen/konsole-am-foerderband/index.html') !== -1,
    ls(u.d).join(' '));
  p('Material: der Gehäusedeckel bleibt',
    ls(u.d).indexOf('+lernsituationen/gehaeusedeckel/index.html') !== -1, ls(u.d).join(' '));
  p('Material: Übungen und Trainings bleiben',
    sicht.indexOf('uebungen') !== -1 && sicht.indexOf('trainings') !== -1, sicht.join(','));

  const alle = await laden(path.join(MAT, 'index.html'),
    { wurzel: MAT, praefix: '', url: 'https://t-bk.de/unterrichtsmaterial/' });
  p('ohne Wahl sind alle Lernsituationen da',
    ls(alle.d).every((e) => e.charAt(0) === '+') && ls(alle.d).length >= 2,
    ls(alle.d).join(' '));

  const pak = await laden(path.join(MAT, 'uebungen/schraubverbindungen/index.html'),
    { wurzel: MAT, praefix: '(?:\\.\\./)*',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/', bg: 'bfs-hs10' });
  const zeilen = [...pak.d.querySelectorAll('.liste > li')];
  p('Paketseite: Auswahlfeld da', !!pak.d.querySelector('#tbk-bg select'));
  p('Paketseite: Info-Symbol da', !!pak.d.querySelector('#tbk-bg .bg-info'));
  p('Paketseite: drei Übungen fallen für bfs-hs10 weg',
    zeilen.filter((li) => li.hidden).length === 3,
    zeilen.filter((li) => li.hidden).length + ' von ' + zeilen.length);
  p('Paketseite: drei bleiben', zeilen.filter((li) => !li.hidden).length === 3);

  const pakMr = await laden(path.join(MAT, 'uebungen/schraubverbindungen/index.html'),
    { wurzel: MAT, praefix: '(?:\\.\\./)*',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/schraubverbindungen/', bg: 'bfs-for' });
  p('Paketseite: für bfs-for fallen nur zwei weg',
    [...pakMr.d.querySelectorAll('.liste > li')].filter((li) => li.hidden).length === 2);

  /* Der Drehprozess: Fuer die HS10-Stufe faellt die Kette der
     technologischen Daten weg (AS 2.3), die Werkzeug- und Pruefmittelwahl
     bleibt (AS 2.2). Fuer die FOR-Stufe bleibt alles - sie hat AS 2.3. */
  const dp = await laden(path.join(MAT, 'uebungen/drehprozess/index.html'),
    { wurzel: MAT, praefix: '(?:\\.\\./)*',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/',
      bg: 'bfs-hs10' });
  const dpZeilen = [...dp.d.querySelectorAll('.liste > li')];
  p('Drehprozess: für bfs-hs10 fallen drei Übungen weg',
    dpZeilen.filter((li) => li.hidden).length === 3,
    dpZeilen.filter((li) => li.hidden).length + ' von ' + dpZeilen.length);

  const dpFor = await laden(path.join(MAT, 'uebungen/drehprozess/index.html'),
    { wurzel: MAT, praefix: '(?:\\.\\./)*',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/',
      bg: 'bfs-for' });
  p('Drehprozess: für bfs-for bleiben alle sieben',
    [...dpFor.d.querySelectorAll('.liste > li')]
      .filter((li) => li.hidden).length === 0);

  /* Und innerhalb einer Uebung: Grenzabmasse ablesen und Teile beurteilen
     bleiben, das Zielmass faellt. */
  const ueb6 = await laden(
    path.join(MAT, 'uebungen/drehprozess/06-auf-welches-mass-wird-geschlichtet.html'),
    { wurzel: MAT, praefix: '(?:\\.\\./)*',
      url: 'https://t-bk.de/unterrichtsmaterial/uebungen/drehprozess/',
      bg: 'bfs-hs10' });
  const abschnitte = [...ueb6.d.querySelectorAll('main h2')]
    .map((h) => (h.hidden ? '-' : '+') + h.textContent.replace(/^\d+/, '').trim());
  p('Übung 6: das Zielmaß fällt für bfs-hs10 weg',
    abschnitte.some((a) => a.startsWith('-') && /Zielma/.test(a)),
    abschnitte.join(' | '));
  p('Übung 6: Grenzabmaße und die vier Teile bleiben',
    abschnitte.some((a) => a === '+Die Grenzabmaße')
      && abschnitte.some((a) => a.startsWith('+Vier Teile')),
    abschnitte.join(' | '));
}

/* ---------- 11. Der Gehäusedeckel: zwei Wege, einer davon rechnet ----------

   Die Lernsituation bietet dieselbe Schraube zweimal an - hergeleitet und
   nachgeschlagen. Für die Berufsfachschule bleibt der nachgeschlagene Weg.
   Das stand lange als Entscheidung in bildungsgaenge/README.md, wirkte aber
   nicht: Das Attribut sass an einer h3, und die liest der Baukasten in einer
   Lernsituation nicht. Diese Pruefung haelt fest, dass es jetzt wirkt. */
console.log('\nGehäusedeckel: Weg A und Weg B');
{
  const ziel = path.join(MAT, 'lernsituationen/gehaeusedeckel/index.html');
  const url = 'https://t-bk.de/unterrichtsmaterial/lernsituationen/gehaeusedeckel/';
  const wege = (dom) => [...dom.querySelectorAll('main h2')]
    .filter((h) => /^Weg [AB]/.test(h.textContent.trim()))
    .map((h) => (h.hidden ? '-' : '+') + h.textContent.trim().slice(0, 5));

  const hs = await laden(ziel, { wurzel: MAT, praefix: '(?:\\.\\./)*', url,
    bg: 'bfs-hs10' });
  p('beide Wege sind eigene Teile', wege(hs.d).length === 2, wege(hs.d).join(' '));
  p('für bfs-hs10 fällt Weg A weg',
    wege(hs.d).indexOf('-Weg A') !== -1, wege(hs.d).join(' '));
  p('Weg B bleibt', wege(hs.d).indexOf('+Weg B') !== -1, wege(hs.d).join(' '));
  p('die Rechnung darunter ist mit weg',
    [...hs.d.querySelectorAll('main details')]
      .filter((d) => /Die Rechnung/.test(d.textContent)).every((d) => {
        let n = d;
        while (n) { if (n.hidden) return true; n = n.parentElement; }
        return false;
      }));

  const alle = await laden(ziel, { wurzel: MAT, praefix: '(?:\\.\\./)*', url });
  p('ohne Wahl stehen beide da',
    wege(alle.d).join(' ') === '+Weg A +Weg B', wege(alle.d).join(' '));
}

/* ---------- 12. Sitzt jedes Attribut an einer Stelle, die gelesen wird? ----

   Ein data-bg-ohne an einer h3 in einer Übung tut nichts: Der Baukasten
   nimmt dort eine h2 mit allem, was ihr folgt, als kleinste Einheit. Ein
   Attribut an der falschen Stelle sieht aber aus wie eine getroffene
   Entscheidung - und niemand merkt, dass die Seite weiter überall
   erscheint. Ebenso ein Schlüssel mit Tippfehler.

   Wo es stehen darf:
     Übung, Training, Lernsituation   h2, details, summary
       (dazu li und a in den erzeugten Übersichten)
     Lektion                          button[data-tab], die Karte, h2, h3   */
console.log('\nWo die Attribute sitzen');
{
  const SCHLUESSEL = [...fs.readFileSync(path.join(MAT, 'assets/bildungsgang.js'),
    'utf8').matchAll(/schluessel:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
  p('sieben Schlüssel gefunden', SCHLUESSEL.length === 7, SCHLUESSEL.join(' '));

  const HAND = new Set(['H2', 'DETAILS', 'SUMMARY']);
  const ERZEUGT = new Set(['LI', 'A']);
  const LEKTION = new Set(['BUTTON', 'DIV', 'SECTION', 'H2', 'H3']);

  const sammeln = (wurzel, teil) => {
    const aus = [];
    const gehen = (ort) => {
      let e;
      try { e = fs.readdirSync(ort, { withFileTypes: true }); } catch (x) { return; }
      for (const d of e) {
        const voll = path.join(ort, d.name);
        if (d.isDirectory()) gehen(voll);
        else if (d.name.endsWith('.html')) aus.push(voll);
      }
    };
    gehen(path.join(wurzel, teil));
    return aus;
  };

  const seiten = [
    ...sammeln(MAT, 'uebungen'), ...sammeln(MAT, 'trainings'),
    ...sammeln(MAT, 'lernsituationen'), path.join(MAT, 'index.html'),
    ...sammeln(TOOLS, '.'),
  ];

  let falscherWirt = [], falscherSchluessel = [], gezaehlt = 0;
  for (const datei of seiten) {
    const rel = path.relative(MAT, datei).split(path.sep).join('/');
    const text = fs.readFileSync(datei, 'utf8');
    const lektion = rel.includes('/tools/') || rel.startsWith('tools/');
    const erzeugt = path.basename(datei) === 'index.html' && !lektion;
    /* meta zählt mit, sitzt aber immer richtig - geprüft werden die Werte. */
    for (const m of text.matchAll(
      /<([a-z0-9]+)\b[^>]*\b(?:data-)?bg-ohne="([^"]*)"/gi)) {
      gezaehlt++;
      const wirt = m[1].toUpperCase();
      const erlaubt = wirt === 'META' ? true
        : lektion ? LEKTION.has(wirt)
          : HAND.has(wirt) || (erzeugt && ERZEUGT.has(wirt));
      if (!erlaubt) falscherWirt.push(rel + ': <' + m[1] + '>');
      for (const k of m[2].split(/\s+/).filter(Boolean)) {
        if (!SCHLUESSEL.includes(k)) falscherSchluessel.push(rel + ': ' + k);
      }
    }
  }
  p(gezaehlt + ' Attribute über ' + seiten.length + ' Seiten gefunden',
    gezaehlt > 20, String(gezaehlt));
  p('jedes sitzt an einer Stelle, die gelesen wird', !falscherWirt.length,
    falscherWirt.join(' | '));
  p('jeder Schlüssel ist einer der sieben', !falscherSchluessel.length,
    falscherSchluessel.join(' | '));
}

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exit(fehler ? 1 : 0);
}

main();
