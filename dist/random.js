export function createRandomPicker(random = Math.random) {
  let poolKey = '', remaining = [];
  return (items, currentId) => {
    const ids = [...new Set(items.map(item => item.id))];
    if (!ids.length) return null;
    if (ids.length === 1) return ids[0];
    const key = ids.slice().sort().join('|');
    if (key !== poolKey) { poolKey = key; remaining = ids.filter(id => id !== currentId); }
    let candidates = remaining.filter(id => id !== currentId);
    if (!candidates.length) { remaining = ids.filter(id => id !== currentId); candidates = remaining; }
    const picked = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    remaining = remaining.filter(id => id !== picked);
    return picked;
  };
}
