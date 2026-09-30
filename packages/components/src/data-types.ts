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
