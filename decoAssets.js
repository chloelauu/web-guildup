// ============================================================
// decoAssets.js
// Decorative (non-interactive) room assets.
// Add new images here, then draw them in the animate loop
// inside index.js.
//
// COLLISION: decorative objects that physically block the player
// should have a matching entry added in data/collisionZones.js,
// using percentage-based coordinates (xPct, yPct, wPct, hPct)
// relative to the background image size (1536 x 1024).
// ============================================================

const DecoAssets = {};

// ── Barrels ──────────────────────────────────────────────────
DecoAssets.barrel01  = new Image(); DecoAssets.barrel01.src  = "./img/barrel_01.png";
DecoAssets.barrel02  = new Image(); DecoAssets.barrel02.src  = "./img/barrel_02.png";
DecoAssets.barrel03  = new Image(); DecoAssets.barrel03.src  = "./img/barrel_03.png";
DecoAssets.barrel04  = new Image(); DecoAssets.barrel04.src  = "./img/barrel_04.png";
DecoAssets.barrelMug = new Image(); DecoAssets.barrelMug.src = "./img/barrel_mug.png";
DecoAssets.barrelSack= new Image(); DecoAssets.barrelSack.src= "./img/barrel_sack.png";

// ── Plants ───────────────────────────────────────────────────
DecoAssets.plant01   = new Image(); DecoAssets.plant01.src   = "./img/plant_01.png";
DecoAssets.plant02   = new Image(); DecoAssets.plant02.src   = "./img/plant_02.png";

// ── Torches ──────────────────────────────────────────────────
DecoAssets.torch01   = new Image(); DecoAssets.torch01.src   = "./img/torch_01.png";
DecoAssets.torch02   = new Image(); DecoAssets.torch02.src   = "./img/torch_02.png";
DecoAssets.candlestick   = new Image(); DecoAssets.candlestick.src   = "./img/candlestick.png";

// ── Furniture ────────────────────────────────────────────────
DecoAssets.carpet    = new Image(); DecoAssets.carpet.src    = "./img/carpet.png";
DecoAssets.sofa      = new Image(); DecoAssets.sofa.src      = "./img/sofa.png";

// ── Misc ─────────────────────────────────────────────────────
DecoAssets.skull     = new Image(); DecoAssets.skull.src     = "./img/skull_04.png";
DecoAssets.skull2     = new Image(); DecoAssets.skull2.src     = "./img/walldeco/skull_02.png";
DecoAssets.bucket01  = new Image(); DecoAssets.bucket01.src  = "./img/bucket_01.png";
DecoAssets.bucket02  = new Image(); DecoAssets.bucket02.src  = "./img/bucket_02.png";
DecoAssets.corpse  = new Image(); DecoAssets.corpse.src  = "./img/corpse.png";
DecoAssets.banner  = new Image(); DecoAssets.banner.src  = "./img/walldeco/banner.png";

// ── Add new assets below this line ───────────────────────────
