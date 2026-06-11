import { TabPanel, Text, Image, Box, Flex, VStack, HStack, Tag, Wrap, WrapItem } from "@chakra-ui/react";
import { Skill } from "@/interfaces/skill";
import { t } from "@/lib/strings";
import EffectTooltip from "./effectTooltip";
import SkillArea from "./skillArea";
import { useCallback } from "react";

const keyword = (count: number, e: string) => {
  switch (e.toLowerCase()) {
    case "stunned":
      return <EffectTooltip label="Stunned" count={count} e={e} icon="Stunned" type="debuff"/>
    case "minimize damage x":
      return <EffectTooltip label="Minimize Damage below 999999" count={count} e={e} icon="DR" type="buff"/>
    case "row protect":
      return <EffectTooltip label="Row Protect" count={count} e={e} icon="Row_Protect" type="buff"/>
    case "column protect":
      return <EffectTooltip label="Column Protect" count={count} e={e} icon="Column_Protect" type="buff"/>
    case "target protect":
      return <EffectTooltip label="Target Protect" count={count} e={e} icon="Target_Protect" type="buff"/>
    case "effect removal":
      return <EffectTooltip label="Temp" count={count} e={e} icon="Buff_Removal" type="unknown"/>
    case "buff removal":
      return <EffectTooltip label="Remove a specific buff" count={count} e={e} icon="Buff_Removal" type="debuff"/>
    case "debuff removal":
      return <EffectTooltip label="Remove a specific deuff" count={count} e={e} icon="Debuff_Removal" type="normal"/>
    case "enhancement removal":
      return <EffectTooltip label="Temp" count={count} e={e} icon="Buff_Removal" type="unknown"/>
    case "charged":
      return <EffectTooltip label="Next attack always Crits" count={count} e={e} icon="Charged" type="buff"/>
    case "provoked":
      return <EffectTooltip label="Provoked" count={count} e={e} icon="Provoked" type="debuff"/>
    case "follow-up attack":
      return <EffectTooltip label="Follow-Up Attack" count={count} e={e} icon="Follow_Up_Attack" type="buff"/>
    case "rooted":
      return <EffectTooltip label="Rooted" count={count} e={e} icon="Rooted" type="debuff"/>
    case "silenced":
      return <EffectTooltip label="Silenced" count={count} e={e} icon="Silenced" type="debuff"/>
    case "marked":
      return <EffectTooltip label="Marked" count={count} e={e} icon="Marked" type="debuff"/>
    case "piercing":
      return <EffectTooltip label="Ignore Barrier / Damage Reduction" count={count} e={e} icon="Ignore_Barrier_DR" type="buff"/>
    case "disarm":
      return <EffectTooltip label="Remove all buffs" count={count} e={e} icon="Buff_Removal" type="debuff"/>
    case "neutralize":
      return <EffectTooltip label="Remove all debuffs" count={count} e={e} icon="Debuff_Removal" type="normal"/>
    case "immunity":
      return <EffectTooltip label="Immunity to certain effects" count={count} e={e} icon="Immunity" type="unknown"/>
    case "fire counteraction":
      return <EffectTooltip label="Fire Resist Reversal" count={count} e={e} icon="Fire_Resist_Reversal" type="buff"/>
    case "ice counteraction":
      return <EffectTooltip label="Ice Resist Reversal" count={count} e={e} icon="Ice_Resist_Reversal" type="buff"/>
    case "electric counteraction":
      return <EffectTooltip label="Electric Resist Reversal" count={count} e={e} icon="Electric_Resist_Reversal" type="buff"/>
    case "lockdown":
      return <EffectTooltip label="Buff Prevention" count={count} e={e} icon="Buff_Prevention" type="debuff"/>
    case "bypass":
      return <EffectTooltip label="Ignore Protect Activated" count={count} e={e} icon="Ignore_Protect_Activated" type="buff"/>
    case "cover":
      return <EffectTooltip label="Ignore Protect Disabled" count={count} e={e} icon="Ignore_Protect_Disabled" type="debuff"/>
    case "def up x":
      return <EffectTooltip label="DEF +500%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 1":
      return <EffectTooltip label="DEF +10%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 2":
      return <EffectTooltip label="DEF +20%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 3":
      return <EffectTooltip label="DEF +30%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 4":
      return <EffectTooltip label="DEF +40%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def up 5":
      return <EffectTooltip label="DEF +50%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "def down 1":
      return <EffectTooltip label="DEF -10%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 2":
      return <EffectTooltip label="DEF -20%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 3":
      return <EffectTooltip label="DEF -30%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 4":
      return <EffectTooltip label="DEF -40%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "def down 5":
      return <EffectTooltip label="DEF -50%" count={count} e={e} icon="Def_Down" type="debuff"/>
    case "eva up x":
      return <EffectTooltip label="EVA +500%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 1":
      return <EffectTooltip label="EVA +10%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 2":
      return <EffectTooltip label="EVA +20%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 3":
      return <EffectTooltip label="EVA +30%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 4":
      return <EffectTooltip label="EVA +40%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva up 5":
      return <EffectTooltip label="EVA +50%" count={count} e={e} icon="Eva_Up" type="buff"/>
    case "eva down 1":
      return <EffectTooltip label="EVA -10%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 2":
      return <EffectTooltip label="EVA -20%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 3":
      return <EffectTooltip label="EVA -30%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 4":
      return <EffectTooltip label="EVA -40%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "eva down 5":
      return <EffectTooltip label="EVA -50%" count={count} e={e} icon="Eva_Down" type="debuff"/>
    case "atk up 1":
      return <EffectTooltip label="ATK +10%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 2":
      return <EffectTooltip label="ATK +20%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 3":
      return <EffectTooltip label="ATK +30%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 4":
      return <EffectTooltip label="ATK +40%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk up 5":
      return <EffectTooltip label="ATK +50%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "atk down 1":
      return <EffectTooltip label="ATK -10%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 2":
      return <EffectTooltip label="ATK -20%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 3":
      return <EffectTooltip label="ATK -30%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 4":
      return <EffectTooltip label="ATK -40%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "atk down 5":
      return <EffectTooltip label="ATK -50%" count={count} e={e} icon="Atk_Down" type="debuff"/>
    case "acc up 1":
      return <EffectTooltip label="ACC +10%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 2":
      return <EffectTooltip label="ACC +20%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 3":
      return <EffectTooltip label="ACC +30%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 4":
      return <EffectTooltip label="ACC +40%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc up 5":
      return <EffectTooltip label="ACC +50%" count={count} e={e} icon="Acc_Up" type="buff"/>
    case "acc down 1":
      return <EffectTooltip label="ACC -10%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 2":
      return <EffectTooltip label="ACC -20%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 3":
      return <EffectTooltip label="ACC -30%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 4":
      return <EffectTooltip label="ACC -40%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "acc down 5":
      return <EffectTooltip label="ACC -50%" count={count} e={e} icon="Acc_Down" type="debuff"/>
    case "crit up 1":
      return <EffectTooltip label="CRIT +10%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 2":
      return <EffectTooltip label="CRIT +20%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 3":
      return <EffectTooltip label="CRIT +30%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 4":
      return <EffectTooltip label="CRIT +40%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit up 5":
      return <EffectTooltip label="CRIT +50%" count={count} e={e} icon="Crit_Up" type="buff"/>
    case "crit down 1":
      return <EffectTooltip label="CRIT -10%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 2":
      return <EffectTooltip label="CRIT -20%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 3":
      return <EffectTooltip label="CRIT -30%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 4":
      return <EffectTooltip label="CRIT -40%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "crit down 5":
      return <EffectTooltip label="CRIT -50%" count={count} e={e} icon="Crit_Down" type="debuff"/>
    case "spd up 1":
      return <EffectTooltip label="SPD +10%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 2":
      return <EffectTooltip label="SPD +20%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 3":
      return <EffectTooltip label="SPD +30%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 4":
      return <EffectTooltip label="SPD +40%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd up 5":
      return <EffectTooltip label="SPD +50%" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "spd down 1":
      return <EffectTooltip label="SPD -10%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 2":
      return <EffectTooltip label="SPD -20%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 3":
      return <EffectTooltip label="SPD -30%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 4":
      return <EffectTooltip label="SPD -40%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "spd down 5":
      return <EffectTooltip label="SPD -50%" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "acceleration 1":
      return <EffectTooltip label="AP +1" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 2":
      return <EffectTooltip label="AP +2" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 3":
      return <EffectTooltip label="AP +3" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 4":
      return <EffectTooltip label="AP +4" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "acceleration 5":
      return <EffectTooltip label="AP +5" count={count} e={e} icon="Spd_Up" type="buff"/>
    case "deceleration 1":
      return <EffectTooltip label="AP -1" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 2":
      return <EffectTooltip label="AP -2" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 3":
      return <EffectTooltip label="AP -3" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 4":
      return <EffectTooltip label="AP -4" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "deceleration 5":
      return <EffectTooltip label="AP -5" count={count} e={e} icon="Spd_Down" type="debuff"/>
    case "heat resistance up 1":
      return <EffectTooltip label="Fire Resist +10%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 2":
      return <EffectTooltip label="Fire Resist +20%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 3":
      return <EffectTooltip label="Fire Resist +30%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 4":
      return <EffectTooltip label="Fire Resist +40%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance up 5":
      return <EffectTooltip label="Fire Resist +50%" count={count} e={e} icon="Fire_Resist_Up" type="buff"/>
    case "heat resistance down 1":
      return <EffectTooltip label="Fire Resist -10%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 2":
      return <EffectTooltip label="Fire Resist -20%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 3":
      return <EffectTooltip label="Fire Resist -30%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 4":
      return <EffectTooltip label="Fire Resist -40%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "heat resistance down 5":
      return <EffectTooltip label="Fire Resist -50%" count={count} e={e} icon="Fire_Resist_Down" type="debuff"/>
    case "cold resistance up 1":
      return <EffectTooltip label="Ice Resist +10%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 2":
      return <EffectTooltip label="Ice Resist +20%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 3":
      return <EffectTooltip label="Ice Resist +30%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 4":
      return <EffectTooltip label="Ice Resist +40%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance up 5":
      return <EffectTooltip label="Ice Resist +50%" count={count} e={e} icon="Ice_Resist_Up" type="buff"/>
    case "cold resistance down 1":
      return <EffectTooltip label="Ice Resist -10%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 2":
      return <EffectTooltip label="Ice Resist -20%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 3":
      return <EffectTooltip label="Ice Resist -30%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 4":
      return <EffectTooltip label="Ice Resist -40%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "cold resistance down 5":
      return <EffectTooltip label="Ice Resist -50%" count={count} e={e} icon="Ice_Resist_Down" type="debuff"/>
    case "insulation up 1":
      return <EffectTooltip label="Electric Resist +10%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 2":
      return <EffectTooltip label="Electric Resist +20%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 3":
      return <EffectTooltip label="Electric Resist +30%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 4":
      return <EffectTooltip label="Electric Resist +40%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation up 5":
      return <EffectTooltip label="Electric Resist +50%" count={count} e={e} icon="Electric_Resist_Up" type="buff"/>
    case "insulation down 1":
      return <EffectTooltip label="Electric Resist -10%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 2":
      return <EffectTooltip label="Electric Resist -20%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 3":
      return <EffectTooltip label="Electric Resist -30%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 4":
      return <EffectTooltip label="Electric Resist -40%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "insulation down 5":
      return <EffectTooltip label="Electric Resist -50%" count={count} e={e} icon="Electric_Resist_Down" type="debuff"/>
    case "iron wall":
      return <EffectTooltip label="Nullify Damage" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 1":
      return <EffectTooltip label="Nullify Damage 1 time" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 2":
      return <EffectTooltip label="Nullify Damage 2 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 3":
      return <EffectTooltip label="Nullify Damage 3 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 4":
      return <EffectTooltip label="Nullify Damage 4 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "iron wall 5":
      return <EffectTooltip label="Nullify Damage 5 times" count={count} e={e} icon="Nullify_Damage" type="buff"/>
    case "counterstrike":
      return <EffectTooltip label="Counterattack" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 1":
      return <EffectTooltip label="Counterattack with 20% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 2":
      return <EffectTooltip label="Counterattack with 40% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 3":
      return <EffectTooltip label="Counterattack with 60% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 4":
      return <EffectTooltip label="Counterattack with 80% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "counterstrike 5":
      return <EffectTooltip label="Counterattack with 100% Power" count={count} e={e} icon="Counterattack" type="buff"/>
    case "deflect":
      return <EffectTooltip label="Minimize Damage" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 1":
      return <EffectTooltip label="Minimize Damage below 1000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 2":
      return <EffectTooltip label="Minimize Damage below 2000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 3":
      return <EffectTooltip label="Minimize Damage below 3000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 4":
      return <EffectTooltip label="Minimize Damage below 4000" count={count} e={e} icon="DR" type="buff"/>
    case "deflect 5":
      return <EffectTooltip label="Minimize Damage below 5000" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction":
      return <EffectTooltip label="Damage Reduction" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 1":
      return <EffectTooltip label="Damage Reduction +10%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 2":
      return <EffectTooltip label="Damage Reduction +20%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 3":
      return <EffectTooltip label="Damage Reduction +30%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 4":
      return <EffectTooltip label="Damage Reduction +40%" count={count} e={e} icon="DR" type="buff"/>
    case "damage reduction 5":
      return <EffectTooltip label="Damage Reduction +50%" count={count} e={e} icon="DR" type="buff"/>
    case "damage absorption":
      return <EffectTooltip label="Barrier" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 1":
      return <EffectTooltip label="Barrier +1000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 2":
      return <EffectTooltip label="Barrier +2000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 3":
      return <EffectTooltip label="Barrier +3000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 4":
      return <EffectTooltip label="Barrier +4000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage absorption 5":
      return <EffectTooltip label="Barrier +5000" count={count} e={e} icon="Barrier" type="buff"/>
    case "damage amplification":
      return <EffectTooltip label="Damage Taken Increased" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 1":
      return <EffectTooltip label="Damage Taken Increased +10%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 2":
      return <EffectTooltip label="Damage Taken Increased +20%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 3":
      return <EffectTooltip label="Damage Taken Increased +30%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 4":
      return <EffectTooltip label="Damage Taken Increased +40%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "damage amplification 5":
      return <EffectTooltip label="Damage Taken Increased +50%" count={count} e={e} icon="Damage_Taken_Increased" type="debuff"/>
    case "knockback 1":
      return <EffectTooltip label="Push Back 1 space" count={count} e={e} icon="Push" type="debuff"/>
    case "knockback 2":
      return <EffectTooltip label="Push Back 2 spaces" count={count} e={e} icon="Push" type="debuff"/>
    case "pull 1":
      return <EffectTooltip label="Pull Forward 1 space" count={count} e={e} icon="Pull" type="debuff"/>
    case "pull 2":
      return <EffectTooltip label="Pull Forward 2 spaces" count={count} e={e} icon="Pull" type="debuff"/>
    case "targeting support 1":
      return <EffectTooltip label="Range +1" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 2":
      return <EffectTooltip label="Range +2" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 3":
      return <EffectTooltip label="Range +3" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 4":
      return <EffectTooltip label="Range +4" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting support 5":
      return <EffectTooltip label="Range +5" count={count} e={e} icon="Range_Up" type="buff"/>
    case "targeting interference 1":
      return <EffectTooltip label="Range -1" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 2":
      return <EffectTooltip label="Range -2" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 3":
      return <EffectTooltip label="Range -3" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 4":
      return <EffectTooltip label="Range -4" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "targeting interference 5":
      return <EffectTooltip label="Range -5" count={count} e={e} icon="Range_Down" type="debuff"/>
    case "sharpness 1":
      return <EffectTooltip label="Defense Penetration +10%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 2":
      return <EffectTooltip label="Defense Penetration +20%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 3":
      return <EffectTooltip label="Defense Penetration +30%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 4":
      return <EffectTooltip label="Defense Penetration +40%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "sharpness 5":
      return <EffectTooltip label="Defense Penetration +50%" count={count} e={e} icon="Defense_Penetration" type="buff"/>
    case "dullness 1":
      return <EffectTooltip label="Defense Penetration -10%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 2":
      return <EffectTooltip label="Defense Penetration -20%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 3":
      return <EffectTooltip label="Defense Penetration -30%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 4":
      return <EffectTooltip label="Defense Penetration -40%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "dullness 5":
      return <EffectTooltip label="Defense Penetration -50%" count={count} e={e} icon="Defense_Penetration" type="debuff"/>
    case "strategic development (light) 1":
      return <EffectTooltip label="Anti-Light DMG +10%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 2":
      return <EffectTooltip label="Anti-Light DMG +20%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 3":
      return <EffectTooltip label="Anti-Light DMG +30%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 4":
      return <EffectTooltip label="Anti-Light DMG +40%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic development (light) 5":
      return <EffectTooltip label="Anti-Light DMG +50%" count={count} e={e} icon="Anti_Light" type="buff"/>
    case "strategic disruption (light) 1":
      return <EffectTooltip label="Anti-Light DMG -10%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 2":
      return <EffectTooltip label="Anti-Light DMG -20%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 3":
      return <EffectTooltip label="Anti-Light DMG -30%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 4":
      return <EffectTooltip label="Anti-Light DMG -40%" count={count} e={e} icon="Anti_Light" type="debuff"/>
    case "strategic disruption (light) 5":
      return <EffectTooltip label="Anti-Flying DMG -50%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic development (flying) 1":
      return <EffectTooltip label="Anti-Flying DMG +10%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 2":
      return <EffectTooltip label="Anti-Flying DMG +20%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 3":
      return <EffectTooltip label="Anti-Flying DMG +30%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 4":
      return <EffectTooltip label="Anti-Flying DMG +40%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic development (flying) 5":
      return <EffectTooltip label="Anti-Flying DMG +50%" count={count} e={e} icon="Anti_Flying" type="buff"/>
    case "strategic disruption (flying) 1":
      return <EffectTooltip label="Anti-Flying DMG -10%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 2":
      return <EffectTooltip label="Anti-Flying DMG -20%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 3":
      return <EffectTooltip label="Anti-Flying DMG -30%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 4":
      return <EffectTooltip label="Anti-Flying DMG -40%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic disruption (flying) 5":
      return <EffectTooltip label="Anti-Flying DMG -50%" count={count} e={e} icon="Anti_Flying" type="debuff"/>
    case "strategic development (heavy) 1":
      return <EffectTooltip label="Anti-Heavy DMG +10%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 2":
      return <EffectTooltip label="Anti-Heavy DMG +20%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 3":
      return <EffectTooltip label="Anti-Heavy DMG +30%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 4":
      return <EffectTooltip label="Anti-Heavy DMG +40%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic development (heavy) 5":
      return <EffectTooltip label="Anti-Heavy DMG +50%" count={count} e={e} icon="Anti_Heavy" type="buff"/>
    case "strategic disruption (heavy) 1":
      return <EffectTooltip label="Anti-Heavy DMG -10%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 2":
      return <EffectTooltip label="Anti-Heavy DMG -20%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 3":
      return <EffectTooltip label="Anti-Heavy DMG -30%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 4":
      return <EffectTooltip label="Anti-Heavy DMG -40%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "strategic disruption (heavy) 5":
      return <EffectTooltip label="Anti-Heavy DMG -50%" count={count} e={e} icon="Anti_Heavy" type="debuff"/>
    case "erosion":
      return <EffectTooltip label="Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 1":
      return <EffectTooltip label="200 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 2":
      return <EffectTooltip label="400 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 3":
      return <EffectTooltip label="600 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 4":
      return <EffectTooltip label="800 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "erosion 5":
      return <EffectTooltip label="1000 Physical DoT Damage at the end of round" count={count} e={e} icon="Corrosion" type="debuff"/>
    case "ignited":
      return <EffectTooltip label="Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 1":
      return <EffectTooltip label="200 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 2":
      return <EffectTooltip label="400 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 3":
      return <EffectTooltip label="600 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 4":
      return <EffectTooltip label="800 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "ignited 5":
      return <EffectTooltip label="1000 Fire DoT Damage at the end of round" count={count} e={e} icon="Fire_DoT_Damage" type="debuff"/>
    case "freezing":
      return <EffectTooltip label="Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 1":
      return <EffectTooltip label="200 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 2":
      return <EffectTooltip label="400 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 3":
      return <EffectTooltip label="600 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 4":
      return <EffectTooltip label="800 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "freezing 5":
      return <EffectTooltip label="1000 Ice DoT Damage at the end of round" count={count} e={e} icon="Ice_DoT_Damage" type="debuff"/>
    case "electrocuted":
      return <EffectTooltip label="Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 1":
      return <EffectTooltip label="200 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 2":
      return <EffectTooltip label="400 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 3":
      return <EffectTooltip label="600 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 4":
      return <EffectTooltip label="800 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "electrocuted 5":
      return <EffectTooltip label="1000 Electric DoT Damage at the end of round" count={count} e={e} icon="Electric_DoT_Damage" type="debuff"/>
    case "enmity 1":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +10%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 2":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +20%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 3":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +30%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 4":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +40%" count={count} e={e} icon="Enmity" type="buff"/>
    case "enmity 5":
      return <EffectTooltip label="Increase damage proportional to attacker's lost HP, upto +50%" count={count} e={e} icon="Enmity" type="buff"/>
    case "finisher 1":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +10%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 2":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +20%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 3":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +30%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 4":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +40%" count={count} e={e} icon="Merciless" type="buff"/>
    case "finisher 5":
      return <EffectTooltip label="Increase damage proportional to target's lost HP, upto +50%" count={count} e={e} icon="Merciless" type="buff"/>
    case "battle continuation":
      return <EffectTooltip label="Battle Continuation" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 1":
      return <EffectTooltip label="Battle Continuation with 100 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 2":
      return <EffectTooltip label="Battle Continuation with 200 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 3":
      return <EffectTooltip label="Battle Continuation with 300 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 4":
      return <EffectTooltip label="Battle Continuation with 400 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "temporary restoration 5":
      return <EffectTooltip label="Battle Continuation with 500 HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 1":
      return <EffectTooltip label="Battle Continuation with 20% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 2":
      return <EffectTooltip label="Battle Continuation with 40% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 3":
      return <EffectTooltip label="Battle Continuation with 60% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 4":
      return <EffectTooltip label="Battle Continuation with 80% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "rapid restoration 5":
      return <EffectTooltip label="Battle Continuation with 100% HP" count={count} e={e} icon="Battle_Continuation" type="normal"/>
    case "all-out attack 1":
      return <EffectTooltip label="Additional DMG +20%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 2":
      return <EffectTooltip label="Additional DMG +40%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 3":
      return <EffectTooltip label="Additional DMG +60%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 4":
      return <EffectTooltip label="Additional DMG +80%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "all-out attack 5":
      return <EffectTooltip label="Additional DMG +100%" count={count} e={e} icon="Additional_Damage" type="normal"/>
    case "resistance up 1":
      return <EffectTooltip label="Status Resist +20%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 2":
      return <EffectTooltip label="Status Resist +40%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 3":
      return <EffectTooltip label="Status Resist +60%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 4":
      return <EffectTooltip label="Status Resist +80%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "resistance up 5":
      return <EffectTooltip label="Status Resist +100%" count={count} e={e} icon="Status_Resist_Up" type="buff"/>
    case "super resistance up 1":
      return <EffectTooltip label="Buff Removal Resist +20%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 2":
      return <EffectTooltip label="Buff Removal Resist +40%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 3":
      return <EffectTooltip label="Buff Removal Resist +60%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 4":
      return <EffectTooltip label="Buff Removal Resist +80%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "super resistance up 5":
      return <EffectTooltip label="Buff Removal Resist +100%" count={count} e={e} icon="Buff_Removal_Resist_Up" type="normal"/>
    case "resistance down 1":
      return <EffectTooltip label="Status Resist -20%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 2":
      return <EffectTooltip label="Status Resist -40%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 3":
      return <EffectTooltip label="Status Resist -60%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 4":
      return <EffectTooltip label="Status Resist -80%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "resistance down 5":
      return <EffectTooltip label="Status Resist -100%" count={count} e={e} icon="Status_Resist_Down" type="debuff"/>
    case "power up 1":
      return <EffectTooltip label="Skill Multiplier +10%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 2":
      return <EffectTooltip label="Skill Multiplier +20%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 3":
      return <EffectTooltip label="Skill Multiplier +30%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 4":
      return <EffectTooltip label="Skill Multiplier +40%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power up 5":
      return <EffectTooltip label="Skill Multiplier +50%" count={count} e={e} icon="Skill_Multiplier_Up" type="buff"/>
    case "power down 1":
      return <EffectTooltip label="Skill Multiplier -10%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 2":
      return <EffectTooltip label="Skill Multiplier -20%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 3":
      return <EffectTooltip label="Skill Multiplier -30%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 4":
      return <EffectTooltip label="Skill Multiplier -40%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "power down 5":
      return <EffectTooltip label="Skill Multiplier -50%" count={count} e={e} icon="Skill_Multiplier_Down" type="debuff"/>
    case "focus 1":
      return <EffectTooltip label="Area Damage Focus +20%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 2":
      return <EffectTooltip label="Area Damage Focus +40%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 3":
      return <EffectTooltip label="Area Damage Focus +60%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 4":
      return <EffectTooltip label="Area Damage Focus +80%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "focus 5":
      return <EffectTooltip label="Area Damage Focus +100%" count={count} e={e} icon="Atk_Up" type="buff"/>
    case "dispersal 1":
      return <EffectTooltip label="Area Damage Dispersion +20%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 2":
      return <EffectTooltip label="Area Damage Dispersion +40%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 3":
      return <EffectTooltip label="Area Damage Dispersion +60%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 4":
      return <EffectTooltip label="Area Damage Dispersion +80%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "dispersal 5":
      return <EffectTooltip label="Area Damage Dispersion +100%" count={count} e={e} icon="Def_Up" type="buff"/>
    case "fire adaptation 1":
      return <EffectTooltip label="Minimum Fire Resist +20%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 2":
      return <EffectTooltip label="Minimum Fire Resist +40%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 3":
      return <EffectTooltip label="Minimum Fire Resist +60%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 4":
      return <EffectTooltip label="Minimum Fire Resist +80%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "fire adaptation 5":
      return <EffectTooltip label="Minimum Fire Resist +100%" count={count} e={e} icon="Minimum_Fire_Resist_Up" type="buff"/>
    case "ice adaptation 1":
      return <EffectTooltip label="Minimum Ice Resist +20%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 2":
      return <EffectTooltip label="Minimum Ice Resist +40%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 3":
      return <EffectTooltip label="Minimum Ice Resist +60%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 4":
      return <EffectTooltip label="Minimum Ice Resist +80%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "ice adaptation 5":
      return <EffectTooltip label="Minimum Ice Resist +100%" count={count} e={e} icon="Minimum_Ice_Resist_Up" type="buff"/>
    case "electric adaptation 1":
      return <EffectTooltip label="Minimum Electric Resist +20%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 2":
      return <EffectTooltip label="Minimum Electric Resist +40%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 3":
      return <EffectTooltip label="Minimum Electric Resist +60%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 4":
      return <EffectTooltip label="Minimum Electric Resist +80%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "electric adaptation 5":
      return <EffectTooltip label="Minimum Electric Resist +100%" count={count} e={e} icon="Minimum_Electric_Resist_Up" type="buff"/>
    case "penetration resistance 1":
      return <EffectTooltip label="Defense Penetration Resist +10%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 2":
      return <EffectTooltip label="Defense Penetration Resist +20%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 3":
      return <EffectTooltip label="Defense Penetration Resist +30%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 4":
      return <EffectTooltip label="Defense Penetration Resist +40%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "penetration resistance 5":
      return <EffectTooltip label="Defense Penetration Resist +50%" count={count} e={e} icon="Defense_Penetration_Resist_Up" type="buff"/>
    case "swiftness 1":
      return <EffectTooltip label="Max Action Count +1" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 2":
      return <EffectTooltip label="Max Action Count +2" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 3":
      return <EffectTooltip label="Max Action Count +3" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 4":
      return <EffectTooltip label="Max Action Count +4" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    case "swiftness 5":
      return <EffectTooltip label="Max Action Count +5" count={count} e={e} icon="Max_Action Count_Up" type="buff"/>
    default:
      return (
        <Text as="b" bg="gray.300" color="gray.800" px={1} py={0.5} rounded={6} key={count}>
          {e}
        </Text>
      );
  }
}




