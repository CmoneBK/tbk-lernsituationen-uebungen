# Regeln für die Zeichnungen

Was in Übungen, Trainings und Lernsituationen gezeichnet wird, ist entweder
eine **technische Zeichnung** — dann gilt die Norm ohne Abzug — oder es ist
erkennbar keine. Dazwischen gibt es nichts. Wer ein Bild so zeichnet, dass es
wie eine technische Zeichnung aussieht, sich aber nicht an die Norm hält,
bringt es den Lernenden falsch bei.

Diese Datei sagt, welche Regeln gelten, wie sie umgesetzt sind, wo bewusst
abgewichen wird — und wie das geprüft wird.

---

## 1. Zwei Sorten Bilder — und nichts dazwischen

Ein Bild ist **sichtbar und eindeutig keine technische Zeichnung** — oder es
ist eine und hält **alle** Regeln ein.

**Was als technische Zeichnung verstanden wird**, entscheidet nicht die
Absicht, sondern das Aussehen: schwarzweiß, Schraffur im Schnitt, Körperkanten
in zwei Linienbreiten. Wer das zeichnet, zeichnet eine technische Zeichnung —
auch ohne Maße, auch „nur schematisch". Ein Prinzipbild, das so aussieht, ist
keine eigene Kategorie, sondern eine technische Zeichnung ohne Maßeintragung.

| | Beispiel | Was gilt |
| --- | --- | --- |
| **Technische Zeichnung** | Schnitt durch eine Schraubverbindung, Einzelteil, Gewindedarstellung, die sechzehn Fügebilder, Draufsicht auf den Gehäusedeckel | Abschnitt 2 bis 7, ohne Abzug. Maße sind nicht Pflicht — wo welche stehen, gilt Abschnitt 6. |
| **Keine technische Zeichnung** | Verspannungsschaubild, Streuband, Abwickeln der schiefen Ebene, die farbige Lehrgrafik im Reiter „Aufbau" | Keine Zeichnungsnorm. Erkennbar an Farbe, Achsen, Kurven — niemand hält das für eine Zeichnung. |

Im Zweifel gilt: **Sieht es aus wie eine Zeichnung, ist es eine.** Wer den
Aufwand nicht treiben will, muss das Bild sichtbar anders machen — farbig zum
Beispiel —, nicht die Regeln lockern.

**Die Erklärebene** liegt über beiden: Benennungen mit Hinweislinie,
nummerierte Regelmarken, farbige Kraftpfeile, Hervorhebungen. Sie ist
**absichtlich anders gezeichnet** — gestrichelt, grau oder farbig — damit man
ihr ansieht, dass sie nicht zur Zeichnung gehört. In den Bausteinen trägt sie
die Klasse `erklaer` und wird bei der Prüfung nicht mitgezählt.

---

## 2. Linien — DIN ISO 128-20 und -24

Es gibt **genau zwei Linienbreiten** im Verhältnis **2:1**. In
`assets/zeichnen.js` stehen sie als `BREIT = 2.0` und `SCHMAL = 1.0`.

| Linie | Breite | Art |
| --- | --- | --- |
| sichtbare Körperkante, Umriss | breit | Vollinie |
| Kerndurchmesser im **geschnittenen Innengewinde** | breit | Vollinie |
| Maßlinie, Maßhilfslinie | schmal | Vollinie |
| Schraffur | schmal | Vollinie |
| Gewindekern am **Außengewinde** | schmal | Vollinie |
| Gewindeende (Begrenzung des nutzbaren Gewindes) | **breit** | Vollinie |
| schräger Gewindeauslauf | schmal | Vollinie |
| Mittellinie, Symmetrielinie | schmal | Strichpunktlinie |

**Keine halbtransparenten Linien.** Eine schmale Vollinie ist eine Linie, kein
Grauton; wer sie abschwächt, macht daraus optisch eine dritte Linienart. Was
zurücktreten soll, gehört in die Erklärebene.

Strichpunkt einheitlich als `"12 2 2 2"`.

---

## 3. Schnitte — DIN ISO 128-50

