/* Das Mausrad in Zahlenfeldern: Aendert es den Wert, haelt es die Seite an,
   und laesst es Felder in Ruhe, ueber die man nur hinwegscrollt? */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

let fehlerGesamt = 0;
function pruefen(was, ok, zusatz) {
  if (ok) { console.log('  ok     ' + was); return; }
  console.log('  FEHLER ' + was + (zusatz ? ' – ' + zusatz : ''));
  fehlerGesamt++;
}

function rad(w, feld, delta, modus) {
  const e = new w.WheelEvent('wheel', {
    deltaY: delta, deltaMode: modus || 0, bubbles: true, cancelable: true,
  });
  feld.dispatchEvent(e);
  return e.defaultPrevented;
}

async function seite(rel) {
  const vc = new VirtualConsole();
  const meldungen = [];
  vc.on('jsdomError', e => meldungen.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, rel), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + rel,
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await fertig(dom);
  return { dom, w: dom.window, d: dom.window.document, meldungen };
}

async function main() {
  // --- Uebung 5: Reibwert (0.02 … 0.60, Schritt 0.01) und Ganzzahlfelder
  console.log('05-querkraft-durch-reibung.html');
  {
    const { dom, w, d, meldungen } = await seite('uebungen/schraubverbindungen/05-querkraft-durch-reibung.html');
    pruefen('laeuft ohne Laufzeitfehler', !meldungen.length, meldungen[0]);

    const my = d.getElementById('eMyEigen');
    const ns = d.getElementById('eNs');

    // Ohne Fokus bleibt alles, wie es ist - sonst verstellt Vorbeiscrollen Werte.
    const vorher = my.value;
    const gebremst = rad(w, my, -100);
    pruefen('ohne Fokus unveraendert', my.value === vorher, my.value);
    pruefen('ohne Fokus scrollt die Seite weiter', !gebremst);

    my.focus();
    const gebremst2 = rad(w, my, -100);
    pruefen('mit Fokus haelt die Seite an', gebremst2);
    pruefen('hoch: 0.25 -> 0.26', my.value === '0.26', my.value);
    rad(w, my, 100);
    rad(w, my, 100);
    pruefen('runter: 0.26 -> 0.24', my.value === '0.24', my.value);

    // Die Uebung muss neu rechnen - dafuer braucht sie das input-Ereignis.
    let gerechnet = 0;
    my.addEventListener('input', () => gerechnet++);
    rad(w, my, -100);
    pruefen('loest input aus', gerechnet === 1, String(gerechnet));

    // Anschlag: max=0.60
    my.value = '0.59';
    rad(w, my, -100);
    const amAnschlag = rad(w, my, -100);
    pruefen('bleibt bei max stehen', my.value === '0.6', my.value);
    pruefen('haelt die Seite auch am Anschlag an', amAnschlag);

    // Touchpad: viele kleine Ausschlaege ergeben zusammen einen Schritt.
    ns.focus();
    const start = ns.value;
    rad(w, ns, -15); rad(w, ns, -15);
    pruefen('zwei kleine Ausschlaege: noch nichts', ns.value === start, ns.value);
    rad(w, ns, -15);
    pruefen('drei kleine Ausschlaege: ein Schritt',
      Number(ns.value) === Number(start) + 1, ns.value);

    // Zeilen-Modus (Firefox meldet deltaMode 1)
    const vor = ns.value;
    rad(w, ns, -3, 1);
    pruefen('Zeilen-Modus zaehlt weiter', Number(ns.value) === Number(vor) + 1, ns.value);

    dom.window.close();
  }

  // --- Uebung 6: Feld ohne Schrittweite und ohne Grenzen
  console.log('06-festigkeitsklassen-deuten.html');
  {
    const { dom, w, d } = await seite('uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html');
    const feld = d.querySelector('input[type="number"]');
    feld.value = '';
    feld.focus();
    rad(w, feld, -100);
    const min = feld.getAttribute('min');
    pruefen('leeres Feld faengt beim Anfangswert an',
      feld.value === String(Number(min || 0)), feld.value + ' (min=' + min + ')');
    dom.window.close();
  }

  // --- Training 2: dort wird ebenfalls gerechnet
  console.log('02-anziehdrehmoment-rechnen.html');
  {
    const { dom, w, d } = await seite('trainings/schraubverbindungen/02-anziehdrehmoment-rechnen.html');
    const feld = d.getElementById('aFM');
    pruefen('Baustein ist eingebunden',
      /zahlenfeld\.js|Mausrad in Zahlenfeldern/.test(d.documentElement.innerHTML));
    feld.value = '10';
    feld.focus();
    rad(w, feld, -100);
    pruefen('Wert steigt', Number(feld.value) > 10, feld.value);
    dom.window.close();
  }

  console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nMausrad verhaelt sich ueberall richtig.');
  process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
