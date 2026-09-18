/* Sagt jede Seite, woher ihre Zahlen stammen?
 *
 * Normmaße sind frei - sie stehen in der Norm und in jedem Katalog. Die
 * Zusammenstellung eines Verlags ist es nicht. Deshalb trägt jede Seite mit
 * fremden Zahlen zwei Felder im Kopf:
 *
 *     <meta name="quellen" content="tabellenbuch hersteller">
 *     <meta name="normen" content="DIN EN ISO 4063, DIN EN ISO 6947">
 *
 * Diese Prüfung hält drei Dinge nach:
 *
 *   1. Die Mechanik stimmt. Ein Schlüssel, den assets/quellen.js nicht
 *      kennt, fällt dort stillschweigend heraus - die Seite sähe aus, als
 *      trüge sie ihren Nachweis, und täte es nicht. Umgekehrt ist ein
 *      eingebundener Baustein ohne Meta-Feld totes Gewicht.
 *
 *   2. Das Feld "normen" enthält Normen. Eine Richtlinie wie VDI 2230 ist
 *      keine - sie hat ihren eigenen Satz, sonst stünde am Ende
 *      "Maße und Bezeichnungen nach VDI 2230", und das stimmt nicht.
 *
 *   3. Keine Verlagstabelle ist vollständig nachgebaut. Das ist der Punkt,
 *      an dem aus Zitat Übernahme wird: Wer eine Auswahl kürzt, benutzt
 *      sie; wer sie ganz abschreibt, ersetzt das Buch. Geprüft wird nur
 *      gegen tabellenbuch/daten.json, und nur gegen die Abschnitte, die
 *      keine Norm hinter sich haben - Normtabellen darf man vollständig
 *      zeigen.
 *
 * Punkt 3 braucht tabellenbuch/daten.json. Der Ordner steht in .gitignore;
 * fehlt er, entfällt dieser Teil und die übrigen gelten weiter.
 */
const fs = require('fs'), path = require('path');

const { MATERIAL, TOOLS, teilweise } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was
    + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* ---------- Welche Schlüssel kennt der Baustein? ----------
   Aus der Quelle gelesen und nicht hier noch einmal aufgeschrieben: Sonst
   wüsste die Prüfung von einem neuen Schlüssel als Letzte. */
const BAUSTEIN = fs.readFileSync(
  path.join(MATERIAL, 'assets/quellen.js'), 'utf8');
const BEKANNT = (() => {
  const block = BAUSTEIN.match(/var TEXTE = \{([\s\S]*?)\n  \};/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s{4}([A-Za-z_][\w]*)\s*:/gm)]
    .map((m) => m[1]);
})();

/* ---------- Die Seiten ---------- */
function seitenUnter(wurzel, ...teile) {
  const gefunden = [];
  const gehen = (ort) => {
    let eintraege;
    try { eintraege = fs.readdirSync(ort, { withFileTypes: true }); }
    catch (e) { return; }
    for (const e of eintraege) {
      const voll = path.join(ort, e.name);
      if (e.isDirectory()) gehen(voll);
      else if (e.name.endsWith('.html')) gefunden.push(voll);
    }
  };
  for (const t of teile) gehen(path.join(wurzel, t));
  return gefunden.sort();
}

const SEITEN = seitenUnter(MATERIAL, 'uebungen', 'trainings', 'lernsituationen');
if (teilweise(TOOLS, 'Werkzeug-Repo')) SEITEN.push(...seitenUnter(TOOLS, '.'));

const metaAus = (text, name) => {
  const m = text.match(new RegExp(
    '<meta[^>]*name="' + name + '"[^>]*content="([^"]*)"', 'i'));
  return m ? m[1].trim() : '';
};

/* Eine Normangabe sieht so aus und nicht anders. Das Jahr in Klammern ist
   erlaubt, der Teilstrich auch - "und" als Aufzählungswort nicht: Die Zeile
   setzt die Kommata selbst. */
const NORM = /^(?:DIN(?: EN)?(?: ISO)?|EN(?: ISO)?|ISO)\s\d{1,5}(?:-\d{1,3})?$/;

