/* Alle Prüfungen nacheinander.
 *
 * Jede läuft in einem eigenen Prozess. Das ist nicht Vorsicht um ihrer selbst
 * willen: Die Prüfungen bauen ihre Seiten mit jsdom auf, und ein Fenster, das
 * offen bleibt, würde sonst alle folgenden aufhalten. So kostet es höchstens
 * die eine.
 *
 *   node pruefungen/alle.js            alle
 *   node pruefungen/alle.js zeichn     nur die, deren Name das enthält
 */
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');

const GRENZE = 10 * 60 * 1000;             /* eine Prüfung darf zehn Minuten */
const filter = process.argv.slice(2);

const dateien = fs.readdirSync(__dirname)
  .filter((d) => /^test.*\.js$/.test(d))
  .filter((d) => !filter.length || filter.some((f) => d.includes(f)))
  .sort();

if (!dateien.length) {
  console.log('Keine Prüfung passt zu: ' + filter.join(' '));
  process.exit(1);
}

let schlecht = 0, gesamt = 0;
for (const d of dateien) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, d)],
    { encoding: 'utf8', timeout: GRENZE });
  const dauer = (Date.now() - t0) / 1000;
  gesamt += dauer;
  const aus = ((r.stdout || '') + (r.stderr || '')).trim();
  const letzte = aus.split('\n').pop() || '(keine Ausgabe)';
  /* Ein Zeitablauf ist kein bestandener Lauf, auch wenn nichts gemeldet
     wurde - dann hat die Prüfung schlicht nicht zu Ende gedacht. */
  const abgelaufen = r.error && r.error.code === 'ETIMEDOUT';
  const gut = !abgelaufen && r.status === 0;
  if (!gut) schlecht++;
  console.log((gut ? '  ok     ' : '  FEHLER ') + d.padEnd(26)
    + dauer.toFixed(0).padStart(4) + ' s  '
    + (abgelaufen ? 'Zeitablauf nach ' + (GRENZE / 60000) + ' Minuten' : letzte));
  /* Bei einem Fehler zeigen, woran es lag - sonst müsste man raten und die
     Prüfung noch einmal einzeln starten. */
  if (!gut) {
    aus.split('\n').filter((z) => /^ {2}FEHLER/.test(z)).slice(0, 15)
      .forEach((z) => console.log('           ' + z.trim()));
  }
}

console.log('\n' + dateien.length + ' Prüfungen, ' + gesamt.toFixed(0) + ' s, '
  + (schlecht ? schlecht + ' mit Fehlern' : 'alle grün'));
process.exitCode = schlecht ? 1 : 0;
