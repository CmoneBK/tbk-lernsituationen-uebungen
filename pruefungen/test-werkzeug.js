/* Das Werkzeug im Repo CmoneBK-Unterrichtsmaterial: Rechnet es nach der
   Aenderung dieselben Werte wie das Tabellenbuch - und laeuft es noch? */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo')) return;
const DATEI = TOOLS + '/'
  + 'maschinenelemente-schrauben-schraubverbindungen.html';

const TABELLE = [
  ['M8', '8.8', 0.12, 18.6, 24.6],
  ['M10', '8.8', 0.12, 29.6, 48],
  ['M12', '8.8', 0.12, 43.0, 84],
  ['M16', '8.8', 0.16, 76.6, 252],
  ['M20', '8.8', 0.12, 130, 415],
  ['M24', '8.8', 0.12, 188, 714],
  ['M10', '10.9', 0.12, 43.4, 70],
  ['M12', '12.9', 0.12, 74.0, 144],
];

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};
const ab = (ist, soll) => Math.abs(ist / soll - 1) * 100;

(async () => {
  let html = fs.readFileSync(DATEI, 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/werkzeuge/tools/maschinenelemente-schrauben-schraubverbindungen.html' });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await new Promise(r => { dom.window.addEventListener('load', r); setTimeout(r, 3000); });
  const w = dom.window;

  p('laeuft ohne Laufzeitfehler', !laut.length, laut[0]);
  p('Rechenkern vorhanden', typeof w.rechneAlles === 'function');

  for (const [g, k, my, fTB, mTB] of TABELLE) {
    const r = w.rechneAlles(g, k, my, my, 0.9);
    const dF = ab(r.FM / 1000, fTB), dM = ab(r.M.gesamt / 1000, mTB);
    p(`${g} ${k} bei μ = ${my}: ${(r.FM / 1000).toFixed(1)} kN / ${(r.M.gesamt / 1000).toFixed(0)} N·m`,
      dF <= 2 && dM <= 2,
      `Tabelle ${fTB} kN / ${mTB} N·m (ab ${dF.toFixed(1)} % / ${dM.toFixed(1)} %)`);
  }

  // Die Probe im Rechenweg muss weiterhin genau nu * Rp0,2 ergeben.
  const r = w.rechneAlles('M10', '8.8', 0.12, 0.12, 0.9);
  p('Auslastung trifft ν = 0,90 (' + r.auslastung.toFixed(1) + ' %)',
    Math.abs(r.auslastung - 90) < 0.6);
  p('Kennwerte 10.9 nach ISO 898-1',
    w.KLASSEN['10.9'].Rp === 940 && w.KLASSEN['10.9'].Rm === 1040);
  p('Kennwerte 12.9 nach ISO 898-1',
    w.KLASSEN['12.9'].Rp === 1100 && w.KLASSEN['12.9'].Rm === 1220);
  p('über M16 gilt für 8.8 weiter der höhere Wert',
    w.klasseWerte('8.8', 20).Rp === 660);

  dom.window.close();
  console.log(fehler ? '\n' + fehler + ' Fehler.' : '\nWerkzeug rechnet wie das Tabellenbuch.');
  process.exitCode = fehler ? 1 : 0;
})();
