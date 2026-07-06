export const CLASSES = [
  'Artificier',
  'Barbare',
  'Barde',
  'Clerc',
  'Druide',
  'Ensorceleur',
  'Guerrier',
  'Magicien',
  'Moine',
  'Occultiste',
  'Paladin',
  'Ranger',
  'Rogue',
  'Autre'
];

export function ClassIcon({ classe, width, height }) {
  const common = {
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.6',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {})
  };

  switch (classe) {
    case 'Artificier':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="6" />
          <line x1="16" y1="4" x2="16" y2="9" />
          <line x1="16" y1="23" x2="16" y2="28" />
          <line x1="4" y1="16" x2="9" y2="16" />
          <line x1="23" y1="16" x2="28" y2="16" />
          <line x1="7.5" y1="7.5" x2="11" y2="11" />
          <line x1="21" y1="21" x2="24.5" y2="24.5" />
          <line x1="24.5" y1="7.5" x2="21" y2="11" />
          <line x1="11" y1="21" x2="7.5" y2="24.5" />
        </svg>
      );
    case 'Barbare':
      return (
        <svg {...common}>
          <path d="M5 24L11 8L16 20L21 8L27 24" />
        </svg>
      );
    case 'Barde':
      return (
        <svg {...common}>
          <circle cx="13" cy="20" r="6" />
          <line x1="17" y1="16" x2="26" y2="7" />
          <line x1="23.5" y1="6.5" x2="27" y2="10" />
        </svg>
      );
    case 'Clerc':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="5" />
          <line x1="16" y1="4" x2="16" y2="9" />
          <line x1="16" y1="23" x2="16" y2="28" />
          <line x1="4" y1="16" x2="9" y2="16" />
          <line x1="23" y1="16" x2="28" y2="16" />
        </svg>
      );
    case 'Druide':
      return (
        <svg {...common}>
          <path d="M16 5C22 8 26 14 22 22C18 28 10 27 8 21C6 15 10 8 16 5Z" />
          <line x1="16" y1="6" x2="12" y2="24" />
        </svg>
      );
    case 'Ensorceleur':
      return (
        <svg {...common}>
          <path d="M22 10C20 7 13 7 12 12C11 17 19 17 18 21C17 25 11 24 10 21" />
        </svg>
      );
    case 'Guerrier':
      return (
        <svg {...common}>
          <path d="M16 4L26 8V16C26 22 21 27 16 29C11 27 6 22 6 16V8L16 4Z" />
        </svg>
      );
    case 'Magicien':
      return (
        <svg {...common}>
          <path d="M16 4L19 13H28L21 19L23 28L16 22L9 28L11 19L4 13H13Z" />
        </svg>
      );
    case 'Moine':
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="10" />
          <path d="M16 6C22 6 22 16 16 16C10 16 10 26 16 26" />
        </svg>
      );
    case 'Occultiste':
      return (
        <svg {...common}>
          <path d="M4 16C8 9 24 9 28 16C24 23 8 23 4 16Z" />
          <circle cx="16" cy="16" r="3.4" />
        </svg>
      );
    case 'Paladin':
      return (
        <svg {...common}>
          <path d="M16 4L26 8V16C26 22 21 27 16 29C11 27 6 22 6 16V8L16 4Z" />
          <line x1="16" y1="10" x2="16" y2="22" />
          <line x1="11" y1="16" x2="21" y2="16" />
        </svg>
      );
    case 'Ranger':
      return (
        <svg {...common}>
          <path d="M16 26V6" />
          <path d="M9 13L16 6L23 13" />
          <path d="M6 22C10 17 22 17 26 22" />
        </svg>
      );
    case 'Rogue':
      return (
        <svg {...common}>
          <path d="M16 4L18.5 16L16 28L13.5 16Z" />
          <line x1="10" y1="14" x2="22" y2="14" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="10" />
          <text x="16" y="21" fontSize="14" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="serif">
            ?
          </text>
        </svg>
      );
  }
}
