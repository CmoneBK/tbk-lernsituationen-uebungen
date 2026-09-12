#!/usr/bin/env node
/**
 * Erzeugt die Uebersicht (index.html) und daten/material.json aus dem Bestand
 * der Ordner lernsituationen/, uebungen/ und trainings/.
 *
 * Bewusst ohne Jekyll und ohne Abhaengigkeiten: die fertige index.html liegt im
 * Repo und wird auf GitHub Pages, auf t-bk.de und lokal identisch ausgeliefert.
 * GitHub Pages baut hier nichts (siehe .nojekyll), deploy.sh im Repo
 * tbk-webseite kopiert nur noch.
 *
 * Aufruf:
 *   node build/build.mjs            erzeugen und fehlende Bausteine nachtragen
 *   node build/build.mjs --check    nur pruefen, nichts schreiben (Exit 1 bei Abweichung)
 */

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, posix } from 'node:path';

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const NUR_PRUEFEN = process.argv.includes('--check');

// Reihenfolge und Beschriftung der Materialtypen. Der Schluessel ist zugleich
// der Ordnername im Repo und der Wert von data-typ in der Uebersicht.
const TYPEN = [
  { id: 'lernsituationen', titel: 'Lernsituationen', lead: 'Vollstaendige Lernsituationen mit Auftrag, Material und Ergebnissicherung.' },
  { id: 'uebungen',        titel: 'Übungen',         lead: 'Kurze Aufgaben zum Einüben einzelner Inhalte.' },
  { id: 'trainings',       titel: 'Trainings',       lead: 'Wiederholung mit Rückmeldung – zum Festigen vor Prüfungen.' },
];

const BACK_NAV = 'assets/back-nav.js';

/* ---------- kleine Helfer ---------- */

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const normWs = (s) => String(s).replace(/\s+/g, ' ').trim();

const warnungen = [];
const warnen = (datei, text) => warnungen.push(`${datei}: ${text}`);

/* ---------- Dateien einsammeln ---------- */

/**
 * Eine Karte entsteht aus jeder HTML-Datei direkt im Typ-Ordner sowie aus
 * jeder index.html eines Unterordners. So kann eine umfangreiche Lernsituation
 * als eigener Ordner mit Bildern und Teilseiten abgelegt werden, ohne dass die
 * Teilseiten einzeln in der Uebersicht auftauchen.
 */
async function seitenSammeln(typId) {
  const basis = join(WURZEL, typId);
  if (!existsSync(basis)) return [];

  const treffer = [];
  for (const eintrag of await readdir(basis, { withFileTypes: true })) {
    if (eintrag.name.startsWith('.') || eintrag.name === 'vendor') continue;

    if (eintrag.isFile() && eintrag.name.toLowerCase().endsWith('.html')) {
      treffer.push(join(basis, eintrag.name));
    } else if (eintrag.isDirectory()) {
      const index = join(basis, eintrag.name, 'index.html');
      if (existsSync(index)) treffer.push(index);
      else warnen(posix.join(typId, eintrag.name), 'Ordner ohne index.html – erscheint nicht in der Übersicht');
    }
  }
  return treffer.sort();
}

/* ---------- Inhalt einer Seite auswerten und normalisieren ---------- */

/**
 * Liest Titel und URL einer Seite. Nebenbei werden zwei Dinge in Ordnung
 * gebracht, die beim Anlegen leicht untergehen:
 *   1. YAML-Front-Matter (--- ... ---) am Dateianfang. Ohne Jekyll wuerde es
 *      als Text im Browser stehen; der dort notierte title wird uebernommen,
 *      falls die Datei sonst keinen hat.
 *   2. Die fehlende Einbindung von assets/back-nav.js.
 * Mit --check wird nur gemeldet, nicht geschrieben.
 */
