/* Bauteile in 3D - Darstellen, Zusammensetzen, Anklicken.
 * ============================================================================
 *
 * Wozu das gut ist
 * ----------------
 * Manches lässt sich in der Ansicht nicht zeigen. Wo eine Naht wirklich
 * liegt, ob eine Rippe vor oder hinter dem Blech sitzt, in welcher
 * Reihenfolge eine Baugruppe zusammengeht - dafür braucht es ein Modell, das
 * man drehen kann. Und wo geprüft werden soll, ob jemand die richtige Stelle
 * gefunden hat, braucht es eine, die auf einen Klick antwortet.
 *
 * Der Baustein macht drei Dinge und sonst nichts:
 *
 *   1. Er baut aus einer Liste von Maßen einen Körper. Die Liste steht in der
 *      Seite, nicht hier - dieser Baustein kennt keine Lagerböcke.
 *   2. Er setzt die Teile auf Wunsch der Reihe nach zusammen: Jedes Teil
 *      fliegt aus seiner Ruhelage an seinen Platz. Das ist die Montage.
 *   3. Er nimmt Klicks entgegen. Wer eine Marke trifft, löst `onWahl(id)`
 *      aus. Was ein Treffer bedeutet, entscheidet die Seite - hier wird
 *      nichts bewertet und nichts gezählt.
 *
 * Was er NICHT macht: rechnen, bewerten, speichern, nachladen. Die Auswertung
 * gehört in die Übung, damit derselbe Körper in einer Lernsituation, einer
 * Übung und einem Training mit verschiedenen Fragen verwendet werden kann.
 *
 * Voraussetzung
 * -------------
 * vendor/three.min.js und vendor/OrbitControls.js, vor diesem Baustein
 * geladen. Beide liegen im Repo - nichts wird nachgeladen, nichts verrät,
 * wer die Seite aufruft.
 *
 * Ohne WebGL
 * ----------
 * Nicht jedes Gerät kann WebGL, und im Ausdruck gibt es keine Leinwand.
 * Deshalb gibt `Bauteil3D.moeglich()` Auskunft, und `aufbauen()` gibt null
 * zurück, wenn es nicht geht. Die Seite zeigt dann, was sie ohne 3D zeigen
 * würde - die Zeichnung. Eine Seite, die ohne diesen Baustein nichts mehr
 * kann, ist falsch gebaut.
 *
 * Aufbau einer Szene
 * ------------------
 *     var szene = Bauteil3D.aufbauen(document.getElementById("buehne"), {
 *       teile: [
 *         {id:"platte", name:"Grundplatte", form:"quader",
 *          masse:{x:180, y:12, z:90}, lage:{x:0, y:6, z:0},
 *          von:{y:-120}},                     // Ruhelage für die Montage
 *         …
 *       ],
 *       marken: [
 *         {id:"A", name:"Naht am Stehblech", lage:{x:0, y:12, z:5}, r:9}
 *       ],
 *       onWahl: function(id){ … },
 *       blick: {abstand:420, hoch:0.9, dreh:0.7}
 *     });
 *
 * Und danach:
 *
 *     szene.montage()        Teile der Reihe nach einsetzen
 *     szene.zeigenAlles()    alles sofort an seinem Platz
 *     szene.zerlegen()       alles in die Ruhelage
 *     szene.schritt(n)       bis Teil n zusammengesetzt
 *     szene.marken(true)     Marken sichtbar und anklickbar
 *     szene.markeStand(id, "richtig"|"falsch"|"offen")
 *     szene.hervorheben(id)  ein Teil herausheben (null: keines)
 *     szene.setzen({…})      Maße ändern, betroffene Teile neu bauen
 *     szene.aus()            aufräumen
 *
 * Formen
 * ------
 *   quader   masse {x, y, z}, wahlweise loch {d, x, y} - Durchbruch laengs z
 *   rohr     masse {d, di, l}, achse "x"|"y"|"z"
 *   keil     masse {x, y, z} - rechtwinkliges Dreieck in der xy-Ebene,
 *            über z ausgezogen; die Kathete liegt auf +x und +y
 *   winkel   masse {x, y, z, s} - L-Profil, Schenkeldicke s
 *
 * Farben und der dunkle Modus
 * ---------------------------
 * Die Szene malt sich selbst hell oder dunkel, je nach
 * data-thema-effektiv am html-Tag, und hört auf Änderungen. Der
 * Umkehrfilter aus thema-werkzeug.css greift bei einer Leinwand nicht -
 * WebGL malt in seinen eigenen Farbraum.
 */
