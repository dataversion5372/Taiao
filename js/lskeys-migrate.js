// ===== Taiao — one-time localStorage key migration (emberfall_* -> taiao_*) =====
// The game shipped under the working title "Isle of Emberfall" and every
// persisted key still carried that name. For the public rename this copies
// each old key forward to its taiao_* twin — once, non-destructively (the
// emberfall_* original is left in place, never deleted, so a bug here can
// never strand anyone's save) — before any other module touches
// localStorage. MUST stay the first game file in tools/bundle.list; every
// reader further down (input.js reads its key at parse time, not lazily)
// depends on this having already run.
"use strict";
(function () {
  const LS_KEY_MIGRATIONS = [
    ["emberfall_save_v2", "taiao_save_v2"],
    ["emberfall_save_cheat_v1", "taiao_save_cheat_v1"],
    ["emberfall_save_v1", "taiao_save_v1"],
    ["emberfall_cheat_overrides", "taiao_cheat_overrides"],
    ["emberfall_pulse_v1", "taiao_pulse_v1"],
    ["emberfall_pulse_cheat_v1", "taiao_pulse_cheat_v1"],
    ["emberfall_wm_overlays", "taiao_wm_overlays"],
    ["emberfall_objedit_v1", "taiao_objedit_v1"],
    ["emberfall_interactmode", "taiao_interactmode"],
    ["emberfallGameVol", "taiaoGameVol"],
    ["emberfallNatureVol", "taiaoNatureVol"],
    ["emberfallSoundFlags", "taiaoSoundFlags"],
  ];
  try {
    for (const [oldKey, newKey] of LS_KEY_MIGRATIONS) {
      if (localStorage.getItem(newKey) != null) continue; // already migrated (or a fresh taiao save)
      const v = localStorage.getItem(oldKey);
      if (v != null) localStorage.setItem(newKey, v);
    }
  } catch (e) { /* private browsing / storage disabled — nothing to migrate */ }
})();
