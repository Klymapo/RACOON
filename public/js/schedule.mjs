export function scheduleEvent(input = {}, nowMs = Date.now()) {
  const published = (input.published || []).filter((event) => Number.isFinite(Date.parse(event.at)) && Date.parse(event.at) <= nowMs);
  const announced = (input.announced || []).filter((event) => Number.isFinite(Date.parse(event.at)) && Date.parse(event.at) > nowMs);
  const scheduled = (input.scheduled || []).filter((event) => Number.isFinite(Date.parse(event.at)) && Date.parse(event.at) > nowMs);
  const nextSource = announced[0] || scheduled[0] || null;
  return {
    available: published.length ? Math.max(...published.map((event) => event.episode).filter(Number.isFinite)) : null,
    confidence: published.length ? 'confirmed' : 'unverified',
    next: nextSource ? {...nextSource, status: announced[0] ? 'announced' : 'scheduled'} : null
  };
}
