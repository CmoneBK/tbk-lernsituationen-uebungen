/* Der Klausurbereich: halten die Versprechen?
 *
 * Der Bereich liegt im Webseiten-Repo (public/klausur/) und ist bewusst
 * nicht freigegeben. Geprüft wird hier trotzdem - und zwar vor allem das,
 * was man einem Bildschirmfoto nicht ansieht:
 *
 *   1. Der Server sieht nichts. Keine IP, kein Name, keine Antwort, keine
 *      Punktzahl, kein Lösungsschlüssel. Das sind Zusagen aus
 *      docs/KLAUSUR-API.md, und eine Zusage ohne Prüfung ist ein Wunsch.
 *   2. Auf dem Gerät bleibt nichts liegen. Kein localStorage, kein Cookie -
 *      anders als im übrigen Material, und mit Absicht.
 *   3. Die Rechnung stimmt: Verschlüsseln und Entschlüsseln gehen
 *      zusammen, die Bewertung rechnet wie beschrieben, und die
 *      Arbeitsmappe ist eine, die sich öffnen lässt.
 *
 * Fehlt das Webseiten-Repo, gibt es nichts zu prüfen - das ist kein Fehler
 * im Material.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
/* Node 18 haelt WebCrypto noch nicht global bereit. */
const webcrypto = require('node:crypto').webcrypto;

const { WEBSEITE, dran } = require('./orte');
if (!dran(WEBSEITE, 'Webseite')) { return; }

const K = path.join(WEBSEITE, 'public', 'klausur');
const D = path.join(WEBSEITE, 'docs');

let fehler = 0;
const p = (was, ok, zusatz) => {
  console.log((ok ? '  ok     ' : '  FEHLER ') + was
    + (ok || !zusatz ? '' : ' – ' + zusatz));
  if (!ok) fehler++;
};

const lies = (...teile) => {
  const voll = path.join(...teile);
  return fs.existsSync(voll) ? fs.readFileSync(voll, 'utf8') : '';
};

/* Die Browser-Bausteine in Node laufen lassen. Sie hängen sich an "window";
   mehr als ein paar Standardbausteine brauchen sie nicht. */
function laden(...dateien) {
  const fenster = {
    crypto: webcrypto,
    TextEncoder, TextDecoder, Blob, URL,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    console,
  };
  const zusammen = { window: fenster, ...fenster };
  const ctx = vm.createContext(zusammen);
  for (const d of dateien) {
    vm.runInContext(lies(K, 'assets', d), ctx, { filename: d });
  }
  return fenster;
}

async function main() {

/* ================= 1. Der Server sieht nichts ================= */
console.log('\nWas der Server nicht sieht');
{
  const php = lies(K, 'api', 'pruefung.php');
  const sql = lies(D, 'klausur-schema.sql');
  p('der Endpunkt ist da', php.length > 1000);
  p('das Schema ist da', sql.length > 500);

  p('keine IP-Adresse im Endpunkt',
    !/REMOTE_ADDR|X_FORWARDED_FOR|CLIENT_IP/i.test(php));
  p('keine Spalte für Name, Klasse, Schule oder Fach',
    !/\b(name|nachname|vorname|klasse|schule|fach)\s+(VARCHAR|CHAR|TEXT)/i.test(sql),
    (sql.match(/\b(name|klasse|schule|fach)\s+\w+/i) || [''])[0]);
  p('keine IP-Spalte im Schema', !/\bip\w*\s+(VARCHAR|CHAR|VARBINARY)/i.test(sql));

  /* Der Teilnehmer bekommt Fragen und den oeffentlichen Schluessel - und
     sonst nichts. Ein Loesungsschluessel in dieser Antwort waere der
     Totalschaden. */
  const start = php.slice(php.indexOf("action === 'start'"),
    php.indexOf("action === 'abgeben'"));
  p('start liefert keinen Lösungsschlüssel', !/loesung/i.test(start),
    (start.match(/loesung\w*/i) || [''])[0]);
  p('start liefert keinen Titel', !/meta_chiffre/.test(start));
  p('start gibt nur Fragen und den öffentlichen Schlüssel',
    /'fragen'\s*=>/.test(start) && /'oeff'\s*=>/.test(start));

  /* Beim Anlegen darf im Klartextteil nichts stehen, was die Antwort
     verraet - der Endpunkt weist solche Felder ab. */
  p('der Endpunkt weist verräterische Felder ab',
    /'richtig',\s*'loesung',\s*'korrekt'/.test(php));

  /* Seit dem Mischen gibt es zwei erlaubte Formen des Feldes "fragen": die
     blanke Liste und {v, mischen, aufgaben}. Beide muessen durch denselben
     Filter - sonst waere die neue Form der Weg, einen Loesungshinweis
     daneben zu schmuggeln. */
  p('der Endpunkt kennt beide Formen von "fragen"',
    /array_is_list\(\$fdec\)/.test(php) && /'aufgaben'/.test(php));
  p('die Objektform laesst nur v, mischen und aufgaben zu',
    /\['v',\s*'mischen',\s*'aufgaben'\]/.test(php));
  p('mischen laesst nur fragen, optionen und teilmenge zu',
    /\['fragen',\s*'optionen',\s*'teilmenge'\]/.test(php));
  p('die Teilmenge muss in die Aufgabenzahl passen',
    /\$tm\s*<\s*1\s*\|\|\s*\$tm\s*>\s*count\(\$aufgaben\)/.test(php));
  p('der Aufgabenfilter greift bei beiden Formen',
    php.indexOf('foreach ($aufgaben as $frage)')
      > php.indexOf('array_is_list($fdec)'));

  /* Die Lehrkraft schickt je Aufgabe nur, was der Teilnehmer sehen soll:
     Text, Optionen, Anzahl - und, wenn die Frage eines hat, das Bild. Ein
     durchgereichtes "standard" oder "thema" stuende sonst im Klartext auf
     dem Server - kein Leck, aber auch kein Grund. */
  const lk = lies(K, 'assets', 'lehrkraft.js');
  p('die Aufgabe geht mit genau den erlaubten Feldern zum Server',
    /var aufgabe = \{\s*text:[^}]*optionen:[^}]*anzahl:[^}]*\}/.test(lk));
  /* Ausser dem Bild darf nichts dazukommen - kein 'standard', kein
     'thema', und schon gar kein 'richtig'. */
  p('ausser dem Bild kommt nichts dazu',
    ((((lk.split('var aufgabe =')[1] || '').split('aufgaben.push')[0])
      .match(/aufgabe\.\w+\s*=/g)) || [])
      .join(',') === 'aufgabe.bild =');
  p('anzahl wird aus der tatsächlichen Auswahl berechnet',
    /anzahl:\s*richtigNeu\.length/.test(lk));

  p('eine Meldung für falschen Code und falsche Passphrase',
    (php.match(/fail\('unbekannt', 403\)/g) || []).length >= 4);
  p('Sperre nach wenigen Fehlversuchen', /\$f >= 5/.test(php));
  p('der Endpunkt rechnet keine Punkte aus',
    !/punkte|bewert/i.test(php.replace(/\/\/[^\n]*/g, '')));
}

