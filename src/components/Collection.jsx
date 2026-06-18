import PlayerCard from "./PlayerCard";

export default function Collection({ players, collection }) {
  const teams = Array.from(new Set(players.map((player) => player.team))).sort();

  return (
    <section className="collection-section">
      <div className="section-header">
        <h2>Collection</h2>
        <span>{Object.keys(collection).length}/{players.length}</span>
      </div>
      <div className="team-list">
        {teams.map((team) => {
          const teamPlayers = players.filter((player) => player.team === team);
          const owned = teamPlayers.filter((player) => collection[player.id]).length;
          return (
            <div className="team-group" key={team}>
              <div className="team-title">
                <span>{team}</span>
                <span>{owned}/{teamPlayers.length}</span>
              </div>
              <div className="card-grid">
                {teamPlayers.map((player) =>
                  collection[player.id] ? (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      copies={collection[player.id].copies}
                      compact
                    />
                  ) : (
                    <div className="missing-card" key={player.id}>
                      <span>Undrafted</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
