import {formatInTimeZone, zonedDateTimeToEpoch} from './time.mjs';

function plusDays(ymd, amount) {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function statusMatches(entry, tracking, filter) {
  if (filter === 'all') return true;
  const available = tracking.availableOverride ?? entry.availableEpisodes ?? 0;
  if (filter === 'pending') return available > tracking.seen;
  if (filter === 'uptodate') return available > 0 && tracking.seen >= available;
  return true;
}

export function buildCalendarModel(catalog = [], state = {}, options = {}) {
  const weekStart = options.weekStart || new Date().toISOString().slice(0, 10);
  const selectedDay = options.selectedDay || weekStart;
  const days = Array.from({length: 7}, (_, index) => ({date: plusDays(weekStart, index), entries: []}));
  const filtered = catalog.filter((entry) => {
    const tracking = state.tracking?.[entry.id] || {seen: 0};
    return entry.date >= weekStart && entry.date <= plusDays(weekStart, 6)
      && (options.platform === 'all' || !options.platform || String(entry.platform || '').includes(options.platform))
      && statusMatches(entry, tracking, options.status || 'all');
  }).map((entry) => {
    const tracking = state.tracking?.[entry.id] || {seen: 0};
    let mexicoDate = entry.date;
    let mexicoTime = null;
    if (entry.sourceTime) {
      const epoch = zonedDateTimeToEpoch(entry.sourceTime.date, entry.sourceTime.time, entry.sourceTime.timeZone);
      const formatted = formatInTimeZone(epoch, 'America/Mexico_City', 'en-CA');
      mexicoDate = formatted.slice(0, 10);
      mexicoTime = formatted;
    }
    const confidence = entry.scheduleConfidence || 'unverified';
    return {
      ...entry,
      tracking,
      confidence,
      statusLabel: confidence === 'confirmed' ? 'Confirmado' : confidence === 'announced' ? 'Anunciado' : confidence === 'estimated' ? 'Estimado' : 'Sin verificar',
      mexicoDate,
      mexicoTime,
      episodeLabel: entry.episodeLabel || 'Episodio pendiente de verificar'
    };
  });
  for (const event of filtered) {
    const day = days.find((candidate) => candidate.date === event.date);
    if (day) day.entries.push(event);
  }
  for (const day of days) day.entries.sort((left, right) => String(left.mexicoTime || '').localeCompare(String(right.mexicoTime || '')) || String(left.title || left.name).localeCompare(String(right.title || right.name)));
  return {weekStart, selectedDay, days, mobileEntries: days.find((day) => day.date === selectedDay)?.entries || []};
}

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
