# Bauteile in 3D

**Stand:** 17.09.2026 — **in Betrieb**, erster Anwender ist die Lernsituation
„Der Lagerbock". Baustein: `assets/bauteil3d.js`, zeichengleich im
Werkzeugrepo unter `tools/assets/bauteil3d.js`.

---

## 1. Wozu

Manches lässt sich in der Ansicht nicht zeigen. Wo eine Naht wirklich liegt,
ob eine Rippe vor oder hinter dem Blech sitzt, in welcher Reihenfolge eine
Baugruppe zusammengeht — dafür braucht es ein Modell, das man drehen kann.
Und wo geprüft werden soll, ob jemand die richtige Stelle gefunden hat,
braucht es eines, das auf einen Klick antwortet.

Der Baustein macht drei Dinge:

1. **Darstellen.** Aus einer Liste von Maßen wird ein Körper. Die Liste steht
   in der Seite — `bauteil3d.js` kennt keine Lagerböcke.
2. **Zusammensetzen.** Die Teile fahren der Reihe nach aus einer Ruhelage an
   ihren Platz. Das ist die Montage.
3. **Anklicken lassen.** Wer eine Marke trifft, löst `onWahl(id)` aus.

Was er **nicht** macht: rechnen, bewerten, zählen, speichern, nachladen. Die
Auswertung gehört in die Seite. Nur so lässt sich derselbe Körper in einer
Lernsituation, einer Übung und einem Training mit verschiedenen Fragen
verwenden.

---

## 2. Was gebraucht wird

```html
<script src="../../vendor/three.min.js"></script>
<script src="../../vendor/OrbitControls.js"></script>
<script src="../../assets/bauteil3d.js"></script>
```

Beide Bibliotheken liegen im Repo. **Nachgeladen wird nichts** — ein Werkzeug,
das beim Aufruf einen fremden Server fragt, verrät, wer es benutzt. Der Build
trägt nur die eigenen `assets/` nach; die `vendor/`-Zeilen stehen von Hand in
der Seite.

---

## 3. Eine Szene

```js
var szene = Bauteil3D.aufbauen(document.getElementById("buehne"), {
  teile: [
    {id:"platte", name:"Grundplatte 180 × 90 × 12", form:"quader",
     masse:{x:180, y:12, z:90}, lage:{x:0, y:6, z:0},
     von:{y:-90}},                    // Ruhelage für die Montage
    …
  ],
  marken: [
    {id:"A", name:"Kehle am Stehblech", lage:{x:-20, y:17, z:10}, r:7}
  ],
  blick: {abstand:330, hoch:0.55, dreh:0.9},
  mitte: {x:0, y:55, z:0},
  beschreibung: "…",                  // wird das aria-label der Leinwand
  onWahl:    function(id, marke){ … },
  onSchritt: function(n, gesamt, teil){ … },
  onFertig:  function(){ … }
});
```

`aufbauen()` gibt **null** zurück, wenn das Gerät kein WebGL kann. Die Seite
muss das abfangen — siehe § 6.

### Maße und Ursprung

Alles in Millimetern, **y zeigt nach oben**. `lage` ist immer die *Mitte* des
umschließenden Quaders, gleich welche Form — das erspart der Seite das
Umrechnen. `von` ist der Versatz der Ruhelage gegenüber der Endlage, also die
Richtung, aus der das Teil einfährt.

### Formen

| Form | Maße | Bemerkung |
| --- | --- | --- |
| `quader` | `{x, y, z}` | |
| `rohr` | `{d, di, l}` | `achse: "x"\|"y"\|"z"`; `di: 0` ergibt einen Vollzylinder |
| `keil` | `{x, y, z}` | rechtwinkliges Dreieck in xy, über z ausgezogen; Katheten auf +x und +y |
| `winkel` | `{x, y, z, s}` | L-Profil, Schenkeldicke `s` |

Gedreht wird über `dreh: {x, y, z}` im Bogenmaß. Eine Rippe, deren senkrechte
Kathete am Blech liegen soll, bekommt `dreh:{y:-Math.PI/2}`.

---

## 4. Was die Szene kann

