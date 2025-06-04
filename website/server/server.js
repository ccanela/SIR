// File: server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const PORT = 5050;

app.use(cors());
app.use(bodyParser.json());

let energyTable = [];

// Load the scenario summary CSV
fs.createReadStream('scenario_summary_df.csv')  // Assuming it's in the server folder
  .pipe(csv())
  .on('data', (row) => {
    // Ensure energy values are parsed as numbers
    energyTable.push({
      scenario_id: row.scenario_id,
      E_BAT_Jm: parseFloat(row.E_BAT_Jm),
      E_RF_Jm: parseFloat(row.E_RF_Jm),
      E_BB_Jm: parseFloat(row.E_BB_Jm),
      E_PA_Jm: parseFloat(row.E_PA_Jm)
    });
  })
  .on('end', () => {
    console.log('✅ Scenario energy summary loaded:', energyTable.length, 'scenarios');
  });

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
  const condition = mobility === 'moving' ? 'Dyna' : 'stat';
  const deviceName = device || 'autre';

  console.log(`\n--- Calculating energy ---`);
  console.log(`📱 Device: ${deviceName}, 🌐 Network: ${network}, 🧭 Mobility: ${mobility}`);

  let totalEnergy = 0;
  const details = [];

  for (const activity of activities) {
    const scenarioKey = `${deviceName}_${network}_${activity.name}_${condition}`;
    const match = energyTable.find(entry => entry.scenario_id === scenarioKey);

    if (match) {
      const rate = parseFloat(match.E_BAT_Jm);
      console.log("EBAT "+match.E_BAT_Jm)
      console.log("duree "+activity.duration)
      const consumption = rate * activity.duration;
      totalEnergy += consumption;

      console.log(`✅ Match found for "${scenarioKey}" → E_BAT_Jm = ${match.E_BAT_Jm}`);
      details.push({ ...activity, consumption });
    } else {
      const fallbackRate = 0.3;
      const consumption = fallbackRate * activity.duration;
      totalEnergy += consumption;

      console.warn(`❌ No match for "${scenarioKey}" → using fallback rate ${fallbackRate} Wh/min`);
      details.push({ ...activity, consumption });
    }
  }

  const batteryPercent = Math.min(100, (totalEnergy / 15) * 100);
  // Convert Wh → kWh
    const energy_kWh = totalEnergy / 1000;
    const co2Min = energy_kWh * 50; // ADEME
    const co2Max = energy_kWh * 60; // RTE

  console.log(`⚡ Total Energy: ${totalEnergy.toFixed(2)} Wh`);
  console.log(`🔋 Battery %: ${batteryPercent.toFixed(1)}%`);
  console.log(`🌍 CO2 Equivalent: ${co2Equivalent.toFixed(2)} g`);
  console.log(`--- End calculation ---\n`);

  res.json({
    // Send both min and max

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


// app.get('/', (req, res) => {
//   res.send('✅ Hello from the energy simulator backend!');
// });

// app.post('/calculate', (req, res) => {
//   const { device, network, mobility, activities = [] } = req.body;
//   const condition = mobility === 'moving' ? 'Dyna' : 'stat';
//   const deviceName = device || 'autre';

//   let totalEnergy = 0;
//   const details = [];

//   for (const activity of activities) {
//     const actName = activity.name.toLowerCase();
//     const match = energyTable.find(entry =>
//       entry.device.toLowerCase().includes(deviceName.toLowerCase()) &&
//       entry.platform.toLowerCase().includes(actName) &&
//       entry.ran_technology.toLowerCase() === network.toLowerCase() &&
//       entry.condition.toLowerCase() === condition.toLowerCase()
//     );

//     const rate = match ? parseFloat(match.e_bat_jm || 0.3) : 0.3;
//     const consumption = rate * activity.duration;
//     totalEnergy += consumption;
//     details.push({ ...activity, consumption });
//   }

//   const batteryPercent = Math.min(100, (totalEnergy / 15) * 100); // example: 15Wh battery
//   const co2Equivalent = totalEnergy * 0.012;

//   res.json({
//     total_energy: totalEnergy,
//     battery_percent: batteryPercent,
//     co2_equivalent: co2Equivalent,
//     activities: details
//   });
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);


});
