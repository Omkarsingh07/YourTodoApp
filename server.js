// server.js - Application Entry Point for Render & Local Development
const path = require('path');
const express = require('express');
const app = require('./api/index.js');

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Express server (runs on Render & locally; Vercel handles its own serverless routing)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
