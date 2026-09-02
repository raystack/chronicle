/**
 * Chronicle's icon set.
 *
 * Every icon is a Lucide drawing, the same family Apsara draws with. Import
 * icons from here rather than from `lucide-react` directly, so one idea keeps
 * one drawing across the whole site.
 *
 * Icons Apsara already ships are re-exported under Apsara's own key, so a
 * `<Theme icons>` override reaches Apsara's components and Chronicle's pages
 * alike. The rest are built with `createIcon`, which gives them the same 16px
 * frame, the same 1.5 stroke, and the same `data-icon` attribute.
 */
export {
  ChevronDownIcon,
  ChevronRightIcon,
  /** Copies the page as markdown. */
  CopyIcon,
  /** A documentation page. */
  FileTextIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  /** An error state. Draws a warning triangle. */
  WarningIcon,
  /** Closes a dialog or panel. */
  XIcon
} from '@raystack/apsara/icons';

import { createIcon } from '@raystack/apsara/icons';
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronUp,
  CircleQuestionMark,
  Code,
  Eye,
  File,
  Folder,
  Hash,
  History,
  Layers,
  Menu,
  Play,
  Sparkles,
  SlidersHorizontal,
  SquareCode
} from 'lucide-react';

/** An API reference section. */
export const ApiIcon = createIcon('ApiIcon', SquareCode);
export const ArrowLeftIcon = createIcon('ArrowLeftIcon', ArrowLeft);
export const ArrowRightIcon = createIcon('ArrowRightIcon', ArrowRight);
export const BookOpenIcon = createIcon('BookOpenIcon', BookOpen);
export const ChevronUpIcon = createIcon('ChevronUpIcon', ChevronUp);
/** A code block or an API endpoint. */
export const CodeIcon = createIcon('CodeIcon', Code);
export const EyeIcon = createIcon('EyeIcon', Eye);
/** A page with no text match — the fallback search result. */
export const FileIcon = createIcon('FileIcon', File);
export const FolderIcon = createIcon('FolderIcon', Folder);
/** A heading match in search results. */
export const HashIcon = createIcon('HashIcon', Hash);
export const HelpIcon = createIcon('HelpIcon', CircleQuestionMark);
/** Recent requests in the API playground. */
export const HistoryIcon = createIcon('HistoryIcon', History);
export const LayersIcon = createIcon('LayersIcon', Layers);
/** Opens the mobile navigation. */
export const MenuIcon = createIcon('MenuIcon', Menu);
/** Sends a request in the API playground. */
export const PlayIcon = createIcon('PlayIcon', Play);
/** Reader display settings. */
export const SettingsIcon = createIcon('SettingsIcon', SlidersHorizontal);
/** Marks an AI affordance. Shares a drawing with Apsara's `CoPilotIcon`. */
export const SparklesIcon = createIcon('SparklesIcon', Sparkles);
/** Opens the table of contents. */
export const TocIcon = createIcon('TocIcon', AlignLeft);
