import { Check, Clock3, Crown, Lock, Trophy, X } from "lucide-react";
import {
  CHAMPIONSHIP_STAGES,
  getPassedStageCount,
  getPlayerChampionshipValue,
  getTeamChampionshipValue,
  getTeamPlayers,
  isTeamEligible,
} from "../game/championship";

function formatTimer(completesAt, now) {
  const seconds = Math.min(30, Math.max(0, Math.ceil((completesAt - now) / 1000)));
  return `0:${String(seconds).padStart(2, "0")}`;
}

export default function ChampionshipPanel({
  teams,
  players,
  collection,
  championship,
  now,
  onEnterTeam,
  onClaimRewards,
  onClose,
}) {
  const teamStates = championship?.teams ?? {};
  const champion = championship?.champion;
  const eligibleTeams = teams.filter((team) => isTeamEligible(players, collection, team.id));
  const clearedStages = champion
    ? 5
    : Math.max(0, ...Object.values(teamStates)
      .map((entry) => entry.lastResult)
      .filter(Boolean)
      .map((result) => result.passedStages));

  return (
    <div className="championship-overlay" role="dialog" aria-modal="true" aria-label="Championship">
      <section className="championship-panel">
        <header className="championship-header">
          <div>
            <span className="championship-kicker">Team competition</span>
            <h2>Championship</h2>
          </div>
          <button className="championship-close" onClick={onClose} aria-label="Close championship">
            <X size={20} />
          </button>
        </header>

        <div className="championship-stages" aria-label="Championship stages">
          {CHAMPIONSHIP_STAGES.map((stage, index) => (
            <div className={`championship-stage ${clearedStages > index ? "is-cleared" : ""}`} key={stage.id}>
              <span>{clearedStages > index ? <Check size={15} /> : index + 1}</span>
              <strong>{stage.name}</strong>
              <small>{stage.requiredValue} value</small>
            </div>
          ))}
        </div>

        <div className="championship-team-list">
          {eligibleTeams.map((team) => {
            const teamPlayers = getTeamPlayers(players, team.id);
            const teamState = teamStates[team.id] ?? {};
            const isRunning = teamState.status === "running";
            const hasReward = teamState.status === "reward";
            const teamValue = getTeamChampionshipValue(players, collection, team.id);
            const currentStageCount = getPassedStageCount(teamValue);
            const lastResult = teamState.lastResult;
            const isChampion = champion?.teamId === team.id;

            return (
              <article className={`championship-team is-eligible ${isChampion ? "is-champion" : ""}`} key={team.id}>
                <div className="championship-team-main">
                  <div className="championship-team-name">
                    <strong>
                      {team.name}
                      {isChampion && <span className="championship-crown"><Crown size={14} /> NBA Champion</span>}
                    </strong>
                    <span>5/5 players</span>
                  </div>
                  <div className="championship-team-value">
                    <strong>{teamValue}</strong>
                    <span>team value</span>
                  </div>
                  <div className="championship-team-progress">
                    <strong>{teamState.xp ?? 0} XP</strong>
                    <span>{currentStageCount}/5 stages in reach</span>
                  </div>
                  <button
                    className={`championship-enter ${hasReward ? "is-reward" : ""}`}
                    disabled={isRunning}
                    onClick={() => hasReward ? onClaimRewards(team.id) : onEnterTeam(team.id)}
                  >
                    {isRunning ? (
                      <><Clock3 size={16} /> {formatTimer(teamState.completesAt, now)}</>
                    ) : hasReward ? (
                      "Get XP"
                    ) : (
                      "Enter"
                    )}
                  </button>
                </div>

                <div className="championship-roster">
                  {teamPlayers.map((player) => (
                    <div className="championship-player" key={player.id} title={player.name}>
                      {player.headshot ? (
                        <img src={player.headshot} alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span
                          className="championship-player-abbreviation"
                          style={{ "--team-primary": player.teamColors?.[0], "--team-secondary": player.teamColors?.[1] }}
                        >
                          {player.abbreviation}
                        </span>
                      )}
                      <span>{getPlayerChampionshipValue(player, collection)}</span>
                    </div>
                  ))}
                </div>

                {lastResult && !isRunning && (
                  <div className={`championship-result ${lastResult.passedStages > 0 ? "is-success" : ""}`}>
                    <Trophy size={20} />
                    <strong>
                      {isChampion && lastResult.passedStages === 5
                        ? "NBA Champion. Cleared 5/5 stages."
                        : lastResult.passedStages > 0
                        ? `Cleared ${lastResult.passedStages}/5 stages.`
                        : "Not enough value yet."}
                    </strong>
                    <span>
                      {lastResult.rewardsClaimed
                        ? `+${lastResult.xpEarned} XP, ${lastResult.starPlayerIds.length} players improved.`
                        : `+${lastResult.xpEarned} XP and ${lastResult.starPlayerIds.length} player upgrades ready.`}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
          <p className="championship-requirement">
            <Lock size={15} /> Collect 5 players from one team to participate.
          </p>
        </div>
      </section>
    </div>
  );
}
