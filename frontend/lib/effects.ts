export const CSS_FILTERS: Record<string, string> = {
  cinematic: "contrast(1.1) saturate(0.85) sepia(0.12) brightness(0.95)",
  cold:      "saturate(0.7) hue-rotate(30deg) brightness(0.95)",
  warm:      "saturate(1.2) sepia(0.28) hue-rotate(-10deg)",
  noir:      "grayscale(1) contrast(1.4) brightness(0.88)",
  neon:      "saturate(2.0) contrast(1.2) brightness(1.05) hue-rotate(10deg)",
  dreamy:    "brightness(1.1) saturate(1.3) contrast(0.92)",
  none:      "none",
};

export interface DirectorCommand {
  type: "director_command";
  tool: "zoom" | "filter" | "shake" | "overlay_text" | "decart_style" | "reset";
  zoom_level?: number;
  target?: string;
  style?: string;
  intensity?: number;
  duration_ms?: number;
  text?: string;
  prompt?: string;
}