| Aufruf | Wirkung |
| --- | --- |
| `montage(abNr)` | setzt die Teile der Reihe nach ein |
| `zeigenAlles()` | alles sofort an seinem Platz |
| `zerlegen()` | alles in die Ruhelage |
| `schritt(n)` | bis Teil n zusammengesetzt |
| `marken(an)` | Marken sichtbar **und** anklickbar |
| `markeStand(id, stand)` | `"offen"`, `"richtig"` oder `"falsch"` |
| `markeZeigen(id, an)` | eine einzelne Marke aus- oder einblenden |
| `markeSetzen(id, lage)` | Marke verschieben, wenn sich Maße geändert haben |
| `hervorheben(id)` | ein Teil farbig herausheben (`null`: keines) |
| `setzen({id: {masse, lage}})` | Maße ändern, betroffene Teile neu bauen |
| `blickZuruecksetzen()` | Kamera zurück in die Ausgangslage |
| `aus()` | aufräumen |

**`aus()` ist Pflicht**, wenn eine Szene verschwindet. WebGL-Kontexte sind
eine begrenzte Ressource; eine Seite, die mehrere Szenen aufbaut und keine
schließt, zeichnet nach ein paar Wechseln gar nichts mehr.

---

## 5. Klicks

Gemeldet wird nur, **was** getroffen wurde — nicht, ob das richtig war:

```js
onWahl: function(id, marke){
  if(id === gesuchteStelle) …          // die Seite entscheidet
}
```

Ein Klick zählt nur, wenn der Zeiger dabei stehen geblieben ist (weniger als
6 Pixel Weg). Wer die Ansicht dreht, wählt nicht versehentlich aus.

Marken werden **zuletzt und ohne Tiefenprüfung** gezeichnet: Eine Stelle, die
hinter einer Rippe verschwindet, könnte niemand anklicken — und wer sie
suchen muss, statt sie zu erkennen, übt das Falsche. Alle Stellen sind
sichtbar; die Aufgabe ist, die richtige zu wählen.

---

## 6. Ohne WebGL

Nicht jedes Gerät kann WebGL, und im Ausdruck gibt es keine Leinwand.

```js
if(!window.Bauteil3D || !Bauteil3D.moeglich()){
  el("ohne3d").hidden = false;         // Hinweis zeigen
  return;                              // und die Seite läuft ohne 3D weiter
}
```

**Eine Seite, die ohne diesen Baustein nichts mehr kann, ist falsch gebaut.**
Die Lernsituation „Der Lagerbock" zeigt daneben weiterhin die Ansicht mit
denselben Buchstaben A bis E; jede Frage bleibt beantwortbar. Im Ausdruck
werden die 3D-Karten über `@media print` ausgeblendet.

---

## 7. Hell und dunkel

Die Szene malt sich selbst hell oder dunkel, je nach `data-thema-effektiv` am
`html`-Tag, und hört auf Änderungen. Der Umkehrfilter aus
`thema-werkzeug.css` greift bei einer Leinwand nicht — WebGL malt in seinen
eigenen Farbraum.

---

## 8. Was geprüft wird

`pruefungen/test-bauteil3d.js`:

* der Baustein liegt in beiden Repos und ist zeichengleich,
* `vendor/` ist vorhanden, und der Baustein lädt nichts nach,
* ohne THREE meldet `moeglich()` false und `aufbauen()` gibt null zurück,
* die Lernsituation fällt sauber zurück und bleibt bearbeitbar,
* **die Geometrie stimmt mit dem überein, was die Seite lehrt.**

Der letzte Punkt ist der wichtigste. Beim Lagerbock heißt das: Naht A ist eine
Doppel-Kehlnaht von 2 × 180 mm, also muss das Stehblech 180 mm lang sein.
Naht C läuft mit 250 mm um die Rippe, also gilt
2 · (85 + 40) = 250 für ihre Katheten. Wer das Modell nachmisst, findet die
Zahlen aus Teil 6 wieder — sonst widerspricht sich die Seite, und das merkt
niemand von selbst.

---

## 9. Was als Nächstes dazugehört

Absehbar gebraucht, aber noch nicht gebaut:

* **Flächen und Kanten als Ziel**, nicht nur gesetzte Marken. Heute wird auf
  Kugeln geklickt; für Fragen wie „welche Fläche ist die Bezugsfläche?"
  müsste der Strahl auf die Teile selbst treffen und die getroffene Fläche
  melden.
* **Bemaßung im Raum** — Maßpfeile und Maßzahlen, die sich mitdrehen.
* **Schnittdarstellung**: eine Ebene, die den Körper aufschneidet.
* **Montagepfade**, die nicht gerade sind — für Teile, die eingefädelt oder
  verschraubt werden.
