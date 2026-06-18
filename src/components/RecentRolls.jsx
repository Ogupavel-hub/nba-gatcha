import { RARITIES } from "../data/rarities";

export default function RecentRolls({ rolls }) {
  return (
    <section className="recent-rolls">
      <div className="section-header">
        <h2>Recent</h2>
        <span>Last 12</span>
      </div>
      <div className="recent-list">
        {rolls.slice(0, 12).map((roll, index) => (
          <div
            className="recent-chip"
            key={`${roll.id}-${index}`}
            style={{ "--rarity-color": RARITIES[roll.rarity].color }}
          >
            {roll.name}
          </div>
        ))}
      </div>
    </section>
  );
}
