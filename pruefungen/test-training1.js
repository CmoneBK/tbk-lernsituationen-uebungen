/* Begriffstraining: Schwierigkeit, Modus, Umfang und die Tafel hinter dem
   Schalter. Geprüft wird gegen die Daten der Seite selbst - so faellt auf,
   wenn ein Ablenker nicht aus der vorgesehenen Quelle kommt. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const DATEI = 'trainings/schraubverbindungen/01-begriffe-und-formelzeichen.html';

let fehlerGesamt = 0;
function p(was, ok, zusatz) {
  if (ok) { console.log('  ok     ' + was); return; }
  console.log('  FEHLER ' + was + (zusatz ? ' – ' + zusatz : ''));
  fehlerGesamt++;
}

async function seite() {
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', e => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, DATEI), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + DATEI,
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  await fertig(dom);
  return { dom, w: dom.window, d: dom.window.document, laut };
}

const warten = ms => new Promise(r => setTimeout(r, ms));
const flach = t => String(t).replace(/[()]/g, '');       // F(V) -> FV, wie gerendert

/* Zu welcher Ebene gehoert die gestellte Frage? */
const EBENE = {
  'Wie heißt das im Fachbegriff?': 'fach',
  'Was ist damit gemeint?': 'alltag',
  'Welches Formelzeichen gehört dazu?': 'zeichen',
  'Welcher Begriff steht hinter diesem Zeichen?': 'fach',
};

function aufgabeLesen(w, d) {
  const frage = d.getElementById('frage').textContent.trim();
  const nach = EBENE[frage];
  const gefragt = d.getElementById('gefragt').textContent.trim();
  const begriff = w.BEGRIFFE.find(b => ['alltag', 'fach', 'zeichen']
    .some(e => b[e] && flach(b[e]) === gefragt));
  const optionen = [...d.querySelectorAll('#auswahl button')]
    .map(k => k.textContent.trim());
  return { frage, nach, gefragt, begriff, optionen };
}

