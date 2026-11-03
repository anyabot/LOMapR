// The site CSP forbids eval; Pixi's unsafe-eval module swaps in eval-free shader and uniform code.
export async function loadPixi() {
  await import('pixi.js/unsafe-eval');
  return import('pixi.js');
}
