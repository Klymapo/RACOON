import {normalizeLegacyCatalog} from './model.mjs';

const LEGACY_CATALOG = [
  {id: 'fx', name: 'FX Fighter Kurumi-chan', platform: 'Crunchyroll', date: '2026-10-01', kind: 'Estreno'},
  {id: 'over', name: 'Overgeared', platform: 'Crunchyroll', date: '2026-10-04', kind: 'Estreno'},
  {id: 'bot', name: 'The Apothecary Diaries · T3', platform: 'Crunchyroll', date: '2026-10-02', kind: 'Nueva temporada'},
  {id: 'tokyo', name: 'Tokyo Revengers · Guerra de los Tres Titanes', platform: 'Disney+', date: '2026-10-02', kind: 'Nueva temporada'},
  {id: 'zombie', name: "#I'm Looking for a Zombie", platform: 'Crunchyroll', date: '2026-10-03', kind: 'Estreno'},
  {id: 'saint', name: 'A Tale of the Secret Saint', platform: 'Crunchyroll', date: '2026-10-03', kind: 'Estreno'},
  {id: 'magical', name: 'Magical Explorer', platform: 'Crunchyroll', date: '2026-10-03', kind: 'Estreno'},
  {id: 'ranma', name: 'Ranma ½ · T3', platform: 'Netflix', date: '2026-10-03', kind: 'Nueva temporada'},
  {id: 'romelia', name: 'Romelia War Chronicle', platform: 'Crunchyroll', date: '2026-10-03', kind: 'Estreno'},
  {id: 'vertex', name: 'Vertex Force', platform: 'Crunchyroll', date: '2026-10-03', kind: 'Estreno'},
  {id: 'space', name: 'Reborn as a Space Mercenary', platform: 'Crunchyroll', date: '2026-10-04', kind: 'Estreno'},
  {id: 'tank', name: 'Tank Chair', platform: 'Prime Video*', date: '2026-10-04', kind: 'Estreno'},
  {id: 'goblin', name: "So What's Wrong with Getting Reborn as a Goblin?", platform: 'Crunchyroll', date: '2026-10-05', kind: 'Estreno'},
  {id: 'chojo', name: 'Super Psychic Policeman Chojo', platform: 'Crunchyroll', date: '2026-10-06', kind: 'Estreno'},
  {id: 'cheat', name: 'The Laid-Off Cheat-Granting Mage Enjoys a Second Lease on Life', platform: 'Crunchyroll', date: '2026-10-06', kind: 'Estreno'},
  {id: 'witch', name: "The World's Strongest Witch", platform: 'Crunchyroll', date: '2026-10-07', kind: 'Estreno'},
  {id: 'avatar', name: 'Avatar: Seven Havens', platform: 'Paramount+', date: '2026-10-09', kind: 'Nueva serie'},
  {id: 'verm', name: 'The Vermilion Mask', platform: 'Crunchyroll', date: '2026-10-10', kind: 'Estreno'},
  {id: 'yoza', name: 'Mission: Yozakura Family · T2, parte 2', platform: 'Disney+', date: '2026-10-11', kind: 'Continuación'},
  {id: 'dark', name: 'A Certain Dark Item', platform: 'Crunchyroll', date: '2026-10-09', kind: 'Estreno'},
  {id: 'elusive', name: 'The Elusive Samurai · T2', platform: 'Disponibilidad variable', date: '2026-10-02', kind: 'Finalizada'},
  {id: 'kaiju', name: 'Kaiju Girl Caramelise', platform: 'Crunchyroll', date: '2026-09-17', kind: 'Finalizada'},
  {id: 'heavy', name: 'The Exiled Heavy Knight Knows How to Game the System', platform: 'Crunchyroll', date: '2026-10-01', kind: 'Continuación'},
  {id: 'dandi', name: 'Dandivine', platform: 'Crunchyroll', date: '2026-10-07', kind: 'Estreno'},
  {id: 'sasaki', name: 'Sasaki and Peeps · T2', platform: 'Crunchyroll', date: '2026-10-07', kind: 'Nueva temporada'}
];

export const CATALOG = normalizeLegacyCatalog(LEGACY_CATALOG);
export const CATALOG_BY_ID = new Map(CATALOG.map((entry) => [entry.id, entry]));
