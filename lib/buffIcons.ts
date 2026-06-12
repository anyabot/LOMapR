/** Maps BUFF_ATTR_TYPE integer to EffectTooltip type string. */
export function buffAttrType(attr: number): "buff" | "debuff" | "normal" | "unknown" {
  switch (attr) {
    case 0: return "buff";
    case 1: return "debuff";
    case 2: return "normal";
    default: return "unknown";
  }
}
