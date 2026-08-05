// src/taxCalculator.js
//
// Objective 4: tax brackets are no longer hard-coded in source code.
// They are loaded from an external JSON config file at startup, whose
// path can be overridden with the TAX_CONFIG_PATH environment variable.
// This means tax brackets can change (e.g. new tax year) without
// touching or rebuilding the application code.

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config', 'taxBrackets.json');
const CONFIG_PATH = process.env.TAX_CONFIG_PATH || DEFAULT_CONFIG_PATH;

function loadTaxBrackets(configPath = CONFIG_PATH) {
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new Error(`Unable to read tax bracket config at ${configPath}: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in tax bracket config at ${configPath}: ${err.message}`);
  }

  // JSON has no Infinity literal, so the config uses `null` for "no upper bound"
  // and we convert it here.
  const normalized = {};
  for (const status of Object.keys(parsed)) {
    normalized[status] = parsed[status].map((bracket) => ({
      upTo: bracket.upTo === null ? Infinity : bracket.upTo,
      rate: bracket.rate,
    }));
  }

  return normalized;
}

// Loaded once at module load time; call loadTaxBrackets() directly if you
// need to reload after a config change without restarting the process.
const TAX_BRACKETS = loadTaxBrackets();

/**
 * Calculates progressive income tax owed for a given income and filing status.
 * @param {number} income - taxable income, must be >= 0
 * @param {string} status - 'single' or 'married'
 * @param {object} [brackets] - optional bracket table override (used in tests)
 * @returns {number} tax owed, rounded to 2 decimal places
 */
function calculateTax(income, status = 'single', brackets = TAX_BRACKETS) {
  if (typeof income !== 'number' || isNaN(income) || income < 0) {
    throw new Error('Income must be a non-negative number');
  }

  const bracketTable = brackets[status];
  if (!bracketTable) {
    throw new Error(`Unknown filing status: ${status}`);
  }

  let tax = 0;
  let lowerBound = 0;

  for (const bracket of bracketTable) {
    if (income > lowerBound) {
      const taxableInBracket = Math.min(income, bracket.upTo) - lowerBound;
      tax += taxableInBracket * bracket.rate;
      lowerBound = bracket.upTo;
    } else {
      break;
    }
  }

  return Math.round(tax * 100) / 100;
}

module.exports = { calculateTax, loadTaxBrackets, TAX_BRACKETS };
