// Seasons that rerun a boss with identical data share the earliest such season as canonical.
export function iwCanonicalId(bosses, id) {
  const sig = (k) => JSON.stringify(bosses[k]).split(k).join('');
  const own = sig(id);
  return Object.keys(bosses).filter((k) => sig(k) === own).sort()[0] ?? id;
}
