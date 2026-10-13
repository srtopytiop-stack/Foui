/**
 * ATLASYNTH — Scientific Dimensional Analysis & Unit Conversion
 * @license Apache-2.0
 */

export interface UnitCategory {
  name: string;
  baseUnit: string;
  units: Record<string, { factor: number; symbol: string; offset?: number }>;
}

export const UNIT_CATEGORIES: Record<string, UnitCategory> = {
  energy: {
    name: 'Energy / Work',
    baseUnit: 'joule',
    units: {
      joule: { factor: 1, symbol: 'J' },
      kilojoule: { factor: 1e3, symbol: 'kJ' },
      megajoule: { factor: 1e6, symbol: 'MJ' },
      calorie: { factor: 4.184, symbol: 'cal' },
      kilocalorie: { factor: 4184, symbol: 'kcal' },
      electronvolt: { factor: 1.602176634e-19, symbol: 'eV' },
      watt_hour: { factor: 3600, symbol: 'Wh' },
      kilowatt_hour: { factor: 3.6e6, symbol: 'kWh' },
      btu: { factor: 1055.06, symbol: 'BTU' },
    },
  },
  pressure: {
    name: 'Pressure',
    baseUnit: 'pascal',
    units: {
      pascal: { factor: 1, symbol: 'Pa' },
      kilopascal: { factor: 1e3, symbol: 'kPa' },
      megapascal: { factor: 1e6, symbol: 'MPa' },
      bar: { factor: 1e5, symbol: 'bar' },
      atmosphere: { factor: 101325, symbol: 'atm' },
      torr: { factor: 133.322, symbol: 'Torr' },
      psi: { factor: 6894.76, symbol: 'psi' },
    },
  },
  force: {
    name: 'Force',
    baseUnit: 'newton',
    units: {
      newton: { factor: 1, symbol: 'N' },
      kilonewton: { factor: 1e3, symbol: 'kN' },
      dyne: { factor: 1e-5, symbol: 'dyn' },
      pound_force: { factor: 4.44822, symbol: 'lbf' },
    },
  },
  temperature: {
    name: 'Temperature',
    baseUnit: 'kelvin',
    units: {
      kelvin: { factor: 1, symbol: 'K', offset: 0 },
      celsius: { factor: 1, symbol: '°C', offset: 273.15 },
      fahrenheit: { factor: 5 / 9, symbol: '°F', offset: 459.67 * (5 / 9) },
    },
  },
  length: {
    name: 'Length',
    baseUnit: 'meter',
    units: {
      meter: { factor: 1, symbol: 'm' },
      kilometer: { factor: 1e3, symbol: 'km' },
      centimeter: { factor: 0.01, symbol: 'cm' },
      millimeter: { factor: 0.001, symbol: 'mm' },
      micrometer: { factor: 1e-6, symbol: 'µm' },
      nanometer: { factor: 1e-9, symbol: 'nm' },
      angstrom: { factor: 1e-10, symbol: 'Å' },
      astronomical_unit: { factor: 1.495978707e11, symbol: 'AU' },
      light_year: { factor: 9.4607e15, symbol: 'ly' },
    },
  },
  mass: {
    name: 'Mass',
    baseUnit: 'kilogram',
    units: {
      kilogram: { factor: 1, symbol: 'kg' },
      gram: { factor: 1e-3, symbol: 'g' },
      milligram: { factor: 1e-6, symbol: 'mg' },
      microgram: { factor: 1e-9, symbol: 'µg' },
      ton_metric: { factor: 1e3, symbol: 't' },
      pound: { factor: 0.45359237, symbol: 'lb' },
      ounce: { factor: 0.0283495, symbol: 'oz' },
      dalton: { factor: 1.6605390666e-27, symbol: 'Da (amu)' },
    },
  },
};

export function convertUnits(
  categoryKey: string,
  fromUnitKey: string,
  toUnitKey: string,
  value: number
): { result: number; formula: string } {
  const cat = UNIT_CATEGORIES[categoryKey];
  if (!cat) return { result: value, formula: '' };

  const from = cat.units[fromUnitKey];
  const to = cat.units[toUnitKey];
  if (!from || !to) return { result: value, formula: '' };

  let baseVal: number;
  if (categoryKey === 'temperature') {
    if (fromUnitKey === 'celsius') baseVal = value + 273.15;
    else if (fromUnitKey === 'fahrenheit') baseVal = (value - 32) * (5 / 9) + 273.15;
    else baseVal = value;

    let finalVal: number;
    if (toUnitKey === 'celsius') finalVal = baseVal - 273.15;
    else if (toUnitKey === 'fahrenheit') finalVal = (baseVal - 273.15) * (9 / 5) + 32;
    else finalVal = baseVal;

    return {
      result: Number(finalVal.toPrecision(7)),
      formula: `${value} ${from.symbol} → ${finalVal.toFixed(3)} ${to.symbol}`,
    };
  }

  // Linear units
  baseVal = value * from.factor;
  const result = baseVal / to.factor;

  return {
    result: Number(result.toPrecision(8)),
    formula: `${value} ${from.symbol} × (${from.factor} / ${to.factor}) = ${result.toPrecision(6)} ${to.symbol}`,
  };
}
