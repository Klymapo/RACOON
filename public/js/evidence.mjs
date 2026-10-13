const CONFIDENCE_RANK = {unverified: 0, estimated: 1, confirmed: 2, contradictory: 3};

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => {
    if (typeof left === 'number' && typeof right === 'number') return left - right;
    return String(left).localeCompare(String(right));
  });
}

function latestConfirmed(observations) {
  return observations
    .filter((observation) => observation.confidence === 'confirmed')
    .sort((left, right) => String(right.confirmedAt || right.queriedAt || '').localeCompare(String(left.confirmedAt || left.queriedAt || '')))[0] || null;
}

export function resolveFieldObservations(observations = []) {
  const valid = observations.filter((observation) => observation && observation.value !== undefined);
  if (!valid.length) return {value: null, confidence: 'unverified', candidates: [], latestConfirmed: null};
  const candidates = uniqueSorted(valid.map((observation) => observation.value));
  const confirmed = latestConfirmed(valid);
  if (candidates.length > 1) {
    return {value: null, confidence: 'contradictory', candidates, latestConfirmed: confirmed};
  }
  const confidence = valid.reduce((best, observation) => CONFIDENCE_RANK[observation.confidence] > CONFIDENCE_RANK[best] ? observation.confidence : best, 'unverified');
  return {value: candidates[0], confidence, candidates, latestConfirmed: confirmed};
}

export function resolveEpisodeAvailability(observations = []) {
  const published = observations.filter((observation) => observation?.status === 'published' && Number.isInteger(observation.episode));
  const dates = new Map();
  for (const observation of published) {
    const key = observation.airDate || 'unknown-date';
    const episodes = dates.get(key) || [];
    episodes.push(observation.episode);
    dates.set(key, episodes);
  }
  const conflictingDate = [...dates.values()].find((episodes) => uniqueSorted(episodes).length > 1);
  if (conflictingDate) {
    return {available: null, confidence: 'contradictory', candidates: uniqueSorted(conflictingDate), reason: 'Fuentes contradictorias para la misma fecha de publicación.'};
  }
  const episodes = uniqueSorted(published.map((observation) => observation.episode));
  const contiguous = episodes.every((episode, index) => index === 0 || episode === episodes[index - 1] + 1);
  return {
    available: episodes.length ? Math.max(...episodes) : null,
    confidence: contiguous && episodes.length ? 'confirmed' : episodes.length ? 'contradictory' : 'unverified',
    candidates: episodes,
    reason: contiguous ? 'Episodios publicados respaldados por fuentes.' : 'La numeración publicada no es continua.'
  };
}