async function main() {
  const { dom, w, d, laut } = await seite();
  p('laeuft ohne Laufzeitfehler', !laut.length, laut[0]);

  const el = id => d.getElementById(id);
  const wechseln = (id, wert) => {
    el(id).value = wert;
    el(id).dispatchEvent(new w.Event('change', { bubbles: true }));
  };

  // ---------------------------------------------------------- Die Tafel
  console.log('Die Tafel');
  p('ist anfangs nicht eingeblendet', el('tafelBox').hidden);
  p('Schalter ist da', !!el('btnTafel') && /einblenden/i.test(el('btnTafel').textContent));
  el('btnTafel').click();
  p('laesst sich oeffnen', !el('tafelBox').hidden);
  p('warnt vor dem fertigen Durchgang', !el('tafelWarnung').hidden);
  p('Tafel ist gefuellt', el('tafel').children.length === w.BEGRIFFE.length,
    String(el('tafel').children.length));
  el('btnTafel').click();
  p('laesst sich wieder schliessen', el('tafelBox').hidden);

  // ---------------------------------------------------------- Der Umfang
  console.log('Umfang');
  wechseln('wahlUmfang', '5');
  await warten(400);
  p('fuenf Begriffe sind moeglich', /von 5$/.test(el('stand').textContent),
    el('stand').textContent);

  wechseln('wahlUmfang', '99');
  await warten(400);
  p('mehr als der Vorrat wird gekappt',
    el('wahlUmfang').value === String(w.BEGRIFFE.length), el('wahlUmfang').value);

  // ---------------------------------------------------------- Die Modi
  console.log('Woran üben');
  wechseln('wahlModus', 'zeichen');
  await warten(50);
  const mitZeichen = w.BEGRIFFE.filter(b => b.zeichen).length;
  p('Vorrat sind nur Begriffe mit Zeichen',
    el('wahlUmfang').max === String(mitZeichen), el('wahlUmfang').max);
  p('Hinweis nennt die Grenze', el('umfangMax').textContent.includes(String(mitZeichen)),
    el('umfangMax').textContent);

  let nurZeichen = true, nurBegriffe = true;
  for (let i = 0; i < 25; i++) {
    const a = aufgabeLesen(w, d);
    if (a.nach !== 'zeichen' && !/[Zz]eichen/.test(a.frage)) nurZeichen = false;
    d.querySelector('#auswahl button').click();
    el('btnWeiter').click();
    if (!el('ende').hidden) { el('btnNochmal').click(); }
  }
  p('fragt ausschliesslich nach Formelzeichen', nurZeichen);

  wechseln('wahlModus', 'begriffe');
  await warten(50);
  for (let i = 0; i < 25; i++) {
    const a = aufgabeLesen(w, d);
    if (/[Zz]eichen/.test(a.frage)) nurBegriffe = false;
    d.querySelector('#auswahl button').click();
    el('btnWeiter').click();
    if (!el('ende').hidden) { el('btnNochmal').click(); }
  }
  p('fragt ausschliesslich nach der Bedeutung', nurBegriffe);

  // ------------------------------------------------------ Schwierigkeit
  console.log('Schwierigkeit');
  wechseln('wahlModus', 'mix');
  await warten(50);

  /* Je Stufe einige Aufgaben ansehen: Woher kommen die falschen Antworten? */
  function stichprobe(stufe, runden) {
    wechseln('wahlStufe', stufe);
    let ausNah = 0, ausFeld = 0, fremd = 0, gesamt = 0;
    for (let i = 0; i < runden; i++) {
      const a = aufgabeLesen(w, d);
      if (a.begriff && a.nach) {
        const richtig = flach(a.begriff[a.nach]);
        const nah = ((a.begriff.nah || {})[a.nach] || []).map(flach);
        const feld = w.BEGRIFFE.filter(b => b !== a.begriff && b[a.nach])
          .map(b => flach(b[a.nach]));
        a.optionen.filter(o => o !== richtig).forEach(o => {
          gesamt++;
          const imNah = nah.indexOf(o) !== -1;
          const imFeld = feld.indexOf(o) !== -1;
          if (imNah && !imFeld) ausNah++;
          else if (imFeld) ausFeld++;
          else fremd++;
        });
      }
      d.querySelector('#auswahl button').click();
      el('btnWeiter').click();
      if (!el('ende').hidden) el('btnNochmal').click();
    }
    return { ausNah, ausFeld, fremd, gesamt };
  }

  const einfach = stichprobe('einfach', 30);
  p('Einfach: alle Ablenker stammen aus dem Feld',
    einfach.ausNah === 0 && einfach.fremd === 0,
    JSON.stringify(einfach));

  const schwer = stichprobe('schwer', 30);
  p('Schwer: kein Ablenker, der nicht als Verwechslung hinterlegt ist',
    schwer.fremd === 0, JSON.stringify(schwer));
  p('Schwer: deutlich mehr naheliegende als Einfach',
    schwer.ausNah > einfach.ausNah, JSON.stringify(schwer));

  const mittel = stichprobe('mittel', 30);
  p('Mittel liegt zwischen beiden',
    mittel.ausNah > einfach.ausNah && mittel.ausNah < schwer.ausNah,
    JSON.stringify(mittel));
  p('Mittel bringt auch Ablenker aus dem Feld', mittel.ausFeld > 0,
    JSON.stringify(mittel));

  p('immer vier Antworten', schwer.gesamt === 90 && einfach.gesamt === 90,
    einfach.gesamt + '/' + schwer.gesamt);

  // -------------------------------------------------- Ende des Durchgangs
  console.log('Durchgang zu Ende');
  wechseln('wahlUmfang', '5');
  await warten(400);
  for (let i = 0; i < 20 && el('ende').hidden; i++) {
    const k = d.querySelector('#auswahl button:not([disabled])');
    if (k) k.click();
    if (!el('btnWeiter').hidden) el('btnWeiter').click();
  }
  p('Ergebnis erscheint', !el('ende').hidden);
  p('Tafel steht danach offen', !el('tafelBox').hidden);
  p('ohne Warnschild', el('tafelWarnung').hidden);

  dom.window.close();
  console.log(fehlerGesamt ? '\n' + fehlerGesamt + ' Fehler.' : '\nBegriffstraining in Ordnung.');
  process.exitCode = fehlerGesamt ? 1 : 0;
}

main();
