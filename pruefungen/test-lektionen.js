/* Die vier Lektionen: gemeinsamer Aufbau, Fachbegriffe, Anpassen und
   Herunterladen. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(WERKZEUGE, 'Werkzeug-Repo')) return;
const REPO = WERKZEUGE;
const TOOLS = path.join(REPO, 'tools');

const LEKTIONEN = [
  'fertigungstechnik-prueftechnik-einfuehrung.html',
  'fertigungstechnik-fuegeverfahren-schweissen.html',
  'fertigungstechnik-fuegeverfahren-ueberblick.html',
  'maschinenelemente-schrauben-schraubverbindungen.html',
  'maschinenelemente-lager-waelzlager-auswaehlen.html',
  'maschinenelemente-lager-lagerungen-gestalten.html',
];

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* Die Bausteine liegen als eigene Dateien daneben; für jsdom werden sie
   eingesetzt. thema.js bleibt draußen - es braucht matchMedia und hat mit
   diesen Prüfungen nichts zu tun. */
function seiteBauen(datei, suche) {
  let h = fs.readFileSync(path.join(TOOLS, datei), 'utf8');
  h = h.replace(/<script src="assets\/thema\.js"><\/script>/, '');
  h = h.replace(/<script src="assets\/([a-z-]+)\.js"([^>]*)><\/script>/g, (ganz, n) => {
    const pfad = path.join(TOOLS, 'assets', n + '.js');
    if (!fs.existsSync(pfad)) return ganz;
    return '<script>' + fs.readFileSync(pfad, 'utf8').split('<' + '/script>').join('<\\/script>')
      + '</script>';
  });
  return h;
}

function laden(datei, suche) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(seiteBauen(datei), {
    runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    url: 'https://t-bk.de/werkzeuge/tools/' + datei + (suche || ''),
  });
  return { dom, d: dom.window.document, w: dom.window, laut };
}

function fertig(dom) {
  return new Promise(function (los) {
    if (dom.window.document.readyState === 'complete') return los();
    dom.window.addEventListener('load', function () { los(); });
    setTimeout(los, 2000);
  });
}

const klick = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

async function laden2(datei, suche) {
  const t = laden(datei, suche);
  await fertig(t.dom);
  return t;
}

