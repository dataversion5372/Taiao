// ===== Taiao — per-biome atmosphere (the "beauty layer") =====
// One entry per classify() biome, tuned against the concept vistas in the
// design folder: each biome gets a COLOUR GRADE (tint multiplier + saturation
// over every world material, composing with the golden-hour/night grade), an
// AIR colour (the fog/sky pulled toward the biome's haze), and LIFE — a
// particle signature (petals, ash, embers, spores, fireflies, butterflies,
// snow-dust, sparkle, dust, seeds, sun motes), extra ground mist, and a
// daytime god-ray floor. render3d.js samples the player's biome, eases these
// values over a few seconds at biome borders, and drives its tint uniforms,
// fog, mist pool, god rays and the overlay particle pass from them.
//
//   tint  [r,g,b] material multiplier (subtle: 0.8–1.15 — legibility first)
//   sat   saturation multiplier (swamp/ash desaturate, meadow/jungle pop)
//   fog   [r,g,b] 0-255 haze colour   fogW  how hard the air pulls toward it
//   part / dens   primary particle signature + density 0..1
//   part2 / dens2 optional second signature (ash + embers, petals + butterflies)
//   mist  extra ground-mist drive 0..1 (swamp breathes all day)
//   rays  daytime god-ray floor 0..1 (jungle shafts at noon, not just dusk)
"use strict";

