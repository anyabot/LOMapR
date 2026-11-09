import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import * as data from '@/lib/fetchData';
import regionReducer, { setRegion } from '@/store/regionSlice';
import unitReducer, { fetchUnitsAsync, fetchUnitBundleAsync, selectUnitFull, selectUnitSkills, selectUnits } from '@/store/unitSlice';
import sanctumReducer, { fetchSanctumAsync, selectFloorData, setFloor } from '@/store/sanctumSlice';

vi.mock('@/lib/fetchData', () => ({
  fetchUnitList: vi.fn(),
  fetchUnitBundle: vi.fn(),
  fetchSanctum: vi.fn(),
}));

const mocked = vi.mocked(data);

const makeStore = () => configureStore({ reducer: { region: regionReducer, unit: unitReducer, sanctum: sanctumReducer } });
type TestStore = ReturnType<typeof makeStore>;
const root = (s: TestStore) => s.getState() as unknown as RootState;
const dispatch = (s: TestStore, a: unknown) => (s.dispatch as (x: unknown) => Promise<unknown>)(a);

beforeEach(() => {
  vi.clearAllMocks();
  mocked.fetchUnitList.mockImplementation(async (region) => ({ [`U_${region}`]: { id: `U_${region}`, name: 'n' } }) as any);
  mocked.fetchUnitBundle.mockImplementation(async (id) => ({ skills: { S: { name: `${id}-skill` } }, detail: { craft: 60 } }));
  mocked.fetchSanctum.mockResolvedValue({ EW01: [[{ name: 'f0' }], [{ name: 'f1d0' }, { name: 'f1d1' }]] } as any);
});

describe('unit slice', () => {
  it('fetches the list once per region and keeps both buckets', async () => {
    const store = makeStore();
    await dispatch(store, fetchUnitsAsync());
    await dispatch(store, fetchUnitsAsync());
    expect(mocked.fetchUnitList).toHaveBeenCalledTimes(1);
    store.dispatch(setRegion('kr'));
    await dispatch(store, fetchUnitsAsync());
    expect(Object.keys(selectUnits(root(store)))).toEqual(['U_kr']);
    store.dispatch(setRegion('global'));
    await dispatch(store, fetchUnitsAsync());
    expect(mocked.fetchUnitList).toHaveBeenCalledTimes(2);
    expect(Object.keys(selectUnits(root(store)))).toEqual(['U_global']);
  });

  it('marks the bucket failed on error and stops refetching', async () => {
    mocked.fetchUnitList.mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await dispatch(store, fetchUnitsAsync());
    expect(root(store).unit.byRegion.global.status).toBe('failed');
    await dispatch(store, fetchUnitsAsync());
    expect(mocked.fetchUnitList).toHaveBeenCalledTimes(1);
  });

  it('loads a unit bundle once and merges its detail', async () => {
    const store = makeStore();
    await dispatch(store, fetchUnitsAsync());
    await dispatch(store, fetchUnitBundleAsync('U_global'));
    await dispatch(store, fetchUnitBundleAsync('U_global'));
    expect(mocked.fetchUnitBundle).toHaveBeenCalledTimes(1);
    expect(selectUnitFull(root(store), 'U_global')).toMatchObject({ id: 'U_global', craft: 60 });
    expect(selectUnitSkills(root(store), 'U_global')).toEqual({ S: { name: 'U_global-skill' } });
  });

  it('returns stable references across unrelated updates', async () => {
    const store = makeStore();
    mocked.fetchUnitList.mockResolvedValue({ A: { id: 'A' }, B: { id: 'B' } } as any);
    await dispatch(store, fetchUnitsAsync());
    await dispatch(store, fetchUnitBundleAsync('A'));
    const a1 = selectUnitFull(root(store), 'A');
    await dispatch(store, fetchUnitBundleAsync('B'));
    expect(selectUnitFull(root(store), 'A')).toBe(a1);
    expect(selectUnitSkills(root(store), 'missing')).toBe(selectUnitSkills(root(store), 'other'));
    expect(selectUnitFull(root(store), 'missing')).toBeNull();
  });
});

describe('sanctum slice', () => {
  it('clamps the selection and memoizes the floor', async () => {
    const store = makeStore();
    await dispatch(store, fetchSanctumAsync());
    const f0 = selectFloorData(root(store));
    expect(f0).toEqual({ name: 'f0' });
    expect(selectFloorData(root(store))).toBe(f0);
    store.dispatch(setFloor(9));
    expect(selectFloorData(root(store))).toEqual({ name: 'f1d0' });
  });

  it('does not refetch a loaded region', async () => {
    const store = makeStore();
    await dispatch(store, fetchSanctumAsync());
    await dispatch(store, fetchSanctumAsync());
    expect(mocked.fetchSanctum).toHaveBeenCalledTimes(1);
  });
});
