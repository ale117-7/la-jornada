// Miniaturas del arte para los paneles (DOM): cada una es un <span> con fondo del atlas.
import { ENTRY_BY_ID } from '../data/origins';
import { SLOT_BY_ID } from '../data/buildings';
import { TAGS, type Tag } from '../data/tags';
import { BUILDING_ART, CHASSIS_ART, COMPANION_ART, EQUIP_ICON, EQUIP_SHEET, FAMILY_ART, HERO, ICONS, MUT_SHEET, mutIcon, PET_ART, SYN_SHEET, synIcon } from '../render/art/catalog';
import { spriteHtml, type ArtDef } from '../render/art/sprites';
import { MUTATIONS } from '../data/mutations';

const thumb = (d: ArtDef | undefined, size: number, title = '', cls = ''): string => {
  if (!d) return '';
  const html = spriteHtml(d.sheet, d.portrait && cls === 'portrait' ? d.portrait : d.ref, size, title);
  return cls && html ? html.replace('class="spr"', `class="spr ${cls}"`) : html;
};

/** Arte de una carta de Encrucijada (o cadena vacía para dejar el glifo). */
export function cardArt(id: string): string {
  const [kind, rest] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
  if (kind === 'origen') {
    const [e, c] = rest.split('+');
    const fams = (ENTRY_BY_ID[e]?.familias ?? []).map((f) => thumb(FAMILY_ART[f], 40, '', 'mirror')).join('');
    return `${thumb(CHASSIS_ART[c], 62)}<span class="fams">${fams}</span>`;
  }
  if (kind === 'comp') return thumb(COMPANION_ART[rest], 62);
  if (kind === 'pacto') return spriteHtml(ICONS, [3, 3], 46);
  if (kind === 'destino') return spriteHtml(ICONS, [1, 1], 46);
  if (kind === 'reliquia') return spriteHtml(ICONS, [1, 6], 46);
  if (kind === 'rumbo') return spriteHtml(ICONS, [7, 10], 46);
  return '';
}

export const chassisThumb = (id: string | null, size = 34): string => thumb(id ? CHASSIS_ART[id] : HERO.N, size);
export const companionThumb = (id: string, size = 34): string => thumb(COMPANION_ART[id], size);
export const petThumb = (id: string, size = 22): string => thumb(PET_ART[id], size);
export const synergyThumb = (tag: Tag, size = 20): string => spriteHtml(SYN_SHEET, synIcon(TAGS.indexOf(tag)), size);

export function mutationThumb(id: string, size = 18): string {
  const i = MUTATIONS.findIndex((m) => m.id === id);
  return i >= 0 ? spriteHtml(MUT_SHEET, mutIcon(i), size) : '';
}

/** Icono del módulo de la Base (su dibujo de nivel medio si no trae icono). */
export function buildingThumb(id: string, size = 40): string {
  const a = BUILDING_ART[id];
  if (!a) return '';
  return spriteHtml(a.sheet, [a.levels[1], 1], size);
}

/** Icono de una pieza de equipo fabricada. */
export function equipThumb(slot: string, nombre: string, size = 22): string {
  const piezas: string[] = (SLOT_BY_ID as Record<string, { piezas: string[] } | undefined>)[slot]?.piezas ?? [];
  const i = Math.max(0, piezas.findIndex((p) => nombre.includes(p)));
  const refs = EQUIP_ICON[slot];
  return refs ? spriteHtml(EQUIP_SHEET, refs[i % refs.length], size) : '';
}
