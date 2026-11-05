/**
 * LËK Network broadcast ident — built from the approved logo artwork (public/brand/lek-horizontal-light.svg).
 * The paths below are copied unchanged from that file; only their timing and reveal are designed here.
 * Used by components/Ident.tsx (website, with a static reduced-motion end frame) and by
 * scripts/brand/render-ident.mjs (1080p video render). Animation styles: components/ident.css.
 */

const HARE_T = 'translate(40.000 40.000) scale(0.609375)';
const WORD_T = 'translate(480.000 88.000) scale(1.161202)';
const HARE_BODY = 'M53,666 L36,649 L14,667 Z M36,608 L25,637 L38,627 L75,667 L92,667 Z M79,498 L72,515 L77,530 L92,517 L92,514 Z M93,461 L88,473 L125,514 L51,572 L43,590 L111,663 L190,590 L196,570 Z M135,524 L182,574 L183,578 L111,645 L56,586 Z M133,545 L79,587 L111,623 L162,577 Z M131,562 L144,577 L112,605 L98,588 Z M104,431 L100,442 L101,445 L202,552 L206,538 Z M158,304 L112,414 L211,520 L271,333 L200,319 Z M124,15 L130,46 L141,79 L157,112 L171,133 L275,192 L355,245 L384,268 L410,293 L434,326 L432,328 L412,318 L349,280 L201,176 L156,147 L93,120 L28,99 L43,143 L67,190 L92,224 L133,261 L167,281 L205,296 L252,308 L333,323 L360,330 L381,340 L356,360 L337,380 L302,433 L273,499 L237,604 L232,606 L195,606 L130,667 L545,667 L586,554 L308,554 L307,552 L323,528 L351,497 L378,476 L406,461 L449,449 L490,448 L528,454 L571,465 L589,465 L602,459 L629,426 L623,414 L581,358 L557,334 L530,313 L500,296 L477,287 L447,280 L426,279 L379,196 L347,145 L322,114 L291,86 L257,64 L226,49 L187,34 Z M484,342 L491,341 L510,345 L536,356 L555,372 L563,384 L537,385 L513,378 L497,364 Z';
const HARE_GOLD = 'M14,665 L37,649 L54,667 L74,667 L38,628 L25,638 Z M37,607 L93,667 L129,667 L194,606 L185,605 L189,591 L111,664 L43,591 Z M135,525 L57,586 L111,644 L183,577 Z M133,544 L163,577 L111,624 L78,587 Z M131,563 L99,588 L112,604 L143,577 Z M88,474 L80,498 L93,514 L93,517 L79,530 L75,529 L71,518 L51,571 L124,514 Z M100,444 L94,460 L196,569 L201,552 Z M111,414 L105,430 L206,537 L211,521 Z M585,165 L573,168 L559,178 L551,192 L549,207 L555,225 L564,235 L578,242 L593,243 L610,237 L619,229 L627,213 L628,201 L623,185 L611,172 L598,166 Z M468,165 L451,171 L442,179 L434,195 L433,208 L439,225 L448,235 L462,242 L477,243 L492,238 L504,227 L511,211 L511,197 L506,184 L496,173 L485,167 Z';
const WORD_BODY = 'M329,318 L353,376 L368,375 L385,336 L403,376 L417,376 L442,318 L428,318 L410,359 L392,318 L379,318 L364,355 L360,359 L343,318 Z M621,317 L607,319 L599,326 L596,318 L583,318 L583,376 L597,376 L598,339 L608,330 L621,330 Z M483,325 L475,335 L473,354 L477,363 L485,371 L500,377 L516,377 L531,371 L538,364 L543,353 L543,342 L537,329 L530,323 L519,318 L502,317 Z M495,331 L502,328 L514,328 L526,336 L529,342 L529,353 L520,364 L504,367 L490,359 L486,348 L487,341 Z M149,326 L142,336 L140,352 L143,361 L152,371 L167,377 L185,377 L204,368 L196,360 L183,367 L170,367 L162,364 L154,354 L155,351 L208,351 L206,334 L198,324 L185,318 L170,317 L161,319 Z M154,341 L161,331 L171,327 L178,327 L187,330 L193,336 L195,342 L155,343 Z M256,303 L256,317 L245,318 L244,328 L256,329 L257,366 L267,376 L285,377 L291,375 L291,363 L286,366 L276,366 L271,362 L270,330 L272,328 L292,328 L292,319 L271,318 L270,301 Z M15,300 L15,376 L29,376 L30,324 L86,375 L97,376 L97,300 L83,300 L82,352 L26,301 Z M662,296 L662,376 L676,376 L676,358 L683,352 L706,376 L724,376 L695,345 L724,318 L706,318 L677,344 L676,296 Z M463,72 L463,273 L530,273 L531,188 L621,273 L724,273 L615,180 L724,71 L644,71 L532,172 L530,171 L530,72 Z M225,71 L225,273 L440,273 L439,226 L291,225 L291,197 L293,194 L417,194 L418,185 L417,149 L293,149 L291,118 L433,117 L434,71 Z M16,71 L15,273 L201,273 L201,222 L82,221 L82,72 Z';
const WORD_GOLD = 'M356,13 L341,21 L336,38 L339,47 L346,54 L360,58 L368,56 L376,50 L381,40 L381,31 L373,18 L362,13 Z M289,13 L274,21 L270,28 L269,38 L272,47 L279,54 L293,58 L301,56 L309,50 L314,40 L314,30 L309,21 L303,16 Z';

