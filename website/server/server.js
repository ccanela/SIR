// File: server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Simulated energy table (replace with DB later)
const ENERGY_TABLE = {
  'netflix|wifi|stat': 0.5,
  'appel|5g|dyn': 0.35,
  'SMS|wifi|stat': 0.1,
  'YT|4g|stat': 0.45,
  'Spotify|wifi|stat': 0.2,
  'web|wifi|stat': 0.25,
  'tiktok|5g|dyn': 0.4,
  'Insta|4g|dyn': 0.4,
  'Prime|wifi|stat': 0.5,
};

app.post('/calculate', (req, res) => {
  const { device, network, mobility, activities = [] } = req.body;
  const mobilityState = mobility === 'moving' ? 'dyn' : 'stat';

  let totalEnergy = 0;
  const details = [];

  for (const activity of activities) {
    const key = `${activity.name}|${network}|${mobilityState}`;
    const rate = ENERGY_TABLE[key] || 0.3;
    const consumption = rate * activity.duration;
    totalEnergy += consumption;
    details.push({ ...activity, consumption });
  }

  const batteryPercent = Math.min(100, (totalEnergy / 15) * 100);
  const co2Equivalent = totalEnergy * 0.012;

  res.json({
    total_energy: totalEnergy,
    battery_percent: batteryPercent,
    co2_equivalent: co2Equivalent,
    activities: details
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