(function (welt) {
  "use strict";

  /* ---------------------------------------------------------------------
     Kann das Gerät überhaupt WebGL?
     --------------------------------------------------------------------- */
  var kannWebGL = null;
  function moeglich() {
    if (kannWebGL !== null) return kannWebGL;
    if (typeof welt.THREE === "undefined") return (kannWebGL = false);
    try {
      var c = document.createElement("canvas");
      kannWebGL = !!(c.getContext("webgl2") || c.getContext("webgl")
        || c.getContext("experimental-webgl"));
    } catch (e) {
      kannWebGL = false;
    }
    return kannWebGL;
  }

  /* ---------------------------------------------------------------------
     Farbwelt. Zwei Sätze, hell und dunkel - beide mit demselben Aufbau,
     damit das Umschalten nur ein Austausch ist.
     --------------------------------------------------------------------- */
  var PALETTE = {
    hell: {
      grund:  0xf1f5f9,
      teil:   0xb8c2cc,
      kante:  0x334155,
      hervor: 0x1d4ed8,
      marke:  0xe67e22,
      richtig:0x16a34a,
      falsch: 0xdc2626,
      boden:  0xe2e8f0
    },
    dunkel: {
      grund:  0x141a21,
      teil:   0x64748b,
      kante:  0xcbd5e1,
      hervor: 0x60a5fa,
      marke:  0xf59e0b,
      richtig:0x4ade80,
      falsch: 0xf87171,
      boden:  0x1f2933
    }
  };

  function themaJetzt() {
    var w = document.documentElement.getAttribute("data-thema-effektiv");
    if (w === "dunkel" || w === "hell") return w;
    return (welt.matchMedia
      && welt.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dunkel" : "hell";
  }

  /* ---------------------------------------------------------------------
     Formen. Jede liefert eine Geometrie, deren Ursprung in der Mitte des
     umschließenden Quaders liegt - so ist "lage" immer die Mitte, egal
     welche Form. Das erspart der Seite das Umrechnen.
     --------------------------------------------------------------------- */
  var FORMEN = {
    quader: function (m) {
      if (!m.loch) return new THREE.BoxGeometry(m.x, m.y, m.z);
      /* Ein Blech mit Durchbruch: Rechteck in xy, rundes Loch darin, ueber z
         ausgezogen. Die Lage des Lochs zaehlt von der Blechmitte aus. */
      var form = new THREE.Shape();
      form.moveTo(-m.x / 2, -m.y / 2);
      form.lineTo(m.x / 2, -m.y / 2);
      form.lineTo(m.x / 2, m.y / 2);
      form.lineTo(-m.x / 2, m.y / 2);
      form.closePath();
      var loch = new THREE.Path();
      loch.absarc(m.loch.x || 0, m.loch.y || 0, m.loch.d / 2, 0,
        Math.PI * 2, true);
      form.holes.push(loch);
      var g = new THREE.ExtrudeGeometry(form,
        { depth: m.z, bevelEnabled: false, curveSegments: 48 });
      g.translate(0, 0, -m.z / 2);
      return g;
    },

    rohr: function (m, achse) {
      var g = new THREE.CylinderGeometry(m.d / 2, m.d / 2, m.l, 48, 1, false);
      if (m.di > 0) {
        /* Ein Rohr ist ein Zylinder mit Loch. Ohne CSG wird es aus vier
           Ringflächen gebaut: außen, innen, und die beiden Stirnringe.
           Das reicht, weil nur die Hülle zu sehen ist. */
        g = rohrGeometrie(m.d / 2, m.di / 2, m.l);
      }
      if (achse === "x") g.rotateZ(Math.PI / 2);
      if (achse === "z") g.rotateX(Math.PI / 2);
      return g;
    },

    keil: function (m) {
      /* Rechtwinkliges Dreieck in xy, über z ausgezogen. Der rechte Winkel
         sitzt unten links; die Hypotenuse läuft von oben links nach unten
         rechts - so steht die Rippe am Blech und liegt auf der Platte. */
      var form = new THREE.Shape();
      form.moveTo(0, 0);
      form.lineTo(m.x, 0);
      form.lineTo(0, m.y);
      form.closePath();
      var g = new THREE.ExtrudeGeometry(form,
        { depth: m.z, bevelEnabled: false });
      g.translate(-m.x / 2, -m.y / 2, -m.z / 2);
      return g;
    },

    winkel: function (m) {
      /* L-Profil: ein liegender und ein stehender Schenkel, Dicke s. */
      var form = new THREE.Shape();
      form.moveTo(0, 0);
      form.lineTo(m.x, 0);
      form.lineTo(m.x, m.s);
      form.lineTo(m.s, m.s);
      form.lineTo(m.s, m.y);
      form.lineTo(0, m.y);
      form.closePath();
      var g = new THREE.ExtrudeGeometry(form,
        { depth: m.z, bevelEnabled: false });
      g.translate(-m.x / 2, -m.y / 2, -m.z / 2);
      return g;
    }
  };

  /* Ein Rohr als geschlossene Hülle: Außenmantel, Innenmantel, zwei
     Stirnringe. LatheGeometry dreht das Profil um die y-Achse. */
  function rohrGeometrie(ra, ri, l) {
    var punkte = [
      new THREE.Vector2(ri, -l / 2),
      new THREE.Vector2(ra, -l / 2),
      new THREE.Vector2(ra, l / 2),
      new THREE.Vector2(ri, l / 2),
      new THREE.Vector2(ri, -l / 2)
    ];
    return new THREE.LatheGeometry(punkte, 48);
  }

  function geometrie(teil) {
    var bauen = FORMEN[teil.form];
    if (!bauen) throw new Error('Bauteil3D: unbekannte Form "' + teil.form + '"');
    return bauen(teil.masse, teil.achse);
  }

  /* ---------------------------------------------------------------------
     Die Szene
     --------------------------------------------------------------------- */
  function aufbauen(ziel, o) {
    if (!ziel || !moeglich()) return null;
    o = o || {};

    var palette = PALETTE[themaJetzt()];
    var szene = new THREE.Scene();
    var renderer, kamera, steuerung, boden;
    var teile = {};          /* id -> {gruppe, netz, kanten, teil} */
    var markenNetze = {};    /* id -> netz */
    var reihenfolge = [];    /* ids in Montagereihenfolge */
    var laeuft = false, animation = null, uhr = null;
    var markenAn = false, hervorId = null;
    var abgeraeumt = false;

    /* --- Leinwand ---------------------------------------------------- */
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(welt.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label",
      o.beschreibung || "Dreidimensionale Ansicht der Baugruppe");
    ziel.appendChild(renderer.domElement);

    /* --- Kamera und Steuerung ---------------------------------------- */
    var blick = o.blick || {};
    var abstand = blick.abstand || 400;
    kamera = new THREE.PerspectiveCamera(38, 1, 1, abstand * 20);
    kamera.position.set(
      abstand * Math.cos(blick.hoch === undefined ? 0.75 : blick.hoch)
        * Math.sin(blick.dreh === undefined ? 0.85 : blick.dreh),
      abstand * Math.sin(blick.hoch === undefined ? 0.75 : blick.hoch),
      abstand * Math.cos(blick.hoch === undefined ? 0.75 : blick.hoch)
        * Math.cos(blick.dreh === undefined ? 0.85 : blick.dreh));

    steuerung = new THREE.OrbitControls(kamera, renderer.domElement);
    steuerung.enableDamping = true;
    steuerung.dampingFactor = 0.08;
    steuerung.enablePan = false;
    steuerung.minDistance = abstand * 0.35;
    steuerung.maxDistance = abstand * 2.6;
    /* Unter den Boden schauen bringt nichts und verwirrt nur. */
    steuerung.maxPolarAngle = Math.PI * 0.49;
    if (o.mitte) steuerung.target.set(o.mitte.x || 0, o.mitte.y || 0, o.mitte.z || 0);
    steuerung.update();

    /* --- Licht -------------------------------------------------------- */
    szene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 0.85));
    var sonne = new THREE.DirectionalLight(0xffffff, 0.75);
    sonne.position.set(abstand, abstand * 1.4, abstand * 0.8);
    szene.add(sonne);
    var gegen = new THREE.DirectionalLight(0xffffff, 0.28);
    gegen.position.set(-abstand, abstand * 0.4, -abstand * 0.6);
    szene.add(gegen);

    /* --- Boden: gibt der Baugruppe einen Stand ------------------------ */
    if (o.boden !== false) {
      var gr = new THREE.PlaneGeometry(abstand * 3, abstand * 3);
      gr.rotateX(-Math.PI / 2);
      boden = new THREE.Mesh(gr, new THREE.MeshBasicMaterial({
        color: palette.boden, transparent: true, opacity: 0.55
      }));
      boden.position.y = o.bodenY === undefined ? 0 : o.bodenY;
      szene.add(boden);
    }

    /* --- Teile bauen --------------------------------------------------- */
    function teilBauen(teil) {
      var gruppe = new THREE.Group();
      var geo = geometrie(teil);

      var netz = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: teil.farbe === undefined ? palette.teil : teil.farbe,
        roughness: 0.62, metalness: 0.28,
        transparent: true, opacity: 1
      }));
      gruppe.add(netz);

      /* Die Kanten tragen die Aussage - ohne sie zerfließt jede
         Werkstattgeometrie zu einem grauen Klumpen. */
      var kanten = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo, 18),
        new THREE.LineBasicMaterial({
          color: palette.kante, transparent: true, opacity: 0.9
        }));
      gruppe.add(kanten);

      gruppe.position.set(teil.lage.x || 0, teil.lage.y || 0, teil.lage.z || 0);
      if (teil.dreh) {
        gruppe.rotation.set(teil.dreh.x || 0, teil.dreh.y || 0, teil.dreh.z || 0);
      }
      gruppe.userData.ziel = gruppe.position.clone();
      gruppe.userData.von = new THREE.Vector3(
        (teil.lage.x || 0) + ((teil.von && teil.von.x) || 0),
        (teil.lage.y || 0) + ((teil.von && teil.von.y) || 0),
        (teil.lage.z || 0) + ((teil.von && teil.von.z) || 0));
      szene.add(gruppe);
      return { gruppe: gruppe, netz: netz, kanten: kanten, teil: teil };
    }

    (o.teile || []).forEach(function (teil) {
      teile[teil.id] = teilBauen(teil);
      reihenfolge.push(teil.id);
    });

    /* --- Marken: kleine Kugeln an den Stellen, die zu finden sind ----- */
    var markenGruppe = new THREE.Group();
    markenGruppe.visible = false;
    /* Die Marken werden zuletzt gezeichnet und ohne Tiefenpruefung: Eine
       Stelle, die hinter der Rippe verschwindet, koennte niemand anklicken -
       und wer sie sucht, statt sie zu erkennen, uebt das Falsche. Alle
       Stellen sind sichtbar; die Aufgabe ist, die richtige zu waehlen. */
    markenGruppe.renderOrder = 10;
    szene.add(markenGruppe);

    (o.marken || []).forEach(function (m) {
      var netz = new THREE.Mesh(
        new THREE.SphereGeometry(m.r || 8, 20, 14),
        new THREE.MeshStandardMaterial({
          color: palette.marke, roughness: 0.4, metalness: 0.1,
          transparent: true, opacity: 0.92,
          depthTest: false, depthWrite: false
        }));
      netz.renderOrder = 11;
      netz.position.set(m.lage.x || 0, m.lage.y || 0, m.lage.z || 0);
      netz.userData.marke = m;
      netz.userData.stand = "offen";
      markenGruppe.add(netz);
      markenNetze[m.id] = netz;
    });

    /* --- Klicks -------------------------------------------------------- */
    var strahl = new THREE.Raycaster();
    var zeiger = new THREE.Vector2();
    var runter = null;

    function zeigerSetzen(ev) {
      var r = renderer.domElement.getBoundingClientRect();
      zeiger.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      zeiger.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    }

    function getroffen(ev) {
      zeigerSetzen(ev);
      strahl.setFromCamera(zeiger, kamera);
      var treffer = strahl.intersectObjects(markenGruppe.children, false);
      return treffer.length ? treffer[0].object.userData.marke : null;
    }

    function aufRunter(ev) {
      runter = { x: ev.clientX, y: ev.clientY };
    }

    function aufHoch(ev) {
      if (!markenAn || !runter) return;
      /* Wer die Ansicht dreht, wählt nicht aus. Ein Klick ist ein Klick,
         wenn der Zeiger dabei stehen geblieben ist. */
      var weit = Math.hypot(ev.clientX - runter.x, ev.clientY - runter.y);
      runter = null;
      if (weit > 6) return;
      var m = getroffen(ev);
      if (m && typeof o.onWahl === "function") o.onWahl(m.id, m);
    }

    function aufBewegung(ev) {
      if (!markenAn) return;
      renderer.domElement.style.cursor = getroffen(ev) ? "pointer" : "grab";
    }

    renderer.domElement.addEventListener("pointerdown", aufRunter);
    renderer.domElement.addEventListener("pointerup", aufHoch);
    renderer.domElement.addEventListener("pointermove", aufBewegung);
    renderer.domElement.style.cursor = "grab";

    /* --- Größe --------------------------------------------------------- */
    function messen() {
      var b = ziel.clientWidth || 640;
      var h = ziel.clientHeight || Math.round(b * 0.62);
      renderer.setSize(b, h, false);
      kamera.aspect = b / Math.max(1, h);
      kamera.updateProjectionMatrix();
    }
    messen();

    var beobachter = null;
    if (welt.ResizeObserver) {
      beobachter = new welt.ResizeObserver(messen);
      beobachter.observe(ziel);
    } else {
      welt.addEventListener("resize", messen);
    }

    /* --- Thema --------------------------------------------------------- */
    function faerben() {
      palette = PALETTE[themaJetzt()];
      szene.background = new THREE.Color(palette.grund);
      Object.keys(teile).forEach(function (id) {
        var t = teile[id];
        if (t.teil.farbe === undefined) {
          t.netz.material.color.setHex(
            id === hervorId ? palette.hervor : palette.teil);
        }
        t.kanten.material.color.setHex(palette.kante);
      });
      Object.keys(markenNetze).forEach(function (id) {
        var n = markenNetze[id];
        n.material.color.setHex(palette[n.userData.stand] || palette.marke);
      });
      if (boden) boden.material.color.setHex(palette.boden);
    }
    faerben();

    var themaWache = new MutationObserver(faerben);
    themaWache.observe(document.documentElement,
      { attributes: true, attributeFilter: ["data-thema-effektiv"] });

    /* --- Bild malen ---------------------------------------------------- */
    function malen() {
      if (abgeraeumt) return;
      animation = welt.requestAnimationFrame(malen);
      steuerung.update();
      renderer.render(szene, kamera);
    }
    malen();

    /* ---------------------------------------------------------------------
       Montage. Jedes Teil braucht `dauer` Millisekunden; danach das
       nächste. Wer dazwischen eingreift, bricht sie ab - deshalb prüft
       jeder Schritt, ob er noch der aktuelle ist.
       --------------------------------------------------------------------- */
    var lauf = 0;          /* Zählmarke: macht abgebrochene Läufe erkennbar */

    function setzeFortschritt(id, t) {
      var g = teile[id].gruppe;
      var d = g.userData;
      /* Weich anfahren und weich ankommen. */
      var s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      g.position.lerpVectors(d.von, d.ziel, s);
      teile[id].netz.material.opacity = 0.25 + 0.75 * s;
      teile[id].kanten.material.opacity = 0.2 + 0.7 * s;
    }

    function zerlegen() {
      lauf++;
      laeuft = false;
      reihenfolge.forEach(function (id) { setzeFortschritt(id, 0); });
      if (typeof o.onSchritt === "function") o.onSchritt(0, reihenfolge.length);
      return api;
    }

    function zeigenAlles() {
      lauf++;
      laeuft = false;
      reihenfolge.forEach(function (id) { setzeFortschritt(id, 1); });
      if (typeof o.onSchritt === "function") {
        o.onSchritt(reihenfolge.length, reihenfolge.length);
      }
      return api;
    }

    function schritt(n) {
      lauf++;
      laeuft = false;
      reihenfolge.forEach(function (id, i) { setzeFortschritt(id, i < n ? 1 : 0); });
      if (typeof o.onSchritt === "function") o.onSchritt(n, reihenfolge.length);
      return api;
    }

    function montage(abNr) {
      var meiner = ++lauf;
      laeuft = true;
      var dauer = o.dauer || 850, pause = o.pause || 220;
      var i = abNr || 0;
      reihenfolge.forEach(function (id, k) { setzeFortschritt(id, k < i ? 1 : 0); });

      function naechstes() {
        if (meiner !== lauf) return;
        if (i >= reihenfolge.length) {
          laeuft = false;
          if (typeof o.onFertig === "function") o.onFertig();
          return;
        }
        var id = reihenfolge[i];
        var start = null;
        if (typeof o.onSchritt === "function") {
          o.onSchritt(i + 1, reihenfolge.length, teile[id].teil);
        }

        function takt(jetzt) {
          if (meiner !== lauf) return;
          if (start === null) start = jetzt;
          var t = Math.min(1, (jetzt - start) / dauer);
          setzeFortschritt(id, t);
          if (t < 1) { welt.requestAnimationFrame(takt); return; }
          i++;
          uhr = welt.setTimeout(naechstes, pause);
        }
        welt.requestAnimationFrame(takt);
      }
      naechstes();
      return api;
    }

    /* ---------------------------------------------------------------------
       Die Schnittstelle nach außen
       --------------------------------------------------------------------- */
    var api = {
      montage: montage,
      zeigenAlles: zeigenAlles,
      zerlegen: zerlegen,
      schritt: schritt,
      laeuft: function () { return laeuft; },
      teileZahl: function () { return reihenfolge.length; },

      /* Marken an oder aus. Aus heißt: unsichtbar und nicht anklickbar. */
      marken: function (an) {
        markenAn = !!an;
        markenGruppe.visible = !!an;
        renderer.domElement.style.cursor = "grab";
        return api;
      },

      /* "offen", "richtig" oder "falsch" - mehr Zustände braucht es nicht. */
      markeStand: function (id, stand) {
        var n = markenNetze[id];
        if (!n) return api;
        n.userData.stand = stand;
        n.material.color.setHex(palette[stand] || palette.marke);
        n.material.opacity = stand === "offen" ? 0.92 : 1;
        return api;
      },

      markeZeigen: function (id, an) {
        var n = markenNetze[id];
        if (n) n.visible = an !== false;
        return api;
      },

      /* Ein Teil heraushebén - etwa, während darüber gesprochen wird. */
      hervorheben: function (id) {
        hervorId = id || null;
        Object.keys(teile).forEach(function (k) {
          var t = teile[k];
          if (t.teil.farbe !== undefined) return;
          t.netz.material.color.setHex(
            k === hervorId ? palette.hervor : palette.teil);
        });
        return api;
      },

      /* Maße ändern. Übergeben wird {teilId: {masse:{…}, lage:{…}}}; nur
         die genannten Teile werden neu gebaut. */
      setzen: function (aenderungen) {
        Object.keys(aenderungen || {}).forEach(function (id) {
          var alt = teile[id];
          if (!alt) return;
          var neu = aenderungen[id];
          var teil = alt.teil;
          if (neu.masse) {
            Object.keys(neu.masse).forEach(function (k) {
              teil.masse[k] = neu.masse[k];
            });
          }
          if (neu.lage) {
            Object.keys(neu.lage).forEach(function (k) {
              teil.lage[k] = neu.lage[k];
            });
          }
          var warSichtbar = alt.netz.material.opacity;
          szene.remove(alt.gruppe);
          alt.netz.geometry.dispose();
          alt.kanten.geometry.dispose();
          alt.netz.material.dispose();
          alt.kanten.material.dispose();
          teile[id] = teilBauen(teil);
          teile[id].netz.material.opacity = warSichtbar;
          teile[id].kanten.material.opacity = warSichtbar;
        });
        faerben();
        return api;
      },

      /* Eine Marke verschieben - nötig, wenn sich die Maße geändert haben. */
      markeSetzen: function (id, lage) {
        var n = markenNetze[id];
        if (n) n.position.set(lage.x || 0, lage.y || 0, lage.z || 0);
        return api;
      },

      blickZuruecksetzen: function () {
        steuerung.reset();
        return api;
      },

      /* Der Baustein räumt hinter sich auf: WebGL-Kontexte sind eine
         begrenzte Ressource, und eine Seite mit mehreren Szenen würde sonst
         nach ein paar Wechseln nichts mehr zeichnen. */
      aus: function () {
        if (abgeraeumt) return;
        abgeraeumt = true;
        lauf++;
        if (animation) welt.cancelAnimationFrame(animation);
        if (uhr) welt.clearTimeout(uhr);
        themaWache.disconnect();
        if (beobachter) beobachter.disconnect();
        else welt.removeEventListener("resize", messen);
        renderer.domElement.removeEventListener("pointerdown", aufRunter);
        renderer.domElement.removeEventListener("pointerup", aufHoch);
        renderer.domElement.removeEventListener("pointermove", aufBewegung);
        steuerung.dispose();
        szene.traverse(function (x) {
          if (x.geometry) x.geometry.dispose();
          if (x.material) {
            (Array.isArray(x.material) ? x.material : [x.material])
              .forEach(function (m) { m.dispose(); });
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };

    zerlegen();
    return api;
  }

  welt.Bauteil3D = {
    moeglich: moeglich,
    aufbauen: aufbauen,
    FORMEN: FORMEN,
    PALETTE: PALETTE
  };
}(window));
