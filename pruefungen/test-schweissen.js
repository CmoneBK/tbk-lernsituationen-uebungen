/* Das Schweiß-Paket: Übungen, Trainings und die Zahlen dahinter.
 *
 * Drei Dinge, die schiefgehen können und die man der Seite nicht ansieht:
 *
 *   1. Die Zahlen laufen vom Tabellenbuch weg. Die Übungen rechnen mit
 *      Ordnungsnummern, Schweißpositionen, Nahtdicken und den Richtwerten
 *      für Draht und Zeit - steht dort etwas anderes als im Buch, übt das
 *      Material etwas Falsches ein, und zwar mit voller Rückmeldung.
 *   2. Eine Übung nimmt die richtige Antwort nicht an. Das merkt man beim
 *      Schreiben nicht, weil man die eigene Lösung im Kopf hat.
 *   3. Ein Training läuft in einen Fehler und bleibt stehen. Deshalb wird
 *      jedes einmal komplett durchgespielt - mit lauter richtigen
 *      Antworten muss am Ende "alles richtig" stehen.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

/* Die abgelesenen Werte liegen in tabellenbuch/ - der Ordner steht in
   .gitignore. Fehlt er, gibt es nichts zu vergleichen; das ist kein Fehler
   im Material. */
const QUELLE = path.join(BASIS, 'tabellenbuch/daten.json');
const BUCH = fs.existsSync(QUELLE)
  ? (JSON.parse(fs.readFileSync(QUELLE, 'utf8')).schweissen || null) : null;

async function seite(rel) {
  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push(String((e.detail && e.detail.message) || e.message)));
  vc.on('error', (...a) => laut.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(mitAssets(fs.readFileSync(path.join(BASIS, rel), 'utf8')), {
    runScripts: 'dangerously', virtualConsole: vc,
    url: 'https://t-bk.de/unterrichtsmaterial/' + rel,
    beforeParse(w) {
      w.Element.prototype.scrollIntoView = function () {};
      w.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
    },
  });
  await fertig(dom);
  return { d: dom.window.document, w: dom.window, laut };
}

const setz = (d, id, v) => { const e = d.getElementById(id); if (e) e.value = v; };
const klick = (d, w, e) => e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const knopf = (d, w, id) => klick(d, w, d.getElementById(id));
const stand = (d, id) => d.getElementById(id).textContent;

/* "5 von 5 richtig." - nur das gilt als bestanden. */
const alles = (text, n) => new RegExp('^' + n + ' von ' + n + ' richtig').test(text);

