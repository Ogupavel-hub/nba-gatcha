import { useEffect, useRef, useState } from "react";
import { Hand, Shield, Swords, X } from "lucide-react";

const BULLS_RATING = 96;
const BULLS_HP = BULLS_RATING * 3;
const BULLS_DAMAGE = 50;
const NEXT_ATTACK_DELAY_MS = 250;
const ATTACK_DURATION_MS = 4000;
const BLOCK_WINDOW_START = 0.68;
const STEAL_WINDOW_START = 0.84;
const DEFENSE_WINDOW_END = 0.99;
const WIN_REWARD = 480;
const BULLS_ATTACK_MESSAGES = [
  "Jordan with a 3-point shot!",
  "Pippen attacks the paint!",
  "Rodman crashes the glass!",
];
const SHATTER_SHARDS = [
  { x: -130, y: -90, r: -55 },
  { x: -55, y: -145, r: 28 },
  { x: 45, y: -150, r: -24 },
  { x: 130, y: -90, r: 62 },
  { x: -155, y: -10, r: -82 },
  { x: -90, y: 75, r: 44 },
  { x: 90, y: 70, r: -46 },
  { x: 155, y: -5, r: 84 },
  { x: -95, y: 145, r: -38 },
  { x: -20, y: 165, r: 58 },
  { x: 55, y: 150, r: -65 },
  { x: 125, y: 120, r: 42 },
];

function playWinSound() {
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/nba-jam-on-fire.mp3`);
  audio.volume = 0.75;
  audio.play().catch(() => {});
}

function playPlayerAttackSound() {
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/boss-attack-swish.mp3`);
  audio.volume = 0.62;
  audio.play().catch(() => {});
}

function getBattlePower(player) {
  return player.value;
}

function PlayerSlot({ player, fighter, power, targeted, selected, inCombat, onClick }) {
  const hp = fighter?.hp ?? power;
  const maxHp = fighter?.maxHp ?? power;
  const isDead = fighter ? fighter.hp <= 0 : false;

  return (
    <button
      className={[
        "battle-slot",
        player ? "is-filled" : "",
        targeted ? "is-targeted" : "",
        selected ? "is-selected" : "",
        isDead ? "is-dead" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={!player || isDead}
    >
      {targeted && <span className="timing-zone block-zone" aria-hidden="true" />}
      {targeted && <span className="timing-zone steal-zone" aria-hidden="true" />}
      {player ? (
        <>
          <img src={player.headshot} alt="" referrerPolicy="no-referrer" />
          <strong>{player.name}</strong>
          <span className="battle-player-value">{power}</span>
          {inCombat && (
            <div className="battle-player-health">
              <div style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }} />
              <span>{hp}/{maxHp}</span>
            </div>
          )}
        </>
      ) : (
        <span className="battle-empty-slot">Empty</span>
      )}
    </button>
  );
}

