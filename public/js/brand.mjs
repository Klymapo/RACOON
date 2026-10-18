// Rostro geométrico: identidad compartida por el icono y el Racoonómetro.
// Nunca se deriva el gesto de la calificación personal.
const SHAPES = "  <path d=\"M51 101 27 51 85 77M171 77 229 51 205 101\" fill=\"#8656E8\" stroke=\"#100B24\" stroke-width=\"8\" stroke-linejoin=\"round\"/>\n  <path d=\"M38 147 49 103 87 77 169 77 207 103 218 147 202 198 170 226 86 226 54 198Z\" fill=\"#8656E8\" stroke=\"#100B24\" stroke-width=\"8\" stroke-linejoin=\"round\"/>\n  <path d=\"M54 143 79 111 128 118 177 111 202 143 191 188 164 207 92 207 65 188Z\" fill=\"#B49AFF\"/>\n  <path d=\"M46 143 69 119 108 111 128 131 113 166 74 176 49 162Z\" fill=\"#24183F\"/>\n  <path d=\"M210 143 187 119 148 111 128 131 143 166 182 176 207 162Z\" fill=\"#24183F\"/>\n  <path d=\"M83 132 104 128 110 138 105 151 87 152 80 144Z\" fill=\"#F4EFFF\"/>\n  <path d=\"M173 132 152 128 146 138 151 151 169 152 176 144Z\" fill=\"#F4EFFF\"/>\n  <circle cx=\"98\" cy=\"141\" r=\"5\" fill=\"#100B24\"/>\n  <circle cx=\"158\" cy=\"141\" r=\"5\" fill=\"#100B24\"/>\n  <path d=\"M117 174H139L128 187Z\" fill=\"#24183F\"/>\n  <path d=\"M73 87 123 23 159 89Z\" fill=\"#392459\" stroke=\"#100B24\" stroke-width=\"7\" stroke-linejoin=\"round\"/>\n  <path d=\"M65 89H176L188 99H67Z\" fill=\"#8656E8\" stroke=\"#100B24\" stroke-width=\"6\" stroke-linejoin=\"round\"/>\n  <path d=\"M133 47 137 55 146 56 140 62 141 70 133 66 125 70 126 62 120 56 129 55Z\" fill=\"#F4EFFF\"/>";
const MOUTHS = Object.freeze({
  'sin dato': '<path d="M110 199H146" fill="none" stroke="#24183F" stroke-width="6" stroke-linecap="round"/>',
  'decepcionado': '<path d="M110 210Q128 189 146 210" fill="none" stroke="#24183F" stroke-width="6" stroke-linecap="round"/>',
  'dudoso': '<path d="M110 207L146 198" fill="none" stroke="#24183F" stroke-width="6" stroke-linecap="round"/>',
  'neutral': '<path d="M110 202H146" fill="none" stroke="#24183F" stroke-width="6" stroke-linecap="round"/>',
  'contento': '<path d="M110 198Q128 214 146 198" fill="none" stroke="#24183F" stroke-width="6" stroke-linecap="round"/>',
  'emocionado': '<path d="M109 197Q128 229 147 197Z" fill="#24183F" stroke="#24183F" stroke-width="4" stroke-linejoin="round"/>'
});
const BROWS = Object.freeze({
  'decepcionado': '<path d="M79 122L110 128M177 122L146 128" stroke="#100B24" stroke-width="5" stroke-linecap="round"/>',
  'dudoso': '<path d="M80 119L108 125M148 124L177 115" stroke="#100B24" stroke-width="5" stroke-linecap="round"/>',
  'emocionado': '<path d="M82 120Q96 112 109 121M147 121Q160 112 174 120" stroke="#100B24" stroke-width="5" fill="none" stroke-linecap="round"/>'
});
export function renderRacoonFace(face = 'sin dato') {
  const expression = Object.hasOwn(MOUTHS,face) ? face : 'sin dato';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="120" height="120" role="img" aria-label="Mapache '+expression+'">' +
    SHAPES + (BROWS[expression] || '') + MOUTHS[expression] + '</svg>';
}
