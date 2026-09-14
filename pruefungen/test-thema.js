/* Der Umschalter hell/dunkel: Ist er auf jeder Seite da, merkt er sich die
   Wahl, und laesst er die Ausgabe in Ruhe? */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const SEITEN = [
  'index.html',
  'uebungen/schraubverbindungen/index.html',
  'trainings/schraubverbindungen/index.html',
  'uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html',
  'trainings/schraubverbindungen/01-begriffe-und-formelzeichen.html',
  'lernsituationen/konsole-am-foerderband/index.html',
];

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* Ein Speicher, den sich alle Seiten teilen - so wie der Browser es tut. */
function speicher() {
  const daten = {};
  return {
    getItem: k => (k in daten ? daten[k] : null),
    setItem: (k, v) => { daten[k] = String(v); },
    removeItem: k => { delete daten[k]; },
    _daten: daten,
  };
}

async function seite(rel, store) {
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, rel), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + rel,
    beforeParse(w) {
      if (store) Object.defineProperty(w, 'localStorage', { value: store, configurable: true });
    },
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await fertig(dom);
  return { dom, d: dom.window.document, laut };
}

async function main() {
  // --- Auf jeder Seite vorhanden, im head eingebunden
  console.log('Überall eingebunden');
  for (const rel of SEITEN) {
    const roh = fs.readFileSync(path.join(BASIS, rel), 'utf8');
    const imKopf = /<head[\s\S]*?thema\.js[\s\S]*?<\/head>/i.test(roh);
    p(rel + ': thema.js im head', imKopf);
  }

  // --- Der Schalter erscheint und zeigt den Zustand
  console.log('Der Schalter');
  const store = speicher();
  let { dom, d, laut } = await seite('uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html', store);
  p('laeuft ohne Laufzeitfehler', !laut.length, laut[0]);
  const knopf = d.getElementById('tbk-thema');
  p('Schalter ist da', !!knopf);
  p('Vorgabe ist System (kein Attribut)', !d.documentElement.hasAttribute('data-thema'),
    d.documentElement.getAttribute('data-thema'));
  p('Schalter nennt den Zustand', /System/.test(knopf.textContent), knopf.textContent);
  p('Schalter faellt beim Ausdruck weg', knopf.getAttribute('data-druck') === 'weg');

  knopf.click();
  p('erster Klick: hell', d.documentElement.getAttribute('data-thema') === 'hell',
    d.documentElement.getAttribute('data-thema'));
  p('Beschriftung folgt', /Hell/.test(knopf.textContent), knopf.textContent);
  knopf.click();
  p('zweiter Klick: dunkel', d.documentElement.getAttribute('data-thema') === 'dunkel');
  knopf.click();
  p('dritter Klick: zurück zu System', !d.documentElement.hasAttribute('data-thema'));

  knopf.click();                                   // wieder hell
  p('Wahl ist gespeichert', store.getItem('tbk-thema') === 'hell', store.getItem('tbk-thema'));
  dom.window.close();

  // --- Die naechste Seite uebernimmt die Wahl
  console.log('Gilt für den ganzen Bereich');
  ({ dom, d } = await seite('trainings/schraubverbindungen/01-begriffe-und-formelzeichen.html', store));
  p('Training übernimmt hell', d.documentElement.getAttribute('data-thema') === 'hell');
  p('Schalter zeigt Hell', /Hell/.test(d.getElementById('tbk-thema').textContent));
  dom.window.close();

  ({ dom, d } = await seite('index.html', store));
  p('Übersicht übernimmt hell', d.documentElement.getAttribute('data-thema') === 'hell');
  p('Übersicht hat den Schalter', !!d.getElementById('tbk-thema'));
  dom.window.close();

  // --- Die Ausgabe bleibt hell, auch wenn dunkel gewaehlt ist
  console.log('Ausgabe');
  const store2 = speicher();
  store2.setItem('tbk-thema', 'dunkel');
  ({ dom, d } = await seite('uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html', store2));
  p('Seite steht auf dunkel', d.documentElement.getAttribute('data-thema') === 'dunkel');
  const css = [...d.querySelectorAll('style')].map(s => s.textContent).join('\n');
  p('ex-hell sticht das dunkle Thema aus',
    /html\.ex-hell\[data-thema\]|html\.ex-hell,\s*html\.ex-hell\[data-thema\]/.test(css)
    || /--bg:#fff[^}]*!important/.test(css),
    'ex-hell muss spezifischer sein als :root[data-thema="dunkel"]');
  dom.window.close();

  console.log(fehler ? '\n' + fehler + ' Fehler.' : '\nDer Umschalter arbeitet überall.');
  process.exitCode = fehler ? 1 : 0;
}

main();
