/* Rückmeldungen von t-bk.de holen und lesbar ausgeben.
 *
 *     npm run rueckmeldungen                 die letzten 50
 *     npm run rueckmeldungen -- --seit 2026-09-01
 *     npm run rueckmeldungen -- --pfad /unterrichtsmaterial/lernsituationen/
 *     npm run rueckmeldungen -- --grenze 200 --roh
 *
 * Der Leseweg ist Weg C aus docs/FEEDBACK-API.md. Er ist geschützt, und der
 * Schlüssel gehört nicht in dieses Repo - auch nicht in eine .env daneben,
 * die man versehentlich mitcommittet. Er wird deshalb von außen gereicht:
 *
 *     TBK_FEEDBACK_KEY=<schluessel>         als Umgebungsvariable, oder
 *     ~/.tbk/feedback-lese-key              als Datei mit dem Schlüssel drin
 *
 * Die Datei ist der bequemere Weg, weil sie eine Sitzung überdauert. Ein
 * anderer Ort geht über TBK_FEEDBACK_KEY_DATEI.
 *
 * Der Schlüssel wandert als "Authorization: Bearer" in den Kopf, nicht als
 * ?key= in die Adresse: Adressen stehen in Server-Logs, Kopfzeilen nicht.
 * Ausgegeben wird er nirgends, auch nicht im Fehlerfall.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://t-bk.de/api/feedback.php';

const KATEGORIEN = [
  ['fehler', 'Fehler / etwas stimmt nicht'],
  ['verstaendnis', 'Verständnisproblem'],
  ['vorschlag', 'Vorschlag / Idee'],
  ['lob', 'Lob'],
  ['sonstiges', 'Sonstiges'],
];
const ROLLEN = { schueler: 'Schüler:in', lehrkraft: 'Lehrkraft' };

function schluessel() {
  if (process.env.TBK_FEEDBACK_KEY) return process.env.TBK_FEEDBACK_KEY.trim();
  const datei = process.env.TBK_FEEDBACK_KEY_DATEI
    || path.join(os.homedir(), '.tbk', 'feedback-lese-key');
  if (fs.existsSync(datei)) {
    const inhalt = fs.readFileSync(datei, 'utf8').trim();
    if (inhalt) return inhalt;
  }
  console.error(
    'Kein Leseschlüssel gefunden.\n\n'
    + 'Er kommt vom Website-Chat (feedback-config.php, Feld lese_key) und\n'
    + 'gehört nicht ins Repo. Zwei Wege, ihn zu hinterlegen:\n\n'
    + '  1. einmalig für diesen Aufruf:\n'
    + '       TBK_FEEDBACK_KEY=<schluessel> npm run rueckmeldungen\n'
    + '  2. dauerhaft, außerhalb des Repos:\n'
    + '       ' + datei + '\n'
    + '     (eine Zeile, nur der Schlüssel)\n');
  process.exit(2);
}

function argumente(argv) {
  const a = { seit: null, pfad: null, status: null, grenze: 50, roh: false };
  for (let i = 0; i < argv.length; i++) {
    const w = argv[i];
    if (w === '--roh') a.roh = true;
    else if (w === '--seit') a.seit = argv[++i];
    else if (w === '--pfad') a.pfad = argv[++i];
    else if (w === '--status') a.status = argv[++i];
    else if (w === '--grenze') a.grenze = Number(argv[++i]);
    else { console.error('Unbekannt: ' + w); process.exit(2); }
  }
  return a;
}

function zeit(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function ausgeben(daten) {
  const eintraege = daten.eintraege || [];
  if (!eintraege.length) {
    console.log('Keine Rückmeldungen'
      + (daten.neuestes ? ' (neueste im Bestand: ' + zeit(daten.neuestes) + ')' : '')
      + '.');
    return;
  }

  console.log(eintraege.length + ' Rückmeldung'
    + (eintraege.length === 1 ? '' : 'en')
    + (daten.anzahl && daten.anzahl !== eintraege.length
      ? ' von ' + daten.anzahl : '') + '\n');

  /* Fehler zuerst: Was nicht stimmt, ist dringender als Lob. */
  for (const [schluessel, name] of KATEGORIEN) {
    const gruppe = eintraege.filter((e) => e.kategorie === schluessel);
    if (!gruppe.length) continue;
    console.log('── ' + name + ' (' + gruppe.length + ')');
    for (const e of gruppe) {
      console.log('   #' + e.id + '  ' + zeit(e.zeit)
        + '  ' + (ROLLEN[e.rolle] || e.rolle)
        + (e.status && e.status !== 'neu' ? '  [' + e.status + ']' : ''));
      console.log('   ' + (e.titel || '(ohne Titel)'));
      console.log('   ' + (e.pfad || ''));
      if (e.nachricht) {
        /* Der Wortlaut bleibt der Wortlaut - nichts kürzen, nichts glätten. */
        for (const z of String(e.nachricht).split(/\r?\n/)) console.log('     | ' + z);
      }
      console.log('');
    }
  }

  const unbekannt = eintraege.filter(
    (e) => !KATEGORIEN.some(([k]) => k === e.kategorie));
  if (unbekannt.length) {
    console.log('── Unbekannte Kategorie (' + unbekannt.length + ')');
    for (const e of unbekannt) {
      console.log('   #' + e.id + '  ' + e.kategorie + '  ' + (e.titel || ''));
    }
    console.log('');
  }

  /* Mehrfach gemeldete Seiten zuerst - dort lohnt das Hinsehen am meisten. */
  const proSeite = new Map();
  for (const e of eintraege) {
    const k = e.pfad || '(ohne Pfad)';
    proSeite.set(k, (proSeite.get(k) || 0) + 1);
  }
  console.log('── Betroffene Seiten');
  [...proSeite.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([pfad, wieoft]) => {
      console.log('   ' + String(wieoft).padStart(2) + '×  ' + pfad);
    });
}

async function main() {
  const a = argumente(process.argv.slice(2));
  const key = schluessel();

  const adresse = new URL(API);
  adresse.searchParams.set('action', 'liste');
  adresse.searchParams.set('limit', String(a.grenze));
  if (a.seit) adresse.searchParams.set('seit', a.seit);
  if (a.pfad) adresse.searchParams.set('pfad', a.pfad);
  if (a.status) adresse.searchParams.set('status', a.status);

  let antwort;
  try {
    antwort = await fetch(adresse, {
      headers: { Authorization: 'Bearer ' + key, Accept: 'application/json' },
    });
  } catch (fehler) {
    console.error('Die Sammelstelle war nicht erreichbar: ' + fehler.message);
    process.exit(1);
  }

  if (antwort.status === 401) {
    console.error('Der Schlüssel wurde abgelehnt (401). Steht er noch so in\n'
      + 'feedback-config.php? Der Website-Chat gibt ihn heraus.');
    process.exit(1);
  }

  const text = await antwort.text();
  let daten;
  try { daten = JSON.parse(text); } catch {
    console.error('Keine JSON-Antwort (HTTP ' + antwort.status + '):\n'
      + text.slice(0, 400));
    process.exit(1);
  }

  if (!daten.ok) {
    console.error('Die Sammelstelle sagt nein: ' + (daten.error || '(ohne Grund)'));
    process.exit(1);
  }

  if (a.roh) { console.log(JSON.stringify(daten, null, 2)); return; }
  ausgeben(daten);
}

main();