/* ============ 2. Auf dem Gerät bleibt nichts liegen ============ */
console.log('\nWas auf dem Gerät nicht liegen bleibt');
{
  /* Ohne Kommentare pruefen: Beide Dateien schreiben im Kopf ausdruecklich,
     dass sie nichts speichern - das ist die Zusage, nicht ihr Bruch. */
  const ohneKommentar = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1 ')).join('\n');
  for (const datei of ['teilnahme.js', 'lehrkraft.js']) {
    const js = ohneKommentar(lies(K, 'assets', datei));
    p(datei + ': kein localStorage', !/localStorage/.test(js));
    p(datei + ': kein sessionStorage', !/sessionStorage/.test(js));
    p(datei + ': kein Cookie', !/document\.cookie/.test(js));
  }
  /* ALLE Seiten des Bereichs, nicht nur die beiden urspruenglichen. Es sind
     inzwischen mehr geworden - Nutzungshinweise und ein AV-Vertrag zum
     Ausdrucken -, und gerade die rechtlichen Seiten sind der Ort, an dem
     spaeter jemand "ein Formular waere bequemer" denkt. */
  const seiten = fs.readdirSync(K).filter((d) => d.endsWith('.html'));
  p('mindestens vier Seiten im Bereich', seiten.length >= 4, seiten.join(' '));

  seiten.forEach((datei) => {
    const h = lies(K, datei);
    p(datei + ': noindex', /name="robots"\s+content="noindex/.test(h));
    p(datei + ': kein Feld für einen Namen',
      !/id="(name|nachname|vorname|klasse|schule)"/i.test(h));
  });

  /* Der AV-Vertrag nennt Schule, Name und Anschrift - er wird ausgedruckt,
     unterschrieben und per Post oder Mail geschickt. Auf der SEITE darf
     davon nichts getippt und schon gar nichts gesendet werden. Dasselbe
     gilt fuer die Hinweise. */
  ['av-vertrag.html', 'hinweise.html'].forEach((datei) => {
    const h = lies(K, datei);
    if (!h) { return; }
    p(datei + ': kein Eingabefeld', !/<input|<textarea|<select/i.test(h));
    p(datei + ': kein Formular', !/<form/i.test(h));
    p(datei + ': sendet nichts', !/fetch\(|XMLHttpRequest|navigator\.send/i.test(h));
  });

  const robots = lies(WEBSEITE, 'public', 'robots.txt');
  p('robots.txt sperrt den Bereich', /Disallow:\s*\/klausur\//.test(robots));

  const cfg = lies(D, 'klausur-config.sample.php');
  p('die Vorlage ist nicht freigegeben', /'freigegeben'\s*=>\s*false/.test(cfg));
  p('der Fragenpool liegt außerhalb von public',
    /'fragenpool'\s*=>\s*'\/home/.test(cfg)
    && !fs.existsSync(path.join(K, 'fragenpool.json')));
}

/* ==================== 3. Die Schlüssel ==================== */
console.log('\nVerschlüsseln und wieder auf');
{
  const w = laden('krypto.js');
  const Krypto = w.Krypto;
  p('Baustein geladen', !!Krypto && Krypto.verfuegbar);

  const salt = Krypto.zufall(32);
  const a1 = await Krypto.ableiten('vier zufaellige woerter hier', salt);
  const a2 = await Krypto.ableiten('vier zufaellige woerter hier', salt);
  const a3 = await Krypto.ableiten('etwas ganz anderes als das', salt);
  p('dieselbe Passphrase ergibt denselben auth-Wert', a1.auth === a2.auth);
  p('eine andere Passphrase einen anderen', a1.auth !== a3.auth);
  p('der auth-Wert ist 32 Byte lang',
    Krypto.ausB64(a1.auth).length === 32, String(Krypto.ausB64(a1.auth).length));

  /* Der Wert, den der Server bekommt, darf den Schluessel nicht enthalten,
     mit dem der private Schluessel ausgepackt wird. */
  const paar = await Krypto.paarErzeugen();
  const verpackt = await Krypto.privVerpacken(paar, a1.wrapKey);
  p('der verpackte Schlüssel enthält den auth-Wert nicht',
    verpackt.indexOf(a1.auth) === -1);

  const wieder = await Krypto.privAuspacken(verpackt, a1.wrapKey);
  p('mit der richtigen Passphrase geht er auf', !!wieder);
  let ging = false;
  try { await Krypto.privAuspacken(verpackt, a3.wrapKey); ging = true; }
  catch (e) { /* so soll es sein */ }
  p('mit der falschen nicht', !ging);

  const oeff = await Krypto.oeffExportieren(paar);
  const umschlag = await Krypto.anOeffentlich(oeff, { antworten: [[0, 2], [1]] });
  const auf = await Krypto.mitPrivat(paar.privateKey, umschlag);
  p('an den öffentlichen Schlüssel und zurück',
    JSON.stringify(auf.antworten) === JSON.stringify([[0, 2], [1]]));
  p('der Umschlag verrät den Inhalt nicht',
    umschlag.indexOf('antworten') === -1);
  p('der Umschlag hat die Felder, die der Server prüft',
    (() => { const u = JSON.parse(umschlag);
      return !!(u.iv && u.daten && u.schluessel); })());

  /* Seit dem Mischen reist die Zuordnung im Umschlag mit. Auch sie darf
     nicht im Klartext dastehen - sonst liesse sich aus der Reihenfolge
     zurueckschliessen, welche Aufgaben jemand gezogen hat. */
  const mitAuswahl = await Krypto.anOeffentlich(oeff, {
    antworten: [[1], [0, 2]],
    auswahl: { fragen: [2, 0], optionen: [[3, 1, 0, 2], [1, 0]] }
  });
  const zurueck = await Krypto.mitPrivat(paar.privateKey, mitAuswahl);
  p('die Zuordnung reist im Umschlag mit',
    JSON.stringify(zurueck.auswahl.fragen) === '[2,0]');
  p('und steht nicht im Klartext darin',
    mitAuswahl.indexOf('auswahl') === -1 && mitAuswahl.indexOf('fragen') === -1);

  const s = Krypto.staerke('Sommer1!');
  p('eine kurze Passphrase gilt als zu schwach', s.urteil === 'zu schwach',
    s.urteil + ' / ' + s.bits + ' Bit');
  p('vier Wörter gelten als gut',
    Krypto.staerke('anker wolke tisch regen').urteil === 'gut');
}

/* ==================== 4. Die Bewertung ==================== */
console.log('\nWie aus Kreuzen Punkte werden');
{
  const w = laden('bewertung.js');
  const B = w.Bewertung;
  const frage = { text: 'x', optionen: ['a', 'b', 'c', 'd'], anzahl: 2 };
  const t = B.VERFAHREN.teilpunkte.punkte;

  p('alles richtig gibt volle Punktzahl',
    t(frage, [0, 2], [0, 2]).punkte === 2);
  p('eines richtig gibt einen Teilpunkt',
    t(frage, [0, 2], [0]).punkte === 1);
  p('eines falsch gibt nichts dafür',
    t(frage, [0, 2], [1]).punkte === 0);
  const zuViel = t(frage, [0, 2], [0, 1, 2]);
  p('zu viele Kreuze geben null', zuViel.punkte === 0, String(zuViel.punkte));
  p('und sagen warum', /zu viele/i.test(zuViel.hinweis));
  p('nichts angekreuzt gibt null', t(frage, [0, 2], []).punkte === 0);

  const a = B.VERFAHREN.alles_oder_nichts.punkte;
  p('alles oder nichts: vollständig zählt', a(frage, [0, 2], [2, 0]).punkte === 1);
  p('alles oder nichts: unvollständig zählt nicht',
    a(frage, [0, 2], [0]).punkte === 0);

  const frage1 = { text: 'y', optionen: ['a', 'b', 'c'], anzahl: 1 };
  const ganz = B.abgabe([frage, frage1], [[0, 2], [1]], [[0], [1]], 'teilpunkte');
  p('eine ganze Abgabe zählt zusammen',
    ganz.punkte === 2 && ganz.max === 3, ganz.punkte + '/' + ganz.max);

  /* Der Server kann nicht pruefen, ob Angabe und Loesungsschluessel
     zusammenpassen - er kennt den Schluessel nicht. Wenn sie es nicht tun,
     gilt der Schluessel, und es wird gesagt. */
  const schief = t(frage, [0], [0]);
  p('bei Widerspruch gilt der Lösungsschlüssel',
    schief.max === 1, String(schief.max));
  p('und der Widerspruch wird gemeldet',
    /widersprechen/i.test(schief.hinweis), schief.hinweis);
  p('die Zeilen nennen das Verfahren', /Teilpunkte/.test(ganz.verfahren));
  p('Optionen werden als Buchstaben ausgegeben',
    B.buchstaben([0, 2]) === 'a c', B.buchstaben([0, 2]));
}

/* ============ 4b. Mischen: kommt die Zuordnung zurueck? ============
   Seit die Klausur Aufgaben und Antworten je Teilnehmer mischen kann, sieht
   jeder eine andere Reihenfolge. Was er ankreuzt, sind Positionen in SEINER
   Ansicht; bewertet wird gegen die feste Reihenfolge des
   Loesungsschluessels. Dazwischen liegt eine Abbildung, und ein
   Vorzeichenfehler darin faellt niemandem auf: Die Punktzahl sieht
   plausibel aus, sie ist nur falsch.

   Der Vertrag (KLAUSUR-API.md, Abschnitt 5):
     auswahl.fragen[p]        = welche feste Aufgabe an Anzeigeposition p steht
     auswahl.optionen[p][pos] = welche feste Option an Anzeigeposition pos steht
     antworten[p]             = angekreuzte Anzeigepositionen              */
console.log('\nGemischt und zurückgerechnet');
{
  const w = laden('bewertung.js');
  const B = w.Bewertung;

  /* Drei Aufgaben in fester Reihenfolge. */
  const aufgaben = [
    { text: 'A', optionen: ['a0', 'a1', 'a2', 'a3'], anzahl: 2 },
    { text: 'B', optionen: ['b0', 'b1', 'b2'], anzahl: 1 },
    { text: 'C', optionen: ['c0', 'c1', 'c2', 'c3'], anzahl: 2 },
  ];
  const richtig = [[0, 3], [2], [1, 2]];

  /* Ein Teilnehmer sieht sie in der Reihenfolge C, A, B, und in jeder
     Aufgabe eine andere Antwortreihenfolge. */
  const auswahl = {
    fragen: [2, 0, 1],
    optionen: [[3, 1, 0, 2], [2, 0, 3, 1], [1, 2, 0]],
  };

  /* Er kreuzt genau das Richtige an - ausgedrueckt in SEINEN Positionen.
     Aufgabe C (richtig 1 und 2): in seiner Karte [3,1,0,2] steht die 1 an
     Position 1 und die 2 an Position 3.
     Aufgabe A (richtig 0 und 3): Karte [2,0,3,1] -> Positionen 1 und 2.
     Aufgabe B (richtig 2):       Karte [1,2,0]   -> Position 1.            */
  const perfekt = [[1, 3], [1, 2], [1]];

  const e = B.abgabe(aufgaben, richtig, perfekt, 'teilpunkte', auswahl);
  p('gemischt und alles richtig gibt die volle Punktzahl',
    e.punkte === 5 && e.max === 5, e.punkte + '/' + e.max);
  p('die Zeilen stehen in der Reihenfolge des Teilnehmers',
    e.zeilen.map((z) => z.text).join('') === 'CAB',
    e.zeilen.map((z) => z.text).join(''));
  p('die Nummern zaehlen von eins',
    e.zeilen.map((z) => z.nr).join('') === '123');

  /* Der Gegenbeweis: Ohne die Zuordnung MUSS es schiefgehen. Ginge es auch
     so durch, pruefte der Test oben gar nichts. */
  const ohne = B.abgabe(aufgaben, richtig, perfekt, 'teilpunkte', null);
  p('ohne die Zuordnung faellt dieselbe Abgabe durch',
    ohne.punkte < e.punkte, ohne.punkte + '/' + ohne.max);

  /* Und eine falsche Antwort bleibt falsch. */
  const daneben = B.abgabe(aufgaben, richtig, [[0, 2], [0], [0]],
    'teilpunkte', auswahl);
  p('falsch bleibt falsch', daneben.punkte < 5, String(daneben.punkte));

  /* Teilmenge: Wer nur zwei der drei Aufgaben gezogen hat, wird auch nur
     ueber zwei bewertet. */
  const teil = B.abgabe(aufgaben, richtig,
    [[1, 3], [1]], 'teilpunkte',
    { fragen: [2, 1], optionen: [[3, 1, 0, 2], [1, 2, 0]] });
  p('bei einer Teilmenge zaehlt nur das Gezogene',
    teil.max === 3 && teil.zeilen.length === 2,
    teil.punkte + '/' + teil.max + ' aus ' + teil.zeilen.length);

  /* Die Buchstaben in der Tabelle beziehen sich auf die FESTE Reihenfolge -
     sonst stuenden in zwei Zeilen dieselben Buchstaben fuer Verschiedenes. */
  p('die Buchstaben meinen die feste Reihenfolge',
    e.zeilen[0].richtig.join(',') === '1,2', e.zeilen[0].richtig.join(','));
}

/* ==================== 5. Die Arbeitsmappe ==================== */
console.log('\nDie Arbeitsmappe');
{
  const w = laden('xlsx.js');
  const X = w.Xlsx;

  p('CRC-32 stimmt mit dem bekannten Wert überein',
    X.crc32(new TextEncoder().encode('123456789')) === 0xCBF43926,
    '0x' + X.crc32(new TextEncoder().encode('123456789')).toString(16));
  p('Spaltennamen zählen weiter als Z',
    X.spalte(0) === 'A' && X.spalte(25) === 'Z' && X.spalte(26) === 'AA',
    X.spalte(26));
  p('spitze Klammern werden maskiert',
    /&lt;b&gt;/.test(X.blattXml([['<b>']])));
  p('Zahlen stehen als Zahl in der Zelle',
    /<v>42<\/v>/.test(X.blattXml([[42]])));

  const blob = X.erzeugen([
    { name: 'Übersicht', zeilen: [['Code', 'Punkte'], ['AB23CD', 7]] },
    { name: 'Einzeln', zeilen: [['Code', 'Aufgabe'], ['AB23CD', 1]] },
  ]);
  const roh = Buffer.from(await blob.arrayBuffer());
  p('die Datei ist ein ZIP', roh.readUInt32LE(0) === 0x04034b50);
  p('sie hat einen Endblock',
    roh.readUInt32LE(roh.length - 22) === 0x06054b50);
  p('sechs Einträge – vier Gerüst, zwei Blätter',
    roh.readUInt16LE(roh.length - 14) === 6,
    String(roh.readUInt16LE(roh.length - 14)));

  /* Jeden Eintrag durchgehen und die Pruefsumme nachrechnen: Ein ZIP mit
     falscher CRC laesst sich nicht oeffnen, und das merkt man sonst erst
     in Excel. */
  let pos = 0, namen = [], heil = true;
  while (roh.readUInt32LE(pos) === 0x04034b50) {
    const crcSoll = roh.readUInt32LE(pos + 14);
    const laenge = roh.readUInt32LE(pos + 18);
    const nLaenge = roh.readUInt16LE(pos + 26);
    const eLaenge = roh.readUInt16LE(pos + 28);
    const name = roh.slice(pos + 30, pos + 30 + nLaenge).toString('utf8');
    const von = pos + 30 + nLaenge + eLaenge;
    const inhalt = roh.slice(von, von + laenge);
    if (X.crc32(new Uint8Array(inhalt)) !== crcSoll) { heil = false; }
    namen.push(name);
    pos = von + laenge;
  }
  p('alle Prüfsummen stimmen', heil);
  p('das Gerüst ist vollständig',
    ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml'].every((n) => namen.includes(n)),
    namen.join(' '));
  p('der Blattname mit Umlaut kommt an',
    /name="Übersicht"/.test(roh.toString('utf8')));
}

/* ==================== 6. Der Vertrag ==================== */
console.log('\nDer Vertrag');
{
  const doc = lies(D, 'KLAUSUR-API.md');
  p('das Vertragsdokument ist da', doc.length > 3000);

  /* Das Beispiel ist die Vorlage fuer alle Poolbeitraege - es muss die neue
     Form zeigen, sonst schreibt der Naechste wieder fuenf Optionen. */
  let pool = [];
  try { pool = JSON.parse(lies(D, 'klausur-fragenpool.beispiel.json')); }
  catch (x) { /* faellt unten auf */ }
  p('das Pool-Beispiel ist lesbares JSON', Array.isArray(pool) && pool.length > 0);
  p('jede Beispielfrage hat Thema, Text, Optionen und Loesung',
    pool.every((f2) => f2.thema && f2.text && Array.isArray(f2.optionen)
      && Array.isArray(f2.richtig)));
  /* Das Beispiel ist die Vorlage: Wer eine Frage dazuschreibt, kopiert
     eine von hier. Fehlt dort der Pfad, fehlt er bald ueberall - und der
     Filter der Lehrkraft faellt auf zwei Ebenen zurueck. */
  p('jede Beispielfrage bringt den Pfad mit, vier Ebenen tief',
    pool.length > 0 && pool.every((f2) => Array.isArray(f2.pfad)
      && f2.pfad.length === 4 && f2.pfad.every((x) => x && x.trim())));
  p('die unterste Ebene des Pfads ist das Thema hinter dem Doppelpunkt',
    pool.every((f2) => !f2.thema || !f2.pfad
      || f2.thema.split(':').slice(1).join(':').trim() === f2.pfad[3]));
  p('die Loesungsindizes liegen im Bereich der Optionen',
    pool.every((f2) => f2.richtig.every((i) => i >= 0 && i < f2.optionen.length)));
  p('wo "standard" steht, liegt es ebenfalls im Bereich',
    pool.every((f2) => !f2.standard
      || f2.standard.every((i) => i >= 0 && i < f2.optionen.length)));
  p('mindestens eine Frage zeigt den groesseren Antwortpool',
    pool.some((f2) => f2.optionen.length > 5),
    pool.map((f2) => f2.optionen.length).join(','));
  p('wo "anzahl" steht, passt es zur Loesung',
    pool.every((f2) => f2.anzahl === undefined
      || f2.anzahl === f2.richtig.length));
  p('es nennt die Rollen nach Art. 28', /Auftragsverarbeiter/.test(doc));
  p('es sagt, dass die Technik vor der Rechtslage steht',
    /nicht freigegeben|nicht in Betrieb/.test(doc));
  p('es verlangt Punkte statt Noten', /Punkte, keine Noten/.test(doc));
  p('es verlangt, den Endpunkt aus dem Protokoll zu nehmen',
    /CustomLog|Zugriffsprotokoll/.test(doc));
}

/* ================ 7. Das Bild zur Aufgabe ================ */
console.log('\nDas Bild zur Aufgabe');
{
  const lk2 = lies(K, 'assets', 'lehrkraft.js');
  const tn = lies(K, 'assets', 'teilnahme.js');
  const php2 = lies(K, 'api', 'pruefung.php');
  const css = lies(K, 'assets', 'klausur.css');

  /* Die Kette hat vier Glieder. Reisst eines, bekommt der Teilnehmer
     einen Fragetext ohne das Bild, von dem er handelt - und das faellt
     erst in der Klausur auf. */
  p('die Lehrkraft schickt das Bild mit',
    /aufgabe\.bild = e\.f\.bild/.test(lk2));
  p('der Teilnehmer traegt es durch das Mischen',
    /bild: a\.bild/.test(tn));
  p('und stellt es dar', /aufgabenbild/.test(tn)
    && /data:image\/svg\+xml;base64,/.test(tn));
  p('die Lehrkraft sieht es schon bei der Auswahl', /bildKnoten/.test(lk2));
  p('das Stilblatt kennt die Klasse', /\.aufgabenbild/.test(css));

  /* Ein SVG darf hier nur ein Bild sein. Im <img> laeuft ohnehin kein
     Skript - aber der Server soll nicht weiterreichen, was er selbst
     nicht annehmen wuerde. */
  p('nicht eingesetzt, sondern im <img>',
    !/innerHTML[^;]*bild/i.test(tn)
    && /createElement\('img'\)/.test(tn));
  p('der Server begrenzt die Bildgroesse',
    /max_bild_bytes/.test(php2) && /\$MAX_BILD/.test(php2));
  p('der Server prueft die Form des SVG',
    /substr\(\$b, 0, 4\) !== '<svg'/.test(php2));
  for (const gift of ['<script', 'javascript:', 'onload=', 'xlink:href',
    '<foreignobject', '<use', '<image']) {
    p('der Server weist "' + gift + '" ab',
      php2.includes("'" + gift + "'"));
  }

  /* Umlaute und das Gradzeichen stehen in fast jedem dieser Bilder.
     btoa allein kann nur Latin-1 - die Umrechnung muss also stimmen. */
  const probe = '<svg xmlns="http://www.w3.org/2000/svg"><text>'
    + 'Größe 80° ε</text></svg>';
  const erwartet = Buffer.from(probe, 'utf8').toString('base64');
  for (const datei of ['lehrkraft.js', 'teilnahme.js']) {
    const quelle = lies(K, 'assets', datei);
    const m = quelle.match(
      /function zuBase64\(s\) \{[\s\S]*?\r?\n  \}/);
    p(datei + ' bringt zuBase64 mit', !!m);
    if (!m) { continue; }
    const ctx = vm.createContext({
      TextEncoder,
      btoa: (x) => Buffer.from(x, 'binary').toString('base64'),
    });
    vm.runInContext(m[0] + '; globalThis.z = zuBase64;', ctx);
    p(datei + ': UTF-8 kommt richtig in die data-URL',
      ctx.z(probe) === erwartet);
  }
}

/* ================ 8. Der Filter im Fragenpool ================ */
console.log('\nDer Filter im Fragenpool');
{
  const lk = lies(K, 'assets', 'lehrkraft.js');
  const idx = lies(K, 'index.html');
  const css = lies(K, 'assets', 'klausur.css');

  /* Vier Ebenen, in der Sprache des Materials. Fehlt eine, fällt der
     Filter still auf die Ebene darüber zurück - und die Lehrkraft sucht
     ihre Frage in einer Liste mit dreistelliger Länge. */
  for (const id of ['fBereich', 'fUnter', 'fEinheit', 'fThema']) {
    p('Ebene "' + id + '" steht in der Seite',
      idx.includes('id="' + id + '"'));
  }
  p('das Skript kennt die vier Ebenen als eine Kette',
    /EBENEN = \['fBereich', 'fUnter', 'fEinheit', 'fThema'\]/.test(lk));
  p('jede Ebene zeigt nur, was nach der Ebene darüber bleibt',
    /if \(wahl\[o\] && p\[o\] !== wahl\[o\]\) \{ return; \}/.test(lk));
  p('eine ungültig gewordene Wahl fällt auf "alle" zurück',
    /namen\.indexOf\(wahl\[e\]\) === -1/.test(lk));

  /* Die übrigen Filter. */
  for (const id of ['fSuche', 'fBild', 'fPunkte', 'fReserve']) {
    p('Filter "' + id + '" steht in der Seite',
      idx.includes('id="' + id + '"'));
  }
  p('gesucht wird auch in den Antworten, nicht nur in der Frage',
    /function trifft\(f, such\)/.test(lk)
    && /f\.optionen\[o\]/.test(lk.split('function trifft')[1] || ''));
  p('die Suche ist entprellt', /clearTimeout\(suchUhr\)/.test(lk));
  p('der Punktwert ist die Zahl der richtigen Antworten',
    /punkte === '4' && n < 4/.test(lk));
  p('die Reserve misst gegen die Vorauswahl',
    /f\.optionen\.length - standardAuswahl\(f\)\.length/.test(lk));

  /* Der Kern: Die Auswahl darf nicht am Filter hängen. Läge sie in den
     Kästchen, verlöre ein Themenwechsel sie lautlos - und das merkt man
     erst an der fertigen Klausur. */
  p('die Auswahl liegt im Modell, nicht im Bildschirm',
    /var gewaehlt = \{\}/.test(lk) && /var optWahl = \{\}/.test(lk));
  p('gewaehltAufbereiten liest aus dem Modell',
    !/querySelectorAll\('#pool \.fInc:checked'\)/.test(lk)
    && /if \(!gewaehlt\[i\]\) \{ return; \}/.test(lk));
  p('der Stand sagt, wie viele Gewählte der Filter verdeckt',
    /außerhalb des Filters/.test(lk) && idx.includes('id="filterStand"'));

  /* Die Knöpfe, die eine grosse Auswahl überhaupt handhabbar machen. */
  for (const id of ['btnSichtbarAn', 'btnSichtbarAus', 'btnWahlLeeren',
    'btnFilterWeg']) {
    p('Knopf "' + id + '" ist da und hat einen Griff',
      idx.includes('id="' + id + '"')
      && lk.includes("el('" + id + "').addEventListener"));
  }

  p('das Stilblatt kennt die Überschriften des Filters',
    /\.poolBereich/.test(css) && /\.poolThema/.test(css)
    && /\.poolFrage\.drin/.test(css));

  /* Das gruene Haekchen ist nur dann etwas wert, wenn es gruen ist.
     Es haengt deshalb am Knoten und nicht an einer Klasse - ein
     Stilblatt von gestern soll es nicht farblos machen koennen. */
  p('die Loesungsmarkierung traegt ihre Farbe selbst',
    /badge\.style\.color = '#127c2f'/.test(lk)
    && /badge\.style\.fontWeight = '600'/.test(lk));

  /* Ein Pool ohne "pfad" darf nicht zu einer leeren Liste führen. */
  p('ältere Poolstände fallen auf das Thema zurück',
    /Array\.isArray\(f\.pfad\) && f\.pfad\.length === 4/.test(lk)
    && /String\(f\.thema \|\| 'Ohne Thema'\)/.test(lk));

  /* Jede ID, die das Skript anfasst, muss es auch geben. Ein Tippfehler
     hier wirft keinen sichtbaren Fehler - die Seite tut nur nichts mehr. */
  const idsVon = (js) => {
    const raus = new Set(), r = /\bel\(\s*'([A-Za-z0-9_]+)'\s*\)/g;
    let m;
    while ((m = r.exec(js))) { raus.add(m[1]); }
    return [...raus];
  };
  const idsIn = (html) => {
    const raus = new Set(), r = /id="([A-Za-z0-9_]+)"/g;
    let m;
    while ((m = r.exec(html))) { raus.add(m[1]); }
    return raus;
  };
  for (const [datei, seite] of [['lehrkraft.js', 'index.html'],
    ['teilnahme.js', 'teilnahme.html']]) {
    const hat = idsIn(lies(K, seite));
    const fehlt = idsVon(lies(K, 'assets', datei)).filter((i) => !hat.has(i));
    p(datei + ': jede angefasste ID gibt es in ' + seite,
      fehlt.length === 0, fehlt.join(', '));
  }
}

/* ============== 9. Die Anforderungsbereiche ============== */
console.log('\nDie Anforderungsbereiche');
{
  const lk = lies(K, 'assets', 'lehrkraft.js');
  const idx = lies(K, 'index.html');
  const css = lies(K, 'assets', 'klausur.css');
  const doc = lies(D, 'KLAUSUR-API.md');

  p('der Filter nach Anforderungsbereich steht in der Seite',
    idx.includes('id="fAfb"')
    && lk.includes("el('fAfb').addEventListener"));
  p('er wird beim Zurücksetzen mit geleert',
    /el\('fAfb'\)\.value = ''/.test(lk));

  /* Ein Poolstand ohne das Feld darf nicht zu erfundenen Zahlen
     führen - lieber eine Zeile "ohne Einstufung". */
  p('ein fehlendes Feld wird als solches behandelt',
    /function afbVon\(f, i\)/.test(lk)
    && /f\.afb === 1 \|\| f\.afb === 2 \|\| f\.afb === 3/.test(lk));
  p('und hat einen eigenen Namen', /ohne Einstufung/.test(lk));

  p('jede Frage trägt ihre Marke', /afbMarke/.test(lk)
    && /\.afbMarke/.test(css));
  /* Farbe allein reicht nicht: Wer Blau, Violett und Gelb nicht
     auseinanderhält, muss die Stufe lesen können. */
  p('die Marke trägt ihre Ziffer, nicht nur eine Farbe',
    /neueOption\(String\(st\), AFB_NAME\[st\]\)/.test(lk));

  /* Die Einstufung ist eine Einschätzung. Wer sie anders sieht, muss
     sie ändern können - und die Statistik muss dann mitgehen, sonst
     zeigt sie etwas anderes an als der Bildschirm. */
  p('die Stufe lässt sich je Aufgabe ändern',
    /var afbWahl = \{\}/.test(lk)
    && /marke\.addEventListener\('change'/.test(lk));
  p('die Änderung gilt nur für diesen Durchgang, nicht für den Pool',
    /afbWahl\[i\] = st/.test(lk) && !/f\.afb = /.test(lk));
  p('Filter und Auswertung rechnen mit der geänderten Stufe',
    /afbVon\(f, i\)/.test(lk) && /afbVon\(e\.f, e\.i\)/.test(lk));

  /* Ein Bild, das die Frage nur erklärt, darf nicht ungefragt
     mitgehen - sonst ist es keine Hilfe, sondern ein Geschenk. */
  p('Hilfsbilder sind nicht vorausgewählt',
    /function bildMit\(f, i\)/.test(lk)
    && /!!f\.bild && !f\.bild_hilfe/.test(lk));
  p('jedes Bild hat einen Schalter', /bInc/.test(lk)
    && /bildSchalter/.test(lk) && /\.bildSchalter/.test(css));
  p('und nur das eingeschaltete Bild geht in die Klausur',
    /if \(e\.f\.bild && e\.bild\) \{ aufgabe\.bild = e\.f\.bild; \}/
      .test(lk));
  p('der Schalter sagt, worum es sich handelt',
    /Hilfsbild mitgeben/.test(lk) && /gehört zur Frage/.test(lk));

  p('die Auswertung steht in der Seite', idx.includes('id="afbKasten"')
    && idx.includes('id="afbBalken"') && idx.includes('id="afbZeilen"'));
  p('sie wird bei jeder Änderung der Auswahl neu gerechnet',
    /afbZeichnen\(g\);/.test(lk)
    && lk.indexOf('afbZeichnen(g);') > lk.indexOf('function poolStand'));
  p('sie verschwindet, wenn nichts gewählt ist',
    /if \(!gewaehlteAufgaben\.length\) \{ kasten\.hidden = true; return; \}/
      .test(lk));

  /* Der Kern: gewichtet wird in Punkten. Eine Aufgabe mit vier
     richtigen Antworten wiegt viermal so schwer wie eine mit einer -
     wer nach Aufgaben zählt, bekommt eine andere Klausur, als er
     glaubt. */
  p('gewichtet wird in Punkten, nicht in Aufgaben',
    /punkte\[st\] \+= rich\.length/.test(lk)
    && /100 \* punkte\[st\] \/ summe/.test(lk));
  p('gezählt werden nur die Antworten, die auch in der Klausur stehen',
    /e\.sel\.filter\(function \(o\) \{ return istRichtig\(e\.f, o\); \}\)/
      .test(lk.split('function afbZeichnen')[1] || ''));

  p('das Stilblatt kennt die drei Stufen',
    /\.afb1/.test(css) && /\.afb2/.test(css) && /\.afb3/.test(css));

  /* Das Beispiel ist die Vorlage für jeden weiteren Poolbeitrag. */
  let bsp = [];
  try { bsp = JSON.parse(lies(D, 'klausur-fragenpool.beispiel.json')); }
  catch (e) { bsp = []; }
  p('jede Beispielfrage trägt einen Anforderungsbereich',
    bsp.length > 0 && bsp.every((f) => [1, 2, 3].includes(f.afb)));
  p('das Vertragsdokument beschreibt das Feld',
    /"afb"/.test(doc) && /Anforderungsbereich/.test(doc));
}

/* ============== 10. Die Herkunft einer Frage ============== */
console.log('\nDie Herkunft einer Frage');
{
  const lk = lies(K, 'assets', 'lehrkraft.js');
  const idx = lies(K, 'index.html');
  const css = lies(K, 'assets', 'klausur.css');
  const doc = lies(D, 'KLAUSUR-API.md');

  p('der Herkunftsfilter steht in der Seite',
    idx.includes('id="fQuelle"')
    && lk.includes("el('fQuelle').addEventListener"));
  p('er wird beim Zurücksetzen mit geleert',
    /el\('fQuelle'\)\.value = ''/.test(lk));
  p('die Liste wird aus dem Pool gefüllt, nicht abgeschrieben',
    /function quellenFuellen\(\)/.test(lk)
    && /quellenFuellen\(\);/.test(lk));
  p('sie trennt Trainings von Lektionen und kennt jede Einheit einzeln',
    /aus Trainings/.test(lk) && /aus Lektionen/.test(lk)
    && lk.includes("'t:' + e"));

  /* Ein älterer Poolstand kennt das Feld nicht. Dann darf der Filter
     nicht ins Leere greifen, sondern muss stillstehen. */
  p('ein fehlendes Feld lässt den Filter stillstehen',
    /function quelleVon\(f\)/.test(lk)
    && /q\.length === 3 \? q : null/.test(lk));

  /* Die Marke ist der Grund für das ganze Feld: Beim Zusammenstellen
     soll zu sehen sein, was die Klasse geübt hat. */
  p('jede Frage aus einem Training trägt ihre Marke',
    /quellMarke/.test(lk) && /\.quellMarke/.test(css));
  p('und der Tooltip nennt Einheit und Seite',
    /qm\.title = qu\[1\]/.test(lk));

  p('die Suche findet ein Training an seinem Namen',
    lk.includes("String(f.quelle || '').toLowerCase()"));

  /* In die Klausur geht die Herkunft nicht mit - sie geht die
     Teilnehmer nichts an und wäre nur ein weiterer Hinweis. */
  p('die Herkunft geht nicht mit in die Klausur',
    !/quelle/.test(lk.split('function gewaehltAufbereiten')[1]
      .split('function poolStand')[0]));

  /* Das Beispiel ist die Vorlage für jeden weiteren Poolbeitrag. */
  let bsp = [];
  try { bsp = JSON.parse(lies(D, 'klausur-fragenpool.beispiel.json')); }
  catch (e) { bsp = []; }
  const mitQ = bsp.filter((f) => typeof f.quelle === 'string');
  p('das Beispiel zeigt eine Frage aus einem Training', mitQ.length > 0);
  p('und ihre Quelle ist dreiteilig',
    mitQ.length > 0 && mitQ.every((f) => f.quelle.split(' · ').length === 3),
    mitQ.map((f) => f.quelle).join(' | '));
  p('das Vertragsdokument beschreibt das Feld',
    /"quelle"/.test(doc) && /dreiteilig/.test(doc));
}

/* ============== 11. Entwürfe weiterbearbeiten ============== */
console.log('\nEntwürfe weiterbearbeiten');
{
  const api = lies(K, 'api', 'pruefung.php');
  const lk = lies(K, 'assets', 'lehrkraft.js');
  const idx = lies(K, 'index.html');
  const doc = lies(D, 'KLAUSUR-API.md');

  p('der Server kann eine eigene Klausur zurückgeben',
    api.includes("$action === 'klausur_lesen'")
    && api.includes("'fragen'          => $k['fragen']"));
  p('und ihren Inhalt ersetzen',
    api.includes("$action === 'klausur_aendern'"));

  /* Der Kern der Sache: Was freigegeben ist oder wofür schon Codes
     ausgegeben sind, wird nicht mehr angefasst. Sonst tauschte man die
     Aufgaben unter den Händen derer, die vielleicht schon schreiben -
     und der Lösungsschlüssel passte nicht mehr zum Bogen. */
  const aendern = api.split("$action === 'klausur_aendern'")[1] || '';
  p('nur ein Entwurf ist änderbar',
    /status.*!== 'entwurf'.*fail\('nicht_entwurf'/s.test(aendern));
  p('und nur, solange keine Teilnehmercodes bestehen',
    /COUNT\(\*\) AS n FROM pr_teilnahme WHERE klausur=\?/.test(aendern)
    && aendern.includes("fail('hat_codes'"));
  p('die Aufbewahrungsfrist wird dabei nicht verlängert',
    !/UPDATE pr_klausur SET[^;]*loeschen_ab/s.test(aendern));

  /* Anlegen und Ändern prüfen denselben Inhalt - abgeschrieben wäre die
     Prüfung die Hälfte wert. */
  p('beide Wege prüfen den Inhalt mit derselben Funktion',
    (api.match(/inhaltPruefen\(/g) || []).length === 3);
  p('der Titelumschlag und der Lösungsschlüssel haben eigene Grenzen',
    /function inhaltPruefen\(int \$maxMeta, int \$maxChiffre/.test(api)
    && api.includes('inhaltPruefen(16384, $MAX_CHIFFRE'));

  /* Der Fehler, der das Ganze ausgelöst hat: Der Titel wurde
     symmetrisch geschrieben und asymmetrisch gelesen. In der Liste stand
     deshalb bei jeder Klausur "(nicht lesbar)". */
  p('der Titel wird gelesen, wie er geschrieben wurde',
    lk.includes("Krypto.aufMachen(ich.wrapKey, k.meta_chiffre)")
    && !lk.includes("Krypto.mitPrivat(ich.privKey, k.meta_chiffre)"));

  p('der Arbeitsstand wandert in den verschlüsselten Titelumschlag',
    /async function entwurfPacken\(/.test(lk)
    && /entwurf: await entwurfPacken\(g, mischen\)/.test(lk));
  p('und wird beim Wiederaufnehmen ausgepackt',
    /async function entwurfAuspacken\(/.test(lk)
    && /async function entwurfLaden\(/.test(lk));

  /* Der Poolindex taugt nicht als Merkmal: Der Pool wird neu gebaut.
     Gemerkt wird eine Kennung aus Fragetext UND Bild - acht Bildfragen
     tragen denselben Text. */
  p('eine Aufgabe wird an Text und Bild wiedererkannt, nicht am Index',
    /async function kennung\(f\)/.test(lk)
    && /String\(f.text\)/.test(lk) && /String\(f.bild \|\| ''\)/.test(lk));
  p('was sich nicht mehr findet, wird benannt statt verschwiegen',
    lk.includes('fehlend.push(weg)')
    && lk.includes('stehen so nicht mehr'));

  p('der Knopf steht nur an Entwürfen ohne Codes',
    /k.status === 'entwurf' && Number\(k.codes\) === 0/.test(lk)
    && lk.includes("w.textContent = 'weiterbearbeiten'"));
  p('„neu zusammenstellen" räumt den geladenen Entwurf ab',
    /entwurfId = null;\s*gewaehlt = \{\};/.test(lk));
  p('gespeichert wird je nach Lage mit anlegen oder ändern',
    /ruf\(entwurfId \? \{\s*action: 'klausur_aendern'/.test(lk)
    && lk.includes("action: 'klausur_anlegen'"));

  p('die Seite sagt, was ein Entwurf ist', idx.includes('id="entwurfHinweis"')
    && idx.includes('id="anlegenKopf"'));
  p('die Fehlertexte nennen beide Gründe',
    lk.includes('nicht_entwurf:') && lk.includes('hat_codes:'));
  p('das Vertragsdokument beschreibt beide Aktionen',
    doc.includes('klausur_lesen') && doc.includes('klausur_aendern'));
}

console.log(fehler ? '\n' + fehler + ' Fehler.'
  : '\nDer Klausurbereich hält, was er zusagt.');
process.exitCode = fehler ? 1 : 0;
}

main();
