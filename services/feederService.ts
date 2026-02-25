
import { UNIT_FEEDERS, DEFAULT_FEEDERS } from '../constants';

const STORAGE_KEY = 'qnpc_feeder_lib_v3';

export const getFeederLibrary = (): Record<string, string[]> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing feeder library', e);
    }
  }
  return JSON.parse(JSON.stringify(UNIT_FEEDERS));
};

export const saveFeederLibrary = (library: Record<string, string[]>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
};

export const getFeedersForUnit = (unit: string): string[] => {
  const library = getFeederLibrary();
  if (Object.prototype.hasOwnProperty.call(library, unit)) {
    return [...library[unit]];
  }
  return [...(UNIT_FEEDERS[unit] || DEFAULT_FEEDERS)];
};

export const updateFeedersForUnit = (unit: string, feeders: string[]) => {
  const library = getFeederLibrary();
  const newLibrary = {
    ...library,
    [unit]: [...feeders]
  };
  saveFeederLibrary(newLibrary);
  return newLibrary;
};

export const resetFeedersForUnit = (unit: string) => {
  const library = getFeederLibrary();
  const newLibrary = { ...library };
  delete newLibrary[unit];
  saveFeederLibrary(newLibrary);
  return getFeedersForUnit(unit);
};
