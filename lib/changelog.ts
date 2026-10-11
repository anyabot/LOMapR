import type { Release } from '@altterisk/game-hub';
import { createSeenStore } from '@altterisk/game-hub/persist';

export const RELEASES: Release[] = [
  {
    date: '2026-10-08',
    title: 'Global 1.4.7 / KR 2.6.18',
    entries: [
      { kind: 'data', text: 'Game data for Global 1.4.7 and KR 2.6.18.' },
      { kind: 'feature', text: 'New site bar, theme and footer shared with the other altterisk.cc game sites.' },
    ],
  },
  {
    date: '2026-10-03',
    title: 'Global 1.4.6 / KR 2.6.17',
    entries: [
      { kind: 'data', text: 'Game data for Global 1.4.6 and KR 2.6.17.' },
      { kind: 'fix', text: 'Added a missing skin.' },
      { kind: 'fix', text: 'L2D picture downloads save at full resolution.' },
    ],
  },
  {
    date: '2026-09-22',
    title: 'KR 2.6.16',
    entries: [
      { kind: 'data', text: 'Game data for KR 2.6.16.' },
      { kind: 'fix', text: 'Spine picture downloads save at full resolution.' },
      { kind: 'fix', text: 'Skinned skins draw the face on the right sorting layer.' },
    ],
  },
  {
    date: '2026-09-10',
    entries: [{ kind: 'data', text: 'Game data update.' }],
  },
  {
    date: '2026-08-31',
    entries: [{ kind: 'fix', text: 'Story-only stages such as 13-3 no longer show as battles with drops.' }],
  },
  {
    date: '2026-08-27',
    entries: [
      { kind: 'data', text: 'Game data update.' },
      { kind: 'fix', text: 'Skinned viewer fixes: face layering, face swaps on load, spline-driven parts.' },
    ],
  },
  {
    date: '2026-08-13',
    entries: [
      { kind: 'data', text: 'Game data update.' },
      { kind: 'feature', text: 'New skinned skin viewer with smooth animation transitions.' },
    ],
  },
];

export const seen = createSeenStore('lomapr.seen');

export const changelogKey = `changelog:${RELEASES[0].date}`;
