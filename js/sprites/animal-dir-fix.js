// ===== Taiao — 8-dir animal sheet frame-order fix =====
// The one-off PixelLab animal sheets (sheep "as", the "aa" barnyard set, the
// "ab" set) and the wolf/bear/dragon sheet ("wd") were registered assuming
// column i faces DIR8[i] — the convention of the base "md" sheet (camel etc.).
// But each of these sheets was generated ROW-BY-ROW, and every row starts its
// 8-frame rotation on a DIFFERENT frame (and some rotate the opposite way), so
// the animals faced the wrong direction — most visibly the "aa" set, whose
// rows are a full 180° out and so appear to WALK BACKWARDS. (Giants "_v" and
// young "_baby" inherit the bug: render3d composites them as ["mcd_"+base+_d].)
//
// There is NO single per-sheet offset — the correct frame order is per-ANIMAL.
// For each animal we found the frame that truly faces SOUTH (dead-front, i.e.
// face/belly to the camera) = `front`, and whether its rotation runs the same
// way as "md" (`rev:false`, frame = front+i) or mirrored (`rev:true`, frame =
// front-i). Verified frame-by-frame against the camel reference across all 8
// directions (S front, N back, E right-profile, W left-profile).
//
// Loads AFTER every animal sheet registers (index.html: after wild-dir-data.js)
// and before the atlas is built at REN.init, so it can override wd too.
"use strict";
(function () {
  if (typeof SPR === "undefined") return;
  var DIR8 = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"];
  // sheet = which packed sheet the animal lives on (guards against name reuse);
  // front = frame facing SOUTH; rev = rotation runs opposite to "md" (mirrored).
  //   frame(DIR8[i]) = rev ? (front - i) : (front + i), mod 8.
  var ANIMALS = [
    // "as" — sheep
    { sheet: "as", name: "sheep",   front: 1, rev: false },
    // "aa" — barnyard set (each row independently rotated)
    { sheet: "aa", name: "quail",   front: 6, rev: false },
    { sheet: "aa", name: "duck",    front: 1, rev: false },
    { sheet: "aa", name: "goat",    front: 2, rev: false },
    { sheet: "aa", name: "rabbit",  front: 2, rev: false },
    { sheet: "aa", name: "pig",     front: 1, rev: false },
    { sheet: "aa", name: "griffon", front: 2, rev: false },
    // "ab" — second set
    { sheet: "ab", name: "goose",    front: 2, rev: false },
    { sheet: "ab", name: "turkey",   front: 3, rev: false },
    { sheet: "ab", name: "buffalo",  front: 1, rev: false },
    { sheet: "ab", name: "alpaca",   front: 2, rev: false },
    { sheet: "ab", name: "aurochs",  front: 1, rev: false },
    { sheet: "ab", name: "wyrmling", front: 1, rev: false },
    // "wd" — wolf/bear/dragon (registered flat as frame i = DIR8[i]; wolf is a
    //  frame off, bear/dragon start on their own front frame)
    { sheet: "wd", name: "wolf",   front: 7, rev: false },
    { sheet: "wd", name: "bear",   front: 1, rev: false },
    { sheet: "wd", name: "dragon", front: 1, rev: false },
  ];
  for (var a = 0; a < ANIMALS.length; a++) {
    var A = ANIMALS[a];
    var base = SPR["mcd_" + A.name + "_south"];
    if (!base || base[0] !== A.sheet) continue;      // not registered / on this sheet
    var sy = (base[3] && base[3].sy) || 0;           // this animal's row (unchanged)
    for (var i = 0; i < 8; i++) {
      var fr = ((A.rev ? (A.front - i) : (A.front + i)) % 8 + 8) % 8;
      SPR["mcd_" + A.name + "_" + DIR8[i]] = [A.sheet, 0, 0, { sx: fr * 64, sy: sy, sw: 64, sh: 64 }];
    }
  }
})();
