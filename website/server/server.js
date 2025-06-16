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
const allEnergyTables = [];

function loadEnergyCSV(filePath) {
  return new Promise((resolve) => {
    const table = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        table.push({
          scenario_id: row.scenario_id,
          E_BAT_Jm: parseFloat(row.E_BAT_Jm),
          E_RF_Jm: parseFloat(row.E_RF_Jm),
          E_BB_Jm: parseFloat(row.E_BB_Jm),
          E_PA_Jm: parseFloat(row.E_PA_Jm)
        });
      })
      .on('end', () => {
        resolve(table);
      });
  });
}

// Load both short video and streaming datasets
Promise.all([
  loadEnergyCSV('scenario_summary_df.csv'),                // short video apps
  loadEnergyCSV('video_streaming_scenario_summary_df.csv'),// long video apps
  loadEnergyCSV('visio_scenario_summary_df.csv')           // visio apps
]).then(([shortVideoTable, longVideoTable, visioTable]) => {
  energyTable = [...shortVideoTable, ...longVideoTable, ...visioTable];
  console.log(`✅ Total scenarios loaded: ${energyTable.length}`);
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
  // Define which activities are considered streaming
  const streamingApps = ['netflix', 'disney', 'amazon', 'apple', 'youtube'];

  for (const activity of activities) {
    //–– normalize keys for case-insensitive matching
    const devKey   = deviceName.toLowerCase();
    const actKey   = activity.name.toLowerCase();
    const condKey  = condition.toLowerCase();
    const netLower = network.toLowerCase();

    const isStreaming = streamingApps.includes(actKey);

    //–– allow “4g” ⇄ “lte” synonyms
    const netVariants = [netLower];
    if (netLower === '4g')      netVariants.push('lte');
    else if (netLower === 'lte') netVariants.push('4g');
  
    let match        = null;
    let scenarioKey  = '';
    // Attempt direct match first (device + all info)

    // Attempt direct match first (device + all info)
      if (isStreaming) {
        // Streaming → requires quality
        let quality = 'auto';
        if (actKey === 'netflix') {
          quality = 'eco';
        } else if (actKey === 'amazon') {
          quality = 'good';
        } else if (actKey === 'youtube') {
          quality = '720p';
        }
        for (const nv of netVariants) {
          const key = `${devKey}_${nv}_${actKey}_${quality}_${condKey}`;
          scenarioKey = key;
          match = energyTable.find(e => e.scenario_id.toLowerCase() === key);
          if (match) break;
        }

        // Fallback to x device
        if (!match) {
          for (const nv of netVariants) {
            const key = `x_${nv}_${actKey}_${quality}_${condKey}`;
            scenarioKey = key;
            match = energyTable.find(e => e.scenario_id.toLowerCase() === key);
            if (match) break;
          }
        }

        // 3. Fallback to '12mini' if no data for X device (worst case)
        if (!match) {
          for (const nv of netVariants) {
            const key = `12mini_${nv}_${actKey}_${quality}_${condKey}`;
            scenarioKey = key;
            match = energyTable.find(e => e.scenario_id.toLowerCase() === key);
            if (match) break;
          }
        }

      } else {
        // Non-streaming → no quality
        for (const nv of netVariants) {
          const key = `${devKey}_${nv}_${actKey}_${condKey}`;
          scenarioKey = key;
          match = energyTable.find(e => e.scenario_id.toLowerCase() === key);
          if (match) break;
        }

        // Fallback to 6pro device
        if (!match) {
          for (const nv of netVariants) {
            const key = `6pro_${nv}_${actKey}_${condKey}`;
            scenarioKey = key;
            match = energyTable.find(e => e.scenario_id.toLowerCase() === key);
            if (match) break;
          }
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
