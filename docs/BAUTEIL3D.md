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
3. **Anklicken lassen.** Wer eine Marke trifft, löst `onWahl(id)` aus; wer
   ein Teil trifft, `onTeil(id)` – wenn `teileWaehlbar(true)` gesetzt ist.

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
    // eine Stelle: Kugel
    {id:"A", name:"Hinweis", lage:{x:-20, y:17, z:10}, r:7},
    // eine Kante: Raupe entlang der Strecke
    {id:"B", name:"Kehle am Blechfuß",
     von:{x:-60, y:15, z:7}, bis:{x:60, y:15, z:7}, r:2.6},
    // eine Rundnaht: Ring um eine Achse
    {id:"C", name:"Naht am Stutzen",
     ring:{mitte:{x:0, y:67, z:7}, radius:32, achse:"z"}, r:2.6}
  ],
  blick: {abstand:330, hoch:0.55, dreh:0.9},
  mitte: {x:0, y:55, z:0},
  beschreibung: "…",                  // wird das aria-label der Leinwand
  onWahl:    function(id, marke){ … },
  onTeil:    function(id, teil){ … },
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
| `quader` | `{x, y, z}`, wahlweise `loch: {d, x, y}` | Durchbruch längs z, Lage ab Mitte |
| `rohr` | `{d, di, l}` | `achse: "x"\|"y"\|"z"`; `di: 0` ergibt einen Vollzylinder |
| `keil` | `{x, y, z}` | rechtwinkliges Dreieck in xy, über z ausgezogen; Katheten auf +x und +y |
| `winkel` | `{x, y, z, s}` | L-Profil, Schenkeldicke `s` |
| `dach` | `{x, y, z}` | symmetrischer Keil, Schneide unten und entlang x – ein Biegestempel |
| `gesenk` | `{x, y, z, nut}` | Quader mit V-Nut im Rücken, 90°, Tiefe `nut`, Nut entlang x |
| `platte` | `{x, y, z, loecher: [{d, x, z}]}` | liegende Platte, Dicke in y, beliebig viele senkrechte Bohrungen |
| `flanke` | `{x, y, z, nut}` | die schräge Wange einer V-Nut, ausgezogen über x |
| `ringSegment` | `{d, di, l, schlitz, oben}` | obere oder untere Hälfte eines Rings; zwei davon ergeben eine Querbohrung |

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

### Kanten statt Kugeln

Wer auf eine Naht zeigen soll, soll auf die **Naht** zeigen können und nicht
auf eine Kugel daneben. Deshalb gibt es drei Gestalten:

| Gestalt | Felder | wofür |
| --- | --- | --- |
| Kugel | `lage`, `r` | eine Stelle ohne Ausdehnung |
| Raupe | `von`, `bis`, `r` | eine Kante — sieht aus wie die Naht |
| Ring | `ring: {mitte, radius, achse}`, `r` | eine Rundnaht |

**Mehrere Marken dürfen dieselbe `id` tragen** — `markeStand` färbt dann alle
zusammen. Der Lagerbock nutzt das nicht mehr: Dort trägt jede Raupe eine
eigene Kennung (`"C.3"`) und nennt daneben die Naht, zu der sie gehört
(`naht: "C"`). Die Marke selbst kommt als zweites Argument in `onWahl`
zurück, die Seite braucht also keine Nachschlagetabelle.

### Eine Naht besteht aus Teilstücken

Eine Doppel-Kehlnaht liegt auf beiden Flanken, eine umlaufende Naht geht als
geschlossene Schleife einmal herum — sechs Raupen bei der Rippe des
Lagerbocks. Wer eine davon anklickt, hat **eine Stelle** getroffen, nicht die
Naht. Deshalb zählt in der Lernsituation erst der vollständige Satz: Jedes
getroffene Stück bleibt grün stehen, die Zeile über dem Modell sagt „3 von 6
gefunden“, und die Erklärung zur Angabe erscheint erst, wenn keines mehr
fehlt.

Das ist der Grund, warum man den Bock drehen muss: Die Rückseite ist von vorn
nicht zu sehen, und ohne sie wird keine Doppelkehlnaht vollständig.

Bewertet wird das weiterhin in der Seite, nicht im Baustein — der meldet nur,
was getroffen wurde.

Unter dem Zeiger hebt sich die Marke hervor. Ohne das wäre bei Kanten nicht
zu sehen, was anklickbar ist — sie liegen ja am Bauteil.

**Alle Marken liegen im durchscheinenden Zeichendurchgang.** Das ist kein
Schmuck, sondern nötig: Die Bauteile selbst sind durchscheinend, weil die
Montage sie einblendet. Eine undurchsichtige Raupe wäre vorher an der Reihe
und würde von ihnen überdeckt, obwohl sie davor liegt — sie war schlicht
unsichtbar, und die Ursache stand eine Weile im Dunkeln. Die Tiefenprüfung
bleibt bei Kanten an: Was wirklich hinter dem Körper liegt, soll verdeckt
sein, und Drehen gehört zur Aufgabe.

