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
  // Convert Wh → kWh
    const energy_kWh = totalEnergy / 1000;
    const co2Min = energy_kWh * 50; // ADEME
    const co2Max = energy_kWh * 60; // RTE

    // Send both min and max
    res.json({
    total_energy: totalEnergy,
    battery_percent: batteryPercent,
    co2_min: co2Min,
    co2_max: co2Max,
    activities: details
    });
}
);
app.get('/', (req, res) => {
  res.send('✅ Hello from the energy simulator backend!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);


});
