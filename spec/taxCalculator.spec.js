const fs = require('fs');
const path = require('path');
const os = require('os');
const { calculateTax, loadTaxBrackets } = require('../src/taxCalculator');

describe('calculateTax', () => {
  it('calculates tax for income within the first bracket (single)', () => {
    expect(calculateTax(10000, 'single')).toBe(1000);
  });

  it('calculates tax across multiple brackets (single)', () => {
    const expected =
      11000 * 0.10 +
      (44725 - 11000) * 0.12 +
      (50000 - 44725) * 0.22;
    expect(calculateTax(50000, 'single')).toBe(Math.round(expected * 100) / 100);
  });

  it('calculates tax for married filing status', () => {
    expect(calculateTax(20000, 'married')).toBe(2000);
  });

  it('returns 0 tax for 0 income', () => {
    expect(calculateTax(0, 'single')).toBe(0);
  });

  it('defaults to single status when none provided', () => {
    expect(calculateTax(10000)).toBe(calculateTax(10000, 'single'));
  });

  it('throws on negative income', () => {
    expect(() => calculateTax(-100, 'single')).toThrowError('Income must be a non-negative number');
  });

  it('throws on non-numeric income', () => {
    expect(() => calculateTax('abc', 'single')).toThrowError('Income must be a non-negative number');
  });

  it('throws on unknown filing status', () => {
    expect(() => calculateTax(10000, 'unknown')).toThrowError('Unknown filing status: unknown');
  });

  it('handles very high income across all brackets (single)', () => {
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

  it('tax brackets can be swapped via an external config file without code changes', () => {
    const altConfig = {
      single: [{ upTo: null, rate: 0.50 }],
      married: [{ upTo: null, rate: 0.50 }],
    };
    tmpConfigPath = path.join(os.tmpdir(), `tax-brackets-${Date.now()}.json`);
    fs.writeFileSync(tmpConfigPath, JSON.stringify(altConfig));

    const altBrackets = loadTaxBrackets(tmpConfigPath);
    const tax = calculateTax(10000, 'single', altBrackets);

    expect(tax).toBe(5000);
  });

  it('loadTaxBrackets throws a clear error for a missing config file', () => {
    expect(() => loadTaxBrackets('/nonexistent/path.json')).toThrowError(/Unable to read tax bracket config/);
  });
});
