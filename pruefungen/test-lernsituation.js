/* Die Lernsituation: Zeichnungen, Ergebnisprüfung und die Bausteine - die
   müssen hier von der "Lernsituation" sprechen, nicht von der Übung. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const DATEI = 'lernsituationen/konsole-am-foerderband/index.html';

let fehlerGesamt = 0;
function p(was, ok, zusatz) {
  if (ok) { console.log('  ok     ' + was); return; }
  console.log('  FEHLER ' + was + (zusatz ? ' – ' + zusatz : ''));
  fehlerGesamt++;
}

async function main() {
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, DATEI), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + DATEI,
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await fertig(dom);
  const d = dom.window.document, el = id => d.getElementById(id);

  p('laeuft ohne Laufzeitfehler', !laut.length, laut[0]);

  // --- Zeichnungen
  ['bildLage', 'bildKraefte'].forEach(id => {
    const svg = d.querySelector('#' + id + ' svg');
    const teile = svg ? svg.querySelectorAll('line,rect,circle,polygon,text').length : 0;
    p(id + ' gezeichnet (' + teile + ' Elemente)', teile > 25);
    p(id + ' hat eine Bildbeschreibung',
      !!svg && (svg.getAttribute('aria-label') || '').length > 40);
  });

  // --- Bausteine sprechen von der Lernsituation
  const knopf = el('bk-knopf');
  p('Baukasten da', !!knopf);
  if (knopf) {
    p('Knopf sagt "Lernsituation anpassen" (' + knopf.textContent.trim() + ')',
      knopf.textContent.includes('Lernsituation anpassen'));
    knopf.click();
    const tafel = el('bk-tafel');
    p('Fenster sagt "Lernsituation"', tafel.textContent.includes('Lernsituation anpassen'));
    const teile = tafel.querySelectorAll('.bk-liste > li').length;
    p('acht Teile zur Auswahl (' + teile + ')', teile === 8);
    const fragen = tafel.querySelectorAll('.bk-liste ul li').length;
    p('Unterpunkte dabei (' + fragen + ')', fragen >= 12);
    knopf.click();
  }
  p('Download-Knopf da', !!el('ex-knopf'));
  if (el('ex-knopf')) {
    el('ex-knopf').click();
    p('Hinweis nennt "Lernsituation anpassen"',
      el('ex-tafel').textContent.includes('Lernsituation anpassen'));
    el('ex-knopf').click();
  }

  // --- Zuschneiden wirkt
  if (knopf) {
    knopf.click();
    const kaesten = [...el('bk-tafel').querySelectorAll('.bk-liste > li > label input')];
    kaesten[4].click();                       // Teil 5 abwählen
    const weg = [...d.querySelectorAll('main h2')]
      .filter(h => h.hidden).length;
    p('abgewaehlter Teil verschwindet', weg === 1, String(weg));
    p('Link traegt den Parameter',
      /\?ohne=/.test(el('bk-link').value || el('bk-link').textContent), '');
    kaesten[4].click();
    knopf.click();
  }

  // --- Die Ergebnisprüfung
  const setzen = (m, fz, fb, fk, fv) => {
    el('aM').value = m; el('aFZ').value = fz; el('aFB').value = fb;
    el('aFK').value = fk; el('aFV').value = fv;
    el('btnPruefen').click();
  };
  el('btnPruefen').click();
  p('leer: freundlicher Hinweis', el('rueck').className === 'rueckmeldung'
    && /Noch nichts/.test(el('rueck').textContent), el('rueck').textContent.slice(0, 40));

  setzen('600', '2.5', '0.6', '7.8', '10.3');
  p('richtige Werte werden erkannt', el('rueck').className.includes('ja'),
    el('rueck').textContent.slice(0, 60));

  setzen('594', '2.45', '0.59', '7.7', '10.5');
  p('drei Prozent Toleranz', el('rueck').className.includes('ja'));

  setzen('600000', '2.5', '0.6', '7.8', '10.3');
  p('Einheitenfehler faellt auf', el('rueck').className.includes('fast')
    || el('rueck').className.includes('nein'));
  p('Hinweis zum Moment kommt', /0,25 m/.test(el('rueck').textContent),
    el('rueck').textContent.slice(0, 80));

  setzen('600', '5', '0.6', '7.8', '10.3');
  p('Zugkraft der ganzen Reihe faellt auf', !el('rueck').className.includes('ja'));

  setzen('600', '2.5', '2.4', '7.8', '10.3');
  p('ungeteilte Querkraft faellt auf', !el('rueck').className.includes('ja'));
  p('Hinweis nennt die Verteilung auf vier Schrauben',
    /alle vier Schrauben/.test(el('rueck').textContent),
    el('rueck').textContent.slice(0, 90));

  el('btnLeeren').click();
  p('Leeren raeumt auf', el('aM').value === '' && el('rueck').hidden);

  // --- Ausgabe
  const knoepfe = ['ex-pdf', 'ex-pdf-datei', 'ex-word'];
  el('ex-knopf').click();
  knoepfe.forEach(id => p('Knopf ' + id + ' da', !!el(id)));
  el('ex-knopf').click();

  dom.window.close();
  console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nLernsituation in Ordnung.');
  process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
