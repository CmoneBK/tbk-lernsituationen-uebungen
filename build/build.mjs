#!/usr/bin/env node
/**
 * Erzeugt die Übersicht (index.html), die Paketseiten und daten/material.json
 * aus dem Bestand der Ordner lernsituationen/, uebungen/ und trainings/.
 *
 * Bewusst ohne Jekyll und ohne Abhaengigkeiten: die fertigen Seiten liegen im
 * Repo und werden auf GitHub Pages, auf t-bk.de und lokal identisch
 * ausgeliefert. GitHub Pages baut hier nichts (siehe .nojekyll), deploy.sh im
 * Repo tbk-webseite kopiert nur noch.
 *
 * Aufbau des Bestands
 * -------------------
 *   uebungen/<paket>/       Uebungspaket   - index.html wird ERZEUGT
 *   trainings/<paket>/      Trainingspaket - index.html wird ERZEUGT
 *   lernsituationen/<ls>/   Lernsituation  - index.html ist HANDGESCHRIEBEN
 *   <typ>/<datei>.html      Einzelstueck ohne Paket
 *
 * Ein Paket beschreibt sich in info.json (titel, lead, werkzeuge, reihenfolge).
 * Eine Lernsituation darf dieselbe Datei nutzen, braucht sie aber nicht - ihr
 * Titel steht im <title> ihrer index.html.
 *
 * Aufruf:
 *   node build/build.mjs            erzeugen und fehlende Bausteine nachtragen
 *   node build/build.mjs --check    nur pruefen, nichts schreiben (Exit 1 bei Abweichung)
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, posix } from 'node:path';

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const NUR_PRUEFEN = process.argv.includes('--check');

// Reihenfolge und Beschriftung der Materialtypen. Der Schluessel ist zugleich
// der Ordnername im Repo und der Wert von data-typ in der Uebersicht.
// "paket" sagt, ob Unterordner Sammlungen sind (erzeugte Uebersicht) oder ein
// einzelnes, selbst geschriebenes Dokument.
const TYPEN = [
  {
    id: 'lernsituationen', titel: 'Lernsituationen', paket: false,
    lead: 'Vollständige Lernsituationen mit Auftrag, Material und Ergebnissicherung.',
    einheit: ['Seite', 'Seiten'],
  },
  {
    id: 'uebungen', titel: 'Übungen', paket: true,
    lead: 'Kurze Aufgaben zum Einüben einzelner Inhalte, gebündelt in Paketen.',
    einheit: ['Übung', 'Übungen'],
  },
  {
    id: 'trainings', titel: 'Trainings', paket: true,
    lead: 'Wiederholung mit Rückmeldung – zum Festigen vor Prüfungen.',
    einheit: ['Training', 'Trainings'],
  },
];

const BACK_NAV = 'assets/back-nav.js';
const WZ_LINK = 'assets/werkzeug-link.js';
const QR = 'assets/qr.js';
const BAUKASTEN = 'assets/baukasten.js';
const EXPORT = 'assets/export.js';

/* ---------- kleine Helfer ---------- */

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const normWs = (s) => String(s).replace(/\s+/g, ' ').trim();

const relPfad = (datei) => relative(WURZEL, datei).split('\\').join('/');

const warnungen = [];
const warnen = (datei, text) => warnungen.push(`${datei}: ${text}`);

const anzahlText = (n, [eins, viele]) => `${n} ${n === 1 ? eins : viele}`;

/* ---------- Metadaten einer HTML-Datei ---------- */

const metaWert = (text, name) => {
  const m = text.match(
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
  );
  return m ? normWs(m[1]) : '';
};

