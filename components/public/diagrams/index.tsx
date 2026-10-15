import type { ReactNode } from "react";

/**
 * Schematic service diagrams, drawn in the catalogue's line style: bronze linework on ink.
 * They are explanatory illustrations, not engineering drawings; only the ranges already
 * published on the service pages (bore 150-300 mm, survey to 800 m, casing 100-500 mm,
 * recharge bores up to 40 m) appear as figures.
 */
const BRONZE = "#D2A65A";
const WATER = "#6BB8CC";
const PAPER = "#F6F2EA";
const SOIL = "rgba(246,242,234,.07)";

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 960 520" role="img" aria-label={title} className="h-auto w-full" fontFamily="var(--font-text), system-ui, sans-serif">
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** A label with a thin leader line from (x1,y1) to the text at (x2,y2). */
function Tag({ x1, y1, x2, y2, children, end = false }: { x1: number; y1: number; x2: number; y2: number; children: ReactNode; end?: boolean }) {
  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={BRONZE} strokeWidth="1" opacity=".7" />
      <circle cx={x1} cy={y1} r="3" fill={BRONZE} />
      <text x={end ? x2 - 8 : x2 + 8} y={y2 + 4} fill={PAPER} fontSize="15" textAnchor={end ? "end" : "start"}>{children}</text>
    </g>
  );
}

function Ground({ top = 150, water = 360, labelRight = false }: { top?: number; water?: number; labelRight?: boolean }) {
  return (
    <g>
      <rect x="0" y={top} width="960" height={520 - top} fill={SOIL} />
      <rect x="0" y={top + 90} width="960" height="70" fill="rgba(246,242,234,.05)" />
      <rect x="0" y={water} width="960" height={520 - water} fill={WATER} opacity=".13" />
      <path d={`M0 ${top}H960`} stroke={PAPER} strokeWidth="2" opacity=".6" />
      <path d={`M0 ${water}H960`} stroke={WATER} strokeWidth="1.5" strokeDasharray="6 6" opacity=".8" />
      <text x={labelRight ? 936 : 24} y={top - 10} textAnchor={labelRight ? "end" : "start"} fill={PAPER} fontSize="13" opacity=".55" letterSpacing="2">GROUND LEVEL</text>
      <text x="24" y={water - 8} fill={WATER} fontSize="13" letterSpacing="2">WATER-BEARING ZONE</text>
    </g>
  );
}

export function SurveyDiagram() {
  const stakes = [150, 270, 390, 510, 630];
  return (
    <Frame title="Ground survey: electrodes along the surface map water-bearing zones down to 800 metres">
      <Ground top={130} water={330} />
      {stakes.map((x) => (
        <g key={x}>
          <path d={`M${x} 100V140`} stroke={BRONZE} strokeWidth="3" />
          <path d={`M${x} 100Q${x + 60} 60 ${x + 120} 100`} fill="none" stroke={BRONZE} strokeWidth="1" opacity=".5" />
        </g>
      ))}
      <rect x="690" y="70" width="86" height="54" rx="8" fill="none" stroke={BRONZE} strokeWidth="2" />
      <circle cx="715" cy="97" r="9" fill="none" stroke={BRONZE} />
      <path d="M740 90h24M740 104h24" stroke={BRONZE} />
      <path d="M630 100H690" stroke={BRONZE} strokeWidth="1.5" />
      {[1, 2, 3, 4].map((n) => (
        <path key={n} d={`M${150 + n * 0} 140 Q${390} ${140 + n * 62} ${630} 140`} fill="none" stroke={BRONZE} strokeWidth="1" opacity={0.55 - n * 0.08} />
      ))}
      <ellipse cx="400" cy="372" rx="170" ry="26" fill={WATER} opacity=".28" />
      <path d="M400 130V372" stroke={PAPER} strokeWidth="2" strokeDasharray="3 6" />
      <circle cx="400" cy="130" r="7" fill={BRONZE} />
      <Tag x1={400} y1={372} x2={640} y2={430}>Water-bearing zone located</Tag>
      <Tag x1={400} y1={130} x2={470} y2={30}>Recommended drilling point and depth</Tag>
      <Tag x1={690} y1={97} x2={800} y2={60}>Resistivity meter</Tag>
      <path d="M880 130V500M870 130h20M870 500h20" stroke={PAPER} strokeWidth="1" opacity=".5" />
      <text x="868" y="238" fill={PAPER} fontSize="14" textAnchor="end" opacity=".85">survey reach</text>
      <text x="868" y="260" fill={BRONZE} fontSize="18" fontWeight="700" textAnchor="end">up to 800 m</text>
    </Frame>
  );
}