### Mehr Stellen als Antworten

Gibt es genau so viele Marken wie Lösungen, ist die letzte durch Ausschluss
zu haben. Deshalb trägt der Lagerbock 28 anklickbare Kanten für fünf Angaben:
17 gehören zu einer Naht, 11 zu keiner. An jeder Kehle *könnte* geschweißt
werden, und am Anschlag liegen drei nebeneinander, von denen nur eine in der
Zeichnung steht. Wer eine Kante ohne Angabe trifft,
bekommt nicht „falsche Naht“ zu hören, sondern „hier wird gar nicht
geschweißt“ — das ist etwas anderes.

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

## 6a. Montieren, ohne die Reihenfolge vorzuschreiben

`montage()` spielt eine feste Folge ab. Für eine Montage, deren Reihenfolge
der Lernende selbst bestimmt, gibt es den Schritt einzeln:

```js
szene.alleVerbergen();          // nichts ist da
szene.einsetzen("gesenk");      // dieses Teil fliegt an seinen Platz
szene.herausnehmen("gesenk");   // und wieder weg
szene.teileWaehlbar(true);      // Klicks treffen jetzt die Teile
szene.teilStand("gesenk", "richtig");
```

Zwei Dinge daran sind nicht offensichtlich:

**Jedes Teil zählt für sich.** Die Montage mit fester Folge benutzt eine
gemeinsame Zählmarke, um abgebrochene Läufe zu erkennen. Für `einsetzen()`
wäre die falsch: Wer zwei Teile kurz nacheinander einsetzt, würde damit die
erste Bewegung abwürgen — und das Teil bliebe in der Luft stehen. Deshalb hat
jedes Teil seine eigene.

**Wer keine Bewegung will, bekommt keine.** Ist im Betriebssystem
`prefers-reduced-motion` gesetzt, fliegt nichts; die Teile sind an ihrem
Platz. Die Aussage der Montage bleibt, die Bewegung fällt weg. Nebenbei macht
das die Darstellung prüfbar: Ein Bild, das auf eine Animation wartet, lässt
sich nicht nachmessen — und in Headless-Chrome läuft
`requestAnimationFrame` unter virtueller Zeit ohnehin nur ein einziges Mal.

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

Der letzte Punkt ist der wichtigste. Die Prüfung schreibt die Zahlen nicht
selbst hin, sondern **liest sie aus der Seite** und rechnet nach, ob sie aus
der Geometrie folgen. Beim Lagerbock: Naht A ist eine Doppel-Kehlnaht über
die Breite des Stehblechs, also 2 · 120 = 240 mm. Naht C läuft umlaufend um
die Rippe, also 2 · (53 + 22) = 150 mm, dazu die unterbrochene Naht D mit
3 · 30 = 90 mm — zusammen die 240 mm, die in Teil 6 stehen. Und die
Vorderansicht wird aus denselben Zahlen gezeichnet.

Das ist keine Formsache. Genau hier ist schon einmal etwas
auseinandergelaufen: Die Teileliste nannte das Stehblech 120 mm breit, Teil 6
rechnete mit 2 × 180 mm. Wer das Modell nach der einen Zahl baut, bekommt ein
Bauteil, das der Zeichnung widerspricht — und niemand merkt es, bis jemand
beides nebeneinanderlegt.

---

## 9. Was als Nächstes dazugehört

Absehbar gebraucht, aber noch nicht gebaut:

* **Echte Bohrungen quer zur Ausziehrichtung.** Der Baustein zieht Umrisse
  aus; eine Bohrung liegt damit immer in Ausziehrichtung. Für die
  Querbohrung des Kegelstifts gibt es deshalb `ringSegment`: zwei
  Ringhälften mit Platz dazwischen. Das ist eine Näherung — die Öffnung ist
  an den Ecken eckig statt rund. Eine runde Querbohrung bräuchte echtes
  Verschneiden von Körpern (CSG), und das kann three.js nicht von sich aus.
* **Flächen als Ziel.** Ganze Teile lassen sich inzwischen anklicken
  (`teileWaehlbar`), Kanten und Rundnähte als Marken auch. Was noch fehlt,
  ist die einzelne *Fläche* — für Fragen wie „welche Fläche ist die
  Bezugsfläche?" müsste der Strahl melden, welches Dreieck er getroffen hat,
  und der Baustein daraus die Fläche ableiten.
* **Bemaßung im Raum** — Maßpfeile und Maßzahlen, die sich mitdrehen.
* **Schnittdarstellung**: eine Ebene, die den Körper aufschneidet.
* **Montagepfade**, die nicht gerade sind — für Teile, die eingefädelt oder
  verschraubt werden.
