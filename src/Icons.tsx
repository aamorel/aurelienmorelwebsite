export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export function DanceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 17V5l11-2v12M9 9l11-2" />
      <ellipse cx="6" cy="18" rx="3" ry="2" />
      <ellipse cx="17" cy="16" rx="3" ry="2" />
    </svg>
  )
}

export function TrackIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    </svg>
  )
}

export function RobotIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      width="36"
      height="36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 34h22M17 33v-9L9 14l12-7 10 11M28 20l-1 6m7-7 3 5" />
      <circle cx="17" cy="24" r="2.5" fill="var(--paper)" />
      <circle cx="9" cy="14" r="2.5" fill="var(--paper)" />
      <circle cx="21" cy="7" r="2.5" fill="var(--paper)" />
    </svg>
  )
}

export function ObjectIcon({ kind }: { kind: Section | 'contact' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="23"
      height="23"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'education' ? (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 3v18m4-13h3m-3 4h3" />
        </>
      ) : kind === 'work' ? (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5m8 4.5v9" />
        </>
      ) : kind === 'publications' ? (
        <>
          <path d="M8 3h11v14H8zM5 7v14h11" />
          <path d="M11 7h5m-5 3h5m-5 3h3" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      )}
    </svg>
  )
}
import type { Section } from './content'