const BIOME_ATMOS = {
  "Deep Sea":       { tint: [0.92, 0.97, 1.08], sat: 1.05, fog: [70, 110, 170], fogW: 0.25 },
  "Sea":            { tint: [0.98, 1.00, 1.06], sat: 1.10, fog: [120, 190, 220], fogW: 0.18 },
  "Coral Reef":     { tint: [1.00, 1.02, 1.05], sat: 1.15, fog: [130, 200, 215], fogW: 0.18 },
  "Beach":          { tint: [1.06, 1.02, 0.96], sat: 1.10, fog: [250, 232, 200], fogW: 0.12 },
  "Plains":         { tint: [1.02, 1.03, 0.98], sat: 1.08, fog: [205, 218, 235], fogW: 0.08, part: "seeds", dens: 0.22 },
  "Forest":         { tint: [0.97, 1.02, 0.94], sat: 1.06, fog: [190, 205, 170], fogW: 0.15, part: "motes", dens: 0.35, rays: 0.30, mist: 0.10 },
  "Swamp":          { tint: [0.88, 0.95, 0.82], sat: 0.78, fog: [130, 140, 105], fogW: 0.42, part: "fireflies", dens: 0.30, mist: 0.55 },
  "Desert":         { tint: [1.12, 1.03, 0.88], sat: 1.05, fog: [240, 212, 160], fogW: 0.22, part: "dust", dens: 0.20 },
  "Mountains":      { tint: [0.98, 0.99, 1.03], sat: 0.97, fog: [175, 185, 205], fogW: 0.15 },
  "Snowy Peaks":    { tint: [1.04, 1.00, 1.05], sat: 1.00, fog: [232, 222, 235], fogW: 0.20, part: "snowdust", dens: 0.25 },
  "Frozen Wastes":  { tint: [0.94, 0.97, 1.05], sat: 0.80, fog: [196, 205, 220], fogW: 0.35, part: "snowdust", dens: 0.55 },
  "Farmland":       { tint: [1.06, 1.02, 0.92], sat: 1.08, fog: [235, 220, 180], fogW: 0.10, part: "motes", dens: 0.20 },
  "Badlands":       { tint: [1.10, 0.98, 0.88], sat: 1.02, fog: [225, 185, 140], fogW: 0.30, part: "dust", dens: 0.40 },
  "Jungle":         { tint: [0.94, 1.04, 0.94], sat: 1.12, fog: [175, 200, 160], fogW: 0.25, part: "motes", dens: 0.40, rays: 0.70, mist: 0.30 },
  "Meadow":         { tint: [1.04, 1.03, 0.98], sat: 1.15, fog: [218, 226, 205], fogW: 0.08, part: "butterflies", dens: 0.65 },
  "Savanna":        { tint: [1.10, 1.02, 0.86], sat: 1.05, fog: [235, 210, 160], fogW: 0.18, part: "seeds", dens: 0.30 },
  "Rockyland":      { tint: [0.99, 0.99, 0.99], sat: 0.92, fog: [185, 190, 195], fogW: 0.15 },
  "Labyrinth":      { tint: [0.95, 0.99, 0.95], sat: 0.95, fog: [170, 185, 170], fogW: 0.20 },
  "Volcano":        { tint: [1.10, 0.92, 0.84], sat: 1.00, fog: [150, 90, 70],  fogW: 0.45, part: "ash", dens: 0.25, part2: "embers", dens2: 0.50, mist: 0.20 },
  "Wilderness":     { tint: [0.93, 1.00, 0.90], sat: 0.95, fog: [150, 165, 135], fogW: 0.25, part: "motes", dens: 0.25, rays: 0.20, mist: 0.20 },
  "Taiga":          { tint: [1.00, 1.00, 1.04], sat: 0.98, fog: [210, 215, 225], fogW: 0.18, part: "snowdust", dens: 0.15, rays: 0.25 },
  "Oasis":          { tint: [1.05, 1.03, 0.94], sat: 1.12, fog: [235, 215, 170], fogW: 0.15 },
  "Ruins":          { tint: [1.03, 1.00, 0.92], sat: 1.00, fog: [210, 205, 175], fogW: 0.15, part: "motes", dens: 0.35, rays: 0.30 },
  "Salt Flats":     { tint: [1.12, 1.10, 1.08], sat: 0.85, fog: [242, 242, 235], fogW: 0.30, part: "sparkle", dens: 0.30 },
  "Wetlands":       { tint: [1.05, 1.00, 0.90], sat: 1.05, fog: [225, 200, 160], fogW: 0.28, part: "fireflies", dens: 0.35, mist: 0.50 },
  "Canyon":         { tint: [1.08, 0.98, 0.90], sat: 1.05, fog: [220, 180, 150], fogW: 0.25, part: "dust", dens: 0.30 },
  "Steppe":         { tint: [1.06, 1.00, 0.88], sat: 1.00, fog: [225, 210, 175], fogW: 0.15, part: "seeds", dens: 0.35 },
  "Red Desert":     { tint: [1.15, 0.94, 0.80], sat: 1.12, fog: [235, 140, 80],  fogW: 0.40, part: "dust", dens: 0.45 },
  "Giant Mushroom Forest": { tint: [0.92, 0.92, 1.10], sat: 1.10, fog: [95, 90, 160], fogW: 0.40, part: "spores", dens: 0.60, mist: 0.15 },
  "Bone Fields":    { tint: [1.08, 0.92, 0.86], sat: 0.95, fog: [190, 120, 95],  fogW: 0.40, part: "dust", dens: 0.30 },
  "Dream Forest":   { tint: [0.98, 0.94, 1.08], sat: 1.12, fog: [150, 140, 200], fogW: 0.35, part: "fireflies", dens: 0.60, mist: 0.30 },
  "Ashen Forest":   { tint: [0.85, 0.82, 0.82], sat: 0.55, fog: [125, 120, 120], fogW: 0.45, part: "ash", dens: 0.55, part2: "embers", dens2: 0.15 },
  "Heather Moor":   { tint: [0.94, 0.92, 1.02], sat: 0.90, fog: [165, 155, 180], fogW: 0.30, part: "seeds", dens: 0.25 },
  "Glacier":        { tint: [0.94, 1.00, 1.10], sat: 1.05, fog: [180, 210, 235], fogW: 0.30, part: "sparkle", dens: 0.35 },
  "Bamboo Grove":   { tint: [0.96, 1.05, 0.90], sat: 1.10, fog: [195, 215, 170], fogW: 0.20, part: "motes", dens: 0.30, rays: 0.35 },
  "Blossom Grove":  { tint: [1.08, 0.98, 1.00], sat: 1.10, fog: [240, 205, 205], fogW: 0.25, part: "petals", dens: 0.60, part2: "butterflies", dens2: 0.15 },
  "Crystal Fields": { tint: [1.02, 1.02, 1.08], sat: 1.12, fog: [205, 215, 240], fogW: 0.22, part: "sparkle", dens: 0.55 },
};

// which particle signatures are LIGHT SOURCES: drawn over the night darkness
// (like fire glow) instead of under it, and faded UP as darkness deepens.
const ATMOS_GLOW_PARTS = { embers: 1, spores: 1, fireflies: 1, sparkle: 1 };

function biomeAtmos(name) { return (name && BIOME_ATMOS[name]) || null; }

if (typeof window !== "undefined") Object.assign(window, { BIOME_ATMOS, ATMOS_GLOW_PARTS, biomeAtmos });