/** Logo placement inside the 1920×1080 frame (logo space = the horizontal logo's own coordinates). */
const LOGO = 'translate(399 214) scale(0.82)';

/** Ticks along the time line: the network's "temps d'avance". */
const TICKS = Array.from({ length: 9 }, (_, i) => 160 + i * 200);

export type IdentOptions = { id: string; tagline: string; label: string };

/** Returns the ident as SVG markup (a string, so the website and the video renderer share one source). */
export function identSvg({ id, tagline, label }: IdentOptions): string {
  const c = (n: string) => `${id}-${n}`;
  return `<svg class="ident-svg" viewBox="0 0 1920 1080" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="${c('glow')}" cx="50%" cy="44%" r="62%">
      <stop offset="0" stop-color="#1c2640"/><stop offset="0.55" stop-color="#0f1526"/><stop offset="1" stop-color="#0b0f1a"/>
    </radialGradient>
    <clipPath id="${c('hare')}" clipPathUnits="userSpaceOnUse"><rect class="i-wipe-x i-wipe-hare" x="30" y="30" width="420" height="440"/></clipPath>
    <clipPath id="${c('lek')}" clipPathUnits="userSpaceOnUse"><rect class="i-wipe-up" x="480" y="160" width="860" height="258"/></clipPath>
    <clipPath id="${c('net')}" clipPathUnits="userSpaceOnUse"><rect class="i-wipe-x i-wipe-net" x="480" y="420" width="860" height="120"/></clipPath>
  </defs>
  <rect width="1920" height="1080" fill="url(#${c('glow')})"/>
  <g class="i-grid" stroke="#d4a017" stroke-opacity="0.07" fill="none">
    <path d="M0 270H1920M0 540H1920M0 810H1920M480 0V1080M960 0V1080M1440 0V1080"/>
  </g>
  <g class="i-time">
    <path class="i-line" d="M160 690H1760" pathLength="1" stroke="#d4a017" stroke-width="3" fill="none"/>
    ${TICKS.map((x, i) => `<path class="i-tick" style="--i:${i}" d="M${x} ${i % 2 ? 680 : 672}V${i % 2 ? 700 : 708}" stroke="#d4a017" stroke-width="3"/>`).join('')}
    <path class="i-marker" d="M0 -14L14 0L0 14L-14 0Z" fill="#d4a017"/>
  </g>
  <g transform="${LOGO}">
    <g class="i-facets" fill="none" stroke="#d4a017" stroke-width="5">
      <path class="i-facet" style="--i:0" d="M40 470L235 40L430 470Z"/>
      <path class="i-facet" style="--i:1" d="M90 300L235 110L380 300L235 490Z"/>
      <path class="i-facet" style="--i:2" d="M120 470L330 160L430 470Z"/>
    </g>
    <g clip-path="url(#${c('hare')})"><g class="i-hare"><g transform="${HARE_T}"><path fill="#FFFFFF" fill-rule="evenodd" d="${HARE_BODY}"/></g></g></g>
    <g class="i-hare-gold"><g transform="${HARE_T}"><path fill="#D4A017" fill-rule="evenodd" d="${HARE_GOLD}"/></g></g>
    <g clip-path="url(#${c('lek')})"><g class="i-lek"><g transform="${WORD_T}"><path fill="#FFFFFF" fill-rule="evenodd" d="${WORD_BODY}"/></g></g></g>
    <g clip-path="url(#${c('net')})"><g class="i-net"><g transform="${WORD_T}"><path fill="#FFFFFF" fill-rule="evenodd" d="${WORD_BODY}"/></g></g></g>
    <g class="i-dots"><g transform="${WORD_T}"><path fill="#D4A017" fill-rule="evenodd" d="${WORD_GOLD}"/></g></g>
  </g>
  <text class="i-tag" x="960" y="812" text-anchor="middle" lang="fr" direction="ltr">${tagline}</text>
</svg>`;
}
