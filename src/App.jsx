import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Lock, PackageOpen, Trophy } from "lucide-react";
import { PACKS } from "./data/packs";
import { PLAYERS, TEAMS } from "./data/players";
import { DYNASTY_PLAYERS, DYNASTY_TEAMS } from "./data/dynasties";
import { RARITIES } from "./data/rarities";
import { ENERGY_REFRESH_MS, MAX_ENERGY_BASE, START_ENERGY, STARTING_CASH } from "./game/constants";
import { clearGame, loadGame, saveGame } from "./game/save";
import { rollPack, rollPlayer } from "./game/roll";
import {
  CHAMPIONSHIP_DURATION_MS,
  claimChampionshipRewards,
  enforceSingleChampion,
  isTeamEligible,
  resolveChampionshipRun,
} from "./game/championship";
import Achievements from "./components/Achievements";
import ChampionshipPanel from "./components/ChampionshipPanel";
import NBAQuiz from "./components/NBAQuiz";
import PackShop from "./components/PackShop";
import PlayerBoard from "./components/PlayerBoard";
import RollPanel from "./components/RollPanel";

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const BASE_URL = import.meta.env.BASE_URL;
const SOUNDS = {
  tick: `${BASE_URL}audio/tick.wav`,
  pullLow: `${BASE_URL}audio/lineage2_soulshot.mp3`,
  pullHigh: `${BASE_URL}audio/critical_hit.mp3`,
  claim: `${BASE_URL}audio/aura_burn.mp3`,
};

const PLAYER_PHRASES = [
  "Locked in.",
  "Let's get to work.",
  "Big moments only.",
  "Built for this.",
  "Next play.",
  "The work starts now.",
  "Ready for the spotlight.",
  "One possession at a time.",
];

const TEAM_PACK_COLORS = {
  LAL: ["#552583", "#fdb927"],
  BOS: ["#007a33", "#ba9653"],
  GSW: ["#1d428a", "#ffc72c"],
  OKC: ["#007ac1", "#ef3b24"],
  DAL: ["#00538c", "#b8c4ca"],
  NYK: ["#006bb6", "#f58426"],
  DEN: ["#0e2240", "#fec524"],
  HOU: ["#ce1141", "#111318"],
  LAC: ["#1d428a", "#c8102e"],
  MIN: ["#0c2340", "#78be20"],
};

const ERA_CONFIGS = {
  modern: {
    id: "modern",
    label: "Modern",
    players: PLAYERS,
    teams: TEAMS,
  },
  dynasties: {
    id: "dynasties",
    label: "Dynasties",
    players: DYNASTY_PLAYERS,
    teams: DYNASTY_TEAMS,
  },
};

const ALL_PLAYERS = [...PLAYERS, ...DYNASTY_PLAYERS];
const ALL_TEAMS = [...TEAMS, ...DYNASTY_TEAMS];

function normalizeChampionship(championship = {}) {
  const legacyModern = championship.teams
    ? { teams: championship.teams, champion: championship.champion }
    : null;
  return {
    modern: championship.modern ?? legacyModern ?? { teams: {} },
    dynasties: championship.dynasties ?? { teams: {} },
  };
}

function playSound(src, volume = 0.45) {
  const audio = new Audio(src);
  audio.volume = volume;
  audio.play().catch(() => {});
}

function createInitialState() {
  return {
    collection: {},
    rolls: [],
    cash: STARTING_CASH,
    energy: START_ENERGY,
    maxEnergy: MAX_ENERGY_BASE,
    nextEnergyAt: null,
    totalRolls: 0,
    claimedAchievements: [],
    packShopUnlocked: false,
    seenDynastiesUnlock: false,
    championship: {
      modern: { teams: {} },
      dynasties: { teams: {} },
    },
  };
}

function applyPlayerResult(state, player) {
  const existing = state.collection[player.id];
  const copies = (existing?.copies ?? 0) + 1;

  const cash = state.cash + Math.floor(player.value / 2);

  return {
    ...state,
    cash,
    packShopUnlocked: state.packShopUnlocked || cash >= 400,
    totalRolls: state.totalRolls + 1,
    collection: {
      ...state.collection,
      [player.id]: {
        copies,
        firstSeenAt: existing?.firstSeenAt ?? Date.now(),
      },
    },
    rolls: [player, ...state.rolls].slice(0, 40),
  };
}

