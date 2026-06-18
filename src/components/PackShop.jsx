import { Badge, Flame, PackageOpen, Trophy } from "lucide-react";

const PACK_ICONS = {
  standard: Badge,
  jumbo: PackageOpen,
  elite: Flame,
  mvp: Trophy,
};

function PackButton({ pack, cash, disabled, onOpenPack }) {
  const Icon = PACK_ICONS[pack.id] ?? PackageOpen;

  return (
    <button
      className={`pack-card pack-art pack-${pack.id}`}
      style={{ "--pack-top": pack.colors?.[0], "--pack-bottom": pack.colors?.[1] }}
      disabled={disabled || cash < pack.cost}
      onClick={() => onOpenPack(pack)}
    >
      <div className="pack-art-top">
        <Icon size={20} />
        <em>${pack.cost.toLocaleString()}</em>
      </div>
      <strong>{pack.name}</strong>
      <span>
        {pack.amount} players
        {pack.refreshesIn ? <small>{pack.refreshesIn}</small> : null}
      </span>
      <div className="pack-stripes" aria-hidden="true" />
    </button>
  );
}

export default function PackShop({ packs, cash, disabled = false, onOpenPack }) {
  return (
    <section className="pack-shop">
      <div className="section-header">
        <h2>Pack Shop</h2>
        <span>Target the roster</span>
      </div>
      <div className="pack-grid">
        {packs.map((pack) => (
          <PackButton
            key={pack.id}
            pack={pack}
            cash={cash}
            disabled={disabled}
            onOpenPack={onOpenPack}
          />
        ))}
      </div>
    </section>
  );
}
