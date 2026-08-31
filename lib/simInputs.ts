// Round-1 simulation inputs built from the store. `missing` is still loading;
// `unavailable` does not exist on the current server.

import { RootState } from '@/store';
import { selectUnitFull, selectUnitSkills } from '@/store/unitSlice';
import { selectEquipFull } from '@/store/equipSlice';
import { selectEnemyFull } from '@/store/enemySlice';
import { selectEnemySkills, selectEnemySkillStatus } from '@/store/skillSlice';
import { Team, StatMap } from '@/interfaces/team';
import { FullUnitData } from '@/interfaces/unit';
import { EnemyFull } from '@/interfaces/enemy';
import { EnemyIndex } from '@/interfaces/world';
import { unitDisplayName } from '@/lib/rank';
import {
  computeStats, equippedStats, equipSlotUnlocked, scaleSkillLevel,
  fullLinkSkillPowerValue, fullLinkBuffLv, skillUnlockRank,
} from '@/lib/team';
import { SimUnitInput, SimEnemyInput } from '@/lib/simulate';

export interface SimInputBuild {
  inputs: SimUnitInput[];
  missing: string[];
  unavailable: string[];
}

export function buildSimInputs(team: Team, state: RootState): SimInputBuild {
  const inputs: SimUnitInput[] = [];
  const missing: string[] = [];
  const unavailable: string[] = [];
  team.forEach((slot, tile) => {
    if (!slot) return;
    const unit = selectUnitFull(state, slot.unitId);
    if (!unit) {
      const status = state.unit.byRegion[state.region.region].status;
      (status === 'loading' ? missing : unavailable).push(slot.unitId);
      return;
    }
    if (!unit.stat) { missing.push(unitDisplayName(unit)); return; }
    const full = unit as FullUnitData;
    const skills = selectUnitSkills(state, slot.unitId);
    const keys = (slot.form === 1 ? full.skillsCh : full.skills) ?? [];
    if (keys.length > 0 && Object.keys(skills).length === 0) {
      missing.push(unitDisplayName(unit)); return;
    }
    const spAdd = fullLinkSkillPowerValue(full, slot.links >= 5 ? slot.fullLink : -1);
    const buffLv = fullLinkBuffLv(full, slot.links >= 5 ? slot.fullLink : -1)
      + (slot.maxAffection && full.affection ? 1 : 0);
    const grade = unit.rarity + Math.min(slot.gradeIdx, full.stat.length - 1);
    const passives = keys
      .map((k, i) => ({ k, raw: skills[k], lv: slot.skillLv[i] ?? 10 }))
      .filter((x) => x.raw && x.raw.type === 'passive' &&
        skillUnlockRank(x.k, x.raw.leastRank, state.region.region) <= grade)
      .map((x) => ({ key: x.k, name: x.raw.name, skill: scaleSkillLevel(x.raw, x.lv, spAdd, buffLv) }));
    const equips: SimUnitInput['equips'] = [];
    let equipsReady = true;
    slot.equips.forEach((sel, i) => {
      if (!sel || !equipSlotUnlocked(unit, i, slot.level)) return;
      const fe = selectEquipFull(state, sel.id);
      if (!fe) { equipsReady = false; return; }
      const rank = fe.ranks[Math.min(sel.rank, fe.ranks.length - 1)];
      const lvl = rank.levels[Math.min(sel.level, rank.levels.length - 1)];
      equips.push({ id: sel.id, name: rank.name, buffs: lvl?.buffs ?? [] });
    });
    if (!equipsReady) { missing.push(`${unitDisplayName(unit)} (equipment)`); return; }
    const stats = computeStats(full, slot, equippedStats(slot, unit, (id) => selectEquipFull(state, id)));
    inputs.push({ tile, unit: full, slot, stats, passives, equips });
  });
  return { inputs, missing, unavailable };
}

// ── enemy side ────────────────────────────────────────────────────────────────

// HP/ATK/DEF grow linearly, floored; the rest are flat. Same math as the enemy modal.
export function enemyStatsAt(e: EnemyFull, lv: number): StatMap {
  const lin = (pair: [number, number]) => Math.floor(pair[0] + pair[1] * (lv - 1));
  return {
    HP: lin(e.HP), ATK: lin(e.ATK), DEF: lin(e.DEF),
    SPD: e.SPD, CRI: e.CRIT, ACC: e.ACC, EVA: e.EVA,
    fireRes: e.resist[0], iceRes: e.resist[1], lightningRes: e.resist[2],
  };
}

export interface EnemySimInputBuild {
  inputs: SimEnemyInput[];
  missing: string[];
}

export function isEnemyWaveCell(
  cell: EnemyIndex | null | undefined,
): cell is EnemyIndex {
  return !!cell?.id && cell.id !== '0';
}

// A failed skill fetch degrades to "no passives" rather than blocking the build.
export function buildEnemySimInputs(
  wave: (EnemyIndex | null)[], state: RootState,
): EnemySimInputBuild {
  const inputs: SimEnemyInput[] = [];
  const missing: string[] = [];
  wave.forEach((cell, tile) => {
    if (tile >= 9 || !isEnemyWaveCell(cell)) return;
    const full = selectEnemyFull(state, cell.id);
    if (!full || !full.HP) { missing.push(cell.id); return; }
    const skills = selectEnemySkills(state, cell.id);
    const skillStatus = selectEnemySkillStatus(state, cell.id);
    if ((full.skills?.length ?? 0) > 0 && Object.keys(skills).length === 0 &&
        skillStatus !== 'failed') {
      missing.push(`${cell.id} (skills)`); return;
    }
    const passives = Object.entries(skills)
      .filter(([, s]) => s.type === 'passive')
      .map(([key, s]) => ({ key, name: s.name, skill: s }));
    inputs.push({ tile, enemy: full, lv: cell.lv, stats: enemyStatsAt(full, cell.lv), passives });
  });
  return { inputs, missing };
}
