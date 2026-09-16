// ===== Taiao — crop harvest-item icons = "Ready to Harvest" art =====
// Sets each of the 160 crops' harvested-item inventory icon to the same real
// "Ready to Harvest" (stage 3) art its world growth-stage sprite uses.
// agriculture.js tries to set this directly at CROPS-build time, but that's
// too early — item-icons-data.js (an older, static, pre-baked placeholder-art
// pipeline covering ~1082 ids from a previous session) loads AFTER it and
// unconditionally clobbers ITEMS[id].icon for any id in its hardcoded list,
// which includes some of the generated "<skill>_crop_<i>" fallback ids (veg/
// fruit crops that had no matching existing item name). Loaded here, after
// item-icons-data.js AND all 5 crop-<skill>-data.js sheets, so this always
// wins the race regardless of what ran before it.
"use strict";
(function () {
  const skills = ["cerealiculture", "olericulture", "pomiculture", "herbiculture", "fibriculture"];
  for (const sl of skills) {
    for (let i = 0; i < 32; i++) {
      const c = CROPS["farm_" + sl + "_" + i];
      if (c && c.sprStages && ITEMS[c.item]) ITEMS[c.item].icon = c.sprStages[3];
    }
  }
})();
