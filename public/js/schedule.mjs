import {formatInTimeZone, zonedDateTimeToEpoch} from './time.mjs';
import {isMovie} from './media.mjs';

function plusDays(ymd, amount) {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function recurringDate(entry, date) {
  if (isMovie(entry)) return null;
  if (entry.kind === 'Finalizada' || entry.airingStatus === 'FINISHED' || entry.airingStatus === 'CANCELLED' || entry.airingStatus === 'HIATUS') return null;
  const schedule = entry.weeklySchedule;
  if (!schedule || schedule.frequency !== 'weekly' || !Number.isInteger(schedule.day)) return null;
  const startDate = schedule.startDate || entry.date;
  if (startDate && date < startDate) return null;
  if (schedule.endDate && date > schedule.endDate) return null;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return schedule.day === (weekday + 6) % 7 ? date : null;
}

function sourceTimeFor(entry, date) {
  if (!entry.sourceTime?.time || !entry.sourceTime?.timeZone) return null;
  return {...entry.sourceTime, date};
}

function explicitEvent(entry, date) {
  return (entry.scheduleEvents || []).find((event) => event.date === date) || null;
}

function animeApiSources(entry) {
  const found = (entry.sources || []).filter((source) => source.name === 'AniList' || /^https:\/\/anilist\.co\//.test(source.url || ''));
  return found.length ? found : entry.sources || [];
}

function statusLabel(confidence) {
  return confidence === 'confirmed' ? 'Confirmado'
    : confidence === 'announced' ? 'Anunciado'
      : confidence === 'estimated' ? 'Previsto'
        : confidence === 'contradictory' ? 'Contradictorio'
          : 'Sin verificar';
}

function statusMatches(entry, tracking, filter) {
  if (filter === 'all') return true;
  if (isMovie(entry)) return filter === 'pending' ? !['Terminada', 'Descartada'].includes(tracking.status) : false;
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
    return statusMatches(entry, tracking, options.status || 'all');
  }).flatMap((entry) => {
    const tracking = state.tracking?.[entry.id] || {seen: 0};
    // Include source-side boundary days: conversion may place an event on the
    // preceding or following Mexico day, especially near Sunday/Monday.
    const planned = Array.from({length: 9}, (_, index) => plusDays(weekStart, index - 1)).map((date) => {
      const recurring = recurringDate(entry, date);
      const explicit = explicitEvent(entry, date);
      if (explicit?.status === 'paused' || explicit?.status === 'cancelled' || explicit?.status === 'delayed') return null;
      const initialDate = entry.date === date || entry.premiereDate === date ? date : null;
      if (!recurring && !explicit && !initialDate) return null;
      if (!recurring && entry.kind === 'Finalizada' && !explicit && !initialDate) return null;
      const eventDate = explicit?.date || recurring || initialDate;
      const japanPremiere = entry.premiereDate === date && entry.date !== date && !explicit && (entry.id?.startsWith('anilist:') || entry.sources?.some((source) => source.name === 'AniList'));
      const eventTime = explicit?.sourceTime || (recurring ? sourceTimeFor(entry, eventDate) : entry.sourceTime);
      let mexicoDate = eventDate;
      let mexicoTime = null;
      if (eventTime?.date && eventTime?.time && eventTime?.timeZone) {
        const epoch = zonedDateTimeToEpoch(eventTime.date, eventTime.time, eventTime.timeZone);
        const formatted = formatInTimeZone(epoch, 'America/Mexico_City', 'en-CA');
        mexicoDate = formatted.slice(0, 10);
        mexicoTime = formatted;
      }
      const isProjected = Boolean(recurring && !initialDate && !explicit);
      const confidence = explicit?.confidence || (isProjected ? 'estimated' : null) || entry.scheduleConfidence || 'unverified';
      const candidates = explicit?.episodeCandidates || entry.episodeCandidates;
      const episodeLabel = isMovie(entry) ? 'Estreno de película' : explicit?.episodeLabel || (candidates?.length && explicit ? `Episodio ${candidates.join('/')} · discrepancia` : entry.episodeLabel) || (japanPremiere ? 'Estreno japonés · fecha AniList' : 'Episodio pendiente de verificar');
      return {
        ...entry,
        ...explicit,
        tracking,
        confidence,
        statusLabel: statusLabel(confidence),
        mexicoDate,
        mexicoTime,
        episodeLabel,
        platformLabel: japanPremiere ? 'Emisión japonesa · AniList' : entry.platform || 'Plataforma pendiente',
        eventKind: japanPremiere ? 'japan-premiere' : 'platform',
        sources: explicit?.sources || (japanPremiere ? animeApiSources(entry) : isProjected && entry.patternSource ? [entry.patternSource, ...(entry.sources || [])] : entry.sources || []),
        projected: isProjected,
        projectionNote: isProjected ? 'Patrón semanal orientativo; puede cambiar y no confirma disponibilidad.' : null
      };
    }).filter(Boolean);
    const airingAt = Number(entry.nextAiring?.airingAt) * 1000;
    if (!isMovie(entry) && Number.isFinite(airingAt) && airingAt > 0 && Number.isInteger(entry.nextAiring?.episode)) {
      const mexicoTime = formatInTimeZone(airingAt, 'America/Mexico_City', 'en-CA');
      const mexicoDate = mexicoTime.slice(0, 10);
      if (days.some(({date}) => date === mexicoDate)) {
        const existingPremiere = planned.findIndex((event) => event.mexicoDate === mexicoDate && event.episodeLabel === 'Estreno japonés · fecha AniList');
        if (existingPremiere >= 0) planned.splice(existingPremiere, 1);
        planned.push({...entry, tracking, mexicoDate, mexicoTime, confidence: 'estimated', statusLabel: 'Previsto', episodeLabel: `Episodio ${entry.nextAiring.episode}`, platformLabel: 'Emisión japonesa · AniList', eventKind: 'japan-airing', sources: animeApiSources(entry)});
      }
    }
    return planned.filter((event) => !options.platform || options.platform === 'all' || (event.eventKind === 'platform' && [event.platform, ...(event.platforms || [])].includes(options.platform)));
  });
  for (const event of filtered) {
    const day = days.find((candidate) => candidate.date === event.mexicoDate);
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
