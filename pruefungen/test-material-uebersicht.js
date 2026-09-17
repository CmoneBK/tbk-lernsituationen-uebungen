/* Die Startseite des Materialbereichs: Art, Thema, Suche.
 *
 * Drei Filter, die zusammenwirken müssen. Bis hierher gab es nur den nach
 * der Art - Lernsituationen, Übungen, Trainings. Wer alles zu den Schrauben
 * sehen wollte, musste durch drei Abschnitte scrollen. Jetzt steht neben der
 * Suche eine Themenauswahl, gespeist aus Bereich und Unterkategorie der
 * Titel: "Maschinenelemente: Schrauben - Schraubverbindungen".
 *
 * Geprüft wird, was dabei schiefgehen kann:
 *   - Trägt jede Karte ihr Thema, und steht jedes Thema in der Liste?
 *   - Filtern Art und Thema zusammen (UND), nicht gegeneinander?
 *   - Verschwinden leere Überschriften - und bleibt keine ohne Karten stehen?
 *   - Stimmen die Zahlen, die vorher sagen, was ein Klick bringt?
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

async function seite() {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(
    mitAssets(fs.readFileSync(path.join(BASIS, 'index.html'), 'utf8')), {
      runScripts: 'dangerously', virtualConsole: vc,
      url: 'https://t-bk.de/unterrichtsmaterial/index.html',
      beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
    });
  await fertig(dom);
  return { w: dom.window, d: dom.window.document, laut };
}

async function main() {
  const { w, d, laut } = await seite();
  const karten = [...d.querySelectorAll('a.card')];
  const wahl = d.getElementById('tbk-thema');
  const suche = d.getElementById('tbk-suche');
  const sichtbar = () => karten.filter((k) => !k.hidden);
  const chip = (f) => d.querySelector('.chip[data-filter="' + f + '"]');
  const klick = (e) => e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const waehle = (v) => {
    wahl.value = v;
    wahl.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  const tippe = (t) => {
    suche.value = t;
    suche.dispatchEvent(new w.Event('input', { bubbles: true }));
  };

  console.log('\nDie Seite und ihre Themen');
  p('lädt ohne Fehler', laut.length === 0, laut[0]);
  p('es gibt Karten', karten.length > 5, String(karten.length));
  p('die Themenauswahl ist da', !!wahl);

  /* Jede Karte trägt ein Thema, und jedes Thema steht zur Wahl. */
  const themenDerKarten = new Set(karten.map((k) => k.dataset.thema));
  p('jede Karte trägt ein Thema',
    !themenDerKarten.has(undefined) && !themenDerKarten.has(''),
    karten.filter((k) => !k.dataset.thema).map((k) => k.getAttribute('href')).join(', '));
  const zurWahl = new Set([...wahl.options].map((o) => o.value).filter((v) => v !== 'alle'));
  const fehlend = [...themenDerKarten].filter((t) => !zurWahl.has(t));
  p('jedes Thema steht in der Liste', fehlend.length === 0, fehlend.join(', '));
  const ueberzaehlig = [...zurWahl].filter((t) => !themenDerKarten.has(t));
  p('und die Liste kennt keins zu viel', ueberzaehlig.length === 0, ueberzaehlig.join(', '));
  /* Die Bereiche gliedern die Liste - so steht "Schrauben" unter
     "Maschinenelemente" und nicht allein in der Gegend herum. */
  p('die Bereiche gliedern die Liste',
    d.querySelectorAll('#tbk-thema optgroup').length > 0);

  console.log('\nNach Thema filtern');
  const schrauben = [...zurWahl].find((t) => /schrauben/.test(t));
  p('es gibt ein Thema Schrauben', !!schrauben, [...zurWahl].join(', '));
  if (schrauben) {
    waehle(schrauben);
    const n = sichtbar();
    p('nur noch Karten dieses Themas',
      n.length > 0 && n.every((k) => k.dataset.thema === schrauben),
      n.map((k) => k.dataset.thema).join(', '));
    p('aber alle drei Arten sind dabei',
      new Set(n.map((k) => k.dataset.typ)).size === 3,
      n.map((k) => k.dataset.typ).join(', '));

    /* Keine Überschrift ohne Karten darunter. */
    const leereKoepfe = [...d.querySelectorAll('.gruppe, .bereich, section.typ')]
      .filter((g) => !g.hidden && !g.querySelector('a.card:not([hidden])'));
    p('keine Überschrift bleibt ohne Karten stehen', leereKoepfe.length === 0,
      leereKoepfe.map((g) => (g.textContent || '').trim().slice(0, 30)).join(' | '));

    console.log('\nArt und Thema zusammen');
    klick(chip('trainings'));
    const beide = sichtbar();
    p('beide Filter wirken mit UND',
      beide.length > 0 && beide.every(
        (k) => k.dataset.typ === 'trainings' && k.dataset.thema === schrauben),
      beide.map((k) => k.dataset.typ + '/' + k.dataset.thema).join(', '));

    /* Die Zahl am Knopf gilt fuer das gewaehlte Thema, die Zahl hinter
       einem Thema fuer die gewaehlte Art - sonst verspricht sie etwas,
       was der Klick nicht haelt. */
    const zahlAmKnopf = Number(chip('trainings').querySelector('.n').textContent);
    p('die Zahl am Knopf gilt für das gewählte Thema',
      zahlAmKnopf === beide.length, zahlAmKnopf + ' statt ' + beide.length);
    const zeile = [...wahl.options].find((o) => o.value === schrauben).textContent;
    p('die Zahl am Thema gilt für die gewählte Art',
      zeile.indexOf('(' + beide.length + ')') !== -1, zeile);

    console.log('\nUnd die Suche kommt dazu');
    tippe('zzzgibtesnicht');
    p('nichts mehr übrig', sichtbar().length === 0);
    p('und die Seite sagt es',
      !d.getElementById('tbk-leer').hidden);

    tippe('');
    waehle('alle');
    klick(chip('alle'));
    p('zurückgesetzt ist wieder alles da', sichtbar().length === karten.length,
      sichtbar().length + ' von ' + karten.length);
  }

  reihenfolgePruefen(d);

  w.close();
  console.log('\n' + (fehler ? fehler + ' Befunde' : 'alles gruen'));
  process.exit(fehler ? 1 : 0);
}

