/* Der gemerkte Stand - assets/fortschritt.js.
 *
 * Bis dieser Baustein da war, überlebte kein Eingabefeld einen
 * Seitenwechsel. Eine Lernsituation hat über hundert davon; wer auf
 * „Übersicht" klickte oder dessen Tablet den Hintergrund-Tab verwarf, fing
 * von vorn an.
 *
 * Geprüft wird, was schiefgehen kann:
 *   - Wird überhaupt gesichert und wiederhergestellt?
 *   - Bleibt draußen, was draußen bleiben soll (Rückmeldung, Wettkampf)?
 *   - Was passiert, wenn sich die Seite geändert hat? (Nichts einsetzen -
 *     ein alter Wert im falschen Feld ist schlimmer als ein leeres.)
 *   - Hält „Nicht merken"?
 *   - Verlässt wirklich nichts das Gerät?
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const SEITE = 'uebungen/drehprozess/06-auf-welches-mass-wird-geschlichtet.html';
const URL = 'https://t-bk.de/unterrichtsmaterial/' + SEITE;

/* Eine Seite aufbauen. `vorrat` ist der localStorage-Inhalt, mit dem sie
   startet - damit lässt sich ein Neuladen nachstellen, denn jsdom gibt
   jedem Fenster einen eigenen, leeren Speicher. */
async function seite(vorrat) {
  const vc = new VirtualConsole();
  const laut = [];
  vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, SEITE), 'utf8')), {
    runScripts: 'dangerously',
    url: URL,
    virtualConsole: vc,
    beforeParse(w) {
      w.Element.prototype.scrollIntoView = function () {};
      /* Vor dem ersten Skript einfüllen - der Baustein liest beim Anlauf. */
      Object.keys(vorrat || {}).forEach((k) => w.localStorage.setItem(k, vorrat[k]));
      /* Jeden Netzweg mitschreiben: Gespeichert wird auf dem Gerät, nicht
         anderswo. */
      w.__gesendet = [];
      w.fetch = function (u) { w.__gesendet.push(String(u)); return Promise.reject(); };
      w.navigator.sendBeacon = function (u) { w.__gesendet.push(String(u)); return true; };
      const XHR = w.XMLHttpRequest;
      w.XMLHttpRequest = function () {
        const x = new XHR();
        const offen = x.open;
        x.open = function (m, u) { w.__gesendet.push(String(u)); return offen.apply(x, arguments); };
        return x;
      };
    },
  });
  await fertig(dom);
  return { dom, w: dom.window, d: dom.window.document, laut };
}

function vorratVon(w) {
  const aus = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    aus[k] = w.localStorage.getItem(k);
  }
  return aus;
}

