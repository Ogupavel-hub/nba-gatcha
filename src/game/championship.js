export const CHAMPIONSHIP_DURATION_MS = 30_000;
export const CHAMPIONSHIP_STAR_VALUE = 30;

export const CHAMPIONSHIP_STAGES = [
  { id: "playoff-berth", name: "Playoff Berth", requiredValue: 400 },
  { id: "first-round", name: "First Round", requiredValue: 500 },
  { id: "conference-semifinals", name: "Conference Semifinals", requiredValue: 600 },
  { id: "conference-finals", name: "Conference Finals", requiredValue: 700 },
  { id: "nba-finals", name: "NBA Finals", requiredValue: 800 },
];

export function getPlayerStars(collection, playerId) {
  return Math.min(3, Math.max(0, (collection[playerId]?.copies ?? 1) - 1));
}

export function getPlayerChampionshipValue(player, collection) {
  return player.value + getPlayerStars(collection, player.id) * CHAMPIONSHIP_STAR_VALUE;
}

export function getTeamPlayers(players, teamId) {
  return players.filter((player) => player.teamId === teamId);
}

export function isTeamEligible(players, collection, teamId) {
  const teamPlayers = getTeamPlayers(players, teamId);
  return teamPlayers.length === 5 && teamPlayers.every((player) => collection[player.id]);
}

export function getTeamChampionshipValue(players, collection, teamId) {
  return getTeamPlayers(players, teamId).reduce(
    (total, player) => total + getPlayerChampionshipValue(player, collection),
    0,
  );
}

export function getPassedStageCount(value) {
  return CHAMPIONSHIP_STAGES.filter((stage) => value >= stage.requiredValue).length;
}

function downgradeFinalsResult(teamState) {
  if (teamState.lastResult?.passedStages !== 5) return teamState;
  const rewardsClaimed = teamState.lastResult.rewardsClaimed;
  return {
    ...teamState,
    xp: rewardsClaimed ? Math.max(0, (teamState.xp ?? 0) - 50) : teamState.xp,
    lastResult: {
      ...teamState.lastResult,
      passedStages: 4,
      xpEarned: Math.max(0, teamState.lastResult.xpEarned - 50),
    },
  };
}

export function enforceSingleChampion({ teams, currentChampion, now }) {
  const candidates = Object.entries(teams)
    .filter(([, teamState]) => teamState.lastResult?.passedStages === 5)
    .map(([teamId, teamState]) => ({
      teamId,
      value: teamState.lastResult.enteredValue,
      wonAt: teamState.lastResult.completedAt,
      isCurrent: false,
    }));

  if (currentChampion) candidates.push({ ...currentChampion, isCurrent: true });
  candidates.sort((a, b) => b.value - a.value || Number(b.isCurrent) - Number(a.isCurrent));
  const winner = candidates[0];
  if (!winner) return { teams, champion: null };

  const nextTeams = Object.fromEntries(
    Object.entries(teams).map(([teamId, teamState]) => [
      teamId,
      teamId === winner.teamId ? teamState : downgradeFinalsResult(teamState),
    ]),
  );
  const titleChanged = currentChampion?.teamId !== winner.teamId || currentChampion?.value !== winner.value;

  return {
    teams: nextTeams,
    champion: {
      teamId: winner.teamId,
      value: winner.value,
      wonAt: titleChanged ? now : currentChampion.wonAt,
    },
  };
}

function pickStarRecipients(teamPlayers, collection, random) {
  const candidates = teamPlayers.filter((player) => getPlayerStars(collection, player.id) < 3);
  const shuffled = [...candidates].sort(() => random() - 0.5);
  return shuffled.slice(0, Math.min(2, shuffled.length));
}

export function resolveChampionshipRun({ players, collection, teamId, teamState, now, random = Math.random }) {
  const teamPlayers = getTeamPlayers(players, teamId);
  const enteredValue = getTeamChampionshipValue(players, collection, teamId);
  const passedStages = getPassedStageCount(enteredValue);
  const xpEarned = 100 + passedStages * 50;
  const recipients = pickStarRecipients(teamPlayers, collection, random);

  return {
    collection,
    teamState: {
      ...teamState,
      status: "reward",
      attempts: (teamState.attempts ?? 0) + 1,
      lastResult: {
        enteredValue,
        finalValue: enteredValue,
        passedStages,
        xpEarned,
        starPlayerIds: recipients.map((player) => player.id),
        completedAt: now,
        rewardsClaimed: false,
      },
    },
  };
}

export function claimChampionshipRewards({ players, collection, teamId, teamState }) {
  if (teamState?.status !== "reward" || teamState.lastResult?.rewardsClaimed) {
    return { collection, teamState };
  }

  const nextCollection = { ...collection };
  teamState.lastResult.starPlayerIds.forEach((playerId) => {
    const owned = nextCollection[playerId];
    if (!owned) return;
    nextCollection[playerId] = {
      ...owned,
      copies: Math.min(4, (owned.copies ?? 1) + 1),
    };
  });

  return {
    collection: nextCollection,
    teamState: {
      ...teamState,
      status: "complete",
      xp: (teamState.xp ?? 0) + teamState.lastResult.xpEarned,
      lastResult: {
        ...teamState.lastResult,
        finalValue: getTeamChampionshipValue(players, nextCollection, teamId),
        rewardsClaimed: true,
      },
    },
  };
}
