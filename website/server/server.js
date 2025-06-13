// /server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const PORT = 5000;

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

let deviceSpecs = {};

fs.createReadStream('batteries_ue.csv')
  .pipe(csv({ separator: ';' }))
  .on('data', (row) => {
    const key = row.value.trim().toLowerCase(); 
    deviceSpecs[key] = {
      batteryWh: parseFloat(row['batterie_Wh']), 
      screenSize: parseFloat(row['taille_ecran (inch)']),
    };
  })
  .on('end', () => {
    console.log('✅ Device specs loaded:', Object.keys(deviceSpecs).length);
  });



app.post('/calculate', (req, res) => {
  const { device, network, mobility, activities = [] } = req.body;
  const condition = mobility === 'moving' ? 'Dyna' : 'stat';
  const deviceName = device || 'autre';

  console.log(`\n--- Calculating energy ---`);
  const activityNames = activities.map(a => a.name).join(', ');
  console.log(`📱 Device: ${deviceName}, 🌐 Network: ${network}, 🧭 Mobility: ${mobility}, 🎯 Activities: [${activityNames}]`);
  
  let totalEnergy = 0;
  let totalRfEnergy = 0; 
  const details = [];

  for (const activity of activities) {
    //–– normalize keys for case-insensitive matching
    const devKey   = deviceName.toLowerCase();
    const actKey   = activity.name.toLowerCase();
    const condKey  = condition.toLowerCase();
    const netLower = network.toLowerCase();
  
    //–– allow “4g” ⇄ “lte” synonyms
    const netVariants = [netLower];
    if (netLower === '4g')      netVariants.push('lte');
    else if (netLower === 'lte') netVariants.push('4g');
  
    let match        = null;
    let scenarioKey  = '';
  
    //–– try user’s device first
    for (const nv of netVariants) {
      const key = `${devKey}_${nv}_${actKey}_${condKey}`;
      scenarioKey = key;
      match = energyTable.find(e => 
        e.scenario_id.toLowerCase() === key
      );
      if (match) break;
    }
  
    //–– fallback to 6pro if no match
    if (!match) {
      for (const nv of netVariants) {
        const key = `6pro_${nv}_${actKey}_${condKey}`;
        scenarioKey = key;
        match = energyTable.find(e => 
          e.scenario_id.toLowerCase() === key
        );
        if (match) break;
      }
    }
  
    console.log(`Scenario Key: ${scenarioKey}`);
  
    if (match) {
      console.log("found E_BAT "+match.E_BAT_Jm)
      console.log("found E_RF "+match.E_RF_Jm)
      const batteryRate = parseFloat(match.E_BAT_Jm) / 3600;
      const batteryConsumption = batteryRate * activity.duration;
      totalEnergy += batteryConsumption;

      const rfRate = parseFloat(match.E_RF_Jm) / 3600;
      const rfConsumption = rfRate * activity.duration;
      totalRfEnergy += rfConsumption;

      details.push({ ...activity, consumption : batteryConsumption, fallback: false });
    } else {
      details.push({
        ...activity,
        consumption: 0,
        fallback:    true,
        network,
        mobility
      });
    }
  }
  

  const baseDevice = '6pro';
  const userKey = deviceName.toLowerCase();
  const baseSpecs = deviceSpecs[baseDevice] || { batteryWh: 19.26, screenSize: 6.4 };
  const targetSpecs = deviceSpecs[userKey] || baseSpecs;

  const screenRatio = (targetSpecs.screenSize / baseSpecs.screenSize) ** 2;
  const adjustedCapacity = targetSpecs.batteryWh * screenRatio;

  const batteryPercent = Math.min(100, (totalEnergy / adjustedCapacity) * 100);


  // Convert Wh → kWh
  const energy_kWh = totalEnergy / 1000;
  const co2Min = energy_kWh * 21.7; // RTE 2024
  const co2Max = energy_kWh * 60; // ADEME

  console.log(`⚡ Total Energy: ${totalEnergy.toFixed(2)} Wh`);
  console.log(`🔋 Battery %: ${batteryPercent.toFixed(1)}%`);
  console.log(`🌍 CO2 min: ${co2Min.toFixed(2)} g`);
  console.log(`--- End calculation ---\n`);

  res.json({
    // Send both min and max

    total_energy: totalEnergy,
    total_rf_energy: totalRfEnergy,
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
