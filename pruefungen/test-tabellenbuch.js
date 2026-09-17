/* Stimmen alle Zahlen mit dem Tabellenbuch überein?

   Die Schüler haben das Europa-Tabellenbuch Metall auf dem Tisch. Weicht das
   Material davon ab, rechnet der Unterricht gegen die Quelle, mit der geprüft
   wird. Dieser Test hält jede hinterlegte Tabellenzeile dagegen - im Material
   und im Werkzeug im Nachbar-Repo.

   Geprüft wird gegen abgelesene Zeilen dieser Abschnitte:
     - Metrische Gewinde und Feingewinde (Nennmaße Reihe 1)
     - Festigkeitsklassen, Durchgangslöcher, Mindesteinschraubtiefen
     - Vereinfachte Berechnung von Schrauben
     - Montage hochbeanspruchter Schraubenverbindungen (VDI 2230, Tabelle A1)
     - Flächenpressung an Schraubenkopf- und Mutterauflageflächen

   Zwei Prozent Abstand sind erlaubt: Die Tabellen runden ihre Zwischenwerte
   anders, und die Drehmomente stehen dort ohne Nachkomma. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const { BASIS, mitAssets, fertig } = require('./harness');

const { MATERIAL, WERKZEUGE, TOOLS, WEBSEITE, dran } = require('./orte');
/* Diese Pruefung gilt dem Nachbar-Repo. Ist es hier nicht ausgecheckt, gibt
   es nichts zu pruefen - das ist kein Fehler im Material. */
if(!dran(TOOLS, 'Werkzeug-Repo')) return;
const WERKZEUG = TOOLS + '/'
  + 'maschinenelemente-schrauben-schraubverbindungen.html';
const GRENZE = 2.0;

/* ---------- Was im Buch steht ----------
   Kommt aus tabellenbuch/daten.json im Repo. Der Ordner steht in .gitignore:
   Die abgelesenen Werte sind Arbeitsgrundlage, nichts zum Veroeffentlichen. */
const TB = JSON.parse(fs.readFileSync(path.join(BASIS, 'tabellenbuch/daten.json'), 'utf8'));

/* Gewindemasse samt Schluesselweite, dazu das Durchgangsloch (Reihe mittel)
   und der Kopfauflagedurchmesser der ISO 4014. */
const TB_GEWINDE = {};
for (const g of Object.keys(TB.gewinde)) {
  if (g.startsWith('_')) continue;
  const kopf = TB.sechskantschraube_4014[g];
  TB_GEWINDE[g] = {
    P: TB.gewinde[g].P,
    As: TB.gewinde[g].S,
    sw: TB.gewinde[g].sw,
    dh: (TB.durchgangsloecher[g] || [])[1],
    dw: kopf && kopf.dw,
    k: kopf && kopf.k,
  };
}

/* Festigkeitsklassen: die Mindestwerte nach ISO 898-1, mit denen die
   Drehmomenttabelle gerechnet ist. */
const TB_KLASSEN = TB.festigkeitsklassen_schrauben._mindestwerte_iso898;

/* Vorspannkraefte und Anziehdrehmomente aus der Tabelle A1. */
const TB_ANZIEHEN = [];
for (const g of Object.keys(TB.montage_vdi2230.tabelle_a1)) {
  if (g.startsWith('_')) continue;
  for (const kl of Object.keys(TB.montage_vdi2230.tabelle_a1[g])) {
    for (const my of Object.keys(TB.montage_vdi2230.tabelle_a1[g][kl])) {
      const [fv, ma] = TB.montage_vdi2230.tabelle_a1[g][kl][my];
      TB_ANZIEHEN.push([g, kl, Number(my), fv, ma]);
    }
  }
}

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};
const ab = (ist, soll) => Math.abs(ist / soll - 1) * 100;

async function seite(rel, ausWerkzeug) {
  const roh = ausWerkzeug
    ? fs.readFileSync(rel, 'utf8').replace(/^---[\s\S]*?---\s*/, '')
    : mitAssets(fs.readFileSync(path.join(BASIS, rel), 'utf8'));
  const dom = new JSDOM(roh, {
    runScripts: 'dangerously',
    url: ausWerkzeug
      ? 'https://t-bk.de/werkzeuge/tools/x.html'
      : 'https://t-bk.de/unterrichtsmaterial/' + rel,
  });
  dom.window.Element.prototype.scrollIntoView = function () {};
  if (ausWerkzeug) {
    await new Promise(r => { dom.window.addEventListener('load', r); setTimeout(r, 3000); });
  } else {
    await fertig(dom);
  }
  return dom;
}

