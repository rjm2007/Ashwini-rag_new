"use client";

/**
 * The depot silhouette that sits at the base of every sky header.
 *
 * This is the one motif that carries the "Depot at Dusk" identity down from the
 * 240px hero to the 118px band — without it the band is just a purple box.
 *
 * The path spans the full 1440 viewBox width. An earlier revision stopped at
 * x=1340, which left ~100px of raw gradient showing at the right edge.
 */
export function DepotSkyline({ height, opacity = 1 }: { height: number; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        color: "var(--depot)",
        opacity,
        pointerEvents: "none",
      }}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <path
          fill="currentColor"
          d="M0 120V78h64V52h34v26h58V38h96v40h40V62h74v16h52V30h120v48h44V58h96v20h50V44h108v34h60V64h92v14h56V40h104v38h62V58h84v20h146v42z"
        />
        <g fill="currentColor" opacity="0.9">
          <rect x="180" y="86" width="120" height="26" rx="3" />
          <rect x="300" y="94" width="46" height="18" rx="3" />
          <rect x="640" y="88" width="140" height="24" rx="3" />
          <rect x="780" y="96" width="50" height="16" rx="3" />
          <rect x="1080" y="90" width="130" height="22" rx="3" />
          <rect x="1210" y="98" width="48" height="14" rx="3" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Film grain. Not decoration: a five-stop gradient across 240px bands visibly
 * on 8-bit panels, and this noise layer breaks up the banding.
 */
export function SkyGrain({ opacity = 0.3 }: { opacity?: number }) {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id="depot-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#depot-grain)" />
    </svg>
  );
}
