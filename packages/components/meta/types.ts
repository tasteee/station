/**
 * One metadata source per element. The generator turns it into:
 * custom-elements.json, VS Code HTML data, and typings for every framework.
 */
export type AttributeType = "string" | "number" | "boolean" | readonly string[];

export interface AttributeMeta {
  /** Attribute name as written in HTML (kebab-case). */
  name: string;
  /** JS property name if the element has one (camelCase). CSS-only elements have none. */
  property?: string;
  type: AttributeType;
  default?: string | number | boolean;
  description: string;
}

export interface PropertyMeta {
  /** JS-only property for rich data. Never an attribute. */
  name: string;
  /** TypeScript type text. */
  type: string;
  description: string;
  /** A getter/setter on the class, not an Atomico prop (no attribute, not in `props`). */
  accessor?: boolean;
}

export interface EventMeta {
  name: string;
  /** TypeScript type text of the event object. Defaults to Event. */
  type?: string;
  description: string;
}

export interface NamedMeta {
  name: string;
  description: string;
}

export interface MethodMeta extends NamedMeta {
  /** TypeScript signature after the name. Default "(): void". */
  signature?: string;
}

export interface ElementMeta {
  tag: `st-${string}`;
  description: string;
  /** Import path that registers the element. Omitted for CSS-only elements. */
  module?: string;
  /** Exported class name for JS elements. */
  className?: string;
  /** Pure CSS element: styled by @station/tokens, no JS. */
  cssOnly?: boolean;
  formAssociated?: boolean;
  attributes: AttributeMeta[];
  properties?: PropertyMeta[];
  methods?: MethodMeta[];
  events?: EventMeta[];
  slots?: NamedMeta[];
  parts?: NamedMeta[];
  cssProperties?: NamedMeta[];
}

export const SIZE: AttributeMeta = {
  name: "size",
  property: "size",
  type: ["small", "medium", "large"],
  default: "medium",
  description: "Control size. Cascades to children through CSS variables.",
};
