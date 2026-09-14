/* Ein schlanker PDF-Schreiber - gerade so viel, wie ein Arbeitsblatt braucht.
 *
 *     var p = tbkPdf();
 *     p.ueberschrift('Titel', 1);
 *     p.absatz([{text:'Hallo ', fett:false}, {text:'Welt', fett:true}]);
 *     p.bild(jpegBytes, 1240, 554);
 *     var blob = p.fertig();
 *
 * Warum selbst gebaut: Die Seite lädt nichts von fremden Servern, und der
 * Druckdialog des Browsers bleibt ohnehin der Weg zum schönsten Ergebnis.
 * Dieser hier ist für den Fall gedacht, dass man eine Datei will statt eines
 * Dialogs - schlichter im Satz, dafür ein Klick.
 *
 * Verwendet werden nur die Standardschriften Helvetica, Helvetica-Bold und
 * Helvetica-Oblique. Die sind in jedem Betrachter vorhanden und müssen nicht
 * eingebettet werden; dafür beschränkt sich der Zeichenvorrat auf WinAnsi.
 * Bilder gehen als JPEG hinein - das kann der Browser selbst erzeugen und PDF
 * direkt einbinden, ohne dass hier gepackt werden müsste.
 */
(function (global) {
  'use strict';

  var A4 = { breite: 595.28, hoehe: 841.89 };
  var RAND = 56;

  /* ---------- Zeichenvorrat ---------- */

  /* Was WinAnsi nicht kennt, wird auf etwas Ähnliches abgebildet. Alles
     Übrige fiele sonst als Kästchen auf oder verschöbe die Codierung. */
  var ERSATZ = {
    'μ': 'µ',    // griechisches my -> Mikrozeichen, sieht gleich aus
    '→': '->', '←': '<-', '↔': '<->',
    '≤': '<=', '≥': '>=',
    ' ': ' ', ' ': ' ', ' ': ' ',
    '′': "'", '″': '"',
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₚ': 'p', 'ₜ': 't', 'ₘ': 'm', 'ᴿ': 'R', 'ᶠ': 'f',
    '⌀': 'd', '·': '·', '✓': 'x', '✗': 'x',
    '▶': '>', '−': '-', '≈': '~', '√': 'Wurzel',
    /* Striche, die WinAnsi nicht kennt - sonst steht dort ein Fragezeichen,
       und die Breite passt auch nicht mehr. */
    '‐': '-', '‑': '-', '‒': '-',
    /* Griechisch kennt WinAnsi nicht. Der ausgeschriebene Name ist lesbar,
       ein Fragezeichen ist es nicht. Mikro steht oben schon. */
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta',
    'ε': 'epsilon', 'ζ': 'zeta', 'η': 'eta', 'θ': 'theta',
    'λ': 'lambda', 'ξ': 'xi', 'π': 'pi', 'ρ': 'rho',
    'σ': 'sigma', 'τ': 'tau', 'φ': 'phi', 'χ': 'chi',
    'ψ': 'psi', 'ω': 'omega', 'ν': 'ny',
    'Δ': 'Delta', 'Σ': 'Sigma', 'Φ': 'Phi', 'Ω': 'Omega',
    /* Unsichtbares: auf Papier ohne Aufgabe. */
    '­': '', '⁠': '', '﻿': '', ' ': ' '
  };

  function nachWinAnsi(text) {
    var aus = '';
    for (var i = 0; i < text.length; i++) {
      var z = text[i];
      if (ERSATZ[z] !== undefined) { aus += ERSATZ[z]; continue; }
      var c = z.charCodeAt(0);
      if (c < 128) { aus += z; continue; }
      /* Der WinAnsi-Bereich deckt sich oberhalb von 160 mit Latin-1; die
         Sonderzeichen zwischen 128 und 159 werden hier abgebildet. */
      var sonder = { '€': 128, '‚': 130, 'ƒ': 131, '„': 132,
        '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137,
        'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142, '‘': 145,
        '’': 146, '“': 147, '”': 148, '•': 149, '–': 150,
        '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155,
        'œ': 156, 'ž': 158, 'Ÿ': 159 };
      if (sonder[z] !== undefined) { aus += String.fromCharCode(sonder[z]); continue; }
      if (c <= 255) { aus += z; continue; }
      aus += '?';
    }
    return aus;
  }

  /* ---------- Breiten messen ----------
     Gemessen wird im Browser mit derselben Schrift, die das PDF später nutzt.
     Das erspart eine eingebaute Breitentabelle und trifft genau genug, damit
     kein Umbruch über den Rand läuft. */
  var messFeld = null;
  function breite(text, groesse, fett, kursiv) {
    if (!messFeld) {
      messFeld = document.createElement('canvas').getContext('2d');
    }
    messFeld.font = (fett ? 'bold ' : '') + (kursiv ? 'italic ' : '')
      + groesse + 'px Helvetica, Arial, sans-serif';
    /* Gemessen wird die umgesetzte Fassung, nicht das Original: Aus einem
       Zeichen koennen mehrere werden ("alpha"), und dann waere der Vorschub
       zu klein - das naechste Wort rutschte darauf. */
    return messFeld.measureText(nachWinAnsi(text)).width;
  }

  /* ---------- Bytes ---------- */

  function textBytes(s) {
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    return b;
  }

  function pdfText(s) {
    return nachWinAnsi(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  /* ---------- Das Dokument ---------- */

  function tbkPdf(o) {
    o = o || {};
    var seitenBreite = o.breite || A4.breite;
    var seitenHoehe = o.hoehe || A4.hoehe;
    var rand = o.rand || RAND;
    var nutzbar = seitenBreite - 2 * rand;

    var seiten = [];        // je Seite: { ops: [], bilder: [] }
    var bilder = [];        // { daten, w, h, nr }
    var y = 0;
    var seite = null;

    function neueSeite() {
      seite = { ops: [], bilder: [] };
      seiten.push(seite);
      y = seitenHoehe - rand;
    }
    neueSeite();

    function platzPruefen(hoehe) {
      if (y - hoehe < rand) neueSeite();
    }

    function zeileSchreiben(stuecke, groesse, x0) {
      var x = x0;
      stuecke.forEach(function (s) {
        if (!s.text) return;
        var schrift = s.fett ? 'F2' : (s.kursiv ? 'F3' : 'F1');
        seite.ops.push('BT /' + schrift + ' ' + groesse + ' Tf 1 0 0 1 '
          + x.toFixed(2) + ' ' + y.toFixed(2) + ' Tm (' + pdfText(s.text) + ') Tj ET');
        x += breite(s.text, groesse, s.fett, s.kursiv);
      });
    }

    /* Läufe in Zeilen brechen. Ein Lauf ist ein Stück Text mit einer Auszeichnung. */
    function umbrechen(stuecke, groesse, maxBreite) {
      var zeilen = [];
      var zeile = [];
      var x = 0;

      stuecke.forEach(function (s) {
        var worte = String(s.text).split(/(\s+)/);
        worte.forEach(function (w) {
          if (!w) return;
          var b = breite(w, groesse, s.fett, s.kursiv);
          if (x + b > maxBreite && x > 0 && /\S/.test(w)) {
            zeilen.push(zeile);
            zeile = [];
            x = 0;
            if (!/\S/.test(w)) return;
          }
          if (x === 0 && !/\S/.test(w)) return;      // führende Leerzeichen weg
          zeile.push({ text: w, fett: s.fett, kursiv: s.kursiv });
          x += b;
        });
      });
      if (zeile.length) zeilen.push(zeile);
      return zeilen;
    }

    var api = {
      absatz: function (stuecke, opt) {
        opt = opt || {};
        var groesse = opt.groesse || 10.5;
        var abstand = opt.abstand === undefined ? 5 : opt.abstand;
        var links = rand + (opt.einzug || 0);
        var zeilen = umbrechen(stuecke, groesse, nutzbar - (opt.einzug || 0));
        var hoehe = groesse * 1.35;

        zeilen.forEach(function (z, i) {
          platzPruefen(hoehe);
          zeileSchreiben(z, groesse, links);
          if (i === 0 && opt.zeichen) {
            zeileSchreiben([{ text: opt.zeichen }], groesse, rand + (opt.einzug || 0) - 14);
          }
          y -= hoehe;
        });
        y -= abstand;
      },

      ueberschrift: function (text, stufe) {
        var groesse = stufe === 1 ? 18 : stufe === 2 ? 13.5 : 11.5;
        y -= stufe === 1 ? 2 : 10;
        platzPruefen(groesse * 2.2);
        if (stufe === 2) {
          seite.ops.push('0.6 w 0.55 0.55 0.55 RG ' + rand + ' ' + (y + 8).toFixed(2)
            + ' m ' + (rand + nutzbar) + ' ' + (y + 8).toFixed(2) + ' l S');
          y -= 6;
        }
        api.absatz([{ text: text, fett: true }], { groesse: groesse, abstand: 4 });
      },

      linie: function () {
        platzPruefen(10);
        seite.ops.push('0.6 w 0.75 0.75 0.75 RG ' + rand + ' ' + y.toFixed(2)
          + ' m ' + (rand + nutzbar) + ' ' + y.toFixed(2) + ' l S');
        y -= 8;
      },

      kasten: function (hoehe) {
        /* Rahmen um den folgenden Block - wird nachträglich gezeichnet. */
        return { oben: y, seite: seite };
      },

      rahmenSchliessen: function (marke) {
        if (marke.seite !== seite) return;            // Seitenwechsel: kein Rahmen
        marke.seite.ops.unshift('0.6 w 0.62 0.62 0.62 RG '
          + (rand - 8) + ' ' + (y - 2).toFixed(2) + ' ' + (nutzbar + 16).toFixed(2)
          + ' ' + (marke.oben - y + 12).toFixed(2) + ' re S');
      },

      bild: function (jpeg, bw, bh, maxBreite) {
        var w = Math.min(maxBreite || nutzbar, nutzbar);
        var h = w * bh / bw;
        if (h > seitenHoehe - 2 * rand) {
          h = seitenHoehe - 2 * rand;
          w = h * bw / bh;
        }
        platzPruefen(h + 6);
        var nr = bilder.length + 1;
        bilder.push({ daten: jpeg, w: bw, h: bh, nr: nr });
        seite.bilder.push(nr);
        var x = rand + (nutzbar - w) / 2;
        seite.ops.push('q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' '
          + x.toFixed(2) + ' ' + (y - h).toFixed(2) + ' cm /Im' + nr + ' Do Q');
        y -= h + 8;
      },

      abstand: function (n) { y -= n; },

      seitenwechsel: function () { neueSeite(); },

      fertig: function () {
        var teile = [];
        var laengen = [];
        function raus(x) {
          var b = typeof x === 'string' ? textBytes(x) : x;
          teile.push(b);
          laengen.push(b.length);
        }

        var objekte = [];       // Byte-Offset je Objektnummer
        var pos = 0;
        function merken(nr) {
          objekte[nr] = pos;
        }
        function schreibe(x) {
          var b = typeof x === 'string' ? textBytes(x) : x;
          teile.push(b);
          pos += b.length;
        }

        var anzSeiten = seiten.length;
        var nrKatalog = 1, nrSeitenbaum = 2;
        var nrSchrift = 3;                               // 3,4,5
        var nrBild0 = 6;                                 // 6 .. 6+bilder-1
        var nrSeite0 = nrBild0 + bilder.length;          // je Seite zwei Objekte
        var gesamt = nrSeite0 + anzSeiten * 2 - 1;

        schreibe('%PDF-1.4\n%âãÏÓ\n');

        merken(nrKatalog);
        schreibe(nrKatalog + ' 0 obj\n<</Type/Catalog/Pages ' + nrSeitenbaum + ' 0 R>>\nendobj\n');

        var kids = [];
        for (var i = 0; i < anzSeiten; i++) kids.push((nrSeite0 + i * 2) + ' 0 R');
        merken(nrSeitenbaum);
        schreibe(nrSeitenbaum + ' 0 obj\n<</Type/Pages/Kids[' + kids.join(' ')
          + ']/Count ' + anzSeiten + '>>\nendobj\n');

        ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'].forEach(function (name, k) {
          merken(nrSchrift + k);
          schreibe((nrSchrift + k) + ' 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/'
            + name + '/Encoding/WinAnsiEncoding>>\nendobj\n');
        });

        bilder.forEach(function (b, k) {
          merken(nrBild0 + k);
          schreibe((nrBild0 + k) + ' 0 obj\n<</Type/XObject/Subtype/Image/Width '
            + b.w + '/Height ' + b.h + '/ColorSpace/DeviceRGB/BitsPerComponent 8'
            + '/Filter/DCTDecode/Length ' + b.daten.length + '>>\nstream\n');
          schreibe(b.daten);
          schreibe('\nendstream\nendobj\n');
        });

        seiten.forEach(function (s, k) {
          var nrS = nrSeite0 + k * 2;
          var nrI = nrS + 1;
          var xobj = s.bilder.map(function (n) {
            return '/Im' + n + ' ' + (nrBild0 + n - 1) + ' 0 R';
          }).join(' ');

          merken(nrS);
          schreibe(nrS + ' 0 obj\n<</Type/Page/Parent ' + nrSeitenbaum + ' 0 R'
            + '/MediaBox[0 0 ' + seitenBreite.toFixed(2) + ' ' + seitenHoehe.toFixed(2) + ']'
            + '/Resources<</Font<</F1 3 0 R/F2 4 0 R/F3 5 0 R>>'
            + (xobj ? '/XObject<<' + xobj + '>>' : '') + '>>'
            + '/Contents ' + nrI + ' 0 R>>\nendobj\n');

          var inhalt = '0 0 0 rg\n' + s.ops.join('\n') + '\n';
          var ib = textBytes(nachWinAnsi(inhalt));
          merken(nrI);
          schreibe(nrI + ' 0 obj\n<</Length ' + ib.length + '>>\nstream\n');
          schreibe(ib);
          schreibe('\nendstream\nendobj\n');
        });

        var xref = pos;
        var zeilenXref = ['xref', '0 ' + (gesamt + 1), '0000000000 65535 f '];
        for (var n = 1; n <= gesamt; n++) {
          var off = objekte[n] || 0;
          zeilenXref.push(('0000000000' + off).slice(-10) + ' 00000 n ');
        }
        schreibe(zeilenXref.join('\n') + '\n');
        schreibe('trailer\n<</Size ' + (gesamt + 1) + '/Root ' + nrKatalog
          + ' 0 R>>\nstartxref\n' + xref + '\n%%EOF\n');

        return new Blob(teile, { type: 'application/pdf' });
      }
    };

    return api;
  }

  global.tbkPdf = tbkPdf;
})(typeof window !== 'undefined' ? window : this);