* Schraffur unter **45°** zur Hauptkante.
* Benachbarte Teile **gegenläufig oder versetzt** — sonst sehen zwei Teile aus
  wie eines. Versetzt heißt: gleicher Winkel, aber anderer Abstand. Stößt ein
  drittes Teil dazu, darf es einen dritten Winkel bekommen (30° oder 60°).
* Die Schraffur reicht **bis zur breiten Linie**, beim Innengewinde also bis
  zum Kerndurchmesser.
* **Nicht geschnitten** werden im Längsschnitt: Schrauben, Muttern, Scheiben,
  Niete, Stifte, Keile, Wellen, Rippen. Sie bekommen keine Schraffur, obwohl
  die Schnittebene durch sie hindurchgeht.
* Quer geschnitten gilt das nicht — eine Welle im Querschnitt wird schraffiert.
* Sehr dünne Teile (Dichtungen, Bleche) dürfen geschwärzt statt schraffiert
  werden.
* **Was man durch ein Spiel hindurch sieht, ist zu zeichnen.** Im
  Durchgangsloch einer Schraubverbindung bleibt die Trennfuge der Bauteile
  sichtbar, bis die Schraube sie verdeckt — die Linie läuft also vom
  Lochrand bis zum Schaft, nicht nur bis zum Lochrand.
* **Die Auflagekante eines Schraubenkopfes läuft durch.** Sie steht senkrecht
  zur Achse und wird von der Seite als Linie gesehen. Ob der Schaft sie
  verdeckt, entscheidet die Tiefe: Innerhalb des Schaftradius liegt der
  vorderste Punkt der Auflagefläche bei √(*r*<sub>e</sub>² − *x*²) — weiter
  vorn als der Schaft. Die Fläche liegt also **vor** dem Schaft. Dasselbe gilt
  für die Mutter.

---

## 4. Gewinde — DIN ISO 6410

| | Außengewinde (Schraube) | Innengewinde (geschnitten) |
| --- | --- | --- |
| Außendurchmesser *d* | breite Vollinie | schmale Vollinie |
| Kerndurchmesser *d*₃ | schmale Vollinie | breite Vollinie |
| Gewindeende | **breite** Vollinie quer zur Achse | ebenso |
| Ansicht von vorn | *d* breiter Vollkreis, *d*₃ schmaler Bogen über **rund drei Viertel** | ebenso, vertauschte Breiten |

Das offene Viertel liegt üblicherweise oben rechts. Ein geschlossener schmaler
Kreis wäre eine Fase, kein Gewinde.

Die Kernlinien enden **an der Kuppenfase**, nicht am Schraubenende.

---

## 5. Sechskant über Ecke

Kopf und Mutter werden so gezeichnet, dass die Blickrichtung auf eine **Ecke**
zeigt:

* Der Umriss ist das **Eckenmaß** *e* = 2·*s*/√3 ≈ 1,155·*s*, nicht die
  Schlüsselweite.
* **Zwei Kanten** trennen die drei sichtbaren Flächen, bei *e*/4.
* Die Fase schneidet die drei Flächen in **drei Bögen**; sie berühren die
  Stirnfläche in der Mitte ihrer Fläche und fallen zu den Kanten um die
  Fasentiefe ab.
* Die Schlüsselweite *s* liegt quer zur Zeichenebene und ist in dieser Ansicht
  **nicht messbar** — sie darf dort nicht bemaßt werden.

Umgesetzt in `sechskantAnsicht()` (Lektion Schraubverbindungen).

---

## 6. Maßeintragung — DIN ISO 129-1 und DIN 406-11

* Maßlinie: schmale Vollinie, begrenzt durch **geschlossene, ausgefüllte
  Pfeile**, rund **3:1** lang zu breit. Keine offenen Striche, keine Punkte.
* Ist die Strecke zu kurz, stehen die Pfeile **außen** und zeigen herein.
* Maßhilfslinien stehen senkrecht auf der Maßlinie und **über sie hinaus**
  (rund das Achtfache der Linienbreite).
* Maßzahl **über** der Maßlinie; bei senkrechten Maßlinien von **rechts
  lesbar** (gedreht).
* Eine Mittellinie darf als Maßhilfslinie verlängert werden, **nie** als
  Maßlinie dienen.
