/** Plain data types shared by components and the generated typings. No runtime code. */

/** One node. Extra fields are allowed and can drive toggle columns (e.g. `visible`, `locked`). */
export interface TreeItem {
  id: string;
  label: string;
  /** Registered icon name. */
  icon?: string;
  /** Image URL shown as a square thumbnail (Photoshop-style layer previews). */
  thumbnail?: string;
  /** Muted secondary text after the label. */
  description?: string;
  /** Present (even empty) = this node can contain others and accepts drops inside. */
  children?: TreeItem[];
  /** Initially expanded. */
  expanded?: boolean;
  disabled?: boolean;
  /** Dim the row (e.g. hidden layers). */
  muted?: boolean;
  renamable?: boolean;
  [key: string]: unknown;
}

/** A per-row on/off column such as visibility or lock. */
export interface TreeToggle {
  /** Item field it reads and reports, e.g. "visible". */
  key: string;
  label: string;
  icon: string;
  /** Icon when off. Defaults to `icon`, drawn faint. */
  offIcon?: string;
  /** Value when the item doesn't have the field. Default false. */
  default?: boolean;
  /** start = before the indent (Photoshop eye). end = right edge (Figma). Default end. */
  position?: "start" | "end";
  /** always, or only on hover plus when on ("active") / off ("inactive"). Default always. */
  show?: "always" | "active" | "inactive";
}

export interface MoveDetail {
  ids: string[];
  target: string;
  position: "before" | "after" | "inside";
}

export interface Command {
  id: string;
  label: string;
  /** Heading the command is listed under when not searching. */
  group?: string;
  icon?: string;
  shortcut?: string;
  /** Extra words that should match, e.g. ["export", "save as"]. */
  keywords?: string[];
  disabled?: boolean;
}

/** A column of st-data-table. */
export interface TableColumn {
  /** Row field this column shows. */
  key: string;
  label: string;
  /** Width in px. Default 140. */
  width?: number;
  minWidth?: number;
  align?: "start" | "center" | "end";
  sortable?: boolean;
  /** Enter, F2, double-click or typing edits the cell. */
  editable?: boolean;
  /** number: right-aligned, tabular digits, edits parse to numbers. */
  type?: "text" | "number";
  /** Display text for a value. Sorting and editing still use the raw value. */
  format?: (value: unknown, row: TableRow) => string;
}

/** A row of st-data-table. Any other fields are cell values. */
export interface TableRow {
  id: string;
  [key: string]: unknown;
}

export interface TableSort {
  key: string;
  direction: "ascending" | "descending";
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface GradientStop {
  /** 0–1 */
  offset: number;
  color: string;
}

export interface HistogramChannels {
  red?: number[];
  green?: number[];
  blue?: number[];
}

/** A clip on a st-timeline track. Times are in seconds (or your unit). */
export interface TimelineClip {
  id: string;
  start: number;
  end: number;
  label?: string;
  /** Any CSS color. Defaults to the track color. */
  color?: string;
}

export interface TimelineKeyframe {
  id: string;
  time: number;
}

export interface TimelineTrack {
  id: string;
  label: string;
  color?: string;
  clips?: TimelineClip[];
  keyframes?: TimelineKeyframe[];
  /** Per-track toggle values, e.g. { muted: true } — shown via `trackToggles`. */
  [key: string]: unknown;
}

/** A small on/off button in every track header (mute, solo, lock…). */
export interface TimelineToggle {
  key: string;
  label: string;
  /** Short text shown in the button, e.g. "M". */
  text: string;
}

/** Serializable st-dock arrangement (what `autosave` stores). */
export interface DockLayout {
  groups: DockGroup[];
  collapsed: boolean;
}

export interface DockGroup {
  /** Panel names, in tab order. */
  panels: string[];
  /** Name of the visible panel. */
  active: string;
  /** Relative height (flex weight). */
  size: number;
  /** Only the tab bar shows. */
  minimized: boolean;
}