async function seiteAuswerten(datei, typId) {
  let text = await readFile(datei, 'utf8');
  const rel = relative(WURZEL, datei).split('\\').join('/');
  let geaendert = false;
  let fmTitel = '';

  const fm = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (fm) {
    const t = fm[1].match(/^\s*title\s*:\s*(.+?)\s*$/m);
    if (t) fmTitel = normWs(t[1].replace(/^["']|["']$/g, ''));
    text = text.slice(fm[0].length);
    geaendert = true;
    warnen(rel, 'YAML-Front-Matter entfernt (wird ohne Jekyll als Text angezeigt)');
  }

  if (!text.includes(BACK_NAV)) {
    const tiefe = rel.split('/').length - 1;          // lernsituationen/x.html -> 1
    const src = '../'.repeat(tiefe) + BACK_NAV;
    const zeile = `<script src="${src}"></script>\n`;
    const schluss = text.match(/([ \t]*)<\/body>/i);
    if (schluss) {
      text = text.replace(/[ \t]*<\/body>/i, `${schluss[1]}${zeile}${schluss[1]}</body>`);
    } else {
      text += `\n${zeile}`;
      warnen(rel, 'kein schließendes body-Tag gefunden – Rücklink ans Dateiende gehängt');
    }
    geaendert = true;
    warnen(rel, `Rücklink ergänzt (${src})`);
  }

  if (geaendert && !NUR_PRUEFEN) await writeFile(datei, text, 'utf8');

  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let titel = m ? normWs(m[1]) : '';
  if (!titel) titel = fmTitel;
  if (!titel) {
    const name = rel.replace(/\.html$/i, '').split('/').pop();
    titel = normWs(name.replace(/[-_]+/g, ' '));
    warnen(rel, 'kein <title> – Dateiname als Kartenbeschriftung verwendet');
  }

  return { ...titelZerlegen(titel), typ: typId, titel, url: rel, geaendert };
}

/**
 * Titel "Bereich: Unterkategorie - Name" zerlegen.
 * Getrennt wird am " - " MIT Leerzeichen, damit Bindestriche im Text
 * ("Form- und Lagetoleranzen", "Wellen-CAD-Software") nicht als Trenner gelten.
 * Ohne ":" gilt der Bereich "Allgemein", ohne " - " gibt es keine Unterkategorie.
 */
function titelZerlegen(titel) {
  let bereich = 'Allgemein';
  let rest = titel;

  const i = titel.indexOf(':');
  if (i > 0) {
    bereich = titel.slice(0, i).trim();
    rest = titel.slice(i + 1).trim();
  }

  const j = rest.indexOf(' - ');
  const kategorie = j > 0 ? rest.slice(0, j).trim() : '';
  const name = j > 0 ? rest.slice(j + 3).trim() : rest;

  return { bereich, kategorie, name };
}

/* ---------- Reihenfolge aus daten/kategorien.csv ---------- */

/**
 * Legt fest, in welcher Reihenfolge Bereiche und Unterkategorien erscheinen -
 * nuetzlich ueberall dort, wo alphabetisch fachlich falsch waere (z. B.
 * Instandhaltung nach DIN 31051: Wartung, Inspektion, Instandsetzung,
 * Verbesserung). Dieselbe Datei und dasselbe Format nutzt das Repo
 * CmoneBK-Unterrichtsmaterial, damit beide Uebersichten gleich sortieren.
 * Was dort nicht steht, wird alphabetisch hinten angehaengt.
 */
async function reihenfolgeLesen() {
  const datei = join(WURZEL, 'daten', 'kategorien.csv');
  const bereiche = [];
  const kategorien = new Map();
  if (!existsSync(datei)) return { bereiche, kategorien };

  const zeilen = (await readFile(datei, 'utf8')).split(/\r?\n/).slice(1);
  for (const zeile of zeilen) {
    if (!zeile.trim()) continue;
    const [b = '', u = ''] = zeile.split(',').map((s) => s.trim());
    if (!b) continue;
    if (!bereiche.includes(b)) bereiche.push(b);
    if (!kategorien.has(b)) kategorien.set(b, []);
    if (u && !kategorien.get(b).includes(u)) kategorien.get(b).push(u);
  }
  return { bereiche, kategorien };
}

/** Vorgabeliste zuerst, alles Weitere alphabetisch (mit deutscher Sortierung). */
function sortiert(vorgabe, vorhanden) {
  const nach = [...new Set(vorhanden)]
    .filter((x) => !vorgabe.includes(x))
    .sort((a, b) => a.localeCompare(b, 'de'));
  return [...vorgabe.filter((x) => vorhanden.includes(x)), ...nach];
}

/* ---------- HTML erzeugen ---------- */

function karteHtml(e) {
  // data-suche buendelt alles Durchsuchbare in Kleinschreibung, damit das
  // Filterskript in der Uebersicht nur einen Vergleich braucht.
  const suche = [e.name, e.bereich, e.kategorie].filter(Boolean).join(' ').toLowerCase();
  return `<a class="card" href="${escHtml(e.url)}"` +
         ` data-typ="${escHtml(e.typ)}" data-suche="${escHtml(suche)}">` +
         `<span>${escHtml(e.name)}</span></a>`;
}

function gitterHtml(eintraege, einzug) {
  const karten = eintraege
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((e) => einzug + '  ' + karteHtml(e))
    .join('\n');
  return `${einzug}<div class="grid">\n${karten}\n${einzug}</div>`;
}

function inhaltHtml(eintraege, ordnung) {
  const teile = [];

  for (const typ of TYPEN) {
    const desTyps = eintraege.filter((e) => e.typ === typ.id);
    if (!desTyps.length) continue;

    const abschnitt = [];
    abschnitt.push(`  <section class="typ" data-typ="${typ.id}">`);
    abschnitt.push(`    <h2 class="typ-titel">${escHtml(typ.titel)}</h2>`);
    abschnitt.push(`    <p class="typ-lead">${escHtml(typ.lead)}</p>`);

    for (const bereich of sortiert(ordnung.bereiche, desTyps.map((e) => e.bereich))) {
      const desBereichs = desTyps.filter((e) => e.bereich === bereich);
      if (!desBereichs.length) continue;

      abschnitt.push(`    <div class="bereich" data-bereich="${escHtml(bereich)}">`);
      abschnitt.push(`      <h3 class="bereich-titel">${escHtml(bereich)}</h3>`);

      // a) ohne Unterkategorie: direkt unter dem Bereich
      const direkt = desBereichs.filter((e) => !e.kategorie);
      if (direkt.length) {
        abschnitt.push('      <div class="gruppe">');
        abschnitt.push(gitterHtml(direkt, '        '));
        abschnitt.push('      </div>');
      }

      // b) danach je Unterkategorie ein eigener Block
      const vorgabe = ordnung.kategorien.get(bereich) ?? [];
      for (const kat of sortiert(vorgabe, desBereichs.map((e) => e.kategorie).filter(Boolean))) {
        const gruppe = desBereichs.filter((e) => e.kategorie === kat);
        if (!gruppe.length) continue;
        abschnitt.push('      <div class="gruppe">');
        abschnitt.push(`        <h4 class="kat-titel">${escHtml(kat)}</h4>`);
        abschnitt.push(gitterHtml(gruppe, '        '));
        abschnitt.push('      </div>');
      }

      abschnitt.push('    </div>');
    }

    abschnitt.push('  </section>');
    teile.push(abschnitt.join('\n'));
  }

  if (!teile.length) {
    return '    <p class="leer">Noch kein Material veröffentlicht.</p>';
  }
  return teile.join('\n\n');
}

/* ---------- Hauptlauf ---------- */

const ordnung = await reihenfolgeLesen();

const eintraege = [];
for (const typ of TYPEN) {
  for (const datei of await seitenSammeln(typ.id)) {
    eintraege.push(await seiteAuswerten(datei, typ.id));
  }
}

const vorlage = await readFile(join(WURZEL, 'build', 'uebersicht-vorlage.html'), 'utf8');
const MARKE = '<!-- INHALT -->';
if (!vorlage.includes(MARKE)) {
  console.error('build/uebersicht-vorlage.html: Platzhalter INHALT fehlt.');
  process.exit(1);
}

const hinweis = '<!-- Erzeugt von build/build.mjs – nicht von Hand bearbeiten.\n' +
                '     Design ändern: build/uebersicht-vorlage.html, danach neu bauen. -->\n';
const indexHtml = hinweis + vorlage.replace(MARKE, inhaltHtml(eintraege, ordnung));

const json = JSON.stringify(
  eintraege.map(({ typ, bereich, kategorie, name, titel, url }) =>
    ({ typ, bereich, kategorie, name, titel, url })),
  null, 2,
) + '\n';

const ziele = [
  [join(WURZEL, 'index.html'), indexHtml],
  [join(WURZEL, 'daten', 'material.json'), json],
];

let abweichung = false;
for (const [pfad, inhalt] of ziele) {
  const alt = existsSync(pfad) ? await readFile(pfad, 'utf8') : null;
  if (alt === inhalt) continue;
  abweichung = true;
  if (!NUR_PRUEFEN) await writeFile(pfad, inhalt, 'utf8');
}

for (const w of warnungen) console.warn('  ! ' + w);

const anzahl = TYPEN
  .map((t) => `${eintraege.filter((e) => e.typ === t.id).length} ${t.titel}`)
  .join(', ');

if (NUR_PRUEFEN) {
  const unsauber = abweichung || eintraege.some((e) => e.geaendert);
  console.log(unsauber
    ? 'Übersicht ist nicht aktuell – "node build/build.mjs" ausführen.'
    : `Übersicht ist aktuell (${anzahl}).`);
  process.exit(unsauber ? 1 : 0);
}

console.log(`Übersicht erzeugt: ${anzahl}.`);