export default function BattlePanel({ players, collection, onReward, onClose }) {
  const [slots, setSlots] = useState([null, null, null]);
  const [phase, setPhase] = useState("menu");
  const [enemyHp, setEnemyHp] = useState(BULLS_HP);
  const [fighters, setFighters] = useState([]);
  const [battleLog, setBattleLog] = useState([]);
  const [targetIndex, setTargetIndex] = useState(null);
  const [activeFighterIndex, setActiveFighterIndex] = useState(0);
  const [attackProgress, setAttackProgress] = useState(0);
  const [combatMessage, setCombatMessage] = useState("Build your lineup.");
  const fightersRef = useRef([]);
  const attackStartedAtRef = useRef(0);
  const attackTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const nextAttackTimerRef = useRef(null);
  const attackResolvedRef = useRef(false);
  const bossMovementAudioRef = useRef(null);

  useEffect(() => {
    fightersRef.current = fighters;
  }, [fighters]);

  useEffect(() => () => clearBattleTimers(), []);

  const ownedPlayers = players.filter((player) => collection[player.id]);
  const selectedIds = new Set(slots.filter(Boolean));
  const selectedPlayers = slots.map((id) => players.find((player) => player.id === id) ?? null);
  const inCombat = phase !== "menu";
  const displayedPlayers = inCombat ? fighters.map((fighter) => fighter.player) : selectedPlayers;
  const teamPower = selectedPlayers.reduce(
    (sum, player) => sum + (player ? getBattlePower(player) : 0),
    0,
  );
  const activeFighter = fighters[activeFighterIndex];

  function clearBattleTimers() {
    window.clearTimeout(attackTimerRef.current);
    window.clearTimeout(nextAttackTimerRef.current);
    window.clearInterval(progressTimerRef.current);
    stopBossMovementSound();
  }

  function startBossMovementSound() {
    stopBossMovementSound();
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/boss-movement-bounce.mp3`);
    audio.volume = 0.48;
    audio.loop = true;
    bossMovementAudioRef.current = audio;
    audio.play().catch(() => {});
  }

  function stopBossMovementSound() {
    const audio = bossMovementAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    bossMovementAudioRef.current = null;
  }

  function selectPlayer(player) {
    if (phase !== "menu") return;
    setSlots((current) => {
      if (current.includes(player.id)) return current.map((id) => (id === player.id ? null : id));
      const emptyIndex = current.findIndex((id) => !id);
      if (emptyIndex === -1) return [current[1], current[2], player.id];
      const next = [...current];
      next[emptyIndex] = player.id;
      return next;
    });
  }

  function scheduleEnemyAttack() {
    setPhase("waiting");
    setTargetIndex(null);
    setAttackProgress(0);
    nextAttackTimerRef.current = window.setTimeout(beginEnemyAttack, NEXT_ATTACK_DELAY_MS);
  }

  function beginEnemyAttack() {
    const aliveIndexes = fightersRef.current
      .map((fighter, index) => (fighter.hp > 0 ? index : -1))
      .filter((index) => index >= 0);
    if (!aliveIndexes.length) {
      setPhase("lose");
      return;
    }

    const nextTarget = aliveIndexes[Math.floor(Math.random() * aliveIndexes.length)];
    attackResolvedRef.current = false;
    attackStartedAtRef.current = Date.now();
    setTargetIndex(nextTarget);
    setAttackProgress(0);
    setPhase("enemy-attack");
    startBossMovementSound();
    setCombatMessage(BULLS_ATTACK_MESSAGES[Math.floor(Math.random() * BULLS_ATTACK_MESSAGES.length)]);
    setBattleLog((log) => [`Bulls target ${fightersRef.current[nextTarget].player.name}.`, ...log].slice(0, 5));

    progressTimerRef.current = window.setInterval(() => {
      setAttackProgress(Math.min(1, (Date.now() - attackStartedAtRef.current) / ATTACK_DURATION_MS));
    }, 40);
    attackTimerRef.current = window.setTimeout(() => resolveEnemyAttack(nextTarget), ATTACK_DURATION_MS);
  }

  function finishEnemyAttack(nextPhase = "player-attack") {
    window.clearTimeout(attackTimerRef.current);
    window.clearInterval(progressTimerRef.current);
    stopBossMovementSound();
    attackResolvedRef.current = true;
    setAttackProgress(1);
    setPhase(nextPhase);
  }

  function resolveEnemyAttack(index) {
    if (attackResolvedRef.current) return;
    const nextFighters = fightersRef.current.map((fighter, fighterIndex) =>
      fighterIndex === index ? { ...fighter, hp: Math.max(0, fighter.hp - BULLS_DAMAGE) } : fighter,
    );
    fightersRef.current = nextFighters;
    setFighters(nextFighters);
    setCombatMessage(`${fightersRef.current[index].player.name} takes ${BULLS_DAMAGE} damage!`);
    setBattleLog((log) => [`Hit for ${BULLS_DAMAGE}.`, ...log].slice(0, 5));

    if (nextFighters.every((fighter) => fighter.hp <= 0)) {
      finishEnemyAttack("lose");
      return;
    }

    const nextAttacker = nextFighters[index]?.hp > 0
      ? index
      : nextFighters.findIndex((fighter) => fighter.hp > 0);
    setActiveFighterIndex(nextAttacker);
    finishEnemyAttack();
  }

  function handleDefense(type) {
    if (phase !== "enemy-attack" || attackResolvedRef.current) return;
    const progress = (Date.now() - attackStartedAtRef.current) / ATTACK_DURATION_MS;
    const inGreenZone = progress >= BLOCK_WINDOW_START && progress < DEFENSE_WINDOW_END;
    const inRedZone = progress >= STEAL_WINDOW_START && progress < DEFENSE_WINDOW_END;
    const success = type === "steal" ? inRedZone : inGreenZone;

    if (!success) {
      setCombatMessage(`${type === "steal" ? "Steal" : "Block"} missed!`);
      setBattleLog((log) => [`${type === "steal" ? "Steal" : "Block"} missed.`, ...log].slice(0, 5));
      resolveEnemyAttack(targetIndex);
      return;
    }

    setActiveFighterIndex(targetIndex);
    finishEnemyAttack();

    if (type === "steal") {
      performPlayerAttack(targetIndex, true);
      return;
    }

    setCombatMessage(`${fightersRef.current[targetIndex].player.name} blocks the shot!`);
    setBattleLog((log) => ["Blocked!", ...log].slice(0, 5));
  }

  function startBattle() {
    if (!slots.every(Boolean)) return;
    clearBattleTimers();
    const startingFighters = selectedPlayers.map((player) => {
      const power = getBattlePower(player);
      return { player, power, hp: player.value, maxHp: player.value };
    });
    fightersRef.current = startingFighters;
    setFighters(startingFighters);
    setEnemyHp(BULLS_HP);
    setActiveFighterIndex(0);
    setCombatMessage("Chicago Bulls 96 are ready.");
    setBattleLog(["Battle started. Bulls wind-up lasts 4 seconds."]);
    scheduleEnemyAttack();
  }

  function performPlayerAttack(fighterIndex, fromSteal = false) {
    const fighter = fightersRef.current[fighterIndex];
    if (!fighter || fighter.hp <= 0) return;
    playPlayerAttackSound();
    const nextEnemyHp = Math.max(0, enemyHp - fighter.power);
    setEnemyHp(nextEnemyHp);
    setCombatMessage(
      fromSteal
        ? `${fighter.player.name} steals and scores ${fighter.power}!`
        : `${fighter.player.name} scores ${fighter.power}!`,
    );
    setBattleLog((log) => [
      `${fromSteal ? "Steal counter" : fighter.player.name} hits for ${fighter.power}.`,
      ...log,
    ].slice(0, 5));

    if (nextEnemyHp <= 0) {
      clearBattleTimers();
      setPhase("win");
      setCombatMessage("Chicago Bulls 96 shattered!");
      playWinSound();
      onReward(WIN_REWARD);
      return;
    }

    scheduleEnemyAttack();
  }

  function attackBoss() {
    if (phase !== "player-attack" || !activeFighter || activeFighter.hp <= 0) return;
    performPlayerAttack(activeFighterIndex);
  }

  function resetBattle() {
    clearBattleTimers();
    setPhase("menu");
    setEnemyHp(BULLS_HP);
    setFighters([]);
    fightersRef.current = [];
    setTargetIndex(null);
    setAttackProgress(0);
    setCombatMessage("Build your lineup.");
    setBattleLog([]);
  }

  function closeBattle() {
    clearBattleTimers();
    onClose();
  }

  return (
    <div className="battle-overlay" role="dialog" aria-modal="true" aria-label="Battle">
      <section className="battle-panel battle-screen">
        <div className="section-header">
          <div>
            <h2>Battle</h2>
            <span>Chicago Bulls 96</span>
          </div>
          <button className="battle-close" onClick={closeBattle} aria-label="Close battle">
            <X size={20} />
          </button>
        </div>

        <div className="battle-arena">
          <div className="battle-message-bubble" key={combatMessage}>
            {combatMessage}
          </div>
          <div
            className={[
              "battle-boss-card",
              phase === "enemy-attack" ? "is-attacking" : "",
              phase === "win" ? "is-defeated" : "",
              targetIndex == null ? "" : `target-${targetIndex}`,
            ].filter(Boolean).join(" ")}
            style={{ "--attack-progress": attackProgress }}
          >
            <img src={`${import.meta.env.BASE_URL}bulls-96.png`} alt="" />
            <strong>Chicago Bulls 96</strong>
            <span>{enemyHp}/{BULLS_HP} HP</span>
            <div className="battle-hp" aria-hidden="true">
              <div style={{ width: `${Math.max(0, (enemyHp / BULLS_HP) * 100)}%` }} />
            </div>
            {phase === "win" && (
              <div className="battle-shatter" aria-hidden="true">
                {SHATTER_SHARDS.map((shard, index) => (
                  <span
                    key={index}
                    style={{
                      "--shard-x": `${shard.x}px`,
                      "--shard-y": `${shard.y}px`,
                      "--shard-r": `${shard.r}deg`,
                      "--shard-delay": `${index * 26}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="battle-slots">
            {displayedPlayers.map((player, index) => (
              <PlayerSlot
                key={player?.id ?? index}
                player={player}
                fighter={inCombat ? fighters[index] : null}
                power={player ? getBattlePower(player) : 0}
                targeted={phase === "enemy-attack" && targetIndex === index}
                selected={phase === "player-attack" && activeFighterIndex === index}
                inCombat={inCombat}
                onClick={() => {
                  if (phase === "menu" && player) selectPlayer(player);
                  if (phase === "player-attack" && fighters[index]?.hp > 0) setActiveFighterIndex(index);
                }}
              />
            ))}
          </div>
        </div>

        <div className="battle-controls">
          {phase === "menu" && (
            <button className="battle-start" disabled={!slots.every(Boolean)} onClick={startBattle}>
              <Swords size={16} /> START
            </button>
          )}
          {phase === "waiting" && <span className="battle-status">Bulls prepare</span>}
          {phase === "enemy-attack" && (
            <>
              <button className="battle-block" onClick={() => handleDefense("block")}>
                <Shield size={16} /> BLOCK
              </button>
              <button className="battle-steal" onClick={() => handleDefense("steal")}>
                <Hand size={16} /> STEAL
              </button>
            </>
          )}
          {phase === "player-attack" && (
            <button className="battle-attack" onClick={attackBoss}>
              <Swords size={16} /> ATTACK {activeFighter?.power ?? 0}
            </button>
          )}
          {(phase === "win" || phase === "lose") && (
            <button className="battle-reset" onClick={resetBattle}>
              {phase === "win" ? `WIN +$${WIN_REWARD}` : "TRY AGAIN"}
            </button>
          )}
        </div>

        <div className="battle-summary">
          <span>Team {teamPower}</span>
          <span>Bulls damage {BULLS_DAMAGE}</span>
        </div>

        {phase === "menu" && (
          <div className="battle-roster">
            {ownedPlayers.map((player) => (
              <button
                key={player.id}
                className={`battle-roster-card ${selectedIds.has(player.id) ? "is-selected" : ""}`}
                onClick={() => selectPlayer(player)}
              >
                <img src={player.headshot} alt="" referrerPolicy="no-referrer" />
                <span>{getBattlePower(player)}</span>
              </button>
            ))}
            {!ownedPlayers.length && <div className="battle-empty">Draft players to build a team.</div>}
          </div>
        )}

        {!!battleLog.length && (
          <div className="battle-log">
            {battleLog.map((entry, index) => (
              <span key={`${entry}-${index}`}>{entry}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
