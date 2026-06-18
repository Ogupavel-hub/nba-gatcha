import { BadgeDollarSign } from "lucide-react";
import { ACHIEVEMENTS } from "../data/achievements";

export default function Achievements({ stats, claimed, onClaim }) {
  const visibleAchievements = ACHIEVEMENTS.map((achievement) => {
    const progress = achievement.getProgress(stats);
    const current = Math.min(progress.current, progress.target);
    const ready = current >= progress.target;
    const isClaimed = claimed.includes(achievement.id);
    const pct = Math.round((current / progress.target) * 100);

    return { achievement, current, target: progress.target, ready, isClaimed, pct };
  })
    .filter(({ isClaimed }) => !isClaimed)
    .slice(0, 5);

  return (
    <section className="achievements-panel">
      <div className="section-header">
        <h2>Achievements</h2>
        <span>Cash rewards</span>
      </div>
      <div className="achievement-list">
        {visibleAchievements.map(({ achievement, current, target, ready, pct }) => {
          return (
            <article className="achievement-card" key={achievement.id}>
              <div className="achievement-row">
                <div className="achievement-copy">
                  <strong>{achievement.title}</strong>
                  <span>{current}/{target}</span>
                </div>
                <button
                  className="claim-button"
                  disabled={!ready}
                  onClick={() => onClaim(achievement)}
                >
                  <BadgeDollarSign size={15} />
                  ${achievement.reward.toLocaleString()}
                </button>
              </div>
              <div className="achievement-progress" aria-hidden="true">
                <div style={{ width: `${pct}%` }} />
              </div>
            </article>
          );
        })}
        {!visibleAchievements.length && (
          <div className="achievement-empty">All visible achievements claimed.</div>
        )}
      </div>
    </section>
  );
}
