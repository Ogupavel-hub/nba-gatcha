import { useEffect, useMemo, useRef, useState } from "react";
import { Swords, Trophy } from "lucide-react";
import { PACKS } from "./data/packs";
import { PLAYERS, TEAMS } from "./data/players";
import { RARITIES } from "./data/rarities";
import { ENERGY_REFRESH_MS, MAX_ENERGY_BASE, START_ENERGY, STARTING_CASH } from "./game/constants";
import { clearGame, loadGame, saveGame } from "./game/save";
import { rollPack, rollPlayer } from "./game/roll";
import Achievements from "./components/Achievements";
import BattlePanel from "./components/BattlePanel";
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
  };
}

function applyPlayerResult(state, player) {
  const existing = state.collection[player.id];
  const copies = (existing?.copies ?? 0) + 1;

  return {
    ...state,
    cash: state.cash + Math.floor(player.value / 2),
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
  if (!saved?.nextEnergyAt || saved.energy >= saved.maxEnergy) return saved;
  let energy = saved.energy;
  let nextEnergyAt = saved.nextEnergyAt;
  const now = Date.now();

  while (nextEnergyAt <= now && energy < saved.maxEnergy) {
    energy += 1;
    nextEnergyAt += ENERGY_REFRESH_MS;
  }

  return {
    ...saved,
    energy,
    nextEnergyAt: energy >= saved.maxEnergy ? null : nextEnergyAt,
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

function getActivePacks(now) {
  const minute = Math.floor(now / 60000);
  const refreshesIn = formatPackRefresh(now);
  const regularPacks = Array.from({ length: 2 }, (_, index) => ({
    ...PACKS[(minute * 2 + index) % PACKS.length],
    refreshesIn,
  }));
  const teamPacks = Array.from({ length: 2 }, (_, index) => {
    const team = TEAMS[(minute * 2 + index) % TEAMS.length];

    return {
      id: `team-${team.id}`,
      name: `${team.short} Pack`,
      cost: 420,
      amount: 2,
      filter: { teamId: team.id },
      colors: TEAM_PACK_COLORS[team.id],
      refreshesIn,
    };
  });

  return [...regularPacks, ...teamPacks];
}

function buildRollPath(target, startIndex) {
  const targetIndex = PLAYERS.findIndex((player) => player.id === target.id);
  const distance = (targetIndex - startIndex + PLAYERS.length) % PLAYERS.length;
  const hops = PLAYERS.length + distance;
  return Array.from({ length: hops + 1 }, (_, index) => {
    const playerIndex = (startIndex + index) % PLAYERS.length;
    return PLAYERS[playerIndex].id;
  });
}

export default function App() {
  const [game, setGame] = useState(() => recoverEnergy(loadGame()) ?? createInitialState());
  const [now, setNow] = useState(Date.now());
  const [highlightedId, setHighlightedId] = useState(null);
  const [rollMaskedIds, setRollMaskedIds] = useState([]);
  const [revealingId, setRevealingId] = useState(null);
  const [focusedPlayer, setFocusedPlayer] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const cursorIndexRef = useRef(0);
  const focusResolverRef = useRef(null);

  useEffect(() => {
    saveGame(game);
  }, [game]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!game.nextEnergyAt || game.energy >= game.maxEnergy || game.nextEnergyAt > now) return;
    setGame((current) => recoverEnergy(current));
  }, [now, game.nextEnergyAt, game.energy, game.maxEnergy]);

  const ownedPlayers = useMemo(
    () => PLAYERS.filter((player) => game.collection[player.id]),
    [game.collection],
  );

  const completion = useMemo(() => {
    const owned = ownedPlayers.length;
    return {
      owned,
      total: PLAYERS.length,
      pct: Math.round((owned / PLAYERS.length) * 100),
      complete: owned === PLAYERS.length,
    };
  }, [ownedPlayers.length]);

  const achievementStats = useMemo(
    () => {
      const teamProgress = Object.fromEntries(
        TEAMS.map((team) => {
          const teamPlayers = PLAYERS.filter((player) => player.teamId === team.id);
          const owned = teamPlayers.filter((player) => game.collection[player.id]).length;
          return [team.id, { current: owned, target: teamPlayers.length }];
        }),
      );

      return {
        totalRolls: game.totalRolls,
        ownedCount: ownedPlayers.length,
        eliteOwned: ownedPlayers.filter((player) => RARITIES[player.rarity].value >= 4).length,
        mvpOwned: ownedPlayers.filter((player) => player.rarity === "legendary").length,
        teamProgress,
      };
    },
    [game.collection, game.totalRolls, ownedPlayers],
  );

  const activePacks = useMemo(() => getActivePacks(now), [now]);

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

    const path = buildRollPath(player, cursorIndexRef.current);
    for (let index = 0; index < path.length; index += 1) {
      setHighlightedId(path[index]);
      setRollMaskedIds((current) => [path[index], ...current.filter((id) => id !== path[index])].slice(0, 4));
      playSound(SOUNDS.tick, 0.22);
      const progress = index / Math.max(1, path.length - 1);
      await sleep(8 + Math.round(120 * progress ** 5));
    }

    setHighlightedId(player.id);
    playSound(RARITIES[player.rarity].value >= 4 ? SOUNDS.pullHigh : SOUNDS.pullLow, 0.55);
    cursorIndexRef.current = PLAYERS.findIndex((entry) => entry.id === player.id);
    await sleep(520);
  }

  function waitForFocusedPlayer(player) {
    setFocusedPlayer(player);
    return new Promise((resolve) => {
      focusResolverRef.current = resolve;
    });
  }

  function closeFocusedPlayer() {
    setFocusedPlayer(null);
    const resolve = focusResolverRef.current;
    focusResolverRef.current = null;
    resolve?.();
  }

  async function handleRoll() {
    if (game.energy <= 0 || isRolling) return;
    const recentIds = game.rolls.slice(0, 10).map((player) => player.id);
    const player = rollPlayer(null, recentIds);
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
    const players = rollPack(pack, recentIds);
    setIsRolling(true);
    setGame((current) => ({ ...current, cash: current.cash - pack.cost }));
    for (const player of players) {
      await animateToPlayer(player);
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
      claimedAchievements: [...(current.claimedAchievements ?? []), achievement.id],
    }));
  }

  function handleBattleReward(amount) {
    setGame((current) => ({
      ...current,
      cash: current.cash + amount,
    }));
  }

  function handleReset() {
    clearGame();
    setHighlightedId(null);
    setRollMaskedIds([]);
    setRevealingId(null);
    setFocusedPlayer(null);
    setShowBattle(false);
    setIsRolling(false);
    setGame(createInitialState());
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>NBA Gatcha</h1>
          <p>Roll through a 50-player board, reveal NBA headshots, and turn every pull into Cash.</p>
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
            onReset={handleReset}
            nextEnergyText={formatCountdown(game.nextEnergyAt)}
          />
          <PackShop packs={activePacks} cash={game.cash} disabled={isRolling} onOpenPack={handleOpenPack} />
        </div>

        <section className="stage">
          <PlayerBoard
            players={PLAYERS}
            collection={game.collection}
            highlightedId={highlightedId}
            rollMaskedIds={rollMaskedIds}
            revealingId={revealingId}
            isRolling={isRolling}
          />
          {completion.complete && (
            <div className="win-banner">Full 50-player collection complete.</div>
          )}
        </section>

        <div className="right-rail">
          <button className="battle-launcher" onClick={() => setShowBattle(true)}>
            <Swords size={18} />
            Battle
          </button>
          <Achievements
            stats={achievementStats}
            claimed={game.claimedAchievements ?? []}
            onClaim={handleClaimAchievement}
          />
        </div>
      </section>
      {showBattle && (
        <BattlePanel
          players={PLAYERS}
          collection={game.collection}
          onReward={handleBattleReward}
          onClose={() => setShowBattle(false)}
        />
      )}
      {focusedPlayer && (
        <button
          className="pull-focus"
          onClick={closeFocusedPlayer}
          aria-label="Return card to board"
          style={{ "--rarity-color": RARITIES[focusedPlayer.rarity].color }}
        >
          <span className="pull-focus-card">
            <img src={focusedPlayer.headshot} alt="" referrerPolicy="no-referrer" />
            <strong className="pull-focus-card-name">{focusedPlayer.name}</strong>
          </span>
        </button>
      )}
    </main>
  );
}