export default function SkillTab({
  skill,
  atk,
}: {
  skill: Skill;
  atk: number;
}) {

  const splitTag = (str: string) => {
    var count = 0;
    let r = str
      .split(/(<li>.+?<\/li>|<[^<]+?>|\[[^\]]+?\]|<br>|<br\/>|<br \/>)/)
      .map((e) => {
        if (e.match(/<li>(.+?)<\/li>/)) {
          let liContent = e.replace(/<li>(.+?)<\/li>/, "$1")
          return <li key={count++}>{splitTag(liContent)}</li>;
        }

        else if (e.match(/<br>|<br\/>|<br \/>/)) return <br key={count++} />;
        else if (e.match(/^<[^<]+?>$/)) {
          // <keyword> -> plain emphasised text (chip/icon highlight removed)
          return <b key={count++}>{e.replace(/<([^<]+?)>/, "$1")}</b>;
        }
        else if (e.match(/^\[[^\]]+?\]$/)) {
          // [skill / effect reference] -> highlighted in the accent color
          return <Text as="b" color="yellow.300" key={count++}>{e}</Text>;
        }

        else return e;
      });
    return r;
  }

  // Render a damage value for a given multiplier: "<atk*rate> (xrate ATK)".
  function dmg(rate: number) {
    return `${Math.floor(atk * rate).toString()} (x${rate} ATK)`;
  }

  function renderDescription() {
    let copy = t(skill.description);
    // Hand-translated text embeds the multiplier inline as $(1.5).
    const inline = copy.match(/\$\((\d+\.*\d*)\)/);
    if (inline && inline[1]) {
      copy = copy.replace(/\$\(\d+\.*\d*\)/g, dmg(parseFloat(inline[1])));
    }
    // Official table text uses a positional {0} placeholder; fill it with the
    // skill's SkillAttackRate.
    if (skill.rate) {
      copy = copy.replace(/\{0\}/g, dmg(skill.rate));
    }
    var count = 0;
    let r = splitTag(copy)
    return r;
  }

  const hasArea = skill.area.some((v) => v > 0);

  return (
    <TabPanel key={skill.title} px={0} py={3}>
      <Flex
        gap={4}
        align="flex-start"
        minH="180px"
        direction={{ base: "column", md: "row" }}
      >
        {/* left: name + description */}
        <Box flex={1} minW={0}>
          <Text as="b" fontSize={["lg", "lg", "xl"]}>
            <Image
              alt={skill.attr ? skill.attr : "normal"}
              src={`/images/${skill.attr ? skill.attr : "normal"}.png`}
              boxSize={{ base: "16px", md: "18px" }}
              display="inline"
              mr={2}
            />
            {t(skill.name)}
          </Text>

          {/* property badges */}
          {skill.accuracy || skill.guardPierce || (skill.center === 0 && hasArea) ? (
            <Wrap mt={2} spacing={2}>
              {skill.accuracy ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="green" variant="solid" borderRadius="full">
                    ACC Correction {skill.accuracy > 0 ? '+' : ''}{skill.accuracy}%
                  </Tag>
                </WrapItem>
              ) : null}
              {skill.guardPierce ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="red" variant="solid" borderRadius="full">Ignore Protect</Tag>
                </WrapItem>
              ) : null}
              {skill.center === 0 && hasArea ? (
                <WrapItem>
                  <Tag size="sm" colorScheme="purple" variant="solid" borderRadius="full">Fixed Grid</Tag>
                </WrapItem>
              ) : null}
            </Wrap>
          ) : null}

          <Text fontSize={["sm", "md"]} mt={2} color="gray.300">
            {renderDescription()}
          </Text>
        </Box>

        {/* right: AoE grid + stats */}
        {hasArea || skill.range || skill.AP ? (
          <VStack
            spacing={2}
            flexShrink={0}
            align="center"
            alignSelf={{ base: "center", md: "flex-start" }}
          >
            {hasArea ? <SkillArea area={skill.area} center={skill.center} /> : null}
            {skill.range || skill.AP ? (
              <HStack spacing={2}>
                <Tag size="sm" colorScheme="teal" variant="subtle" borderRadius="full">Range {skill.range}</Tag>
                <Tag size="sm" colorScheme="blue" variant="subtle" borderRadius="full">AP {skill.AP}</Tag>
              </HStack>
            ) : null}
          </VStack>
        ) : null}
      </Flex>
    </TabPanel>
  );
}
