/* Die Montageeinheit: Presse, Strukturnetz, Vorrang und Montageplan.
 *
 * Diese Einheit hängt an einem einzigen Baustein: assets/biegepresse.js. Dort
 * stehen die Maße, die Stückliste, die Verbindungen und die
 * Vorrangbeziehungen; Zeichnung, Modell, Lektion, Übungen, Trainings und
 * Lernsituation greifen alle darauf zu. Geht dort etwas auseinander, geht es
 * überall auseinander - und genau das prüft diese Datei.
 *
 * Fünf Dinge werden gehalten:
 *
 *   1. Die Maßkette. Aus Exzentrizität, Radius und Bauteilhöhen folgt der
 *      Spalt von 2 mm über dem Nutgrund. Wer eine Zahl ändert, muss die
 *      Kette nachrechnen - sonst schlägt der Stempel auf.
 *   2. Der Bauraum. Die Federn stehen zwischen Gesenk und Ständer, der
 *      Blechstreifen zwischen den Führungsbolzen, der Stempelhalter
 *      zwischen den Ständern. Drei Engstellen, drei Prüfungen.
 *   3. Die Normteile. Jede Bezeichnung in der Stückliste muss im
 *      Tabellenbuch stehen - mit diesem Durchmesser und dieser Länge.
 *   4. Der Vorranggraph. Er darf keinen Kreis enthalten, sonst gäbe es
 *      keine einzige gültige Reihenfolge; und er darf nicht so eng sein,
 *      dass nur eine bleibt - dann wäre die ganze Einheit gegenstandslos.
 *   5. Die Spiegelung. Beide Bausteine liegen in zwei Repos.
 */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const { BASIS, mitAssets, fertig } = require('./harness');
const { TOOLS, teilweise } = require('./orte');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was
    + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const LS = 'lernsituationen/biegepresse/index.html';

/* Die beiden Bausteine laufen ohne Browser - sie hängen nur an einem
   globalen Objekt. Für die Prüfung genügt eine leere Hülle. */
function laden() {
  const welt = { window: null };
  const sand = {};
  sand.window = sand;
  ['biegepresse.js', 'montageplan.js'].forEach((datei) => {
    const quelle = fs.readFileSync(path.join(BASIS, 'assets', datei), 'utf8');
    // eslint-disable-next-line no-new-func
    new Function('window', quelle).call(sand, sand);
  });
  return sand;
}