async function alles() {
  console.log('Der Baustein ist eingebunden');
  {
    const text = fs.readFileSync(path.join(BASIS, SEITE), 'utf8');
    p('die Seite bindet assets/fortschritt.js ein',
      /<script src="[^"]*assets\/fortschritt\.js"/.test(text));

    /* Trainings absichtlich nicht: Dort ist jede Runde eine neue Aufgabe. */
    const training = fs.readFileSync(
      path.join(BASIS, 'trainings/drehprozess/08-toleranzmitte.html'), 'utf8');
    p('Trainings binden ihn nicht ein',
      !/assets\/fortschritt\.js/.test(training));
  }

  console.log('\nEingeben, weggehen, wiederkommen');
  let vorrat = null;
  {
    const { w, d, laut } = await seite({});
    p('die Seite laedt ohne Fehler', laut.length === 0, laut[0]);

    const hinweis = d.getElementById('standHinweis');
    p('der Hinweis steht auf der Seite', !!hinweis);
    p('und sagt, dass nichts gesendet wird',
      hinweis && /nicht gesendet/.test(hinweis.textContent),
      hinweis ? hinweis.textContent.slice(0, 90) : '');

    /* Ausfuellen, wie ein Schueler es taete. */
    const passungen = w.eval('PASSUNGEN');
    passungen.forEach((x) => {
      d.getElementById('a_' + x.id + '_es').value = String(x.es);
      d.getElementById('m_' + x.id + '_z').value = x.mitte.toFixed(4);
    });
    d.getElementById('u_0').value = w.eval('TEILE')[0].soll;
    d.dispatchEvent(new w.Event('input', { bubbles: true }));

    /* Der Tab geht in den Hintergrund - genau dort verwerfen Tablets ihn. */
    Object.defineProperty(d, 'visibilityState', { value: 'hidden', configurable: true });
    d.dispatchEvent(new w.Event('visibilitychange'));

    vorrat = vorratVon(w);
    const staende = Object.keys(vorrat).filter((k) => k.indexOf('tbk:stand:') === 0);
    p('der Stand liegt im Speicher des Geraets', staende.length === 1,
      Object.keys(vorrat).join(', '));
    p('und nichts ist gesendet worden', w.__gesendet.length === 0,
      w.__gesendet.join(', '));

    const paket = JSON.parse(vorrat[staende[0]]);
    p('er traegt einen Zeitstempel', paket.zeit > 0);
    p('einen Fingerabdruck der Felder', !!paket.abdruck);
    p('und die eingetippten Werte', Object.keys(paket.werte).length === 5,
      Object.keys(paket.werte).join(', '));
    w.close();
  }

  {
    /* Neu geladen - mit dem Speicher von vorhin. */
    const { w, d } = await seite(vorrat);
    const passungen = w.eval('PASSUNGEN');
    const wieder = passungen.every((x) =>
      d.getElementById('a_' + x.id + '_es').value === String(x.es)
      && d.getElementById('m_' + x.id + '_z').value === x.mitte.toFixed(4));
    p('nach dem Neuladen stehen die Eingaben wieder da', wieder);
    p('auch die Auswahl aus einem select',
      d.getElementById('u_0').value === w.eval('TEILE')[0].soll,
      d.getElementById('u_0').value);
    p('der Hinweis sagt, dass wiederhergestellt wurde',
      /wiederhergestellt/.test(d.getElementById('standHinweis').textContent),
      d.getElementById('standHinweis').textContent.slice(0, 80));

    /* Und die Uebung rechnet damit weiter, als waere nichts gewesen. */
    passungen.forEach((x) => {
      d.getElementById('a_' + x.id + '_ei').value = String(x.ei);
    });
    d.getElementById('btn1').click();
    p('die Uebung nimmt die wiederhergestellten Werte an',
      /4 von 4 richtig/.test(d.getElementById('bilanz1').textContent),
      d.getElementById('bilanz1').textContent);
    w.close();
  }

  console.log('\nWas draussen bleibt');
  {
    const { w, d } = await seite({});
    /* Die Rueckmeldung ist Text, der gesendet werden soll - kein Stand. */
    const rueck = d.querySelector('#tbk-feedback textarea');
    p('die Rueckmeldung hat ein Textfeld', !!rueck);
    if (rueck) {
      rueck.value = 'Das ist eine Rueckmeldung und kein Stand.';
      d.getElementById('a_g6_es').value = '-7';
      d.dispatchEvent(new w.Event('input', { bubbles: true }));
      w.tbkStandSichern();
      const paket = JSON.parse(w.localStorage.getItem(
        Object.keys(vorratVon(w)).filter((k) => k.indexOf('tbk:stand:') === 0)[0]));
      const alles = JSON.stringify(paket.werte);
      p('sie wird nicht mitgemerkt', !/Rueckmeldung/.test(alles),
        alles.slice(0, 120));
      p('der eigene Eintrag dagegen schon', /-7/.test(alles));
    }
    p('der Block traegt data-merken="nein"',
      !!d.querySelector('#tbk-feedback[data-merken="nein"]'));
    w.close();
  }

  console.log('\nWenn sich die Seite geaendert hat');
  {
    /* Ein alter Stand mit anderem Fingerabdruck darf nichts einsetzen -
       ein Wert im falschen Feld ist schlimmer als ein leeres Feld. */
    const schluessel = Object.keys(vorrat).filter((k) => k.indexOf('tbk:stand:') === 0)[0];
    const alt = JSON.parse(vorrat[schluessel]);
    const verbogen = {};
    verbogen[schluessel] = JSON.stringify({
      zeit: alt.zeit, abdruck: 'ganz|andere|felder', werte: alt.werte,
    });
    const { w, d } = await seite(verbogen);
    p('der alte Stand wird nicht eingesetzt',
      d.getElementById('a_g6_es').value === '',
      d.getElementById('a_g6_es').value);
    p('und aus dem Speicher geworfen',
      w.localStorage.getItem(schluessel) === null);
    w.close();
  }

  console.log('\nNicht merken');
  {
    const { w, d } = await seite({ 'tbk:stand-aus': '1' });
    p('der Hinweis sagt es',
      /nichts gemerkt/.test(d.getElementById('standHinweis').textContent),
      d.getElementById('standHinweis').textContent.slice(0, 70));

    d.getElementById('a_g6_es').value = '-7';
    d.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.tbkStandSichern();
    const staende = Object.keys(vorratVon(w)).filter((k) => k.indexOf('tbk:stand:') === 0);
    p('und es wird wirklich nichts gespeichert', staende.length === 0,
      staende.join(', '));

    /* Der Weg zurueck steht daneben. */
    const knoepfe = [...d.getElementById('standHinweis').querySelectorAll('button')];
    p('ein Knopf schaltet es wieder ein',
      knoepfe.some((b) => /Doch merken/.test(b.textContent)),
      knoepfe.map((b) => b.textContent).join(' | '));
    knoepfe.filter((b) => /Doch merken/.test(b.textContent))[0].click();
    p('danach wird wieder gemerkt',
      Object.keys(vorratVon(w)).some((k) => k.indexOf('tbk:stand:') === 0));
    w.close();
  }

  console.log('\nEingaben loeschen');
  {
    const { w, d } = await seite(vorrat);
    const knoepfe = [...d.getElementById('standHinweis').querySelectorAll('button')];
    const loeschen = knoepfe.filter((b) => /Eingaben l/.test(b.textContent))[0];
    p('der Knopf ist da', !!loeschen,
      knoepfe.map((b) => b.textContent).join(' | '));
    loeschen.click();
    p('die Felder sind leer', d.getElementById('a_g6_es').value === '');
    p('und der Stand ist weg',
      !Object.keys(vorratVon(w)).some((k) => k.indexOf('tbk:stand:') === 0));
    w.close();
  }

  console.log('\nWenn der Speicher gesperrt ist');
  {
    /* Privates Fenster, gesperrte Website-Daten, manche Schulgeraete: Der
       Baustein muss still bleiben, nicht die Seite mitreissen. */
    const vc = new VirtualConsole();
    const laut = [];
    vc.on('jsdomError', (e) => laut.push((e.detail || e).toString().split('\n')[0]));
    const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, SEITE), 'utf8')), {
      runScripts: 'dangerously', url: URL, virtualConsole: vc,
      beforeParse(w) {
        w.Element.prototype.scrollIntoView = function () {};
        Object.defineProperty(w, 'localStorage', {
          get() { throw new Error('gesperrt'); },
        });
      },
    });
    p('die Seite laedt trotzdem', laut.length === 0, laut[0]);
    p('und zeigt keinen Hinweis, der nichts halten kann',
      !dom.window.document.getElementById('standHinweis'));
    dom.window.close();
  }

  /* ---------- Wer Felder hat, muss sie sich auch merken ---------- */

  console.log('\nJede Seite mit Feldern hat den Baustein');
  {
    /* Frueher entschied der Build ueber einen Blick in den Quelltext. Die
       vier Uebungen zu den Fuegeverfahren und die Lernsituation
       Gehaeusedeckel bauen ihre Auswahlfelder aber erst im Javascript -
       die Regel sah sie nicht, und ihre Antworten waren nach jedem
       Seitenwechsel weg. Gezaehlt wird deshalb, was nach dem Laden
       tatsaechlich dasteht.

       Trainings bleiben aussen vor: Dort ist jede Runde eine neue
       Aufgabe. */
    const NICHT = ['file', 'password', 'hidden', 'submit', 'button',
      'reset', 'range'];
    const sammeln = (ordner, aus) => {
      if (!fs.existsSync(ordner)) return aus;
      for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
        const pf = path.join(ordner, e.name);
        if (e.isDirectory()) sammeln(pf, aus);
        else if (/\.html$/.test(e.name) && !e.name.startsWith('_')) aus.push(pf);
      }
      return aus;
    };
    const seiten = [];
    ['lernsituationen', 'uebungen'].forEach(
      (o) => sammeln(path.join(BASIS, o), seiten));
    /* Die erzeugten Paketuebersichten sind Verzeichnisse, kein Inhalt. */
    const inhalt = seiten.filter((f) => path.basename(f) !== 'index.html'
      || f.includes('lernsituationen'));
    p('es gibt Inhaltsseiten zu pruefen', inhalt.length > 0);

    const ohne = [];
    for (const datei of inhalt.sort()) {
      const kurz = path.relative(BASIS, datei).replace(/\\/g, '/');
      const roh = fs.readFileSync(datei, 'utf8');
      const laut = new VirtualConsole();
      let w;
      try {
        w = new JSDOM(mitAssets(roh), {
          runScripts: 'dangerously', virtualConsole: laut,
          url: 'https://t-bk.de/unterrichtsmaterial/' + kurz,
          beforeParse(win) {
            win.Element.prototype.scrollIntoView = function () {};
            win.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
          },
        }).window;
      } catch (e) { p(kurz + ': laedt', false, e.message); continue; }

      const felder = [...w.document.querySelectorAll('input, textarea, select')]
        .filter((e) => !NICHT.includes((e.type || '').toLowerCase()))
        .filter((e) => !(e.closest && e.closest('[data-merken="nein"]')));
      w.close();

      if (felder.length && !roh.includes('assets/fortschritt.js')) {
        ohne.push(kurz + ' (' + felder.length + ' Felder)');
      }
    }
    p(inhalt.length + ' Inhaltsseiten geprueft, keine ohne Gedaechtnis',
      ohne.length === 0, ohne.join(', '));
  }

}

alles().then(function () {
  console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
  process.exit(fehler ? 1 : 0);
});
