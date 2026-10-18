type Props = { kind: 'speech' | 'agents' | 'product' | 'mechanism' | 'grasping' }

// Abstract diagrams, not screenshots or representations of proprietary systems.
export default function ProjectIllustration({ kind }: Props) {
  return (
    <svg viewBox="0 0 280 110" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === 'speech' && (
          <>
            <path d="M25 55h20m8-9v18m9-28v38m9-50v62m9-39v16m9-28v38m9-55v72m9-45v18m9-33v48m9-37v26m9-18v10m9-5h18" />
            <path strokeDasharray="3 4" d="M159 55h24" />
            <rect x="191" y="20" width="64" height="70" rx="5" />
            <path d="M204 36h27m-27 10h38m-38 10h31m-31 10h38m-38 10h19" />
          </>
        )}
        {kind === 'agents' && (
          <>
            <path d="M52 55h46m44 0h40m-62-18V20h75m-75 53v17h75" />
            <rect x="22" y="38" width="30" height="34" rx="9" />
            <path d="m31 49 6 5-6 5m9 1h5" />
            <rect x="98" y="33" width="44" height="44" rx="12" />
            <circle cx="120" cy="55" r="9" />
            <rect x="195" y="10" width="54" height="20" rx="5" />
            <rect x="182" y="44" width="67" height="22" rx="5" />
            <rect x="195" y="80" width="54" height="20" rx="5" />
            <path d="m205 20 4 4 8-8m-25 39h21m-8 35h25" />
          </>
        )}
        {kind === 'product' && (
          <>
            <rect x="39" y="13" width="202" height="84" rx="5" />
            <path d="M39 28h202m-139 0v69" />
            <circle cx="48" cy="21" r="1" />
            <circle cx="56" cy="21" r="1" />
            <circle cx="64" cy="21" r="1" />
            <path d="M51 43h36m-36 11h25m-25 11h31m-31 11h17m47-33h48m-48 12h96m-96 10h80m-80 10h90m-90 10h54" />
            <circle cx="219" cy="44" r="5" />
          </>
        )}
        {kind === 'grasping' && (
          <>
            <path
              strokeDasharray="3 4"
              d="M36 86Q65 10 142 38M36 86Q115 98 146 52M36 86Q92 22 143 46"
            />
            <circle cx="36" cy="86" r="5" />
            <path d="m152 30-8 13 9 17m-1-30 21-9m-20 39 21 8m-3-47 22 5 9 20-10 21-18 1" />
            <rect x="166" y="35" width="23" height="23" rx="4" transform="rotate(-12 177 46)" />
            <path d="M212 20v67m-8 0h16M24 97h201" />
          </>
        )}
        {kind === 'mechanism' && (
          <>
            <path d="M50 87h175M84 85l39-55 55 34 30-39M123 30l25 52M178 64l-30 18" />
            <circle cx="84" cy="85" r="8" />
            <circle cx="123" cy="30" r="11" />
            <circle cx="178" cy="64" r="8" />
            <circle cx="208" cy="25" r="5" />
            <path strokeDasharray="3 4" d="M123 13v80M65 64h162" />
          </>
        )}
      </g>
    </svg>
  )
}
