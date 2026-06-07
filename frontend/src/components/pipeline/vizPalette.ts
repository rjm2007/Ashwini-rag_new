/**
 * Category → color mapping for embedding clusters, section tags, etc.
 * Maps to the --cat-* CSS tokens in globals.css.
 */

export interface CategoryColor {
  label: string;
  cssVar: string;
  hex: string;
}

export const CATEGORY_PALETTE: Record<string, CategoryColor> = {
  coverage:  { label: "Coverage Codes",  cssVar: "var(--cat-coverage)",   hex: "#6366F1" },
  vehicle:   { label: "Vehicle Data",    cssVar: "var(--cat-vehicle)",    hex: "#3B82F6" },
  claims:    { label: "Claim Process",   cssVar: "var(--cat-claims)",     hex: "#F59E0B" },
  terms:     { label: "Coverage Period", cssVar: "var(--cat-terms)",      hex: "#8B5CF6" },
  exclusions:{ label: "Exclusions",      cssVar: "var(--cat-exclusions)", hex: "#F43F5E" },
  general:   { label: "General Info",    cssVar: "var(--cat-emissions)",  hex: "#14B8A6" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_PALETTE);

/** Default proportional distribution of chunks across categories */
export const DEFAULT_PROPORTIONS: Record<string, number> = {
  coverage: 0.33,
  vehicle: 0.23,
  claims: 0.12,
  terms: 0.12,
  exclusions: 0.10,
  general: 0.10,
};
