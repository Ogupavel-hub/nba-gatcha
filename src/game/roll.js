import { PLAYERS } from "../data/players";
import { RARITIES, RARITY_ORDER } from "../data/rarities";

function matchesFilter(player, filter = {}) {
  if (filter.teamId && player.teamId !== filter.teamId) return false;
  if (filter.minValue && player.value < filter.minValue) return false;
  if (filter.maxValue && player.value > filter.maxValue) return false;
  return true;
}

function getPool(pack, players) {
  let pool = players.filter((player) => matchesFilter(player, pack?.filter));
  if (pack?.minRarityValue) {
    pool = pool.filter((player) => RARITIES[player.rarity].value >= pack.minRarityValue);
  }
  return pool.length ? pool : players;
}

function rollRarity(pool) {
  const available = new Set(pool.map((player) => player.rarity));
  const adjusted = RARITY_ORDER.filter((rarity) => available.has(rarity));
  const total = adjusted.reduce((sum, rarity) => sum + RARITIES[rarity].chance, 0);
  let ticket = Math.random() * total;

  for (const rarity of adjusted) {
    ticket -= RARITIES[rarity].chance;
    if (ticket <= 0) return rarity;
  }
  return adjusted[adjusted.length - 1];
}

export function rollPlayer(pack = null, excludedIds = [], players = PLAYERS) {
  const fullPool = getPool(pack, players);
  const excluded = new Set(excludedIds);
  const freshPool = fullPool.filter((player) => !excluded.has(player.id));
  const pool = freshPool.length ? freshPool : fullPool;
  const rarity = rollRarity(pool);
  const rarityPool = pool.filter((player) => player.rarity === rarity);
  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
}

export function rollPack(pack, excludedIds = [], pool = PLAYERS) {
  const players = [];

  for (let index = 0; index < pack.amount; index += 1) {
    const player = rollPlayer(pack, [...excludedIds, ...players.map((entry) => entry.id)], pool);
    players.push(player);
  }

  return players;
}
