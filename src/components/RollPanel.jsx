import { RotateCcw, Sparkles, Zap } from "lucide-react";

export default function RollPanel({
  energy,
  maxEnergy,
  cash,
  rolls,
  canRoll,
  isRolling,
  onRoll,
  onReset,
  nextEnergyText,
}) {
  return (
    <section className="roll-panel">
      <div className="wallet">
        <div>
          <span className="wallet-label">Energy</span>
          <strong><Zap size={16} /> {energy}/{maxEnergy}</strong>
          <small>{nextEnergyText}</small>
        </div>
        <div>
          <span className="wallet-label">Cash</span>
          <strong>${cash.toLocaleString()}</strong>
          <small>{rolls} rolls</small>
        </div>
      </div>

      <button className="roll-button" onClick={onRoll} disabled={!canRoll}>
        <Sparkles size={22} />
        {isRolling ? "ROLLING" : "ROLL"}
      </button>

      <button className="icon-command" onClick={onReset} aria-label="Reset save" title="Reset save">
        <RotateCcw size={18} />
      </button>
    </section>
  );
}
