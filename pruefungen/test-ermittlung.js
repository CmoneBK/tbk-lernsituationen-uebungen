/* Der neue Bereich "Ermittlung" im Werkzeug: Liefert er die Zeilen, die im
   Tabellenbuch stehen - und rechnet er die Beispiele des Buches nach? */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo')) return;
const DATEI = TOOLS + '/'
  + 'maschinenelemente-schrauben-schraubverbindungen.html';

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

(async () => {
  const html = fs.readFileSync(DATEI, 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/werkzeuge/tools/x.html' });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await new Promise(r => { dom.window.addEventListener('load', r); setTimeout(r, 3000); });
  const w = dom.window, d = w.document, el = id => d.getElementById(id);

  p('laeuft ohne Laufzeitfehler', !laut.length, laut[0]);

  // --- Reiter
  const reiter = [...d.querySelectorAll('.tabs button')].map(b => b.getAttribute('data-tab'));
  p('Reiter steht links neben Berechnungen',
    reiter.indexOf('ermittlung') === reiter.indexOf('berechnungen') - 1, reiter.join(','));
  w.reiterSetzen('ermittlung');
  p('Bereich wird sichtbar', !el('p-ermittlung').hidden);
  p('Berechnungen ist daneben zu', el('p-berechnungen').hidden);

  // --- 1. Gewinde nachschlagen: die Zeile M10 aus dem Tabellenbuch
  console.log('1. Gewinde nachschlagen');
  el('tbGewinde').value = 'M10';
  w.ermittlungGewinde();
  const txt = el('tbTabGewinde').textContent.replace(/\s+/g, ' ');
  const hat = (was, wert) => p(was + ' = ' + wert, txt.includes(wert), txt.slice(0, 200));
  hat('d2', '9,03');
  hat('d3', '8,16');
  hat('D1', '8,38');
  hat('S', '58,0');
  hat('Kernlochbohrer', '8,5');
  hat('Durchgangsloch mittel', '11,0');
  hat('Schlüsselweite', '16');
  el('tbReihe').value = '2';
  w.ermittlungGewinde();
  p('Reihe grob liefert 12,0 mm',
    el('tbTabGewinde').textContent.includes('12,0'));
  el('tbReihe').value = '1';

  // --- 2. Schraube ermitteln: das Beispiel Scheibenkupplung aus dem Buch
  console.log('2. Schraube ermitteln (Beispiel Scheibenkupplung)');
  el('tbLast').value = 'quer';
  el('tbFB').value = '1600';
  el('tbPhi').value = '2';
  el('tbMy').value = '0.2';
  w.ermittlungSchraube();
  p('F_verf = 16000 N', el('tbGesucht').textContent === '16.000',
    el('tbGesucht').textContent);
  p('gewaehlt wird M10', el('tbWahl').textContent === 'M10', el('tbWahl').textContent);
  p('Erfahrungswert 16000 N', el('tbFv').textContent === '16.000', el('tbFv').textContent);
  p('Rechenweg zeigt die Formel des Buches',
    /φ · F<sub>B<\/sub> \/ μ/.test(el('tbWeg').innerHTML));
  p('Zeile M10 ist hervorgehoben',
    !!el('tbTabErfahrung').querySelector('tr.treffer'));

  // --- 2b. Das Zugbeispiel des Buches: FB = 1875 N, nu = 2,5, 8.8 -> M4
  console.log('2b. Schraube ermitteln (Beispiel Zug in Achsrichtung)');
  el('tbLast').value = 'laengs';
  el('tbFB').value = '1875';
  el('tbNu').value = '2.5';
  el('tbKlasse').value = '8.8';
  w.ermittlungSchraube();
  p('erforderlicher Querschnitt 7,32 mm²', el('tbGesucht').textContent === '7,32',
    el('tbGesucht').textContent);
  p('gewaehlt wird M4', el('tbWahl').textContent === 'M4', el('tbWahl').textContent);
  p('Mindest-Streckgrenze 525 N/mm² geprueft',
    el('tbWeg').textContent.includes('525'), el('tbWeg').textContent.slice(-160));
  p('Felder fuer den Reibschluss sind ausgeblendet',
    el('tbFeldPhi').hidden && el('tbFeldMy').hidden);

  // --- 3. Anziehen und Einschrauben
  console.log('3. Anziehen und Einschrauben');
  el('tbAGewinde').value = 'M10';
  el('tbAKlasse').value = '8.8';
  el('tbAMy').value = '0.12';
  el('tbWerkstoff').value = '2';            // Baustahl 600 ... 800
  w.ermittlungAnziehen();
  p('F_V = 29,6 kN', el('tbAFv').textContent === '29,6', el('tbAFv').textContent);
  p('M_A = 48,4 N·m', el('tbAMa').textContent === '48,4', el('tbAMa').textContent);
  p('l_e = 1,2 · 10 = 12,0 mm', el('tbLe').textContent === '12,0', el('tbLe').textContent);
  p('Gewindeauslauf 4,5 mm', el('tbX').textContent === '4,5', el('tbX').textContent);
  p('Bohrtiefe 16,5 mm', el('tbTiefe').textContent === '16,5', el('tbTiefe').textContent);
  p('Hinweis nennt den Kernlochbohrer',
    el('tbAHinweis').textContent.includes('8,5'), el('tbAHinweis').textContent.slice(0, 120));

  // Paarung, die die Tabelle nicht vorsieht: Kunststoff mit 8.8
  el('tbWerkstoff').value = String(w.TB_EINSCHRAUB.length - 1);   // Kunststoffe
  w.ermittlungAnziehen();
  p('nicht vorgesehene Paarung wird erklaert', el('tbLe').textContent === '–'
    && /nicht vorgesehen/.test(el('tbAHinweis').textContent),
    el('tbAHinweis').textContent.slice(0, 90));

  // 12.9 bekommt den Hinweis auf die fehlende Spalte
  el('tbWerkstoff').value = '2';
  el('tbAKlasse').value = '12.9';
  w.ermittlungAnziehen();
  p('12.9 bekommt einen Hinweis', /12\.9/.test(el('tbAHinweis').textContent));

  dom.window.close();
  console.log(fehler ? '\n' + fehler + ' Fehler.' : '\nBereich Ermittlung arbeitet wie das Tabellenbuch.');
  process.exitCode = fehler ? 1 : 0;
})();
