/* QR-Code erzeugen - nur so viel, wie für einen Link gebraucht wird.
 *
 *     var m = tbkQr("https://t-bk.de/...");   // Matrix, m[zeile][spalte] = 0|1
 *
 * Warum selbst gebaut: Die Seite lädt grundsätzlich nichts von fremden Servern
 * (siehe DEPLOYMENT.md), und für einen einzigen QR-Code lohnt keine mitgelieferte
 * Fremdbibliothek. Umgesetzt ist deshalb nur der Byte-Modus mit Fehlerkorrektur-
 * stufe M und automatischer Versionswahl bis Version 10 - das reicht für Links
 * bis rund 270 Zeichen.
 *
 * Aufbau nach ISO/IEC 18004. Die Schritte in der Reihenfolge, in der sie unten
 * stehen: Daten codieren, Reed-Solomon-Prüfzeichen anhängen, Blöcke verschränken,
 * Muster setzen, Bits einfüllen, acht Masken durchprobieren und die mit der
 * geringsten Strafpunktzahl behalten.
 */
(function (global) {
  'use strict';

  /* ---------- Rechnen im Galoiskörper GF(256) ---------- */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;          // erzeugendes Polynom x^8+x^4+x^3+x^2+1
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* Generatorpolynom für n Prüfzeichen: (x-a^0)(x-a^1)...(x-a^(n-1)) */
  function generator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var neu = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        neu[j] ^= g[j];
        neu[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = neu;
    }
    return g;
  }

  function pruefzeichen(daten, n) {
    var g = generator(n);
    var rest = new Array(n).fill(0);
    for (var i = 0; i < daten.length; i++) {
      var faktor = daten[i] ^ rest[0];
      rest.shift();
      rest.push(0);
      if (faktor !== 0) {
        for (var j = 0; j < n; j++) rest[j] ^= mul(g[j + 1], faktor);
      }
    }
    return rest;
  }

  /* ---------- Kenndaten der Versionen 1 bis 10, Stufe M ----------
     [Gesamtzahl Codewörter, Prüfzeichen je Block, Blöcke Gruppe 1,
      Datenwörter je Block Gruppe 1, Blöcke Gruppe 2, Datenwörter Gruppe 2] */
  var VERSIONEN = [
    null,
    [26,   10, 1, 16,  0,  0],
    [44,   16, 1, 28,  0,  0],
    [70,   26, 1, 44,  0,  0],
    [100,  18, 2, 32,  0,  0],
    [134,  24, 2, 43,  0,  0],
    [172,  16, 4, 27,  0,  0],
    [196,  18, 4, 31,  0,  0],
    [242,  22, 2, 38,  2, 39],
    [292,  22, 3, 36,  2, 37],
    [346,  26, 4, 43,  1, 44]
  ];

  /* Lage der Ausrichtungsmuster je Version. */
  var AUSRICHTUNG = [
    null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  function datenwoerter(v) {
    var k = VERSIONEN[v];
    return k[2] * k[3] + k[4] * k[5];
  }

  /* ---------- Nachricht in Codewörter ---------- */
  function codieren(bytes, v) {
    var bits = [];
    function schiebe(wert, laenge) {
      for (var i = laenge - 1; i >= 0; i--) bits.push((wert >> i) & 1);
    }

    schiebe(4, 4);                                   // Byte-Modus
    schiebe(bytes.length, v <= 9 ? 8 : 16);          // Längenfeld
    for (var i = 0; i < bytes.length; i++) schiebe(bytes[i], 8);

    var platz = datenwoerter(v) * 8;
    for (var t = 0; t < 4 && bits.length < platz; t++) bits.push(0);   // Abschluss
    while (bits.length % 8) bits.push(0);

    var woerter = [];
    for (var b = 0; b < bits.length; b += 8) {
      var w = 0;
      for (var j = 0; j < 8; j++) w = (w << 1) | bits[b + j];
      woerter.push(w);
    }
    /* Auffüllen mit den beiden vorgeschriebenen Füllwörtern im Wechsel. */
    var fuell = [0xec, 0x11], f = 0;
    while (woerter.length < datenwoerter(v)) woerter.push(fuell[f++ % 2]);
    return woerter;
  }

  /* Blöcke bilden, Prüfzeichen rechnen und beides verschränken. */
  function verschraenken(woerter, v) {
    var k = VERSIONEN[v], ecLen = k[1];
    var bloecke = [], ec = [], pos = 0, i, j;

    function nimm(anzahl, wieViele) {
      for (var b = 0; b < wieViele; b++) {
        var teil = woerter.slice(pos, pos + anzahl);
        pos += anzahl;
        bloecke.push(teil);
        ec.push(pruefzeichen(teil, ecLen));
      }
    }
    nimm(k[3], k[2]);
    nimm(k[5], k[4]);

    var aus = [];
    var maxD = Math.max(k[3], k[5]);
    for (i = 0; i < maxD; i++) {
      for (j = 0; j < bloecke.length; j++) {
        if (i < bloecke[j].length) aus.push(bloecke[j][i]);
      }
    }
    for (i = 0; i < ecLen; i++) {
      for (j = 0; j < ec.length; j++) aus.push(ec[j][i]);
    }
    return aus;
  }

  /* ---------- Muster ---------- */
  function leer(n) {
    var m = [];
    for (var i = 0; i < n; i++) m.push(new Array(n).fill(null));
    return m;
  }

  function sucher(m, x, y) {
    for (var dy = -1; dy <= 7; dy++) {
      for (var dx = -1; dx <= 7; dx++) {
        var px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= m.length || py >= m.length) continue;
        var rand = dx === -1 || dx === 7 || dy === -1 || dy === 7;
        var aussen = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        var kern = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        m[py][px] = rand ? 0 : (aussen || kern) ? 1 : 0;
      }
    }
  }

  /* Zentren der Ausrichtungsmuster. Die drei Kombinationen, die auf einem
     Sucher lägen (erste/erste, erste/letzte, letzte/erste), entfallen. */
  function ausrichtungsZentren(v) {
    var p = AUSRICHTUNG[v], aus = [], letzte = p.length - 1;
    for (var a = 0; a < p.length; a++) {
      for (var b = 0; b < p.length; b++) {
        if (a === 0 && b === 0) continue;
        if (a === 0 && b === letzte) continue;
        if (a === letzte && b === 0) continue;
        aus.push([p[a], p[b]]);
      }
    }
    return aus;
  }

  /* Versionsinformation, erst ab Version 7 vorhanden: 6 Bit Version und 12 Bit
     BCH-Sicherung, zweimal abgelegt. */
  function versionBits(v) {
    var rest = v << 12;
    for (var i = 5; i >= 0; i--) {
      if (rest & (1 << (i + 12))) rest ^= 0x1f25 << i;
    }
    return (v << 12) | rest;
  }

  function versionSetzen(m, v) {
    if (v < 7) return;
    var n = m.length, bits = versionBits(v);
    for (var i = 0; i < 18; i++) {
      var b = (bits >> i) & 1;
      m[n - 11 + (i % 3)][Math.floor(i / 3)] = b;
      m[Math.floor(i / 3)][n - 11 + (i % 3)] = b;
    }
  }

  function grundmuster(v) {
    var n = v * 4 + 17;
    var m = leer(n), i;

    sucher(m, 0, 0);
    sucher(m, n - 7, 0);
    sucher(m, 0, n - 7);

    for (i = 8; i < n - 8; i++) {            // Taktmuster
      var an = i % 2 === 0 ? 1 : 0;
      if (m[6][i] === null) m[6][i] = an;
      if (m[i][6] === null) m[i][6] = an;
    }

    ausrichtungsZentren(v).forEach(function (z) {
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          var rand = Math.max(Math.abs(dx), Math.abs(dy));
          m[z[1] + dy][z[0] + dx] = (rand === 1) ? 0 : 1;
        }
      }
    });

    versionSetzen(m, v);
    m[n - 8][8] = 1;                         // immer gesetztes dunkles Modul
    return m;
  }

  /* Plätze der Formatinformation freihalten, damit sie nicht mit Daten
     gefüllt werden. */
  function formatPlaetze(m) {
    var n = m.length, i;
    for (i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = 'f';
      if (m[i][8] === null) m[i][8] = 'f';
    }
    for (i = 0; i < 8; i++) {
      if (m[8][n - 1 - i] === null) m[8][n - 1 - i] = 'f';
      if (m[n - 1 - i][8] === null) m[n - 1 - i][8] = 'f';
    }
  }

  /* Daten im Zickzack von rechts unten nach oben einfüllen. */
  function fuellen(m, woerter) {
    var n = m.length, bit = 0, gesamt = woerter.length * 8;
    function naechstesBit() {
      if (bit >= gesamt) return 0;
      var w = woerter[bit >> 3], b = (w >> (7 - (bit & 7))) & 1;
      bit++;
      return b;
    }
    var hoch = true;
    for (var x = n - 1; x > 0; x -= 2) {
      if (x === 6) x--;                       // Taktspalte überspringen
      for (var s = 0; s < n; s++) {
        var y = hoch ? n - 1 - s : s;
        for (var d = 0; d < 2; d++) {
          var xx = x - d;
          if (m[y][xx] === null) m[y][xx] = naechstesBit();
        }
      }
      hoch = !hoch;
    }
  }

  var MASKEN = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  /* Formatinformation: 5 Bits (Stufe + Maske), BCH-gesichert, dann maskiert. */
  function formatBits(maske) {
    var wert = (0x00 << 3) | maske;          // 0b00 = Stufe M
    var rest = wert << 10;
    for (var i = 4; i >= 0; i--) {
      if (rest & (1 << (i + 10))) rest ^= 0x537 << i;
    }
    return ((wert << 10) | rest) ^ 0x5412;
  }

  function formatSetzen(m, maske) {
    var n = m.length, bits = formatBits(maske), i;
    function b(k) { return (bits >> k) & 1; }      // k = Bitnummer, 14 = höchstwertig

    /* Erste Kopie um den Sucher oben links: Zeile 8 trägt von links die Bits
       14 bis 7, Spalte 8 von unten nach oben die Bits 6 bis 0. Die Spalte 6
       und die Zeile 6 gehören zum Taktmuster und werden übersprungen. */
    for (i = 0; i <= 5; i++) m[8][i] = b(14 - i);
    m[8][7] = b(8);
    m[8][8] = b(7);
    m[7][8] = b(6);
    for (i = 0; i <= 5; i++) m[i][8] = b(i);

    /* Zweite Kopie, aufgeteilt auf die beiden anderen Sucher: Spalte 8 von
       unten die Bits 14 bis 8, Zeile 8 von rechts aussen die Bits 7 bis 0. */
    for (i = 0; i <= 6; i++) m[n - 1 - i][8] = b(14 - i);
    for (i = 0; i <= 7; i++) m[8][n - 8 + i] = b(7 - i);
  }

  /* Strafpunkte nach den vier Regeln der Norm - je weniger, desto besser
     lesbar ist der Code für die Kamera. */
  function strafe(m) {
    var n = m.length, s = 0, x, y, i, j;

    for (y = 0; y < n; y++) {
      for (var richtung = 0; richtung < 2; richtung++) {
        var lauf = 1;
        for (x = 1; x < n; x++) {
          var a = richtung ? m[x][y] : m[y][x];
          var vor = richtung ? m[x - 1][y] : m[y][x - 1];
          if (a === vor) { lauf++; } else { if (lauf >= 5) s += 3 + (lauf - 5); lauf = 1; }
        }
        if (lauf >= 5) s += 3 + (lauf - 5);
      }
    }

    for (y = 0; y < n - 1; y++) {
      for (x = 0; x < n - 1; x++) {
        var v = m[y][x];
        if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) s += 3;
      }
    }

    /* Regel 3: das Sucher-aehnliche Muster 1011101 mit vier hellen Modulen
       davor oder dahinter. Gesucht wird mit einem Fenster von elf Modulen, das
       vollstaendig im Code liegen muss - ein Muster, das erst mit dem Rand
       vollstaendig wuerde, zaehlt nicht. */
    for (y = 0; y < n; y++) {
      var zeile = 0, spalte = 0;
      for (x = 0; x < n; x++) {
        zeile  = ((zeile  << 1) & 0x7ff) | m[y][x];
        spalte = ((spalte << 1) & 0x7ff) | m[x][y];
        if (x < 10) continue;
        if (zeile  === 0x5d0 || zeile  === 0x05d) s += 40;
        if (spalte === 0x5d0 || spalte === 0x05d) s += 40;
      }
    }

    var dunkel = 0;
    for (y = 0; y < n; y++) for (x = 0; x < n; x++) if (m[y][x]) dunkel++;
    /* Regel 4: Abweichung des Dunkelanteils von der Haelfte, in Schritten von
       fuenf Prozent. Gerechnet wie in den gaengigen Umsetzungen - die Norm
       laesst hier Spielraum, und die Maskenwahl ist ohnehin nur eine
       Guetefrage: lesbar sind alle acht. */
    var anteil = dunkel * 100 / (n * n);
    s += Math.abs(Math.ceil(anteil / 5) - 10) * 10;
    return s;
  }

  /* ---------- Zusammenbau ---------- */
  function bytesVon(text) {
    var s = unescape(encodeURIComponent(text));     // UTF-8
    var b = [];
    for (var i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff);
    return b;
  }

  function tbkQr(text) {
    var bytes = bytesVon(text);
    var v = 0;
    for (var k = 1; k <= 10; k++) {
      var kopf = 4 + (k <= 9 ? 8 : 16);
      if (datenwoerter(k) * 8 >= kopf + bytes.length * 8) { v = k; break; }
    }
    if (!v) throw new Error('Text zu lang für einen QR-Code bis Version 10');

    var woerter = verschraenken(codieren(bytes, v), v);

    var geruest = grundmuster(v);
    formatPlaetze(geruest);
    fuellen(geruest, woerter);

    var beste = null, besteStrafe = Infinity;
    for (var maske = 0; maske < 8; maske++) {
      var m = geruest.map(function (zeile) { return zeile.slice(); });
      for (var y = 0; y < m.length; y++) {
        for (var x = 0; x < m.length; x++) {
          if (geruest[y][x] === 'f') { m[y][x] = 0; continue; }
          /* Maskiert wird nur, was Daten trägt - die festen Muster nicht.
             Erkennbar daran, dass das Grundmuster dort noch leer war. */
          if (istDaten(v, x, y)) m[y][x] = geruest[y][x] ^ (MASKEN[maske](x, y) ? 1 : 0);
        }
      }
      formatSetzen(m, maske);
      var p = strafe(m);
      if (p < besteStrafe) { besteStrafe = p; beste = m; }
    }
    return beste;
  }

  /* Ein Modul trägt Daten, wenn es weder Sucher, Takt, Ausrichtung, Format
     noch das feste dunkle Modul ist. Dieselbe Prüfung wie beim Füllen - hier
     aber aus den Koordinaten, damit die Maske sie unabhängig anwenden kann. */
  function istDaten(v, x, y) {
    var n = v * 4 + 17;
    if (x <= 8 && y <= 8) return false;                  // Sucher oben links
    if (x >= n - 8 && y <= 8) return false;              // Sucher oben rechts
    if (x <= 8 && y >= n - 8) return false;              // Sucher unten links
    if (x === 6 || y === 6) return false;                // Taktmuster
    if (v >= 7) {                                        // Versionsinformation
      if (x < 6 && y >= n - 11 && y < n - 8) return false;
      if (y < 6 && x >= n - 11 && x < n - 8) return false;
    }
    var z = ausrichtungsZentren(v);
    for (var i = 0; i < z.length; i++) {
      if (Math.abs(x - z[i][0]) <= 2 && Math.abs(y - z[i][1]) <= 2) return false;
    }
    return true;
  }

  global.tbkQr = tbkQr;
})(typeof window !== 'undefined' ? window : this);
