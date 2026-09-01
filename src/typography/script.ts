/**
 * Which writing system the page is set in. The typographic rules are not the
 * same for both — a line of 32 full-width Japanese glyphs is a comfortable
 * measure, while 32 Latin characters is a cramped one — so every rule that
 * counts characters has to know which it is looking at.
 */
export type Script = "latin" | "cjk";

export interface ScriptReading {
  script: Script;
  /** Share of the counted glyphs that are CJK, so the page can say when a
   * document is mixed rather than pretending it is one or the other. */
  cjkRatio: number;
  mixed: boolean;
}

/* Han, Hiragana, Katakana and full-width forms. Punctuation is left out on
   purpose: it is shared between scripts and would blur the ratio. */
const CJK = /[぀-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]/u;
const LATIN = /[A-Za-zÀ-ɏ]/u;

/** Above this share of CJK glyphs the line is filled by full-width characters,
 * so the CJK bands apply even though Latin words are mixed in. */
const CJK_DOMINANT = 0.3;
/** Below this the document is Latin with the odd loan word or name. */
const CJK_INCIDENTAL = 0.05;

export function readScript(text: string): ScriptReading {
  let cjk = 0;
  let latin = 0;
  for (const ch of text) {
    if (CJK.test(ch)) cjk += 1;
    else if (LATIN.test(ch)) latin += 1;
  }
  const counted = cjk + latin;
  const cjkRatio = counted === 0 ? 0 : cjk / counted;
  return {
    script: cjkRatio >= CJK_DOMINANT ? "cjk" : "latin",
    cjkRatio: Number(cjkRatio.toFixed(3)),
    mixed: cjkRatio > CJK_INCIDENTAL && cjkRatio < 1 - CJK_INCIDENTAL,
  };
}