console.log('\nDie Mechanik');
{
  p('assets/quellen.js kennt Schlüssel', BEKANNT.length >= 3,
    BEKANNT.join(' '));

  for (const datei of SEITEN) {
    const rel = path.relative(MATERIAL, datei).split(path.sep).join('/');
    const text = fs.readFileSync(datei, 'utf8');
    const quellen = metaAus(text, 'quellen');
    const normen = metaAus(text, 'normen');
    const eingebunden = /<script[^>]+src="[^"]*assets\/quellen\.js"/.test(text);

    if (!quellen && !normen && !eingebunden) continue;

    if (quellen) {
      const unbekannt = quellen.split(/\s+/).filter(Boolean)
        .filter((k) => BEKANNT.indexOf(k.replace(/-/g, '_')) < 0);
      p(rel + ': alle Quellenschlüssel sind bekannt', !unbekannt.length,
        unbekannt.join(' '));
    }

    p(rel + ': Nachweis genannt, Baustein eingebunden',
      !(quellen || normen) || eingebunden);
    p(rel + ': Baustein eingebunden, Nachweis genannt',
      !eingebunden || !!(quellen || normen));

    if (normen) {
      const stuecke = normen.split(',').map((s) => s.trim()).filter(Boolean);
      const schief = stuecke.filter((s) => !NORM.test(s));
      p(rel + ': das Feld "normen" enthält nur Normen', !schief.length,
        schief.join(' | '));
      const doppelt = stuecke.filter((s, i) => stuecke.indexOf(s) !== i);
      p(rel + ': keine Norm doppelt', !doppelt.length, doppelt.join(' '));
    }
  }
}

/* ---------- Punkt 3: ist eine Verlagstabelle ganz abgeschrieben? ---------- */
const DATEN = path.join(MATERIAL, 'tabellenbuch/daten.json');
if (!fs.existsSync(DATEN)) {
  console.log('\n  ohne   Verlagstabellen: tabellenbuch/daten.json ist hier '
    + 'nicht ausgecheckt');
} else {
  console.log('\nKeine Verlagstabelle vollständig nachgebaut');
  const TB = JSON.parse(fs.readFileSync(DATEN, 'utf8'));

  /* Nur Abschnitte ohne Norm dahinter. Eine Normtabelle darf vollständig
     dastehen - sie gehört niemandem. */
  const hatNorm = (o) => {
    const q = String((o && o._quelle) || '') + String((o && o._hinweis) || '');
    return /\b(?:DIN|EN|ISO|VDI)\b/.test(q);
  };

  /* Aus dem Baum alle Tabellen holen: ein Objekt, dessen Schlüssel die
     Zeilen sind. Zu kleine und zu kurz benannte taugen nicht zum Vergleich -
     "M4" stünde auf jeder zweiten Seite. */
  const tabellen = [];
  const sammeln = (o, name, geerbt) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    const norm = geerbt || hatNorm(o);
    const zeilen = Object.keys(o).filter((k) => !k.startsWith('_'));
    const eigen = zeilen.filter((k) => k.length >= 4
      && typeof o[k] !== 'object');
    const unter = zeilen.filter((k) => o[k] && typeof o[k] === 'object');
    if (!norm && zeilen.length >= 6 && unter.length === zeilen.length) {
      const brauchbar = zeilen.filter((k) => k.length >= 4);
      if (brauchbar.length >= 6) tabellen.push([name, brauchbar]);
    }
    if (eigen.length && !norm && eigen.length >= 6) {
      tabellen.push([name, eigen]);
    }
    for (const k of unter) sammeln(o[k], name + '.' + k, norm);
  };
  for (const k of Object.keys(TB)) {
    if (k.startsWith('_')) continue;
    sammeln(TB[k], k, hatNorm(TB[k]));
  }

  /* Wie viel von einer Tabelle darf dastehen? Die Grenze ist eine
     Setzung, kein Rechtssatz - sie soll den Fall treffen, in dem jemand
     eine Tabelle abschreibt statt auszuwaehlen. Beim Stand dieser Zeile
     kommt das Material hoechstens auf 6 von 10 Zeilen (Einschraubtiefen in
     der Lektion Schraubverbindungen); ab 8 von 10 schlaegt es an. */
  const GRENZE = 0.75;
  let gemeldet = 0;
  for (const datei of SEITEN) {
    const rel = path.relative(MATERIAL, datei).split(path.sep).join('/');
    const text = fs.readFileSync(datei, 'utf8');
    for (const [name, zeilen] of tabellen) {
      const da = zeilen.filter((z) => text.includes(z)).length;
      if (da / zeilen.length >= GRENZE) {
        p(rel + ': Tabelle "' + name + '" nicht vollständig übernommen',
          false, da + ' von ' + zeilen.length + ' Zeilen');
        gemeldet++;
      }
    }
  }
  p(tabellen.length + ' Verlagstabellen gegen ' + SEITEN.length
    + ' Seiten gehalten', gemeldet === 0);
}

console.log(fehler ? '\n' + fehler + ' Fehler.'
  : '\nJede Seite sagt, woher ihre Zahlen stammen.');
process.exitCode = fehler ? 1 : 0;
