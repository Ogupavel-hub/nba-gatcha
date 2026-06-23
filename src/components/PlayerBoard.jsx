import { Lock } from "lucide-react";
import { RARITIES } from "../data/rarities";

function DuplicateStars({ copies = 0 }) {
  const stars = Math.min(3, Math.max(0, copies - 1));
  if (!stars) return null;

  return (
    <div className="duplicate-stars" aria-label={`${stars} duplicate stars`}>
      {Array.from({ length: stars }, (_, index) => (
        <span key={index}>★</span>
      ))}
    </div>
  );
}

export default function PlayerBoard({
  players,
  teams,
  collection,
  highlightedId,
  rollMaskedIds = [],
  revealingId,
  isRolling,
}) {
  return (
    <section className={`player-board ${isRolling ? "is-roll-active" : ""}`} aria-label="Player board">
      {teams.map((team) => (
        <div className="team-column" key={team.id}>
          <div className="team-column-title" title={team.name}>{team.short}</div>
          {players
            .filter((player) => player.teamId === team.id)
            .map((player) => {
              const rarity = RARITIES[player.rarity];
              const owned = collection[player.id];
              const isOpen = Boolean(owned);
              const isHighlighted = highlightedId === player.id;
              const hideIdentity = isRolling && rollMaskedIds.includes(player.id);
              const className = [
                "board-card",
                `rarity-${player.rarity}`,
                isOpen ? "is-open" : "is-closed",
                isHighlighted ? "is-highlighted" : "",
                hideIdentity ? "is-roll-masked" : "",
                revealingId === player.id ? "is-revealing" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <article
                  className={className}
                  key={player.id}
                  style={{ "--rarity-color": rarity.color }}
                  title={hideIdentity ? rarity.label : isOpen ? `${player.name} (${player.value})` : "Hidden player"}
                >
                  <div className="board-card-inner">
                    <div className="board-card-face board-card-back">
                      <Lock size={18} />
                    </div>
                    <div className="board-card-face board-card-front">
                      {hideIdentity ? (
                        <div className="roll-rarity-cover" aria-hidden="true" />
                      ) : (
                        <>
                          {player.headshot ? (
                            <img src={player.headshot} alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <span
                              className="player-abbreviation"
                              style={{ "--team-primary": player.teamColors?.[0], "--team-secondary": player.teamColors?.[1] }}
                            >
                              {player.abbreviation}
                            </span>
                          )}
                          <DuplicateStars copies={owned?.copies ?? 0} />
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      ))}
    </section>
  );
}