async function main() {

/* ---------- 1. Gemeinsamer Aufbau ---------- */
console.log('\nGemeinsamer Aufbau');

for (const datei of LEKTIONEN) {
  const roh = fs.readFileSync(path.join(TOOLS, datei), 'utf8');
  const kurz = datei.replace('fertigungstechnik-', '').replace('maschinenelemente-', '')
    .replace('.html', '');
  const fehlt = ['<main>', '</main>', 'assets/qr.js', 'assets/pdf.js', 'assets/lektion.js',
    'assets/back-nav.js', 'name="art" content="lektion"', 'role="tablist"',
    'class="schalter"', 'id="btnLink"', 'class="term"']
    .filter(s => !roh.includes(s));
  p(kurz, !fehlt.length, 'fehlt: ' + fehlt.join(', '));
}

/* ---------- 2. Lektion anpassen und Herunterladen ---------- */
console.log('\nLektion anpassen und Herunterladen');

for (const datei of LEKTIONEN) {
  const kurz = datei.replace(/^[a-z]+-/, '').replace('.html', '');
  const { d, w, laut } = await laden2(datei);

  p(kurz + ': lädt ohne Fehler', !laut.length, laut.join(' | '));

  const reiter = d.querySelectorAll('.tabs button[data-tab]');
  const zeilen = d.querySelectorAll('#lk-tafel .lk-kapitelzeile');
  p(kurz + ': beide Knöpfe in der Leiste',
    !!d.getElementById('lk-knopf') && !!d.getElementById('lk-holen-knopf'));
  p(kurz + ': ein Eintrag je Reiter', zeilen.length === reiter.length,
    zeilen.length + ' von ' + reiter.length);
  p(kurz + ': Karten als Unterpunkte',
    d.querySelectorAll('#lk-tafel .lk-liste input').length > reiter.length);
  p(kurz + ': QR-Code gezeichnet', !!d.querySelector('#lk-qr svg'));
  p(kurz + ': Umfang wählbar',
    d.querySelectorAll('#lk-holen input[name="lk-umfang"]').length === 2);
  p(kurz + ': drei Wege zur Datei',
    !!d.getElementById('lk-pdf-datei') && !!d.getElementById('lk-pdf')
    && !!d.getElementById('lk-word'));
}

/* ---------- 3. Ein Kapitel abwählen ---------- */
console.log('\nEin Kapitel abwählen');
{
  const datei = 'fertigungstechnik-fuegeverfahren-ueberblick.html';
  const { d, w } = await laden2(datei);

  const ersteZeile = d.querySelector('#lk-tafel .lk-kapitelzeile');
  const id = ersteZeile.dataset.id;
  const kasten = ersteZeile.querySelector('input');
  const knopf = d.querySelector('.tabs button[data-tab]');
  const panel = d.getElementById('p-' + knopf.dataset.tab);

  p('erster Reiter ist offen', knopf.getAttribute('aria-selected') === 'true');

  kasten.checked = false;
  kasten.dispatchEvent(new w.Event('change', { bubbles: true }));

  p('Abschnitt trägt lk-weg', panel.hasAttribute('data-lk-weg'));
  p('Reiter verschwindet mit', knopf.hidden);
  p('Adresse merkt es sich', w.location.search.indexOf('ohne=' + id) !== -1,
    w.location.search);
  p('ein anderer Reiter ist offen',
    !!d.querySelector('.tabs button[aria-selected="true"]:not([hidden])'));
  p('Knopf sagt, wie viel fehlt',
    /1 weniger/.test(d.getElementById('lk-knopf').textContent),
    d.getElementById('lk-knopf').textContent);

  /* Ein Reiterwechsel darf das abgewählte Kapitel nicht zurückholen - die
     Lektionen schalten ihre Abschnitte selbst über hidden um. */
  const anderer = [...d.querySelectorAll('.tabs button[data-tab]')].filter(b => !b.hidden)[1];
  klick(w, anderer);
  p('Reiterwechsel holt es nicht zurück', panel.hasAttribute('data-lk-weg'));

  d.getElementById('lk-alle').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  p('alles wieder da', !panel.hasAttribute('data-lk-weg') && !knopf.hidden);
  p('Adresse wieder sauber', w.location.search.indexOf('ohne=') === -1, w.location.search);
}

/* ---------- 4. Auswahl aus der Adresse ---------- */
console.log('\nAuswahl aus der Adresse');
{
  const datei = 'fertigungstechnik-fuegeverfahren-ueberblick.html';
  const vorlauf = await laden2(datei);
  const id = vorlauf.d.querySelectorAll('#lk-tafel .lk-kapitelzeile')[1].dataset.id;
  const name = vorlauf.d.querySelectorAll('.tabs button[data-tab]')[1].dataset.tab;

  const { d } = await laden2(datei, '?ohne=' + id);
  p('abgewähltes Kapitel bleibt weg',
    d.getElementById('p-' + name).hasAttribute('data-lk-weg'));
  p('Häkchen steht passend dazu',
    d.querySelector('#lk-tafel input[data-id="' + id + '"]').checked === false);
  p('die übrigen Kapitel sind da',
    d.querySelectorAll('.panel:not([data-lk-weg])').length
      === d.querySelectorAll('.panel').length - 1);
}

/* ---------- 5. Prüftechnik: Stil und Fachbegriffe ---------- */
console.log('\nPrüftechnik – Stil und Fachbegriffe');
{
  const { d, w, laut } = await laden2('fertigungstechnik-prueftechnik-einfuehrung.html');

  p('lädt ohne Fehler', !laut.length, laut.join(' | '));
  p('kein Akkordeon mehr', !d.querySelector('.accordion-item'));
  p('drei Reiter', d.querySelectorAll('.tabs button[data-tab]').length === 3);
  p('Karten wie in den anderen Lektionen', d.querySelectorAll(".karte").length === 6);
  p('gleiche Farbwelt',
    /--primary:#1e3a8a/.test(d.querySelector('style').textContent));

  const terme = d.querySelectorAll('.term');
  p('Fachbegriffe ausgezeichnet', terme.length >= 18, terme.length + ' Stellen');
  const leer = [...terme].filter(t => !t.textContent.trim());
  p('jeder Begriff hat Text', !leer.length,
    [...leer].map(t => t.dataset.t).join(', '));
  const unbekannt = [...terme].filter(t => t.getAttribute('role') !== 'button');
  p('jeder Begriff ist anklickbar', !unbekannt.length,
    [...unbekannt].map(t => t.dataset.t).join(', '));

  /* Alltagssprache zuerst, Fachbegriff auf Wunsch. */
  const einer = [...terme].find(t => t.dataset.t === 'messgroesse');
  p('Alltagssprache ist die Vorgabe', /gemessen wird/.test(einer.textContent),
    einer.textContent);
  const sw = d.getElementById('swFach');
  sw.checked = true;
  sw.dispatchEvent(new w.Event('change', { bubbles: true }));
  p('Umschalter setzt den Fachbegriff', einer.textContent.trim() === 'Messgröße',
    einer.textContent);
  p('Einstellung landet in der Adresse', /fach=1/.test(w.location.search),
    w.location.search);

  /* Einzelnes Wort aufdecken dreht die Einstellung für dieses Wort um. */
  klick(w, einer);
  p('einzeln aufgedeckt', einer.textContent.trim() === 'Größe, die gemessen wird',
    einer.textContent);
  p('Rücksetzknopf meldet sich', !d.getElementById('btnZurueck').hidden);
  klick(w, d.getElementById('btnZurueck'));
  p('zurückgesetzt', einer.textContent.trim() === 'Messgröße');

  p('Link-Knopf vorhanden', !!d.getElementById('btnLink'));

  /* Zeichnungen: als SVG, damit sie in PDF und Word mitkommen. */
  p('Messkette gezeichnet', d.querySelectorAll('#svgKette text').length > 8);
  p('Zehnerregel gezeichnet', d.querySelectorAll('#svgZehner rect').length === 5);
  p('Zehnerregel logarithmisch beschriftet',
    /logarithmisch/.test(d.getElementById('svgZehner').textContent));
  const betraege = [...d.querySelectorAll('#svgZehner text')].map(t => t.textContent);
  p('alle fünf Stufen beziffert',
    ['0,10 €', '1 €', '10 €', '100 €', '1000 €'].every(b => betraege.includes(b)),
    betraege.join(' | '));

  /* Der Entscheidungssimulator urteilt wie der Text darüber. */
  function urteil(bauteil, umfang) {
    d.getElementById('bauteil').value = bauteil;
    d.getElementById('umfang').value = umfang;
    klick(w, d.getElementById('btnBewerten'));
    return d.getElementById('simErgebnis').innerHTML;
  }
  p('Massenteile: Stichprobe ist richtig', /class="gut"/.test(urteil('masse', 'stich')));
  p('Massenteile: 100 % ist unwirtschaftlich', /class="warnung"/.test(urteil('masse', 'voll')));
  p('Sicherheitsteile: 100 % ist richtig', /class="gut"/.test(urteil('sicher', 'voll')));
  p('Sicherheitsteile: Stichprobe ist zu wenig',
    /class="warnung"/.test(urteil('sicher', 'stich')));
  p('Endlosmaterial: Intervall ist richtig',
    /class="gut"/.test(urteil('endlos', 'intervall')));
  p('ohne Wahl kommt ein Hinweis', /class="warnung"/.test(urteil('', '')));

  /* Der Messvorgang läuft über die Kette. */
  klick(w, d.getElementById('btnMessen'));
  p('Messvorgang startet', d.getElementById('btnMessen').disabled);
}

console.log('\nLektion oder Werkzeug - die Pakete muessen es richtig sagen');
{
  /* Die Paketseiten fuehren die Verweise ins Werkzeugrepo in zwei
     Bereichen: Lektionen zum Durcharbeiten, Simulationen zum Rechnen.
     Welche Art ein Verweis hat, steht in der info.json des Pakets - der
     Build kann beim Ausliefern nicht im Nachbarrepo nachsehen.

     Damit die Angabe nicht auseinanderlaeuft, wird sie hier gegen die
     Quelle gehalten: das <meta name="art"> der Werkzeugseite selbst. Vor
     der Trennung log der Name zweimal - "Fuegeverfahren im Ueberblick" und
     "Schraubverbindungen" hiessen "Werkzeug ...", sind aber Lektionen. */
  const ART = /<meta\s+name="art"\s+content="([a-z]+)"/i;
  const infos = [];
  ['lernsituationen', 'trainings', 'uebungen'].forEach((typ) => {
    const wurzel = path.join(MATERIAL, typ);
    if (!fs.existsSync(wurzel)) return;
    fs.readdirSync(wurzel, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .forEach((e) => {
        const datei = path.join(wurzel, e.name, 'info.json');
        if (fs.existsSync(datei)) infos.push([typ + '/' + e.name, datei]);
      });
  });
  p('es gibt Pakete mit Verweisen', infos.length > 0);

  infos.forEach(([kurz, datei]) => {
    let info;
    try { info = JSON.parse(fs.readFileSync(datei, 'utf8')); }
    catch (e) { p(kurz + ': info.json ist lesbar', false, e.message); return; }
    (info.werkzeuge || []).forEach((w) => {
      const seite = path.join(TOOLS, w.datei);
      if (!fs.existsSync(seite)) {
        p(kurz + ': ' + w.datei + ' gibt es', false, 'nicht im Werkzeugrepo');
        return;
      }
      const m = ART.exec(fs.readFileSync(seite, 'utf8').slice(0, 8000));
      p(kurz + ': ' + w.name + ' ist als ' + (m ? m[1] : '?') + ' gefuehrt',
        !!m && w.art === m[1],
        'info.json sagt ' + w.art + ', die Seite sagt ' + (m ? m[1] : 'nichts'));
      /* Der Zusatz im Namen war die alte Kruecke - jetzt sagt es die
         Ueberschrift des Bereichs. */
      p(kurz + ': ' + w.name + ' traegt die Art nicht noch im Namen',
        !/^(Lektion|Werkzeug|Simulation)\s/.test(w.name), w.name);
    });
  });
}

console.log('\nJede Werkzeugseite traegt ihren Untertitel');
{
  /* Auf der Uebersicht steht unter jedem Namen eine Zeile, die sagt, was
     einen erwartet - sie kommt aus <meta name="description">. Fehlt sie,
     steht die Karte nackt da: "Ueberblick", und sonst nichts.

     Und wo mehrere Karten unter derselben Ueberschrift stehen, sortiert
     ohne <meta name="reihenfolge"> das Alphabet. Dann steht der Ueberblick
     zu den Fuegeverfahren hinter dem Schweissen: erst das Einzelverfahren,
     dann die Einordnung. */
  const holen = (text, name) => {
    const m = new RegExp('<meta[^>]*name="' + name + '"[^>]*content="([^"]*)"', 'i')
      .exec(text);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
  };
  /* "Bereich: Kategorie - Name" - getrennt wird am " - " MIT Leerzeichen,
     damit "Form- und Lagetoleranzen" heil bleibt. */
  const zerlegen = (titel) => {
    const dp = titel.indexOf(':');
    if (dp === -1) return { kopf: 'Allgemein', name: titel };
    const bereich = titel.slice(0, dp).trim();
    const rest = titel.slice(dp + 1).trim();
    const bs = rest.indexOf(' - ');
    return bs === -1
      ? { kopf: bereich, name: rest }
      : { kopf: bereich + ' / ' + rest.slice(0, bs).trim(), name: rest.slice(bs + 3).trim() };
  };

  const seiten = fs.readdirSync(TOOLS)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .map((f) => {
      const text = fs.readFileSync(path.join(TOOLS, f), 'utf8');
      const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
      const titel = t ? t[1].replace(/\s+/g, ' ').trim() : '';
      return Object.assign({ datei: f, titel, art: holen(text, 'art') || 'simulation',
        beschreibung: holen(text, 'description'),
        reihenfolge: holen(text, 'reihenfolge') }, zerlegen(titel));
    });

  p('es gibt Werkzeugseiten', seiten.length > 0);

  seiten.forEach((s) => {
    p(s.datei + ': hat einen Untertitel', !!s.beschreibung,
      'ohne <meta name="description"> bleibt die Karte nackt');
    p(s.datei + ': der Untertitel wiederholt nicht den Namen',
      s.beschreibung.toLowerCase() !== s.name.toLowerCase(), s.beschreibung);
  });

  /* Gruppiert wird wie in der Uebersicht: je Art und je Ueberschrift. */
  const gruppen = new Map();
  seiten.forEach((s) => {
    const k = s.art + ' | ' + s.kopf;
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(s);
  });
  [...gruppen].forEach(([k, block]) => {
    if (block.length < 2) return;
    const zahlen = block.map((s) => s.reihenfolge);
    p(k + ': jede Karte hat eine Reihenfolge',
      zahlen.every((z) => /^[0-9]+$/.test(z)),
      block.map((s) => s.name + '=' + (s.reihenfolge || '-')).join(', '));
    p(k + ': keine Zahl doppelt',
      new Set(zahlen).size === zahlen.length, zahlen.join(', '));
  });
}

console.log('\n' + (fehler ? fehler + ' Fehler' : 'alles gruen'));
process.exit(fehler ? 1 : 0);
}

main();