/**
 * Liest Titel und Beschreibung einer Seite. Nebenbei werden drei Dinge in
 * Ordnung gebracht, die beim Anlegen leicht untergehen:
 *   1. YAML-Front-Matter (--- ... ---) am Dateianfang. Ohne Jekyll wuerde es
 *      als Text im Browser stehen; der dort notierte title wird uebernommen,
 *      falls die Datei sonst keinen hat.
 *   2. Die fehlende Einbindung von assets/back-nav.js.
 *   3. Die fehlende Einbindung von assets/werkzeug-link.js, sobald die Seite
 *      einen Werkzeug-Link (data-werkzeug) enthaelt.
 * Mit --check wird nur gemeldet, nicht geschrieben.
 */
async function seiteLesen(datei, { imPaket = false, baukasten = false } = {}) {
  let text = await readFile(datei, 'utf8');
  const rel = relPfad(datei);
  const tiefe = rel.split('/').length - 1;          // uebungen/paket/x.html -> 2
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

  // Bausteine, die die Seite braucht. Der Ruecklink fuehrt innerhalb eines
  // Pakets zur Paketuebersicht, sonst zur Startseite des Materialbereichs.
  const noetig = [{ pfad: BACK_NAV, attr: imPaket ? ' data-ziel="./"' : '' }];
  if (/data-werkzeug=/.test(text)) noetig.push({ pfad: WZ_LINK, attr: '' });
  // Uebungen und Trainings lassen sich fuer eine Lerngruppe zuschneiden. Der
  // QR-Code gehoert dazu, deshalb beide Bausteine und in dieser Reihenfolge.
  if (baukasten) {
    noetig.push({ pfad: QR, attr: '' });
    noetig.push({ pfad: BAUKASTEN, attr: '' });
    noetig.push({ pfad: EXPORT, attr: '' });
  }

  for (const { pfad, attr } of noetig) {
    if (text.includes(pfad)) continue;
    const src = '../'.repeat(tiefe) + pfad;
    const zeile = `<script src="${src}"${attr}></script>\n`;
    const schluss = text.match(/([ \t]*)<\/body>/i);
    if (schluss) {
      text = text.replace(/[ \t]*<\/body>/i, `${schluss[1]}${zeile}${schluss[1]}</body>`);
    } else {
      text += `\n${zeile}`;
      warnen(rel, 'kein schließendes body-Tag gefunden – Baustein ans Dateiende gehängt');
    }
    geaendert = true;
    warnen(rel, `${pfad} ergänzt (${src})`);
  }

  if (geaendert && !NUR_PRUEFEN) await writeFile(datei, text, 'utf8');

  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let titel = m ? normWs(m[1]) : '';
  if (!titel) titel = fmTitel;
  if (!titel) {
    titel = normWs(rel.replace(/\.html$/i, '').split('/').pop().replace(/[-_]+/g, ' '));
    warnen(rel, 'kein <title> – Dateiname als Beschriftung verwendet');
  }

  return {
    titel,
    beschreibung: metaWert(text, 'description'),
    dauer: metaWert(text, 'dauer'),
    url: rel,
    geaendert,
  };
}

/**
 * Titel "Bereich: Unterkategorie - Name" zerlegen.
 * Getrennt wird am " - " MIT Leerzeichen, damit Bindestriche im Text
 * ("Form- und Lagetoleranzen", "Welle-Nabe-Verbindung") nicht als Trenner
 * gelten. Ohne ":" gilt der Bereich "Allgemein", ohne " - " gibt es keine
 * Unterkategorie.
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
  return {
    bereich,
    kategorie: j > 0 ? rest.slice(0, j).trim() : '',
    name: j > 0 ? rest.slice(j + 3).trim() : rest,
  };
}

/* ---------- Bestand einsammeln ---------- */

async function infoLesen(ordner) {
  const datei = join(ordner, 'info.json');
  if (!existsSync(datei)) return null;
  try {
    return JSON.parse(await readFile(datei, 'utf8'));
  } catch (e) {
    warnen(posix.join(relPfad(ordner), 'info.json'), `nicht lesbar (${e.message})`);
    return null;
  }
}

/** Dateien eines Pakets in der gewuenschten Reihenfolge: erst laut info.json, dann alphabetisch. */
function paketReihenfolge(dateien, vorgabe = []) {
  const rest = dateien.filter((f) => !vorgabe.includes(f)).sort();
  return [...vorgabe.filter((f) => dateien.includes(f)), ...rest];
}