export function BorewellDiagram() {
  return (
    <Frame title="Borewell section: 150 to 300 millimetre bore with uPVC casing through to the aquifer">
      <Ground top={110} water={340} />
      <rect x="440" y="96" width="80" height="14" fill="none" stroke={BRONZE} strokeWidth="2" />
      <rect x="452" y="110" width="56" height="230" fill="none" stroke={PAPER} strokeWidth="2" opacity=".9" />
      <path d="M440 110v230M520 110v230" stroke={BRONZE} strokeWidth="1" strokeDasharray="4 4" opacity=".6" />
      <rect x="452" y="340" width="56" height="130" fill="none" stroke={PAPER} strokeWidth="2" strokeDasharray="5 4" />
      <g stroke={PAPER} opacity=".6">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M452 ${352 + i * 14}h56`} />)}</g>
      <rect x="440" y="150" width="80" height="60" fill={BRONZE} opacity=".14" />
      <Tag x1={452} y1={230} x2={320} y2={230} end>uPVC casing, 10 kg/cm²</Tag>
      <Tag x1={520} y1={180} x2={640} y2={150}>Aquifer isolation by casing</Tag>
      <Tag x1={508} y1={410} x2={640} y2={410}>Slotted pipe in the aquifer</Tag>
      <Tag x1={440} y1={470} x2={320} y2={490} end>Developed until the water runs clear</Tag>
      <path d="M580 200H820M580 200v0M820 200" stroke="none" />
      <path d="M850 110v360M840 110h20M840 470h20" stroke={PAPER} opacity=".5" />
      <text x="838" y="230" fill={PAPER} fontSize="14" textAnchor="end" opacity=".85">bore diameter</text>
      <text x="838" y="252" fill={BRONZE} fontSize="18" fontWeight="700" textAnchor="end">150–300 mm</text>
    </Frame>
  );
}

export function TubewellDiagram() {
  return (
    <Frame title="Tubewell section: casing, slotted filter pipe with gravel pack, submersible pump on a rising main">
      <Ground top={120} water={330} />
      <rect x="640" y="70" width="70" height="50" rx="6" fill="none" stroke={BRONZE} strokeWidth="2" />
      <path d="M650 90h50M650 104h30" stroke={BRONZE} />
      <path d="M640 100H500" stroke={BRONZE} strokeWidth="1.5" />
      <rect x="430" y="100" width="70" height="20" fill="none" stroke={BRONZE} strokeWidth="2" />
      <rect x="440" y="120" width="50" height="200" fill="none" stroke={PAPER} strokeWidth="2" />
      <rect x="440" y="320" width="50" height="150" fill="none" stroke={PAPER} strokeWidth="2" strokeDasharray="5 4" />
      <rect x="418" y="320" width="22" height="150" fill={BRONZE} opacity=".22" />
      <rect x="490" y="320" width="22" height="150" fill={BRONZE} opacity=".22" />
      <path d="M465 120V380" stroke={WATER} strokeWidth="6" opacity=".7" />
      <path d="M476 120V380" stroke={BRONZE} strokeWidth="2" />
      <rect x="450" y="380" width="30" height="64" rx="8" fill="none" stroke={BRONZE} strokeWidth="2.5" />
      <Tag x1={700} y1={95} x2={790} y2={70}>Starter panel</Tag>
      <Tag x1={440} y1={200} x2={300} y2={200} end>Casing</Tag>
      <Tag x1={500} y1={250} x2={640} y2={235}>HDPE rising main and cable</Tag>
      <Tag x1={512} y1={400} x2={640} y2={400}>Gravel pack around slotted pipe</Tag>
      <Tag x1={450} y1={412} x2={300} y2={430} end>Stainless-steel submersible pump</Tag>
      <Tag x1={430} y1={110} x2={300} y2={70} end>Well-head assembly</Tag>
    </Frame>
  );
}

export function RechargeDiagram() {
  return (
    <Frame title="Rainwater recharge: runoff passes a silt chamber and filter chamber, then a recharge bore returns it to the ground">
      <Ground top={170} water={400} labelRight />
      <path d="M40 150L200 110V160" fill="none" stroke={PAPER} strokeWidth="2" opacity=".7" />
      <path d="M60 90q30 30 20 60M110 80q28 34 16 62M160 78q24 34 12 56" fill="none" stroke={WATER} strokeWidth="2" opacity=".8" />
      <rect x="250" y="190" width="120" height="70" fill="none" stroke={PAPER} strokeWidth="2" />
      <rect x="400" y="190" width="120" height="70" fill="none" stroke={PAPER} strokeWidth="2" />
      <path d="M404 232h112" stroke={BRONZE} strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M200 160H250M370 225H400M520 225H540V190" fill="none" stroke={WATER} strokeWidth="2.5" />
      <rect x="520" y="170" width="40" height="14" fill="none" stroke={BRONZE} strokeWidth="2" />
      <rect x="528" y="184" width="24" height="216" fill="none" stroke={PAPER} strokeWidth="2" />
      <rect x="510" y="260" width="12" height="140" fill={BRONZE} opacity=".22" />
      <rect x="558" y="260" width="12" height="140" fill={BRONZE} opacity=".22" />
      <path d="M540 260V400" stroke={WATER} strokeWidth="5" opacity=".6" />
      <Tag x1={310} y1={190} x2={250} y2={140}>Silt chamber</Tag>
      <Tag x1={460} y1={190} x2={420} y2={140}>Filter chamber</Tag>
      <Tag x1={570} y1={320} x2={640} y2={300}>Recharge bore, up to 40 m</Tag><Tag x1={558} y1={360} x2={640} y2={350}>Slotted pipe in pea gravel</Tag>
      <Tag x1={540} y1={400} x2={640} y2={440}>Returns water to the aquifer</Tag>
    </Frame>
  );
}