* Umgesetzt in `mass()`, `massV()` und `pfeil()` (`assets/zeichnen.js`) sowie
  `masslinie()` und `masslinieSenkrecht()` (Lektion).

---

## 7. Mittellinien

Schmale Strichpunktlinie, **2 bis 3 mm über** das Bauteil hinaus — aber nie
über den Rand der Zeichenfläche. Runde Teile bekommen ein Mittellinienkreuz.

---

## 8. Bewusste Abweichungen

Jede steht hier, mit Grund. Was nicht hier steht, ist ein Fehler.

| Wo | Abweichung | Warum |
| --- | --- | --- |
| Übung „Vier Schnitte, drei Fehler“, Fall B | zwei gleichlaufende Schraffuren | Das ist der zu findende Fehler. |
| Übung „Vier Schnitte, drei Fehler“, Fall A und C | geschnittene Schraube, vertauschte Gewindelinien | Ebenso: die gesuchten Fehler. |
| Training „Schraffur-Schnellcheck“ | zeigt auch gleichlaufende Schraffuren, geschnittene Schrauben, vertauschte Linienbreiten | Die Aussage, die zu beurteilen ist, steht daneben. Ohne den falschen Fall gäbe es nichts zu entscheiden. |
| Übung 1 „Eine Bezeichnung lesen“, Teil 3 | Scheibe und Mutter durchsichtig | Nur mit Schalter: Die Übung zeigt, wie weit die Schraube reicht — dafür muss man hineinsehen. Der Schalter steht am Bild, und der Hinweis darunter sagt, dass das keine Normdarstellung mehr ist. Ausgeschaltet ist die Darstellung normgerecht. |

| Übung „Eine Schraube im Spiel“ (Querkraft, Teil 4) | Spiel überhöht gezeichnet | 0,5 mm je Seite wären im Bild ein halber Pixel. Die Bildunterschrift sagt es. |

| Welle LF5 (`assets/drehteil.js`) | R1 am Übergang zum Bund als scharfe Kante | Ein Radius von 1 mm wäre bei sechs Bildpunkten je Millimeter ein Pixel. Der Wert steht im Text und in der Lernsituation, wo er gebraucht wird — nämlich als Grenze für den Eckenradius. |

| Lektion „Planung eines Drehprozesses“, Rillenprofil | Höhe stark überhöht | Die Rautiefe beträgt wenige Tausendstel Millimeter. Maßstäblich gezeichnet wäre die Fläche eine gerade Linie, und das Bild zeigte nichts. Die Bildunterschrift sagt es; das Bild ist farbig und damit keine technische Zeichnung. |

Keine Ausnahme sind (obwohl ohne Maße): die sechzehn Fügebilder und die
Draufsicht auf den Gehäusedeckel. Maße sind keine Pflicht; alles andere schon.

**Farbig bleiben, auch in der Normdarstellung:** die Zonenkarte der
Wärmeeinflusszone und die Verzugsskizze im Schweiß-Werkzeug. Für Gefügezonen
gibt es keine Normdarstellung, und ein Verzug, den man sehen kann, ist immer
übertrieben. Schwarzweiß umgefärbt sähen beide aus wie Zeichnungen, ohne
welche sein zu können — nach Abschnitt 1 wäre das die verbotene dritte
Kategorie.

---

## 9. Wie das geprüft wird

`test-zeichnungen.js` lädt jede Seite, zeichnet jedes Bild und prüft:

1. Höchstens zwei Linienbreiten je Zeichnung; kommen beide vor, im
   Verhältnis 2:1 (Erklärebene ausgenommen, Ausnahmen aus Abschnitt 8
   namentlich zugelassen).
2. Maßlinien tragen gefüllte Pfeile — keine offenen Striche.
3. Schraffuren benachbarter Teile laufen gegenläufig.
4. Mittellinien sind Strichpunktlinien.
5. Nichts steht außerhalb des viewBox-Rahmens.
6. Jedes Bild hat ein `aria-label`, das etwas sagt.

Neue Zeichnungen laufen automatisch mit — die Prüfung geht über alle Seiten,
nicht über eine Liste.