async function main() {
  console.log('\nDie Bausteine');

  ['biegepresse.js', 'montageplan.js'].forEach((datei) => {
    const hier = path.join(BASIS, 'assets', datei);
    p('assets/' + datei + ' liegt im Materialrepo', fs.existsSync(hier));
    if (teilweise(TOOLS, 'die Werkzeuge')) {
      const dort = path.join(TOOLS, 'assets', datei);
      p('und zeichengleich im Werkzeugrepo',
        fs.existsSync(dort)
        && fs.readFileSync(dort, 'utf8') === fs.readFileSync(hier, 'utf8'));
    }
  });

  const w = laden();
  const P = w.PRESSE, MP = w.Montageplan;
  p('PRESSE steht bereit', !!P);
  p('Montageplan steht bereit', !!MP);
  if (!P || !MP) { schluss(); return; }

  const M = P.M;

  console.log('\nDie Maßkette');

  p('der Hub ist das Doppelte der Exzentrizität',
    M.hub === 2 * M.exzE, M.hub + ' zu ' + M.exzE);
  p('der Exzenter berührt den Stempelhalter zwischen ' + M.beruehrUnten
    + ' und ' + M.beruehrOben,
    M.beruehrOben - M.beruehrUnten === M.hub);
  p('der Stempel steht in der unteren Endlage genau eine Blechdicke über '
    + 'dem Nutgrund',
    M.luft === M.blechD, M.luft + ' mm statt ' + M.blechD);
  p('der Nutgrund liegt über der Grundplatte',
    M.nutGrund > M.gpD, M.nutGrund + ' zu ' + M.gpD);
  p('der Stempel taucht in die Nut ein',
    M.spitze < M.geOben, 'Spitze ' + M.spitze + ', Nutkante ' + M.geOben);

  /* Die Feder darf in der unteren Endlage nicht auf Block gehen und in der
     oberen nicht den Halt verlieren. Beides wäre am Modell nicht zu sehen,
     an der Maschine aber sofort zu spüren. */
  const einbauUnten = M.shUnten - M.gpOben;
  const einbauOben = einbauUnten + M.hub;
  p('die Feder ist unten um ' + (M.federL0 - einbauUnten) + ' mm '
    + 'zusammengedrückt und geht nicht auf Block',
    M.federL0 - einbauUnten < 34.9, 'zulässiger Federweg 34,9 mm');
  p('und oben noch vorgespannt',
    einbauOben < M.federL0, einbauOben + ' zu ' + M.federL0);

  console.log('\nDer Bauraum');

  const federHalb = M.federD / 2;
  p('die Federn stehen neben dem Gesenk',
    M.fbX - federHalb > M.geB / 2,
    'Feder ab x = ' + (M.fbX - federHalb) + ', Gesenk bis '
    + (M.geB / 2));
  p('und neben den Ständern',
    M.fbX + federHalb < M.stX,
    'Feder bis x = ' + (M.fbX + federHalb) + ', Ständer ab ' + M.stX);
  p('der Blechstreifen passt zwischen die Führungsbolzen',
    M.blechB / 2 < M.fbX - M.fbD / 2,
    'Streifen bis ' + (M.blechB / 2) + ', Bolzen ab '
    + (M.fbX - M.fbD / 2));
  p('und ist schmaler als die Nut lang ist',
    M.blechB <= M.geB, M.blechB + ' zu ' + M.geB);
  p('der Stempelhalter läuft zwischen den Ständern',
    M.shB / 2 < M.stX, M.shB / 2 + ' zu ' + M.stX);
  p('die Führungsbolzen enden unter der Welle',
    M.fbOben < M.wellY - M.wellD / 2,
    M.fbOben + ' zu ' + (M.wellY - M.wellD / 2));
  p('und ragen über den Stempelhalter hinaus, auch ganz oben',
    M.fbOben > M.beruehrOben, M.fbOben + ' zu ' + M.beruehrOben);
  p('der Exzenterbund liegt zwischen den Führungsbolzen',
    M.exzB / 2 < M.fbX - M.fbD / 2,
    'Bund bis ' + (M.exzB / 2) + ', Bolzen ab ' + (M.fbX - M.fbD / 2));
  p('die Welle ist länger als der Abstand der Ständeraußenflächen',
    M.wellBis - M.wellVon > 2 * (M.stX + M.stB),
    (M.wellBis - M.wellVon) + ' zu ' + 2 * (M.stX + M.stB));
  p('der Bund liegt innen am linken Ständer an',
    M.bundVon === -M.stX, M.bundVon + ' zu ' + (-M.stX));

  console.log('\nStückliste und Normteile');

  p('zwölf Positionen', P.TEILE.length === 12, P.TEILE.length + '');
  p('die Positionsnummern sind lückenlos von 1 bis 12',
    P.TEILE.every((t, i) => t.pos === i + 1),
    P.TEILE.map((t) => t.pos).join(','));
  p('jede Position hat eine Menge größer null',
    P.TEILE.every((t) => t.menge >= 1));
  p('und ist Fertigungs- oder Normteil',
    P.TEILE.every((t) => t.art === 'fertigung' || t.art === 'norm'));
  p('mehr als eine Position kommt mehrfach vor',
    P.TEILE.filter((t) => t.menge > 1).length >= 3,
    P.TEILE.filter((t) => t.menge > 1).map((t) => t.pos).join(','));

  /* Die abgelesenen Tabellenzeilen liegen in tabellenbuch/daten.json. Der
     Ordner steht in .gitignore - wer das Repo frisch klont, hat ihn nicht,
     und das ist kein Fehler im Material. */
  const datenOrt = path.join(BASIS, 'tabellenbuch', 'daten.json');
  if (!fs.existsSync(datenOrt)) {
    console.log('  ohne   Tabellenbuch: ' + datenOrt + ' ist hier nicht da');
  } else {
    const B = JSON.parse(fs.readFileSync(datenOrt, 'utf8'));

    /* Zylinderstift ISO 2338 - 6 m6 x 20: Gibt es diese Länge zu diesem
       Durchmesser? Die Tabelle nennt je Durchmesser eine Spanne. */
    const stift = B.stifte && B.stifte.zylinderstift_2338;
    if (stift) {
      const spanne = stift._laengenbereich['6'];
      p('Zylinderstift Ø 6 × 20 liegt im Längenbereich des Buchs',
        spanne && 20 >= spanne[0] && 20 <= spanne[1],
        spanne ? spanne.join(' … ') : 'kein Eintrag');
      p('20 mm ist eine Nennlänge',
        stift._nennlaengen.indexOf(20) >= 0);
      p('die Bezeichnung in der Stückliste folgt dem Beispiel des Buchs',
        /^Zylinderstift ISO 2338 – 6 m6 × 20 – St$/.test(
          P.teil(11).benennung),
        P.teil(11).benennung);
    }
    const kegel = B.stifte && B.stifte.kegelstift_2339;
    if (kegel) {
      const spanne = kegel._laengenbereich['5'];
      p('Kegelstift Ø 5 × 40 liegt im Längenbereich des Buchs',
        spanne && 40 >= spanne[0] && 40 <= spanne[1],
        spanne ? spanne.join(' … ') : 'kein Eintrag');
      p('der Kegelstift trägt die Form in der Bezeichnung',
        / – A – /.test(P.teil(12).benennung), P.teil(12).benennung);
    }
    const zyl = B.zylinderschraube_4762;
    if (zyl) {
      p('Zylinderschraube M8 × 20 liegt im Längenbereich des Buchs',
        20 >= zyl.M8.l_von && 20 <= zyl.M8.l_bis,
        zyl.M8.l_von + ' … ' + zyl.M8.l_bis);
      p('Zylinderschraube M6 × 25 liegt im Längenbereich des Buchs',
        25 >= zyl.M6.l_von && 25 <= zyl.M6.l_bis,
        zyl.M6.l_von + ' … ' + zyl.M6.l_bis);
      p('die Senkung der M8 passt zu ihrer Kopfhöhe',
        M.senkungStT >= zyl.M8.k, M.senkungStT + ' zu k = ' + zyl.M8.k);
      p('und die Grundplatte ist dick genug für diese Senkung',
        M.gpD > M.senkungStT, M.gpD + ' zu ' + M.senkungStT);
    }
    const feder = B.druckfedern_2099_1;
    if (feder) {
      const zeile = feder['d1.6_De21.6'];
      const werte = zeile && zeile['if3.5'];
      p('die Druckfeder steht so im Buch', !!werte);
      p('Länge und Federrate stimmen mit der Tabelle überein',
        !!werte && werte.L0 === M.federL0 && werte.R === M.federR,
        werte ? werte.L0 + ' / ' + werte.R : 'kein Eintrag');
      p('der Federweg bleibt unter dem zulässigen',
        !!werte && M.federL0 - einbauUnten <= werte.sn,
        werte ? 'sn = ' + werte.sn : '');
    }
  }

  console.log('\nStrukturnetz und Vorrang');

  const posSet = new Set(P.TEILE.map((t) => t.pos));
  p('jede Kante des Strukturnetzes zeigt auf vorhandene Positionen',
    P.STRUKTUR.every((k) => posSet.has(k.a) && posSet.has(k.b)));
  p('jede Kante sagt fest oder beweglich',
    P.STRUKTUR.every((k) => k.art === 'fest' || k.art === 'beweglich'));
  p('und jede sagt warum',
    P.STRUKTUR.every((k) => (k.warum || '').length > 12));
  p('keine Verbindung steht doppelt im Netz',
    new Set(P.STRUKTUR.map((k) => Math.min(k.a, k.b) + '-'
      + Math.max(k.a, k.b))).size === P.STRUKTUR.length);
  p('jede Position hat mindestens eine Verbindung',
    P.TEILE.every((t) => P.STRUKTUR.some((k) => k.a === t.pos
      || k.b === t.pos)),
    P.TEILE.filter((t) => !P.STRUKTUR.some((k) => k.a === t.pos
      || k.b === t.pos)).map((t) => t.pos).join(','));
  p('jede Position hat einen Platz im Netzbild',
    P.TEILE.every((t) => P.NETZ_LAGE[t.pos]));

  /* Das Netzbild wird nachgemessen, nicht nach Augenmaß gesetzt.

     Zwei Dinge dürfen nicht passieren: Zwei Kästchen dürfen einander nicht
     überdecken, und eine Verbindungslinie darf durch kein fremdes Kästchen
     laufen - dort liegt sie unter der Beschriftung, und eine Linie unter
     einem Wort ist keine Linie. Gerechnet wird in denselben Bildpunkten,
     in denen assets/montageplan.js zeichnet. */
  const NB = 940, NH = 620, NR = 70;
  const npx = (x) => NR + x / 100 * (NB - 2 * NR);
  const npy = (y) => NR + y / 100 * (NH - 2 * NR);
  const kasten = (t) => {
    const l = (t.pos + '  ' + t.kurz).length;
    const w = Math.max(104, l * 8.2 + 26), h = 40;
    const lage = P.NETZ_LAGE[t.pos];
    const x = npx(lage.x), y = npy(lage.y);
    return { pos: t.pos, x, y, l: x - w / 2, r: x + w / 2,
      o: y - h / 2, u: y + h / 2 };
  };
  const kaesten = P.TEILE.filter((t) => P.NETZ_LAGE[t.pos]).map(kasten);

  const nah = [];
  kaesten.forEach((a, i) => {
    kaesten.slice(i + 1).forEach((b) => {
      if (a.l < b.r + 8 && b.l < a.r + 8 && a.o < b.u + 8 && b.o < a.u + 8) {
        nah.push(a.pos + '/' + b.pos);
      }
    });
  });
  p('keine zwei Kästchen liegen aufeinander', !nah.length, nah.join(', '));

  const drueber = kaesten.filter((k) => k.l < 2 || k.r > NB - 2
    || k.o < 2 || k.u > NH - 2);
  p('jedes Kästchen bleibt im Bild', !drueber.length,
    drueber.map((k) => k.pos).join(', '));

  /* Schneidet die Strecke von (x1,y1) nach (x2,y2) den Kasten k? */
  const schneidet = (x1, y1, x2, y2, k) => {
    const rand = 4;
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const grenzen = [[-dx, x1 - (k.l - rand)], [dx, (k.r + rand) - x1],
      [-dy, y1 - (k.o - rand)], [dy, (k.u + rand) - y1]];
    for (const [pp, q] of grenzen) {
      if (pp === 0) { if (q < 0) return false; continue; }
      const r = q / pp;
      if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t1 > t0 + 0.02;
  };
  const durch = [];
  P.STRUKTUR.forEach((kante) => {
    const a = kaesten.filter((k) => k.pos === kante.a)[0];
    const b = kaesten.filter((k) => k.pos === kante.b)[0];
    if (!a || !b) return;
    kaesten.forEach((c) => {
      if (c.pos === kante.a || c.pos === kante.b) return;
      if (schneidet(a.x, a.y, b.x, b.y, c)) {
        durch.push(kante.a + '-' + kante.b + ' durch ' + c.pos);
      }
    });
  });
  p('keine Verbindungslinie läuft durch ein fremdes Kästchen',
    !durch.length, durch.join(', '));

  p('jede Vorrangbeziehung zeigt auf vorhandene Positionen',
    P.VORRANG.every((v) => posSet.has(v.vorher) && posSet.has(v.nachher)));
  p('und jede nennt ihren Grund',
    P.VORRANG.every((v) => (v.warum || '').length > 20));
  p('keine Vorrangbeziehung steht doppelt',
    new Set(P.VORRANG.map((v) => v.vorher + '>' + v.nachher)).size
      === P.VORRANG.length);

  /* Ein Kreis im Vorranggraph hieße: Diese Baugruppe lässt sich nicht
     montieren. Das fiele sonst erst auf, wenn die Übung nichts mehr
     akzeptiert. */
  const folgen = MP.wieVieleFolgen(P.TEILE, P.VORRANG, 300000);
  p('es gibt überhaupt eine gültige Reihenfolge', folgen.zahl > 0);
  p('und mehr als eine - sonst wäre die ganze Einheit gegenstandslos',
    folgen.zahl > 1, folgen.zahl + '');
  p('aber nicht beliebig viele: die Bedingungen wirken',
    folgen.abgebrochen || folgen.zahl < 479001600 / 1000,
    folgen.zahl + ' von 479 001 600');

  /* Die Reihenfolge, die das Modell abspielt, muss selbst gültig sein. */
  const koerper = P.teile3d();
  const folgePos = [];
  P.REIHENFOLGE.forEach((id) => {
    const k = koerper.filter((x) => x.id === id)[0];
    if (k && folgePos.indexOf(k.pos) < 0) folgePos.push(k.pos);
  });
  p('die Montagefolge des Modells verletzt keine Vorrangbeziehung',
    MP.pruefen(folgePos, P.VORRANG) === null,
    JSON.stringify(MP.pruefen(folgePos, P.VORRANG) || {}).slice(0, 90));

  /* Und eine falsche muss auffallen. Eine Prüfung, die nie anschlägt,
     prüft nichts. */
  const verdreht = folgePos.slice().reverse();
  p('eine umgekehrte Reihenfolge fällt auf',
    MP.pruefen(verdreht, P.VORRANG) !== null);

  console.log('\nDas Modell');

  p('jede Position kommt im Modell vor',
    P.TEILE.every((t) => koerper.some((k) => k.pos === t.pos)),
    P.TEILE.filter((t) => !koerper.some((k) => k.pos === t.pos))
      .map((t) => t.pos).join(','));
  p('jeder Körper hat eine eigene Kennung',
    new Set(koerper.map((k) => k.id)).size === koerper.length);
  p('jeder Körper hat eine Ruhelage abseits seines Platzes',
    koerper.every((k) => k.von
      && Math.hypot(k.von.x, k.von.y, k.von.z) > 30),
    koerper.filter((k) => !k.von
      || Math.hypot(k.von.x, k.von.y, k.von.z) <= 30)
      .map((k) => k.id).join(', '));
  p('die Abspielfolge nennt jeden Körper genau einmal',
    P.REIHENFOLGE.length === koerper.length
    && koerper.every((k) => P.REIHENFOLGE.indexOf(k.id) >= 0));
  const FORMEN = ['quader', 'rohr', 'keil', 'winkel', 'dach', 'gesenk',
    'platte', 'flanke', 'ringSegment'];
  p('jeder Körper nennt eine bekannte Form',
    koerper.every((k) => FORMEN.indexOf(k.form) >= 0),
    koerper.filter((k) => FORMEN.indexOf(k.form) < 0)
      .map((k) => k.form).join(', '));

  /* Wo ein Teil durch ein anderes gesteckt wird, hat das andere ein Loch.
     Das ist der Befund, mit dem diese Runde angefangen hat. */
  const mitLoch = (id) => {
    const k = koerper.filter((x) => x.id === id)[0];
    return !!(k && (k.masse.loch
      || (k.masse.loecher && k.masse.loecher.length)
      || k.masse.di > 0));
  };
  [['grundplatte', 'die Grundplatte'], ['stempelhalter', 'der Stempelhalter'],
   ['gesenkBasis', 'die Basis des Gesenks'], ['staenderL', 'der Ständer'],
   ['nabeV', 'die Hebelnabe'], ['federL', 'die Druckfeder']
  ].forEach(([id, was]) => {
    p(was + ' hat die Bohrung, durch die gesteckt wird', mitLoch(id));
  });

  /* Der Kegelstift geht quer durch Nabe und Welle. Eine Bohrung quer zur
     Ausziehrichtung kann der Baustein nicht - sie entsteht aus zwei
     Ringsegmenten mit Platz dazwischen. Der Platz muss so breit sein wie
     der Stift dick ist, sonst steckt er in vollem Werkstoff. */
  const stift = koerper.filter((k) => k.id === 'kegelstift')[0];
  [['nabe', 'die Hebelnabe'], ['welleQuer', 'die Welle']].forEach(
    ([anfang, was]) => {
      const segmente = koerper.filter((k) => k.form === 'ringSegment'
        && k.id.indexOf(anfang) === 0);
      p(was + ' ist für den Kegelstift quer aufgebohrt',
        segmente.length === 2, segmente.length + ' Segmente');
      p('und die Bohrung ist so weit wie der Stift dick',
        segmente.every((k) => k.masse.schlitz === stift.masse.d),
        segmente.map((k) => k.masse.schlitz).join('/') + ' zu '
          + stift.masse.d);
    });
  p('der Kegelstift reicht durch die ganze Nabe',
    stift.masse.l >= M.nabeD, stift.masse.l + ' zu ' + M.nabeD);
  const platte = koerper.filter((k) => k.id === 'grundplatte')[0];
  p('die Grundplatte hat zehn Bohrungen',
    platte.masse.loecher.length === 10,
    platte.masse.loecher.length + '');

  console.log('\nDie Montagewege');

  /* Der eigentliche Beweis: Keine Reihenfolge, die der Montageplan zulässt,
     darf ein Teil durch ein anderes hindurchfliegen lassen.

     Geprüft wird paarweise und damit für alle Reihenfolgen auf einmal: Wenn
     Teil A vor Teil B liegen darf - wenn also keine Vorrangbeziehung das
     Gegenteil erzwingt -, dann muss B seinen Weg zurücklegen können,
     während A schon da ist. Erlaubt ist eine Überschneidung nur, wo das
     eine im anderen steckt; und was ineinandersteckt, sagt das
     Strukturnetz. */
  const huelle = (k) => {
    const m = k.masse, l = k.lage;
    const halb = (a, b, c) => ({ x: a / 2, y: b / 2, z: c / 2 });
    let h;
    if (k.form === 'rohr' || k.form === 'ringSegment') {
      const r = m.d / 2, hl = m.l / 2;
      h = k.achse === 'x' ? halb(m.l, m.d, m.d)
        : k.achse === 'z' ? halb(m.d, m.d, m.l) : halb(m.d, m.l, m.d);
      void r; void hl;
    } else if (k.form === 'quader' && k.dreh && k.dreh.y) {
      /* Um 90 Grad gestellt: Länge und Dicke tauschen die Achse. */
      h = halb(m.z, m.y, m.x);
    } else {
      h = halb(m.x, m.y, m.z);
    }
    const k1 = { x1: l.x - h.x, x2: l.x + h.x, y1: l.y - h.y, y2: l.y + h.y,
      z1: l.z - h.z, z2: l.z + h.z };
    if (k.form === 'flanke') {
      /* Die Flanke liegt nicht mittig: Sie beginnt an der Nutmitte und
         reicht nach einer Seite. */
      const nachHinten = k.dreh && k.dreh.y < 0;
      k1.z1 = nachHinten ? l.z : l.z - m.z;
      k1.z2 = nachHinten ? l.z + m.z : l.z;
    }
    return k1;
  };

  const weg = (k) => {
    const a = huelle(k);
    const v = k.von || { x: 0, y: 0, z: 0 };
    return {
      x1: Math.min(a.x1, a.x1 + v.x), x2: Math.max(a.x2, a.x2 + v.x),
      y1: Math.min(a.y1, a.y1 + v.y), y2: Math.max(a.y2, a.y2 + v.y),
      z1: Math.min(a.z1, a.z1 + v.z), z2: Math.max(a.z2, a.z2 + v.z),
    };
  };

  /* Zwei Quader überschneiden sich - mit einem halben Millimeter Nachsicht,
     denn Teile, die aneinander anliegen, berühren sich eben. */
  const trifft = (a, b) => {
    const s = 0.5;
    return a.x1 < b.x2 - s && b.x1 < a.x2 - s
      && a.y1 < b.y2 - s && b.y1 < a.y2 - s
      && a.z1 < b.z2 - s && b.z1 < a.z2 - s;
  };

  /* Muss "vorher" zwingend vor "nachher" kommen? Auch über Umwege. */
  const vorherNoetig = {};
  P.TEILE.forEach((t1) => { vorherNoetig[t1.pos] = new Set(); });
  P.VORRANG.forEach((v) => vorherNoetig[v.nachher].add(v.vorher));
  let gewachsen = true;
  while (gewachsen) {
    gewachsen = false;
    P.TEILE.forEach((t1) => {
      const jetzt = vorherNoetig[t1.pos];
      [...jetzt].forEach((q) => {
        vorherNoetig[q].forEach((r) => {
          if (!jetzt.has(r)) { jetzt.add(r); gewachsen = true; }
        });
      });
    });
  }
  p('der Vorranggraph hat keinen Kreis',
    P.TEILE.every((t1) => !vorherNoetig[t1.pos].has(t1.pos)),
    P.TEILE.filter((t1) => vorherNoetig[t1.pos].has(t1.pos))
      .map((t1) => t1.pos).join(','));

  p('jeder Körper kommt aus einer Richtung, nicht aus dem Nichts',
    koerper.every((k) => k.von && [k.von.x, k.von.y, k.von.z]
      .filter((a) => Math.abs(a) > 0.001).length === 1),
    koerper.filter((k) => !k.von || [k.von.x, k.von.y, k.von.z]
      .filter((a) => Math.abs(a) > 0.001).length !== 1)
      .map((k) => k.id).join(', '));

  const kreuzt = [];
  koerper.forEach((b) => {
    const wb = weg(b);
    koerper.forEach((a) => {
      if (a.pos === b.pos) return;
      /* Muss b vor a? Dann kann a nicht im Weg liegen. */
      if (vorherNoetig[a.pos].has(b.pos)) return;
      if (P.darfDurchdringen(a.pos, b.pos)) return;
      if (trifft(wb, huelle(a))) {
        kreuzt.push(b.id + ' (Pos. ' + b.pos + ') durch '
          + a.id + ' (Pos. ' + a.pos + ')');
      }
    });
  });
  p('kein Teil fliegt auf seinem Weg durch ein anderes',
    !kreuzt.length, [...new Set(kreuzt)].slice(0, 6).join(' · '));

  /* Und umgekehrt: Was sich am Ende durchdringt, muss auch zusammengehören.
     Ein Quader, der in einem anderen steckt, ohne dass das Strukturnetz
     davon weiß, ist ein Modellfehler. */
  const fremd = [];
  koerper.forEach((b, i) => {
    koerper.slice(i + 1).forEach((a) => {
      if (a.pos === b.pos) return;
      if (P.darfDurchdringen(a.pos, b.pos)) return;
      if (trifft(huelle(b), huelle(a))) {
        fremd.push(a.pos + '/' + b.pos);
      }
    });
  });
  p('am Ende steckt nichts in etwas, das nichts davon weiß',
    !fremd.length, [...new Set(fremd)].join(', '));

  console.log('\nDie Lernsituation');

  const laut = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => laut.push(
    String((e.detail && e.detail.message) || e.message)));
  const dom = new JSDOM(
    mitAssets(fs.readFileSync(path.join(BASIS, LS), 'utf8')), {
      runScripts: 'dangerously', virtualConsole: vc,
      url: 'https://t-bk.de/unterrichtsmaterial/' + LS,
      beforeParse(f) { f.Element.prototype.scrollIntoView = function () {}; },
    });
  await fertig(dom);
  const d = dom.window.document;

  p('sie lädt ohne Fehler', !laut.length, laut[0]);
  p('der Hinweis ohne 3D steht da', !d.getElementById('ohne3d').hidden);
  p('die Zeichnung ist gezeichnet',
    !!d.querySelector('#bildPresse svg'));
  p('das Strukturnetz ist gezeichnet',
    !!d.querySelector('#netzPresse svg'));
  p('die Stückliste hat zwölf Zeilen',
    d.querySelectorAll('#tabStueck tr').length === 12,
    d.querySelectorAll('#tabStueck tr').length + '');
  p('der Montageplan bietet zwölf Positionen an',
    d.querySelectorAll('#planPlanen .mp-teil').length === 12,
    d.querySelectorAll('#planPlanen .mp-teil').length + '');
  p('die Zahl der gültigen Reihenfolgen steht in der Seite',
    d.getElementById('zahlFolgen').textContent === String(folgen.zahl),
    d.getElementById('zahlFolgen').textContent);

  /* Die Zeichnung trägt Positionsnummern - und zwar so viele, wie die
     Stückliste Positionen hat. */
  const nummern = d.querySelectorAll('#bildPresse .posnr');
  p('die Zeichnung trägt zwölf Positionsnummern',
    nummern.length === 12, nummern.length + '');

  schluss();
}

function schluss() {
  console.log(fehler ? '\n' + fehler + ' Befunde' : '\nalles gruen');
  process.exit(fehler ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
