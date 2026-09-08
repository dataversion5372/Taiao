// ===== Isle of Emberfall — align real boat art to Shipwrighting vessels =====
// boat-icons-data.js ("bi" sheet) carries 24 hand-drawn boat icons, but they are
// keyed by the world-OBJECT id (boat_coracle, ship_smack, raft_logs, …), which
// do NOT match the Shipwrighting vessel ITEM ids (coracle, fishing_smack,
// log_raft, …) — so only "skiff" coincidentally lined up and the rest fell back
// to generic ic_/ic2_ silhouettes. This maps each vessel item to its object's
// "bi" icon (the same alias->objKey table furniture.js uses for place/ride) and
// repoints it. Loads AFTER item-icons-data.js / craft-icons-data.js so it wins.
// Vessels with no dedicated boat art (canoe, rowboat, sailboat, ship) keep their
// existing icons.
"use strict";
(function () {
  if (typeof SPR === "undefined" || typeof ITEMS === "undefined") return;
  var MAP = {
    raft: "raft_planks", log_raft: "raft_logs", coracle: "boat_coracle", punt: "raft_planks",
    skiff: "skiff", dinghy: "boat_dinghy", dory: "boat_dory", catboat: "boat_catboat",
    fishing_smack: "ship_smack", sloop: "ship_cutter", barge: "boat_barge", cutter: "ship_cutter",
    ketch: "ship_schooner", cog: "ship_carrack", longship: "ship_longship", junk: "ship_junk",
    caravel: "ship_caravel", schooner: "ship_schooner", carrack: "ship_carrack", brig: "ship_brig",
    brigantine: "ship_brigantine", galley: "ship_galley", barque: "ship_barque", galleon: "ship_galleon",
    frigate: "ship_frigate", clipper: "ship_clipper", dhow: "ship_dhow", man_o_war: "ship_manofwar",
  };
  for (var vessel in MAP) {
    var spr = "i_" + MAP[vessel];
    if (ITEMS[vessel] && SPR[spr]) ITEMS[vessel].icon = spr;
  }
})();