async function typSammeln(typ) {
  const basis = join(WURZEL, typ.id);
  if (!existsSync(basis)) return [];

  const eintraege = [];
  for (const e of (await readdir(basis, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith('.') || e.name === 'vendor') continue;

    // a) Einzelstueck direkt im Typ-Ordner
    if (e.isFile() && e.name.toLowerCase().endsWith('.html')) {
      const s = await seiteLesen(join(basis, e.name), { baukasten: typ.paket });
      eintraege.push({ typ: typ.id, ...titelZerlegen(s.titel), ...s, werkzeuge: [], inhalt: [] });
      continue;
    }
    if (!e.isDirectory()) continue;

    const ordner = join(basis, e.name);
    const info = await infoLesen(ordner) ?? {};
    const dateien = (await readdir(ordner))
      .filter((f) => f.toLowerCase().endsWith('.html') && f.toLowerCase() !== 'index.html');

    // b) Lernsituation: eigenes Dokument, index.html ist handgeschrieben
    if (!typ.paket) {
      const index = join(ordner, 'index.html');
      if (!existsSync(index)) {
        warnen(posix.join(typ.id, e.name), 'Ordner ohne index.html – erscheint nicht in der Übersicht');
        continue;
      }
      const s = await seiteLesen(index);
      // Weitere Seiten der Lernsituation bekommen die Bausteine ebenfalls.
      for (const f of dateien) await seiteLesen(join(ordner, f), { imPaket: true });
      eintraege.push({
        typ: typ.id, ...titelZerlegen(info.titel ?? s.titel), ...s,
        beschreibung: info.lead ?? s.beschreibung,
        werkzeuge: info.werkzeuge ?? [],
        inhalt: [],
        unterseiten: dateien.length,
      });
      continue;
    }

    // c) Uebungs- oder Trainingspaket: Uebersicht wird erzeugt
    if (!info.titel) {
      warnen(posix.join(typ.id, e.name, 'info.json'), 'ohne "titel" – Ordnername wird verwendet');
    }
    if (!dateien.length) {
      warnen(posix.join(typ.id, e.name), 'Paket ohne Inhalt – erscheint nicht in der Übersicht');
      continue;
    }

    const inhalt = [];
    for (const f of paketReihenfolge(dateien, info.reihenfolge)) {
      const s = await seiteLesen(join(ordner, f), { imPaket: true, baukasten: true });
      inhalt.push({ ...s, datei: f });
    }

    eintraege.push({
      typ: typ.id,
      ...titelZerlegen(info.titel ?? normWs(e.name.replace(/[-_]+/g, ' '))),
      beschreibung: info.lead ?? '',
      url: posix.join(typ.id, e.name, 'index.html'),
      ordner,
      werkzeuge: info.werkzeuge ?? [],
      inhalt,
    });
  }
  return eintraege;
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

  for (const zeile of (await readFile(datei, 'utf8')).split(/\r?\n/).slice(1)) {
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

/* ---------- Vorlagen ---------- */

const MARKE = '<!-- INHALT -->';

async function vorlageFuellen(name, ersatz) {
  const pfad = join(WURZEL, 'build', name);
  const v = await readFile(pfad, 'utf8');
  if (!v.includes(MARKE)) {
    console.error(`build/${name}: Platzhalter INHALT fehlt.`);
    process.exit(1);
  }
  let out = v.replace(MARKE, ersatz.inhalt);
  for (const [schluessel, wert] of Object.entries(ersatz.felder ?? {})) {
    out = out.split(`{{${schluessel}}}`).join(wert);
  }
  return '<!-- Erzeugt von build/build.mjs – nicht von Hand bearbeiten.\n' +
         `     Design ändern: build/${name}, danach neu bauen. -->\n` + out;
}

/* ---------- Haupt-Uebersicht ---------- */

function karteHtml(e, typ) {
  // data-suche buendelt alles Durchsuchbare in Kleinschreibung, damit das
  // Filterskript in der Uebersicht nur einen Vergleich braucht. Bei einem Paket
  // gehoeren die Titel der enthaltenen Uebungen dazu - sonst findet die Suche
  // nach "Drehmoment" das Paket nicht, in dem die Aufgabe steckt.
  const suche = [e.name, e.bereich, e.kategorie, e.beschreibung,
                 ...e.inhalt.map((i) => i.titel)]
    .filter(Boolean).join(' ').toLowerCase();

  const zusatz = e.inhalt.length
    ? `<span class="anzahl">${escHtml(anzahlText(e.inhalt.length, typ.einheit))}</span>`
    : '';

  return `<a class="card" href="${escHtml(e.url)}"` +
         ` data-typ="${escHtml(e.typ)}" data-suche="${escHtml(suche)}">` +
         `<span class="kartenname">${escHtml(e.name)}</span>${zusatz}</a>`;
}

function gitterHtml(eintraege, typ, einzug) {
  const karten = eintraege
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((e) => einzug + '  ' + karteHtml(e, typ))
    .join('\n');
  return `${einzug}<div class="grid">\n${karten}\n${einzug}</div>`;
}

function uebersichtInhalt(alle, ordnung) {
  const teile = [];

  for (const typ of TYPEN) {
    const desTyps = alle.filter((e) => e.typ === typ.id);
    if (!desTyps.length) continue;

    const a = [];
    a.push(`  <section class="typ" data-typ="${typ.id}">`);
    a.push(`    <h2 class="typ-titel">${escHtml(typ.titel)}</h2>`);
    a.push(`    <p class="typ-lead">${escHtml(typ.lead)}</p>`);

    for (const bereich of sortiert(ordnung.bereiche, desTyps.map((e) => e.bereich))) {
      const desBereichs = desTyps.filter((e) => e.bereich === bereich);
      if (!desBereichs.length) continue;

      a.push(`    <div class="bereich" data-bereich="${escHtml(bereich)}">`);
      a.push(`      <h3 class="bereich-titel">${escHtml(bereich)}</h3>`);

      // a) ohne Unterkategorie: direkt unter dem Bereich
      const direkt = desBereichs.filter((e) => !e.kategorie);
      if (direkt.length) {
        a.push('      <div class="gruppe">');
        a.push(gitterHtml(direkt, typ, '        '));
        a.push('      </div>');
      }

      // b) danach je Unterkategorie ein eigener Block
      const vorgabe = ordnung.kategorien.get(bereich) ?? [];
      for (const kat of sortiert(vorgabe, desBereichs.map((e) => e.kategorie).filter(Boolean))) {
        const gruppe = desBereichs.filter((e) => e.kategorie === kat);
        if (!gruppe.length) continue;
        a.push('      <div class="gruppe">');
        a.push(`        <h4 class="kat-titel">${escHtml(kat)}</h4>`);
        a.push(gitterHtml(gruppe, typ, '        '));
        a.push('      </div>');
      }

      a.push('    </div>');
    }

    a.push('  </section>');
    teile.push(a.join('\n'));
  }

  return teile.length
    ? teile.join('\n\n')
    : '    <p class="leer">Noch kein Material veröffentlicht.</p>';
}

/* ---------- Paketseite ---------- */

function werkzeugeHtml(werkzeuge) {
  if (!werkzeuge.length) return '';
  const links = werkzeuge.map((w) => {
    const datei = typeof w === 'string' ? w : w.datei;
    const name = typeof w === 'string' ? 'Werkzeug öffnen' : (w.name ?? 'Werkzeug öffnen');
    const fach = typeof w === 'object' && w.fach ? ` data-fach="${escHtml(w.fach)}"` : '';
    return `        <a class="werkzeug" data-werkzeug="${escHtml(datei)}"${fach}>` +
           `${escHtml(name)}</a>`;
  }).join('\n');
  return `      <div class="werkzeuge">\n` +
         `        <p class="werkzeuge-lead">Passendes interaktives Werkzeug:</p>\n` +
         `${links}\n      </div>\n`;
}

function paketInhalt(e) {
  const zeilen = [];
  zeilen.push(werkzeugeHtml(e.werkzeuge));
  zeilen.push('      <ol class="liste">');
  for (const i of e.inhalt) {
    const dauer = i.dauer ? `<span class="dauer">${escHtml(i.dauer)}</span>` : '';
    const besch = i.beschreibung ? `<span class="besch">${escHtml(i.beschreibung)}</span>` : '';
    zeilen.push(
      `        <li><a class="eintrag" href="${escHtml(i.datei)}">` +
      `<span class="eintrag-kopf"><span class="eintrag-name">${escHtml(i.titel)}</span>${dauer}</span>` +
      `${besch}</a></li>`,
    );
  }
  zeilen.push('      </ol>');
  return zeilen.filter(Boolean).join('\n');
}

/* ---------- Hauptlauf ---------- */

const ordnung = await reihenfolgeLesen();

const alle = [];
for (const typ of TYPEN) alle.push(...await typSammeln(typ));

const ziele = [];

// Paketseiten
for (const typ of TYPEN.filter((t) => t.paket)) {
  for (const e of alle.filter((x) => x.typ === typ.id && x.inhalt.length)) {
    ziele.push([join(WURZEL, e.url), await vorlageFuellen('paket-vorlage.html', {
      inhalt: paketInhalt(e),
      felder: {
        TITEL: escHtml(e.titel ?? e.name),
        NAME: escHtml(e.name),
        LEAD: escHtml(e.beschreibung || typ.lead),
        HERKUNFT: escHtml([e.bereich, e.kategorie].filter(Boolean).join(' · ')),
        ANZAHL: escHtml(anzahlText(e.inhalt.length, typ.einheit)),
      },
    })]);
  }
}

// Startseite des Materialbereichs
ziele.push([join(WURZEL, 'index.html'), await vorlageFuellen('uebersicht-vorlage.html', {
  inhalt: uebersichtInhalt(alle, ordnung),
})]);

// Bestand als Liste, fuer weitere Auswertungen
ziele.push([join(WURZEL, 'daten', 'material.json'), JSON.stringify(
  alle.map((e) => ({
    typ: e.typ, bereich: e.bereich, kategorie: e.kategorie, name: e.name,
    url: e.url, werkzeuge: e.werkzeuge,
    inhalt: e.inhalt.map((i) => ({ titel: i.titel, url: posix.join(dirname(e.url).split('\\').join('/'), i.datei) })),
  })), null, 2) + '\n']);

let abweichung = false;
for (const [pfad, inhalt] of ziele) {
  const alt = existsSync(pfad) ? await readFile(pfad, 'utf8') : null;
  if (alt === inhalt) continue;
  abweichung = true;
  if (!NUR_PRUEFEN) await writeFile(pfad, inhalt, 'utf8');
}

for (const w of warnungen) console.warn('  ! ' + w);

const bilanz = TYPEN.map((t) => {
  const e = alle.filter((x) => x.typ === t.id);
  if (!t.paket) return `${t.titel}: ${e.length}`;
  const stueck = e.reduce((n, x) => n + x.inhalt.length, 0);
  return `${t.titel}: ${anzahlText(e.length, ['Paket', 'Pakete'])}` +
         ` mit ${anzahlText(stueck, t.einheit)}`;
}).join(', ');

if (NUR_PRUEFEN) {
  const unsauber = abweichung || alle.some((e) => e.geaendert);
  console.log(unsauber
    ? 'Übersicht ist nicht aktuell – "node build/build.mjs" ausführen.'
    : `Übersicht ist aktuell (${bilanz}).`);
  process.exit(unsauber ? 1 : 0);
}

console.log(`Erzeugt – ${bilanz}.`);
