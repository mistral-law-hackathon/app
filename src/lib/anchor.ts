export function locateQuote(text: string, quote: string, from = 0): [number, number] | null {
  const exact = text.indexOf(quote, from);
  if (exact >= 0) return [exact, exact + quote.length];
  const anywhere = text.indexOf(quote);
  if (anywhere >= 0) return [anywhere, anywhere + quote.length];

  const words = quote.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return null;
  const m = new RegExp(words.join("[\\s*_#>-]+"), "i").exec(text);
  if (m) return [m.index, m.index + m[0].length];

  // fallback: anchor on the first ~8 words
  if (words.length > 8) {
    const head = new RegExp(words.slice(0, 8).join("[\\s*_#>-]+"), "i").exec(text);
    if (head) return [head.index, head.index + head[0].length];
  }
  return null;
}
