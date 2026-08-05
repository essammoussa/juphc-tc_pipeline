const fs = require('fs');
const path = require('path');
const os = require('os');
const { calculateTax, loadTaxBrackets } = require('../src/taxCalculator');

describe('calculateTax', () => {
  test('calculates tax for income within the first bracket (single)', () => {
    expect(calculateTax(10000, 'single')).toBe(1000);
  });

  test('calculates tax across multiple brackets (single)', () => {
    // 50000 spans three brackets: 0-11000 @10%, 11000-44725 @12%, 44725-50000 @22%
    const expected =
      11000 * 0.10 +
      (44725 - 11000) * 0.12 +
      (50000 - 44725) * 0.22;
    expect(calculateTax(50000, 'single')).toBe(Math.round(expected * 100) / 100);
  });

  test('calculates tax for married filing status', () => {
    expect(calculateTax(20000, 'married')).toBe(2000);
  });

  test('returns 0 tax for 0 income', () => {
    expect(calculateTax(0, 'single')).toBe(0);
  });

  test('defaults to single status when none provided', () => {
    expect(calculateTax(10000)).toBe(calculateTax(10000, 'single'));
  });

  test('throws on negative income', () => {
    expect(() => calculateTax(-100, 'single')).toThrow('Income must be a non-negative number');
  });

  test('throws on non-numeric income', () => {
    expect(() => calculateTax('abc', 'single')).toThrow('Income must be a non-negative number');
  });

  test('throws on unknown filing status', () => {
    expect(() => calculateTax(10000, 'unknown')).toThrow('Unknown filing status: unknown');
  });

  test('handles very high income across all brackets (single)', () => {
    const tax = calculateTax(500000, 'single');
    expect(tax).toBeGreaterThan(0);
    expect(typeof tax).toBe('number');
  });
});

describe('externalized config (Objective 4)', () => {
  let tmpConfigPath;

  afterEach(() => {
    if (tmpConfigPath && fs.existsSync(tmpConfigPath)) {
      fs.unlinkSync(tmpConfigPath);
    }
  });

  test('tax brackets can be swapped via an external config file without code changes', () => {
    // Write a temporary alternate config with a flat 50% single-bracket rate.
    const altConfig = {
      single: [{ upTo: null, rate: 0.50 }],
      married: [{ upTo: null, rate: 0.50 }],
    };
    tmpConfigPath = path.join(os.tmpdir(), `tax-brackets-${Date.now()}.json`);
    fs.writeFileSync(tmpConfigPath, JSON.stringify(altConfig));

    const altBrackets = loadTaxBrackets(tmpConfigPath);
    const tax = calculateTax(10000, 'single', altBrackets);

    expect(tax).toBe(5000); // 10000 * 0.50, proves the new config was actually used
  });

  test('loadTaxBrackets throws a clear error for a missing config file', () => {
    expect(() => loadTaxBrackets('/nonexistent/path.json')).toThrow(/Unable to read tax bracket config/);
  });
});
