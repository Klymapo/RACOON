function partsFor(epochMs, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  return Object.fromEntries(formatter.formatToParts(new Date(epochMs))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]));
}

export function zonedDateTimeToEpoch(dateYmd, timeHm, timeZone) {
  const [year, month, day] = String(dateYmd).split('-').map(Number);
  const [hour, minute] = String(timeHm).split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new TypeError('Fecha u hora inválida');
  }
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let index = 0; index < 4; index += 1) {
    const local = partsFor(guess, timeZone);
    const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    guess += target - represented;
  }
  return guess;
}

export function formatInTimeZone(epochMs, timeZone, locale = 'es-MX', options = {}) {
  if (locale === 'en-CA') {
    const parts = partsFor(epochMs, timeZone);
    return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')} ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  }
  return new Intl.DateTimeFormat(locale, {timeZone, ...options}).format(new Date(epochMs));
}

export function mexicoDate(epochMs) {
  return formatInTimeZone(epochMs, 'America/Mexico_City', 'en-CA').slice(0, 10);
}
