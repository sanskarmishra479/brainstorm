import type { ReactNode } from 'react';

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const PointerIcon = () => (
  <Icon>
    <path d="M5 3.5l13.5 6.8-5.8 1.9-2 5.8z" />
  </Icon>
);

export const HandIcon = () => (
  <Icon>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v8M14 11.5V5.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a6 6 0 0 1-5-2.7L3.3 15a1.5 1.5 0 0 1 2.4-1.8L8 15" />
  </Icon>
);

export const AddCardIcon = () => (
  <Icon>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </Icon>
);

export const TextIcon = () => (
  <Icon>
    <path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6" />
  </Icon>
);

export const GroupIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M3 9h18" />
  </Icon>
);

export const UngroupIcon = () => (
  <Icon size={16}>
    <rect x="3" y="4" width="18" height="16" rx="3" strokeDasharray="3 3" />
    <path d="M3 9h18" />
  </Icon>
);

export const ZoomInIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4M11 8v6M8 11h6" />
  </Icon>
);

export const ZoomOutIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4M8 11h6" />
  </Icon>
);

export const FitIcon = () => (
  <Icon>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
  </Icon>
);

export const UndoIcon = () => (
  <Icon>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
);

export const RedoIcon = () => (
  <Icon>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Icon>
);

export const SidebarIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon size={16}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const PencilIcon = () => (
  <Icon size={15}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
  </Icon>
);

export const TrashIcon = () => (
  <Icon size={16}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);

export const ImageIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M21 16l-5-5-9 9" />
  </Icon>
);

export const LinkIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);

export const ExternalIcon = () => (
  <Icon size={14}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Icon>
);

export const BoldIcon = () => (
  <Icon size={15}>
    <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" strokeWidth={2.2} />
  </Icon>
);

export const ItalicIcon = () => (
  <Icon size={15}>
    <path d="M10 5h8M6 19h8M14 5l-4 14" />
  </Icon>
);

export const StrikeIcon = () => (
  <Icon size={15}>
    <path d="M4 12h16M16 6.5C15 5 13.6 4.5 12 4.5c-2.5 0-4 1.3-4 3.2 0 1.2.6 2 1.8 2.6M8 17.5c1 1.5 2.4 2 4 2 2.6 0 4.2-1.3 4.2-3.3 0-.8-.2-1.5-.7-2" />
  </Icon>
);

export const HeadingIcon = () => (
  <Icon size={15}>
    <path d="M6 5v14M18 5v14M6 12h12" />
  </Icon>
);

export const BulletListIcon = () => (
  <Icon size={15}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <circle cx="5" cy="6" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="5" cy="18" r="1" fill="currentColor" />
  </Icon>
);

export const NumberListIcon = () => (
  <Icon size={15}>
    <path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2.5-3 4h3" />
  </Icon>
);

export const CheckListIcon = () => (
  <Icon size={15}>
    <rect x="3.5" y="4" width="6" height="6" rx="1.5" />
    <path d="M5 7l1.2 1.2L8.5 6M13 7h8M3.5 15.5h6v-.5M13 17h8" />
    <rect x="3.5" y="14" width="6" height="6" rx="1.5" />
  </Icon>
);

export const SearchIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);

export const GridIcon = () => (
  <Icon>
    <path d="M4 9h16M4 15h16M9 4v16M15 4v16" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </Icon>
);

export const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Icon>
);

export const MonitorIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
);

export const MoreIcon = () => (
  <Icon>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" />
  </Icon>
);

export const DownloadIcon = () => (
  <Icon size={16}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icon>
);

export const UploadIcon = () => (
  <Icon size={16}>
    <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
  </Icon>
);

export const TidyIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="3" y="9" width="6" height="6" rx="1.5" />
    <rect x="15" y="3" width="6" height="6" rx="1.5" />
    <rect x="15" y="15" width="6" height="6" rx="1.5" />
    <path d="M9 12h3M12 6v12M12 6h3M12 18h3" />
  </Icon>
);

export const KeyboardIcon = () => (
  <Icon size={16}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </Icon>
);

export const MapIcon = () => (
  <Icon>
    <path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4L15 6.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Icon>
);

export const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
  </svg>
);

export const RefreshIcon = () => (
  <Icon size={16}>
    <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" />
  </Icon>
);

export const CopyIcon = () => (
  <Icon size={16}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const CutIcon = () => (
  <Icon size={16}>
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8 16.5L18 4M16 16.5L6 4" />
  </Icon>
);

export const PasteIcon = () => (
  <Icon size={16}>
    <rect x="5" y="5" width="14" height="16" rx="2.5" />
    <path d="M9 5V3.5h6V5M9 12h6M9 16h4" />
  </Icon>
);

export const DuplicateIcon = () => (
  <Icon size={16}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M14 11v6M11 14h6M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const BringFrontIcon = () => (
  <Icon size={16}>
    <rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" fillOpacity={0.15} />
    <path d="M4 14V6a2 2 0 0 1 2-2h8" strokeDasharray="2 2" />
  </Icon>
);

export const SendBackIcon = () => (
  <Icon size={16}>
    <rect x="4" y="4" width="12" height="12" rx="2" strokeDasharray="2 2" />
    <path d="M20 10v8a2 2 0 0 1-2 2h-8" />
  </Icon>
);

export const ConnectIcon = () => (
  <Icon size={16}>
    <rect x="2.5" y="8" width="7" height="8" rx="2" />
    <path d="M9.5 12h5M17 9v6M14 12h6" />
  </Icon>
);

export const CollapseIcon = () => (
  <Icon size={16}>
    <path d="M7 9l5 5 5-5" />
  </Icon>
);

export const SelectAllIcon = () => (
  <Icon size={16}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" strokeDasharray="3 3" />
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
  </Icon>
);

export const CaretIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M1.5 3h7L5 7.5z" fill="currentColor" />
  </svg>
);
