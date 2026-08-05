// src/server.js
const express = require('express');
const { calculateTax } = require('./taxCalculator');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/calculate', (req, res) => {
  const { income, status } = req.body;

  try {
    const tax = calculateTax(income, status);
    res.status(200).json({ income, status: status || 'single', tax });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Only start listening if this file is run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Tax Calculator app listening on port ${PORT}`);
  });
}

module.exports = app;
