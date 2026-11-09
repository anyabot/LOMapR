import { describe, it, expect } from 'vitest';
import { variant, iconSrc, hasPublicImage } from '@/lib/imageSrc';

describe('image variants', () => {
  it('maps a listed icon PNG to its tile WebP', () => {
    expect(hasPublicImage('images/icons/Ev_Chocolate_3P_Aurora.png')).toBe(true);
    expect(iconSrc('Ev_Chocolate_3P_Aurora')).toBe('/images/_w/icons/Ev_Chocolate_3P_Aurora.webp');
  });

  it('keeps unlisted icons and other folders as-is', () => {
    expect(iconSrc('Not_A_Real_Icon')).toBe('/images/icons/Not_A_Real_Icon.png');
    expect(variant('/images/B_Stage.png')).toBe('/images/B_Stage.png');
    expect(variant('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
});
