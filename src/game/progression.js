import { LEVELS } from "../data/levels";

export function getLevel(copies = 0) {
  let level = 0;
  for (const entry of LEVELS) {
    if (copies >= entry.copies) {
      level = entry.level;
    }
  }
  return level;
}

export function getNextLevelProgress(copies = 0) {
  const level = getLevel(copies);
  const current = LEVELS.find((entry) => entry.level === level);
  const next = LEVELS.find((entry) => entry.level === level + 1);

  return {
    level,
    currentCopies: copies,
    levelStart: current?.copies ?? 0,
    nextCopies: next?.copies ?? copies,
    isMax: !next,
  };
}

export function getDuplicateReward(player, copiesAfter) {
  const base = {
    common: 20,
    rare: 45,
    epic: 90,
    legendary: 180,
  }[player.rarity];

  return base + Math.max(0, copiesAfter - 1) * 3;
}