async function main() {

  /* ---------- 1. Die Zahlen gegen das Tabellenbuch ---------- */

  console.log('\nDie Zahlen im Material und die im Buch');
  if (!BUCH) {
    console.log('  ohne   tabellenbuch/daten.json kennt noch keinen Abschnitt schweissen');
  } else {
    const t5 = fs.readFileSync(path.join(BASIS,
      'trainings/schweissen/05-verfahren-und-kennzahl.html'), 'utf8');
    /* Die Liste im Training: {n:"111", v:"Lichtbogenhandschweißen", s:1} */
    const paare = [...t5.matchAll(/\{n:"(\d+)",\s*v:"([^"]+)"/g)]
      .map((m) => [m[1], m[2]]);
    p('das Training kennt Ordnungsnummern', paare.length > 15, String(paare.length));
    const falsch = paare.filter(([n, v]) => {
      const soll = BUCH.verfahren_4063.nummern[n];
      if (!soll) return true;
      /* Das Training kuerzt die Bezeichnung an einer Stelle - der Kern muss
         uebereinstimmen. */
      const kern = (s) => s.toLowerCase().replace(/[^a-zäöüß]/g, '').slice(0, 14);
      return kern(soll) !== kern(v);
    });
    p('jede Nummer steht so im Buch', falsch.length === 0,
      falsch.map(([n, v]) => n + ' = ' + v).join(', '));

    const u4 = fs.readFileSync(path.join(BASIS,
      'uebungen/schweissen/04-welches-verfahren.html'), 'utf8');
    [['135', 'mag'], ['141', 'wig'], ['111', 'hand'], ['131', 'mig']]
      .forEach(([n]) => {
        p('Uebung 4 nennt die Nummer ' + n + ', und das Buch kennt sie',
          u4.indexOf('"' + n + '"') !== -1 && !!BUCH.verfahren_4063.nummern[n]);
      });

    /* Die Richtwerte, mit denen Uebung 3 und Training 3 rechnen. */
    const zeile = (a) => BUCH.richtwerte_mag.zeilen.filter((z) => z.a === a)[0];
    const u3 = fs.readFileSync(path.join(BASIS,
      'uebungen/schweissen/03-die-naht-bemassen.html'), 'utf8');
    const mZus = /var ZUSATZ_A5 = (\d+)/.exec(u3);
    const mZeit = /var ZEIT_A5\s+= ([\d.]+)/.exec(u3);
    p('Uebung 3: Schweisszusatz fuer a = 5 wie im Buch',
      !!mZus && Number(mZus[1]) === zeile(5).zusatz_g_m,
      (mZus ? mZus[1] : '?') + ' statt ' + zeile(5).zusatz_g_m);
    p('Uebung 3: Hauptnutzungszeit fuer a = 5 wie im Buch',
      !!mZeit && Number(mZeit[1]) === zeile(5).zeit_min_m,
      (mZeit ? mZeit[1] : '?') + ' statt ' + zeile(5).zeit_min_m);

    const t3 = fs.readFileSync(path.join(BASIS,
      'trainings/schweissen/03-a-und-z-umrechnen.html'), 'utf8');
    const mTab = /var ZUSATZ = \{([^}]*)\}/.exec(t3);
    p('Training 3 fuehrt die Zusatztabelle', !!mTab);
    if (mTab) {
      const drin = [...mTab[1].matchAll(/(\d+):(\d+)/g)].map((m) => [+m[1], +m[2]]);
      const daneben = drin.filter(([a, g]) => !zeile(a) || zeile(a).zusatz_g_m !== g);
      p('jede Zeile der Zusatztabelle steht so im Buch', daneben.length === 0,
        daneben.map(([a, g]) => 'a' + a + ' = ' + g).join(', '));
    }

    /* Die Schweisspositionen, die Uebung 4 abfragt. */
    ['PA', 'PB', 'PF', 'PE'].forEach((k) => {
      p('die Position ' + k + ' steht im Buch', !!BUCH.positionen_6947[k]);
    });
  }

  /* ---------- 2. Die Uebungen nehmen die richtige Antwort an ---------- */

  console.log('\nDie sechs Uebungen, jede mit der richtigen Loesung');
  {
    const { d, w, laut } = await seite('uebungen/schweissen/01-was-sagt-das-symbol.html');
    p('01 laedt ohne Fehler', laut.length === 0, laut[0]);
    p('01 zeigt vier Sinnbilder', d.querySelectorAll('#faelle .fall svg').length === 4);
    [['a', 'kehl', 'pfeil', 'ringsum'], ['b', 'kehl', 'gegen', 'keins'],
      ['c', 'dkehl', 'beide', 'keins'], ['d', 'v', 'pfeil', 'baustelle']]
      .forEach(([id, n, s, z]) => {
        setz(d, 'n' + id, n); setz(d, 's' + id, s); setz(d, 'z' + id, z);
      });
    knopf(d, w, 'btn1');
    p('01 Teil 1 nimmt die Loesung an', alles(stand(d, 'bilanz1'), 4), stand(d, 'bilanz1'));
    ['f1', 'f2', 'f3', 'f4'].forEach((id, i) => setz(d, id, ['b', 'b', 'a', 'b'][i]));
    knopf(d, w, 'btn2');
    p('01 Teil 2 nimmt die Loesung an', alles(stand(d, 'bilanz2'), 4), stand(d, 'bilanz2'));
    w.close();
  }
  {
    const { d, w, laut } = await seite('uebungen/schweissen/02-pfeilseite-oder-gegenseite.html');
    p('02 laedt ohne Fehler', laut.length === 0, laut[0]);
    p('02 zeigt vier Sinnbilder und vier Bauteile',
      d.querySelectorAll('#sinnbilder .karte2').length === 4
      && d.querySelectorAll('#bauteile .karte2').length === 4);
    ['1', '2', '3', '4'].forEach((n, i) => setz(d, 'w' + n, ['A', 'B', 'C', 'D'][i]));
    knopf(d, w, 'btn1');
    p('02 die Zuordnung stimmt', alles(stand(d, 'bilanz1'), 4), stand(d, 'bilanz1'));
    setz(d, 'p1', 'voll'); setz(d, 'p2', 'strich'); setz(d, 'p3', 'kombi');
    knopf(d, w, 'btn2');
    p('02 die Umkehrung stimmt', alles(stand(d, 'bilanz2'), 3), stand(d, 'bilanz2'));
    w.close();
  }
  {
    const { d, w, laut } = await seite('uebungen/schweissen/03-die-naht-bemassen.html');
    p('03 laedt ohne Fehler', laut.length === 0, laut[0]);
    [['z1', '5'], ['z2', '4'], ['z3', '40'], ['z4', '30'], ['z5', '160']]
      .forEach(([id, v]) => setz(d, id, v));
    knopf(d, w, 'btn1');
    p('03 der Eintrag wird richtig gelesen', alles(stand(d, 'bilanz1'), 5),
      stand(d, 'bilanz1'));
    setz(d, 'az1', '7.1'); setz(d, 'az2', '5.7'); setz(d, 'az3', 'z');
    knopf(d, w, 'btn2');
    p('03 a und z rechnen sich um', alles(stand(d, 'bilanz2'), 3), stand(d, 'bilanz2'));
    setz(d, 'e1', 'a4 5 x 25 (15)'); setz(d, 'e2', 'voll'); setz(d, 'e3', '250');
    knopf(d, w, 'btn3');
    p('03 der Eintrag laesst sich bilden', alles(stand(d, 'bilanz3'), 3),
      stand(d, 'bilanz3'));
    setz(d, 'k1', '215'); setz(d, 'k2', '2.6'); setz(d, 'k3', '34.4'); setz(d, 'k4', '0.42');
    knopf(d, w, 'btn4');
    p('03 Draht und Zeit stimmen', alles(stand(d, 'bilanz4'), 4), stand(d, 'bilanz4'));
    w.close();
  }
  {
    const { d, w, laut } = await seite('uebungen/schweissen/04-welches-verfahren.html');
    p('04 laedt ohne Fehler', laut.length === 0, laut[0]);
    [['a', 'mag', '135'], ['b', 'wig', '141'], ['c', 'hand', '111'],
      ['d', 'mig', '131']].forEach(([id, v, n]) => {
      setz(d, 'v' + id, v); setz(d, 'n' + id, n);
    });
    knopf(d, w, 'btn1');
    p('04 Verfahren und Nummer werden angenommen', alles(stand(d, 'bilanz1'), 4),
      stand(d, 'bilanz1'));
    ['l1', 'l2', 'l3', 'l4'].forEach((id, i) => setz(d, id, ['PA', 'PB', 'PF', 'PE'][i]));
    knopf(d, w, 'btn2');
    p('04 die Positionen stimmen', alles(stand(d, 'bilanz2'), 4), stand(d, 'bilanz2'));
    w.close();
  }
  {
    const { d, w, laut } = await seite('uebungen/schweissen/05-schweissgeeignet.html');
    p('05 laedt ohne Fehler', laut.length === 0, laut[0]);
    [['1', '0.40', 'gut', 'nein'], ['2', '0.47', 'bedingt', 'meist'],
      ['3', '0.77', 'sorgfalt', 'immer']].forEach(([n, c, b, v]) => {
      setz(d, 'c' + n, c); setz(d, 'b' + n, b); setz(d, 'v' + n, v);
    });
    knopf(d, w, 'btn1');
    p('05 die drei Kohlenstoffaequivalente stimmen', alles(stand(d, 'bilanz1'), 3),
      stand(d, 'bilanz1'));
    setz(d, 'x1', '4.58'); setz(d, 'x2', 'c'); setz(d, 'x3', 'nein');
    knopf(d, w, 'btn2');
    p('05 der nichtrostende Fall stimmt', alles(stand(d, 'bilanz2'), 3),
      stand(d, 'bilanz2'));
    w.close();
  }
  {
    const { d, w, laut } = await seite('uebungen/schweissen/06-woher-kommt-der-verzug.html');
    p('06 laedt ohne Fehler', laut.length === 0, laut[0]);
    p('06 zeigt vier Schweissfolgen', d.querySelectorAll('#folgen .folge').length === 4);
    ['v1', 'v2', 'v3'].forEach((id, i) => setz(d, id, ['quer', 'winkel', 'laengs'][i]));
    knopf(d, w, 'btn1');
    p('06 die drei Ursachen stimmen', alles(stand(d, 'bilanz1'), 3), stand(d, 'bilanz1'));
    setz(d, 'f1', 'D'); setz(d, 'f2', 'A');
    knopf(d, w, 'btn2');
    p('06 die Schweissfolge stimmt', alles(stand(d, 'bilanz2'), 2), stand(d, 'bilanz2'));
    ['m1', 'm2', 'm3', 'm4', 'm5'].forEach((id, i) =>
      setz(d, id, ['quer', 'winkel', 'laengs', 'winkel', 'laengs'][i]));
    knopf(d, w, 'btn3');
    p('06 die Gegenmassnahmen stimmen', alles(stand(d, 'bilanz3'), 5),
      stand(d, 'bilanz3'));
    w.close();
  }

  /* ---------- 3. Jedes Training einmal durchspielen ---------- */

  console.log('\nDie fuenf Trainings, je ein Durchgang mit lauter richtigen Antworten');

  /* Die richtige Antwort steht im Zustand der Seite (w.runde) - so prueft
     das hier den Weg von der Eingabe bis zur Rueckmeldung und nicht noch
     einmal die eigene Rechnung. */
  const ANTWORTEN = {
    '01-symbol-schnellcheck.html': (d, w) => w.schweissName(w.runde[w.nr].art),
    '02-pfeilseite-erkennen.html': (d, w) =>
      w.LAGEN.filter((l) => l.id === w.runde[w.nr].lage)[0].text,
    '04-begriffe-der-schweisstechnik.html': (d, w) => {
      const a = w.runde[w.nr];
      return a.richtung === 'begriff' ? a.b : a.e;
    },
    '05-verfahren-und-kennzahl.html': (d, w) => {
      const a = w.runde[w.nr];
      return a.richtung === 'verfahren' ? a.v : a.n;
    },
  };

  for (const datei of Object.keys(ANTWORTEN).sort()) {
    const { d, w, laut } = await seite('trainings/schweissen/' + datei);
    if (laut.length) { p(datei + ' laeuft', false, laut[0]); continue; }
    const umfang = d.getElementById('umfang');
    umfang.value = umfang.options[0].value;
    umfang.dispatchEvent(new w.Event('change', { bubbles: true }));
    const runden = Number(umfang.value);
    let stecken = 0;
    for (let i = 0; i < runden; i++) {
      const soll = ANTWORTEN[datei](d, w);
      [...d.querySelectorAll('#wahl button')]
        .filter((b) => b.textContent === soll)
        .forEach((b) => klick(d, w, b));
      const weiter = d.getElementById('btnWeiter');
      if (weiter.hidden) { stecken = i + 1; break; }
      klick(d, w, weiter);
    }
    p(datei + ' laeuft durch', stecken === 0, 'stehen geblieben in Runde ' + stecken);
    if (stecken) { w.close(); continue; }
    p(datei + ' zaehlt richtig', alles(stand(d, 'bilanz'), runden), stand(d, 'bilanz'));
    p(datei + ' zeigt den Rueckblick',
      d.querySelectorAll('#rueckblick li').length === runden);
    w.close();
  }

  /* Das Rechentraining hat ein Eingabefeld statt Knoepfen. */
  {
    const datei = '03-a-und-z-umrechnen.html';
    const { d, w, laut } = await seite('trainings/schweissen/' + datei);
    p(datei + ' laedt ohne Fehler', laut.length === 0, laut[0]);
    const umfang = d.getElementById('umfang');
    umfang.value = '5';
    umfang.dispatchEvent(new w.Event('change', { bubbles: true }));
    let stecken = 0;
    for (let i = 0; i < 5; i++) {
      d.getElementById('antwort').value = String(w.runde[w.nr].soll.toFixed(2));
      knopf(d, w, 'btnPruefen');
      const weiter = d.getElementById('btnWeiter');
      if (weiter.hidden) { stecken = i + 1; break; }
      klick(d, w, weiter);
    }
    p(datei + ' laeuft durch', stecken === 0, 'stehen geblieben in Runde ' + stecken);
    if (!stecken) {
      p(datei + ' zaehlt richtig', alles(stand(d, 'bilanz'), 5), stand(d, 'bilanz'));
    }
    w.close();
  }

  console.log('\n' + (fehler ? fehler + ' Befunde' : 'alles gruen'));
  process.exit(fehler ? 1 : 0);
}

main();