function recoverEnergy(saved) {
  if (!saved) return saved;
  const normalized = {
    ...saved,
    energy: Math.min(saved.energy, MAX_ENERGY_BASE),
    maxEnergy: MAX_ENERGY_BASE,
  };
  if (!normalized.nextEnergyAt || normalized.energy >= normalized.maxEnergy) {
    return {
      ...normalized,
      nextEnergyAt: normalized.energy >= normalized.maxEnergy ? null : normalized.nextEnergyAt,
    };
  }
  let energy = normalized.energy;
  let nextEnergyAt = normalized.nextEnergyAt;
  const now = Date.now();

  while (nextEnergyAt <= now && energy < normalized.maxEnergy) {
    energy += 1;
    nextEnergyAt += ENERGY_REFRESH_MS;
  }

  return {
    ...normalized,
    energy,
    nextEnergyAt: energy >= normalized.maxEnergy ? null : nextEnergyAt,
  };
}

function formatCountdown(nextEnergyAt) {
  if (!nextEnergyAt) return "Full";
  const ms = Math.max(0, nextEnergyAt - Date.now());
  const sec = Math.ceil(ms / 1000);
  return `+1 in ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function formatPackRefresh(now) {
  const seconds = 60 - (Math.floor(now / 1000) % 60);
  return `Refresh ${seconds}s`;
}

function formatChampionshipCountdown(completesAt, now) {
  const seconds = Math.min(30, Math.max(0, Math.ceil((completesAt - now) / 1000)));
  return `0:${String(seconds).padStart(2, "0")}`;
}

function getActivePacks(now, teams, eraId) {
  const minute = Math.floor(now / 60000);
  const refreshesIn = formatPackRefresh(now);
  const regularPacks = Array.from({ length: 2 }, (_, index) => ({
    ...PACKS[(minute * 2 + index) % PACKS.length],
    refreshesIn,
  }));
  const teamPacks = Array.from({ length: 2 }, (_, index) => {
    const team = teams[(minute * 2 + index) % teams.length];

    return {
      id: `team-${eraId}-${team.id}`,
      name: `${team.short} Pack`,
      cost: 840,
      amount: 2,
      filter: { teamId: team.id },
      colors: team.colors ?? TEAM_PACK_COLORS[team.id],
      refreshesIn,
    };
  });

  return [...regularPacks, ...teamPacks];
}

function buildRollPath(target, startIndex, players) {
  const targetIndex = players.findIndex((player) => player.id === target.id);
  const distance = (targetIndex - startIndex + players.length) % players.length;
  const hops = players.length + distance;
  return Array.from({ length: hops + 1 }, (_, index) => {
    const playerIndex = (startIndex + index) % players.length;
    return players[playerIndex].id;
  });
}

export default function App() {
  const [game, setGame] = useState(() => recoverEnergy(loadGame()) ?? createInitialState());
  const [now, setNow] = useState(Date.now());
  const [highlightedId, setHighlightedId] = useState(null);
  const [rollMaskedIds, setRollMaskedIds] = useState([]);
  const [revealingId, setRevealingId] = useState(null);
  const [focusedPlayer, setFocusedPlayer] = useState(null);
  const [focusedPhrase, setFocusedPhrase] = useState("");
  const [isRolling, setIsRolling] = useState(false);
  const [openingPack, setOpeningPack] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showChampionship, setShowChampionship] = useState(false);
  const [showDynastyUnlock, setShowDynastyUnlock] = useState(false);
  const [selectedEra, setSelectedEra] = useState("modern");
  const cursorIndexRef = useRef(0);
  const focusResolverRef = useRef(null);

  useEffect(() => {
    saveGame(game);
  }, [game]);

  useEffect(() => {
    if (game.cash < 400 || game.packShopUnlocked) return;
    setGame((current) => ({ ...current, packShopUnlocked: true }));
  }, [game.cash, game.packShopUnlocked]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!game.nextEnergyAt || game.energy >= game.maxEnergy || game.nextEnergyAt > now) return;
    setGame((current) => recoverEnergy(current));
  }, [now, game.nextEnergyAt, game.energy, game.maxEnergy]);

  useEffect(() => {
    const championship = normalizeChampionship(game.championship);
    const hasFinishedTeam = Object.keys(ERA_CONFIGS).some((eraId) =>
      Object.values(championship[eraId].teams ?? {}).some(
        (teamState) => teamState.status === "running" && teamState.completesAt <= now,
      ),
    );
    if (!hasFinishedTeam) return;

    setGame((current) => {
      let collection = current.collection;
      const nextChampionship = normalizeChampionship(current.championship);

      Object.entries(ERA_CONFIGS).forEach(([eraId, era]) => {
        const eraState = nextChampionship[eraId];
        const teams = { ...(eraState.teams ?? {}) };
        let changed = false;

        Object.entries(teams).forEach(([teamId, teamState]) => {
          if (teamState.status !== "running" || teamState.completesAt > now) return;
          const result = resolveChampionshipRun({
            players: era.players,
            collection,
            teamId,
            teamState,
            now,
          });
          collection = result.collection;
          teams[teamId] = result.teamState;
          changed = true;
        });

        if (changed) {
          nextChampionship[eraId] = enforceSingleChampion({
            teams,
            currentChampion: eraState.champion,
            now,
          });
        }
      });

      return {
        ...current,
        collection,
        championship: nextChampionship,
      };
    });
  }, [now, game.championship]);

  const activeEra = ERA_CONFIGS[selectedEra];
  const activePlayers = activeEra.players;
  const activeTeams = activeEra.teams;
  const championshipByEra = useMemo(() => normalizeChampionship(game.championship), [game.championship]);
  const activeChampionship = championshipByEra[selectedEra];
  const dynastiesUnlocked = Boolean(championshipByEra.modern.champion);

  useEffect(() => {
    if (dynastiesUnlocked && !game.seenDynastiesUnlock) setShowDynastyUnlock(true);
  }, [dynastiesUnlocked, game.seenDynastiesUnlock]);

  const ownedPlayers = useMemo(
    () => activePlayers.filter((player) => game.collection[player.id]),
    [activePlayers, game.collection],
  );

  const completion = useMemo(() => {
    const owned = ownedPlayers.length;
    return {
      owned,
      total: activePlayers.length,
      pct: Math.round((owned / activePlayers.length) * 100),
      complete: owned === activePlayers.length,
    };
  }, [activePlayers.length, ownedPlayers.length]);

  const achievementStats = useMemo(
    () => {
      const teamProgress = Object.fromEntries(
        ALL_TEAMS.map((team) => {
          const teamPlayers = ALL_PLAYERS.filter((player) => player.teamId === team.id);
          const owned = teamPlayers.filter((player) => game.collection[player.id]).length;
          return [team.id, { current: owned, target: teamPlayers.length }];
        }),
      );

      return {
        totalRolls: game.totalRolls,
        ownedCount: ALL_PLAYERS.filter((player) => game.collection[player.id]).length,
        eliteOwned: ALL_PLAYERS.filter(
          (player) => game.collection[player.id] && RARITIES[player.rarity].value >= 4,
        ).length,
        mvpOwned: ALL_PLAYERS.filter(
          (player) => game.collection[player.id] && player.rarity === "legendary",
        ).length,
        teamProgress,
      };
    },
    [game.collection, game.totalRolls],
  );

  const activePacks = useMemo(
    () => getActivePacks(now, activeTeams, selectedEra),
    [activeTeams, now, selectedEra],
  );
  const championshipUnlocked = useMemo(
    () => activeTeams.some((team) => isTeamEligible(activePlayers, game.collection, team.id)),
    [activePlayers, activeTeams, game.collection],
  );
  const championshipVisible = useMemo(
    () => activeTeams.some((team) => {
      const teamPlayers = activePlayers.filter((player) => player.teamId === team.id);
      return teamPlayers.filter((player) => game.collection[player.id]).length >= 4;
    }),
    [activePlayers, activeTeams, game.collection],
  );
  const packShopUnlocked = game.packShopUnlocked || game.cash >= 400;
  const nearestChampionshipEnd = useMemo(() => {
    const endTimes = Object.values(championshipByEra)
      .flatMap((eraState) => Object.values(eraState.teams ?? {}))
      .filter((teamState) => teamState.status === "running")
      .map((teamState) => teamState.completesAt);
    return endTimes.length ? Math.min(...endTimes) : null;
  }, [championshipByEra]);

  function spendEnergy(amount = 1) {
    setGame((current) => ({
      ...current,
      energy: current.energy - amount,
      nextEnergyAt: current.nextEnergyAt ?? Date.now() + ENERGY_REFRESH_MS,
    }));
  }

  async function animateToPlayer(player) {
    setRevealingId(null);
    setRollMaskedIds([]);

    const path = buildRollPath(player, cursorIndexRef.current, activePlayers);
    for (let index = 0; index < path.length; index += 1) {
      setHighlightedId(path[index]);
      setRollMaskedIds((current) => [path[index], ...current.filter((id) => id !== path[index])].slice(0, 4));
      playSound(SOUNDS.tick, 0.22);
      const progress = index / Math.max(1, path.length - 1);
      await sleep(8 + Math.round(180 * progress ** 4));
    }

    setHighlightedId(player.id);
    playSound(RARITIES[player.rarity].value >= 4 ? SOUNDS.pullHigh : SOUNDS.pullLow, 0.55);
    cursorIndexRef.current = activePlayers.findIndex((entry) => entry.id === player.id);
    await sleep(520);
  }

  function waitForFocusedPlayer(player) {
    setFocusedPlayer(player);
    setFocusedPhrase(PLAYER_PHRASES[Math.floor(Math.random() * PLAYER_PHRASES.length)]);
    return new Promise((resolve) => {
      focusResolverRef.current = resolve;
    });
  }

  function closeFocusedPlayer() {
    setFocusedPlayer(null);
    setFocusedPhrase("");
    const resolve = focusResolverRef.current;
    focusResolverRef.current = null;
    resolve?.();
  }

  async function handleRoll() {
    if (game.energy <= 0 || isRolling) return;
    const recentIds = game.rolls.slice(0, 10).map((player) => player.id);
    const player = rollPlayer(null, recentIds, activePlayers);
    setIsRolling(true);
    spendEnergy(1);
    await animateToPlayer(player);
    await waitForFocusedPlayer(player);
    setGame((current) => applyPlayerResult(current, player));
    setHighlightedId(null);
    setRollMaskedIds([]);
    setRevealingId(null);
    setIsRolling(false);
  }

  async function handleOpenPack(pack) {
    if (game.cash < pack.cost || isRolling) return;
    const recentIds = game.rolls.slice(0, 10).map((player) => player.id);
    const players = rollPack(pack, recentIds, activePlayers);
    setIsRolling(true);
    setGame((current) => ({ ...current, cash: current.cash - pack.cost }));
    setOpeningPack(pack);
    await sleep(1100);
    setOpeningPack(null);
    for (const player of players) {
      setHighlightedId(player.id);
      setRevealingId(player.id);
      playSound(RARITIES[player.rarity].value >= 4 ? SOUNDS.pullHigh : SOUNDS.pullLow, 0.55);
      await sleep(650);
      await waitForFocusedPlayer(player);
      setGame((current) => applyPlayerResult(current, player));
      await sleep(280);
      setHighlightedId(null);
      setRollMaskedIds([]);
      setRevealingId(null);
    }
    setHighlightedId(null);
    setRollMaskedIds([]);
    setRevealingId(null);
    setIsRolling(false);
  }

  function handleClaimAchievement(achievement) {
    const claimed = game.claimedAchievements ?? [];
    if (claimed.includes(achievement.id)) return;
    const progress = achievement.getProgress(achievementStats);
    if (progress.current < progress.target) return;
    playSound(SOUNDS.claim, 0.55);

    setGame((current) => ({
      ...current,
      cash: current.cash + achievement.reward,
      packShopUnlocked: current.packShopUnlocked || current.cash + achievement.reward >= 400,
      claimedAchievements: [...(current.claimedAchievements ?? []), achievement.id],
    }));
  }

  function handleEnterChampionship(teamId) {
    const startedAt = Date.now();
    const eraId = selectedEra;
    const era = ERA_CONFIGS[eraId];
    setGame((current) => {
      if (!isTeamEligible(era.players, current.collection, teamId)) return current;
      const championship = normalizeChampionship(current.championship);
      const eraState = championship[eraId];
      return {
        ...current,
        championship: {
          ...championship,
          [eraId]: {
            ...eraState,
            teams: {
              ...(eraState.teams ?? {}),
              [teamId]: {
                ...(eraState.teams?.[teamId] ?? {}),
                status: "running",
                startedAt,
                completesAt: startedAt + CHAMPIONSHIP_DURATION_MS,
                lastResult: null,
              },
            },
          },
        },
      };
    });
  }

  function handleClaimChampionshipRewards(teamId) {
    playSound(SOUNDS.claim, 0.45);
    const eraId = selectedEra;
    const era = ERA_CONFIGS[eraId];
    setGame((current) => {
      const championship = normalizeChampionship(current.championship);
      const eraState = championship[eraId];
      const teamState = eraState.teams?.[teamId];
      if (teamState?.status !== "reward") return current;
      const result = claimChampionshipRewards({
        players: era.players,
        collection: current.collection,
        teamId,
        teamState,
      });

      return {
        ...current,
        collection: result.collection,
        championship: {
          ...championship,
          [eraId]: {
            ...eraState,
            teams: {
              ...(eraState.teams ?? {}),
              [teamId]: result.teamState,
            },
          },
        },
      };
    });
  }

  function handleReset() {
    clearGame();
    setHighlightedId(null);
    setRollMaskedIds([]);
    setRevealingId(null);
    setFocusedPlayer(null);
    setFocusedPhrase("");
    setShowChampionship(false);
    setShowDynastyUnlock(false);
    setSelectedEra("modern");
    setIsRolling(false);
    setOpeningPack(null);
    setShowQuiz(false);
    setGame(createInitialState());
  }

  function handleQuizReward(amount) {
    setGame((current) => {
      const energy = Math.min(current.maxEnergy, current.energy + amount);
      return {
        ...current,
        energy,
        nextEnergyAt: energy >= current.maxEnergy ? null : current.nextEnergyAt,
      };
    });
  }

  function handleOpenDynasties() {
    setGame((current) => ({ ...current, seenDynastiesUnlock: true }));
    setShowDynastyUnlock(false);
    setShowChampionship(false);
    setSelectedEra("dynasties");
    cursorIndexRef.current = 0;
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>NBA Gatcha</h1>
          <p>{selectedEra === "modern" ? "Modern NBA collection" : "Championship teams from iconic NBA seasons"}</p>
        </div>
        <div className="completion">
          <Trophy size={18} />
          <strong>{completion.pct}%</strong>
          <span>{completion.owned}/{completion.total}</span>
        </div>
      </section>

      <section className="game-layout">
        <div className="left-rail">
          <RollPanel
            energy={game.energy}
            maxEnergy={game.maxEnergy}
            cash={game.cash}
            rolls={game.totalRolls}
            canRoll={game.energy > 0 && !isRolling}
            isRolling={isRolling}
            onRoll={handleRoll}
            onQuiz={() => setShowQuiz(true)}
            onReset={handleReset}
            nextEnergyText={formatCountdown(game.nextEnergyAt)}
          />
          {packShopUnlocked && (
            <PackShop packs={activePacks} cash={game.cash} disabled={isRolling} onOpenPack={handleOpenPack} />
          )}
        </div>

        <section className="stage">
          <div className="era-tabs" aria-label="NBA eras">
            <button
              className={`era-tab ${selectedEra === "modern" ? "is-active" : ""}`}
              disabled={isRolling}
              onClick={() => {
                setSelectedEra("modern");
                cursorIndexRef.current = 0;
              }}
            >
              Modern
            </button>
            <button
              className={`era-tab ${selectedEra === "dynasties" ? "is-active" : ""}`}
              disabled={!dynastiesUnlocked || isRolling}
              title={dynastiesUnlocked ? "NBA Dynasties" : "Win a Modern Championship to unlock"}
              onClick={() => {
                setSelectedEra("dynasties");
                cursorIndexRef.current = 0;
              }}
            >
              {!dynastiesUnlocked && <Lock size={13} />}
              Dynasties
            </button>
          </div>
          <PlayerBoard
            players={activePlayers}
            teams={activeTeams}
            collection={game.collection}
            highlightedId={highlightedId}
            rollMaskedIds={rollMaskedIds}
            revealingId={revealingId}
            isRolling={isRolling}
          />
          {completion.complete && (
            <div className="win-banner">Full {activeEra.label} collection complete.</div>
          )}
        </section>

        <div className="right-rail">
          {championshipVisible && (
            <div
              className="championship-launcher-wrap"
              data-tooltip={championshipUnlocked
                ? "Open Championship"
                : "Collect 5 players from one team to enter Championship"}
            >
              <button
                className="championship-launcher"
                disabled={!championshipUnlocked}
                onClick={() => setShowChampionship(true)}
              >
                <Trophy size={18} />
                <span>Championship</span>
                {nearestChampionshipEnd && (
                  <small className="championship-launcher-timer">
                    <Clock3 size={14} />
                    {formatChampionshipCountdown(nearestChampionshipEnd, now)}
                  </small>
                )}
              </button>
            </div>
          )}
          {game.totalRolls >= 3 && (
            <Achievements
              stats={achievementStats}
              claimed={game.claimedAchievements ?? []}
              onClaim={handleClaimAchievement}
            />
          )}
        </div>
      </section>
      {showChampionship && (
        <ChampionshipPanel
          teams={activeTeams}
          players={activePlayers}
          collection={game.collection}
          championship={activeChampionship}
          now={now}
          onEnterTeam={handleEnterChampionship}
          onClaimRewards={handleClaimChampionshipRewards}
          onClose={() => setShowChampionship(false)}
        />
      )}
      {showDynastyUnlock && (
        <div className="dynasty-unlock-overlay" role="dialog" aria-modal="true" aria-label="NBA Dynasties unlocked">
          <section className="dynasty-unlock-panel">
            <Trophy size={34} />
            <span>New era unlocked</span>
            <h2>NBA Dynasties</h2>
            <p>10 iconic championship teams are ready.</p>
            <button onClick={handleOpenDynasties}>Explore Dynasties</button>
          </section>
        </div>
      )}
      {openingPack && (
        <div className="pack-opening-overlay" aria-live="polite">
          <div
            className="pack-opening-card"
            style={{ "--pack-top": openingPack.colors?.[0], "--pack-bottom": openingPack.colors?.[1] }}
          >
            <PackageOpen size={34} />
            <strong>{openingPack.name}</strong>
            <span>Opening</span>
          </div>
        </div>
      )}
      {showQuiz && (
        <NBAQuiz onReward={handleQuizReward} onClose={() => setShowQuiz(false)} />
      )}
      {focusedPlayer && (
        <button
          className="pull-focus"
          onClick={closeFocusedPlayer}
          aria-label="Return card to board"
          style={{ "--rarity-color": RARITIES[focusedPlayer.rarity].color }}
        >
          <span className="pull-focus-card">
            {focusedPlayer.headshot ? (
              <img src={focusedPlayer.headshot} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span
                className="pull-focus-abbreviation"
                style={{ "--team-primary": focusedPlayer.teamColors?.[0], "--team-secondary": focusedPlayer.teamColors?.[1] }}
              >
                {focusedPlayer.abbreviation}
              </span>
            )}
            <strong className="pull-focus-card-name">{focusedPlayer.name}</strong>
          </span>
          <span className="pull-quote-bubble">{focusedPhrase}</span>
        </button>
      )}
    </main>
  );
}