/* Jede Seite, die eine Gewinde- oder Klassentabelle mitbringt. */
const SEITEN = [
  { rel: 'uebungen/schraubverbindungen/01-bezeichnung-lesen.html', name: 'Übung 1' },
  { rel: 'uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html', name: 'Übung 3' },
  { rel: 'uebungen/schraubverbindungen/04-gleiches-drehmoment-andere-spannkraft.html', name: 'Übung 4' },
  { rel: 'uebungen/schraubverbindungen/05-querkraft-durch-reibung.html', name: 'Übung 5' },
  { rel: 'trainings/schraubverbindungen/02-anziehdrehmoment-rechnen.html', name: 'Training 2' },
  { rel: WERKZEUG, name: 'Werkzeug', werkzeug: true },
];

async function main() {
  /* ---------- 1. Gewinde- und Klassentabellen auf allen Seiten ---------- */
  console.log('Gewinde- und Klassentabellen');
  const masse = {};          // Seite -> abgeleitete Masse, fuer den Quervergleich
  for (const s of SEITEN) {
    const dom = await seite(s.rel, s.werkzeug);
    const w = dom.window;
    const schrauben = w.SCHRAUBEN;
    const abw = [];
    for (const g in schrauben) {
      if (!schrauben.hasOwnProperty(g)) continue;
      const tb = TB_GEWINDE[g];
      if (!tb) { abw.push(g + ': im Tabellenbuch nicht nachgeschlagen'); continue; }
      if (schrauben[g].P !== tb.P) abw.push(g + ': P = ' + schrauben[g].P + ' statt ' + tb.P);
      if (schrauben[g].s !== undefined && schrauben[g].s !== tb.sw) {
        abw.push(g + ': SW = ' + schrauben[g].s + ' statt ' + tb.sw);
      }
      if (schrauben[g].Dh !== undefined && schrauben[g].Dh !== tb.dh) {
        abw.push(g + ': Durchgangsloch = ' + schrauben[g].Dh + ' statt ' + tb.dh);
      }
      if (schrauben[g].dw !== undefined && schrauben[g].dw !== tb.dw) {
        abw.push(g + ': Kopfauflage dw = ' + schrauben[g].dw + ' statt ' + tb.dw);
      }
      if (schrauben[g].k !== undefined && schrauben[g].k !== tb.k) {
        abw.push(g + ': Kopfhöhe k = ' + schrauben[g].k + ' statt ' + tb.k);
      }
      if (schrauben[g].m !== undefined && schrauben[g].m !== TB.mutter_4032[g].m) {
        abw.push(g + ': Mutterhöhe m = ' + schrauben[g].m + ' statt ' + TB.mutter_4032[g].m);
      }
      /* Der Spannungsquerschnitt wird gerechnet - er muss die Buchspalte
         treffen. Nicht jede Seite braucht ihn (Übung 1 rechnet keine Kräfte). */
      const masseFn = w.gewindeMasse || w.masse;
      if (typeof masseFn === 'function') {
        const m = masseFn(g);
        if (m && m.As && ab(m.As, tb.As) > 0.5) {
          abw.push(g + ': A_S = ' + m.As.toFixed(1) + ' statt ' + tb.As);
        }
      }
    }
    p(s.name + ': Gewindetabelle', !abw.length, abw.join(' · '));

    if (w.KLASSEN) {
      const kl = [];
      for (const k in TB_KLASSEN) {
        const wert = w.KLASSEN[k];
        if (wert === undefined) { kl.push(k + ' fehlt'); continue; }
        const rp = (typeof wert === 'object') ? wert.Rp : wert;
        if (rp !== TB_KLASSEN[k].Rp) kl.push(k + ': Rp = ' + rp + ' statt ' + TB_KLASSEN[k].Rp);
        if (typeof wert === 'object' && wert.Rm !== TB_KLASSEN[k].Rm) {
          kl.push(k + ': Rm = ' + wert.Rm + ' statt ' + TB_KLASSEN[k].Rm);
        }
      }
      p(s.name + ': Festigkeitsklassen', !kl.length, kl.join(' · '));
    }
    masse[s.name] = schrauben;
    dom.window.close();
  }

  /* ---------- 2. Dieselben Zahlen auf allen Seiten ---------- */
  console.log('Quervergleich');
  const namen = Object.keys(masse);
  const unterschiede = [];
  for (const g in TB_GEWINDE) {
    ['dw', 'Dh', 's', 'k'].forEach(feld => {
      const werte = {};
      namen.forEach(n => {
        if (masse[n][g] && masse[n][g][feld] !== undefined) werte[masse[n][g][feld]] = n;
      });
      if (Object.keys(werte).length > 1) {
        unterschiede.push(g + '.' + feld + ': ' + JSON.stringify(werte));
      }
    });
  }
  p('gleiche Schraubenmaße auf allen Seiten', !unterschiede.length, unterschiede.join(' · '));

  /* ---------- 3. Vorspannkraft und Anziehdrehmoment ---------- */
  console.log('Vorspannkraft und Anziehdrehmoment');
  const t2 = await seite('trainings/schraubverbindungen/02-anziehdrehmoment-rechnen.html');
  for (const [g, k, my, fTB, mTB] of TB_ANZIEHEN) {
    const r = t2.window.rechne(g, k, my);
    const dF = ab(r.FM / 1000, fTB), dM = ab(r.MA, mTB);
    p(`${g} ${k} bei μ = ${my}: ${(r.FM / 1000).toFixed(1)} kN / ${r.MA.toFixed(0)} N·m`,
      dF <= GRENZE && dM <= GRENZE,
      `Tabelle ${fTB} kN / ${mTB} N·m (ab ${dF.toFixed(1)} % / ${dM.toFixed(1)} %)`);
  }
  const rM10 = t2.window.rechne('M10', '8.8', 0.12);
  p('Tabellenwert liegt in der Toleranz des Trainings',
    Math.abs(29.6 / (rM10.FM / 1000) - 1) <= 0.04);
  t2.window.close();

  const u5 = await seite('uebungen/schraubverbindungen/05-querkraft-durch-reibung.html');
  p('Übung 5: M10 8.8 = 29,6 kN', ab(u5.window.vorspannkraft('M10', '8.8') / 1000, 29.6) <= GRENZE);
  u5.window.close();

  const u3 = await seite('uebungen/schraubverbindungen/03-wohin-geht-das-drehmoment.html');
  const e3 = u3.window.rechne('M12', '8.8', 0.12, 0.12);
  p('Übung 3: M12 8.8 = 43 kN / 84 N·m',
    ab(e3.FM / 1000, 43.0) <= GRENZE && ab(e3.MA, 84) <= GRENZE);
  u3.window.close();

  /* ---------- 4. Werte, die nur als Text auf der Seite stehen ---------- */
  console.log('Zahlen im Text');
  const ls = fs.readFileSync(path.join(BASIS,
    'lernsituationen/konsole-am-foerderband/index.html'), 'utf8');
  p('Lernsituation: Grenzflächenpressung S235JR = 490 N/mm²', /490 N\/mm²/.test(ls));
  p('Lernsituation: Erfahrungswert M10 = 16 kN', /16 kN/.test(ls));
  p('Lernsituation: Durchgangsloch als Reihe mittel benannt', /Reihe <em>mittel<\/em>/.test(ls));

  const u4 = fs.readFileSync(path.join(BASIS,
    'uebungen/schraubverbindungen/04-gleiches-drehmoment-andere-spannkraft.html'), 'utf8');
  p('Übung 4: Anziehfaktoren wie im Tabellenbuch',
    /1,6 &hellip; 2,5/.test(u4) && /2,5 &hellip; 4/.test(u4) && /3 &hellip; 4/.test(u4));
  p('Übung 4: Drehwinkel ist als VDI-Wert gekennzeichnet',
    /nicht\s+in dieser Tabelle, sondern in der VDI 2230/.test(u4.replace(/\s+/g, ' ')));

  const u6 = fs.readFileSync(path.join(BASIS,
    'uebungen/schraubverbindungen/06-festigkeitsklassen-deuten.html'), 'utf8');
  p('Übung 6: A2-70 mit 700 N/mm²', /700 N\/mm²/.test(u6));

  /* ---------- Die vier Nachschlage-Trainings ----------
     Sie bringen ihre Tabellen selbst mit, weil tabellenbuch/ nicht
     veroeffentlicht wird. Hier wird jede Zeile gegen das Buch gehalten. */
  console.log('\nTrainings mit eigener Tabelle');

  const nah = (a, b) => Math.abs(a - b) < 0.005;

  {
    const w = (await seite('trainings/schraubverbindungen/04-reicht-die-laenge.html')).window;
    const abw = [];
    for (const g of Object.keys(w.SCHRAUBEN)) {
      const z = w.SCHRAUBEN[g];
      if (!nah(z.P, TB.gewinde[g].P)) abw.push(g + ': P = ' + z.P + ' statt ' + TB.gewinde[g].P);
      if (!nah(z.m, TB.mutter_4032[g].m)) {
        abw.push(g + ': m = ' + z.m + ' statt ' + TB.mutter_4032[g].m);
      }
      const sch = TB.scheiben.iso7090[g];
      if (!sch) abw.push(g + ': Scheibe nicht nachgeschlagen');
      else if (!nah(z.h, sch.h)) abw.push(g + ': h = ' + z.h + ' statt ' + sch.h);
    }
    p('Reicht die Länge?: Steigung, Mutterhöhe, Scheibendicke', !abw.length, abw.join(' · '));
    p('Reicht die Länge?: Normlängenreihe wie ISO 4014',
      w.NENNLAENGEN.join(',') === TB.sechskantschraube_4014._nennlaengen.join(','),
      w.NENNLAENGEN.join(','));
  }

  {
    const w = (await seite('trainings/schraubverbindungen/05-klasse-und-zahl.html')).window;
    const abw = [];
    for (const g of Object.keys(w.QUERSCHNITT)) {
      if (!nah(w.QUERSCHNITT[g], TB.gewinde[g].S)) {
        abw.push(g + ': S = ' + w.QUERSCHNITT[g] + ' statt ' + TB.gewinde[g].S);
      }
    }
    p('Klasse und Zahl: Spannungsquerschnitte', !abw.length, abw.join(' · '));
    /* Die Kennwerte werden aus der Bezeichnung gerechnet - sie muessen die
       abgedruckten Nennwerte treffen. */
    const kl = [];
    for (const k of w.KLASSEN) {
      const tb = TB.festigkeitsklassen_schrauben[k];
      if (!tb) continue;
      const r = w.kennwerte(k);
      if (r.Rm !== tb.Rm) kl.push(k + ': Rm = ' + r.Rm + ' statt ' + tb.Rm);
      if (r.Re !== tb.Re) kl.push(k + ': Re = ' + r.Re + ' statt ' + tb.Re);
    }
    p('Klasse und Zahl: Rm und Re wie abgedruckt', !kl.length, kl.join(' · '));
  }

  {
    const w = (await seite('trainings/schraubverbindungen/06-haelt-oder-rutscht.html')).window;
    const abw = [];
    for (const paar of w.PAARUNGEN) {
      /* "Stahl auf Stahl" heisst im Buch "Stahl/Stahl". */
      const schl = paar.name.replace(' auf ', '/');
      const tb = TB.reibungszahlen[schl];
      if (!tb) { abw.push(paar.name + ': im Buch nicht gefunden'); continue; }
      if (!nah(paar.trocken, tb.haft[0])) {
        abw.push(paar.name + ' trocken: ' + paar.trocken + ' statt ' + tb.haft[0]);
      }
      if (!nah(paar.geschmiert, tb.haft[1])) {
        abw.push(paar.name + ' geschmiert: ' + paar.geschmiert + ' statt ' + tb.haft[1]);
      }
    }
    p('Hält oder rutscht?: Haftreibungszahlen', !abw.length, abw.join(' · '));
    const ef = TB.vereinfachte_berechnung.erfahrungswerte;
    const vs = [];
    for (const g of Object.keys(w.VORSPANN)) {
      if (!ef[g]) { vs.push(g + ': kein Erfahrungswert im Buch'); continue; }
      if (w.VORSPANN[g] !== ef[g].Fv) {
        vs.push(g + ': Fv = ' + w.VORSPANN[g] + ' statt ' + ef[g].Fv);
      }
    }
    p('Hält oder rutscht?: Vorspannkräfte aus den Erfahrungswerten', !vs.length, vs.join(' · '));
  }

  {
    const w = (await seite(
      'trainings/schraubverbindungen/07-im-tabellenbuch-nachschlagen.html')).window;
    const abw = [];
    for (const g of Object.keys(w.TABELLE)) {
      const z = w.TABELLE[g], tb = TB.gewinde[g];
      const kopf = TB.sechskantschraube_4014[g], mut = TB.mutter_4032[g];
      const dl = (TB.durchgangsloecher[g] || [])[1];
      const pruefe = [['P', z.P, tb.P], ['d2', z.d2, tb.d2], ['d3', z.d3, tb.d3],
        ['S', z.S, tb.S], ['bohrer', z.bohrer, tb.bohrer], ['sw', z.sw, tb.sw],
        ['dl', z.dl, dl], ['k', z.k, kopf && kopf.k], ['e', z.e, kopf && kopf.e],
        ['m', z.m, mut && mut.m]];
      for (const [name, ist, soll] of pruefe) {
        if (soll === undefined || soll === null) {
          abw.push(g + ': ' + name + ' fehlt im Buch');
          continue;
        }
        if (!nah(ist, soll)) abw.push(g + ': ' + name + ' = ' + ist + ' statt ' + soll);
      }
    }
    p('Im Tabellenbuch nachschlagen: alle zehn Spalten', !abw.length, abw.join(' · '));
  }

  /* ---------- Jede Art mit ihrer Norm ---------- */

  console.log('\nReicht die Laenge: jede Art nennt ihre Norm');
  {
    /* Das Tabellenbuch fuehrt mehrere Mutter- und Scheibenarten
       nebeneinander und neben dem Regelgewinde das Feingewinde. Steht in
       der Aufgabe nur "Sechskantmutter" und "Scheibe", schlaegt man die
       falsche Zeile nach und rechnet mit einer anderen Hoehe oder Dicke -
       ohne dass man den Fehler sieht. Deshalb gehoert die Norm in die
       Aufgabe selbst, nicht nur in die Fussnote. */
    const datei = 'trainings/schraubverbindungen/04-reicht-die-laenge.html';
    const roh = fs.readFileSync(path.join(BASIS, datei), 'utf8');
    const dom = new JSDOM(mitAssets(roh), {
      runScripts: 'dangerously',
      url: 'https://t-bk.de/unterrichtsmaterial/' + datei,
      beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; },
    });
    await fertig(dom.window);
    const dd = dom.window.document;
    const lies = (id) => (dd.getElementById(id) || {}).textContent || '';

    /* Die Normen stehen duenn unter der Aufgabe, nicht im Satz: Mitten im
       Text unterbrechen vier Normnummern den Lesefluss. */
    p('die Aufgabe steht da', lies('aufgabe').length > 40, lies('aufgabe'));
    p('die Normen stehen unter der Aufgabe, nicht darin',
      lies('normen').length > 20 && lies('aufgabe').indexOf('DIN') === -1,
      lies('aufgabe'));

    /* Die Normen, die das Material selbst als Quelle angibt. */
    [['das Regelgewinde', 'DIN 13-1'],
      ['die Sechskantschraube', 'DIN EN ISO 4014'],
      ['die Sechskantmutter', 'DIN EN ISO 4032'],
    ].forEach(([was, norm]) => {
      p('die Zeile nennt fuer ' + was + ' die ' + norm,
        lies('normen').indexOf(norm) !== -1, lies('normen'));
    });

    /* Die Scheibe kommt nur in einem Teil der Aufgaben vor - dann aber mit
       Norm, und ohne Scheibe darf sie auch nicht dastehen. */
    let mitScheibe = false, ohneStimmt = true;
    for (let i = 0; i < 60; i++) {
      const auf = lies('aufgabe'), norm = lies('normen');
      if (/<strong>mit<\/strong> Scheibe/.test(dd.getElementById('aufgabe').innerHTML)) {
        if (/DIN EN ISO 7090/.test(norm)) mitScheibe = true;
      } else if (/DIN EN ISO 7090/.test(norm)) {
        ohneStimmt = false;
      }
      if (mitScheibe && !ohneStimmt) break;
      if (auf && dom.window.neueAufgabe) dom.window.neueAufgabe();
    }
    p('eine Aufgabe mit Scheibe nennt die DIN EN ISO 7090', mitScheibe);
    p('eine Aufgabe ohne Scheibe nennt sie nicht', ohneStimmt);
    dom.window.close();
  }

  console.log(fehler ? '\n' + fehler + ' Fehler.' : '\nAlles deckt sich mit dem Tabellenbuch.');
  process.exitCode = fehler ? 1 : 0;
}

main();
