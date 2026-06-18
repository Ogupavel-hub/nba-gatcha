import { RARITIES } from "../data/rarities";
import { getNextLevelProgress } from "../game/progression";

export default function PlayerCard({ player, copies = 0, compact = false, featured = false }) {
  const rarity = RARITIES[player.rarity];
  const progress = getNextLevelProgress(copies);
  const pct = progress.isMax
    ? 100
    : ((copies - progress.levelStart) / (progress.nextCopies - progress.levelStart)) * 100;

  return (
    <article
      className={"player-card rarity-" + player.rarity + (featured ? " featured-card" : "")}
      style={{ "--rarity-color": rarity.color }}
    >
      <div className="card-topline">
        <span>{rarity.label}</span>
        <span>LVL {progress.level}</span>
      </div>
      <div className="player-name">{player.name}</div>
      <div className="player-meta">{player.team}</div>
      <div className="player-era">{player.era}</div>
      {!compact && (
        <>
          <div className="copy-row">
            <span>{copies} copies</span>
            <span>{progress.isMax ? "MAX" : `${progress.nextCopies - copies} to next`}</span>
          </div>
          <div className="level-bar">
            <div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
          </div>
        </>
      )}
    </article>
  );
}