/* ---------------------------------------------------------------------
   Die Reihenfolge der Karten.

   Alphabetisch ist fachlich oft falsch: Der Ueberblick ueber die
   Fuegeverfahren gehoert vor das einzelne Verfahren, und die Antriebswelle
   kommt vor der Abtriebswelle, obwohl das Alphabet es andersherum sieht.
   Jedes Paket sagt in info.json, an welchen Platz es gehoert; der Build
   sortiert danach und schreibt den Platz nach daten/material.json.
   --------------------------------------------------------------------- */
function reihenfolgePruefen(d) {
  console.log('\nDie Reihenfolge der Karten');
  const alle = JSON.parse(
    fs.readFileSync(path.join(BASIS, 'daten', 'material.json'), 'utf8'));

  const ohne = alle.filter((e) => !e.platz);
  p('jede Karte hat einen Platz', ohne.length === 0,
    ohne.map((e) => e.url).join(', '));

  /* Ein Name allein laesst raten, wovon die Seite handelt - "Ueberblick"
     unter der Ueberschrift FUEGEVERFAHREN war zu wenig. Zu lang darf er
     auch nicht sein: Eine doppelt hohe Karte reisst eine Luecke ins Gitter. */
  const MAX = 140;
  const stumm = alle.filter((e) => !(e.untertitel || '').trim());
  p('jede Karte hat einen Untertitel', stumm.length === 0,
    stumm.map((e) => e.url).join(', '));
  const lang = alle.filter((e) => (e.untertitel || '').length > MAX);
  p('und keiner ist laenger als ' + MAX + ' Zeichen', lang.length === 0,
    lang.map((e) => e.url + ' (' + e.untertitel.length + ')').join(', '));

  const sichtbarOhne = [...d.querySelectorAll('a.card')]
    .filter((a) => !a.querySelector('.kartensub'));
  p('und die Uebersicht zeigt ihn auch', sichtbarOhne.length === 0,
    sichtbarOhne.map((a) => a.getAttribute('href')).join(', '));

  /* In einer Gruppe darf weder ein Name noch ein Platz zweimal vorkommen -
     sonst steht "Ueberblick" neben "Ueberblick", und welcher vorn landet,
     entscheidet der Zufall der Ordnernamen. */
  const gruppen = new Map();
  alle.forEach((e) => {
    const k = [e.typ, e.bereich, e.kategorie].join(' / ');
    if (!gruppen.has(k)) gruppen.set(k, []);
    gruppen.get(k).push(e);
  });
  const doppelt = [];
  for (const [k, g] of gruppen) {
    const namen = g.map((e) => e.name);
    const plaetze = g.map((e) => e.platz);
    namen.forEach((n, i) => {
      if (namen.indexOf(n) !== i) doppelt.push(k + ': "' + n + '" zweimal');
    });
    plaetze.forEach((x, i) => {
      if (plaetze.indexOf(x) !== i) doppelt.push(k + ': Platz ' + x + ' zweimal');
    });
  }
  p('kein Name und kein Platz doppelt in derselben Gruppe',
    doppelt.length === 0, doppelt.join('; '));

  /* Und die erzeugte Startseite zeigt sie auch in dieser Reihenfolge. */
  const platzVon = new Map(alle.map((e) => [e.url, e.platz]));
  const verdreht = [];
  [...d.querySelectorAll('.grid')].forEach((gitter) => {
    const folge = [...gitter.querySelectorAll('a.card')]
      .map((a) => platzVon.get(a.getAttribute('href')));
    for (let i = 1; i < folge.length; i++) {
      if (folge[i - 1] > folge[i]) {
        verdreht.push(folge.join(' vor ') + ' in '
          + (gitter.closest('.bereich') || {}).dataset?.bereich);
      }
    }
  });
  p('die Startseite ordnet die Karten danach', verdreht.length === 0,
    verdreht.join('; '));
}

main();
