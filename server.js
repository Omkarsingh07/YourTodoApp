// server.js - Local Development Entry Point
const path = require('path');
const express = require('express');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

// Serve static assets locally
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
