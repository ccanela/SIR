// script.js

// Global variables
let totalDuration = 0; // Total simulation time (minutes)
let plannedActivities = []; // Planned activities array
let selectedActivity = null;

const categoryColors = {
    'communication': '#6366f1',  // Indigo
    'streaming': '#ef4444',      // Red
    'short-video': '#3b82f6',    // Blue
    'visio':'#008000',           // Green
    'autres': '#fbbf24'          // Yellow
};

// DOM Selectors
document.addEventListener('DOMContentLoaded', () => {
    const durationButtons = document.querySelectorAll('.duration-btn');
    const totalTimeEl = document.getElementById('total-time');
    const remainingTimeEl = document.getElementById('remaining-time');
    const timeline = document.getElementById('timeline');
    const timelineMarkers = document.getElementById('timeline-markers');
    const emptyTimelineMessage = document.getElementById('empty-timeline-message');
    const activityCards = document.querySelectorAll('.activity-card');
    const selectedActivityEl = document.getElementById('selected-activity');
    const activityDurationInput = document.getElementById('activity-duration');
    const addActivityBtn = document.getElementById('add-activity-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const results = document.getElementById('results');
    const totalEnergy = document.getElementById('total-energy');
    const batteryPercentage = document.getElementById('battery-percentage');
    const batteryLevel = document.getElementById('battery-level');
    const co2Equivalent = document.getElementById('co2-equivalent');
    const activitiesDetail = document.getElementById('activities-detail');
    const newSimulation = document.getElementById('new-simulation');
    const toggleDetailsBtn = document.getElementById('toggle-details');
    const detailsSection = document.getElementById('details-section');
    const batteryInfoModal = document.getElementById('battery-details-modal');
    const batteryInfoBtn = document.getElementById('battery-info-btn');
    
    const qualityWrapper = document.getElementById('quality-wrapper');
    const qualitySelect = document.getElementById('quality-select');
    const callQualitySelect = document.getElementById('call-quality-select');


    let detailsVisible = false;
    toggleDetailsBtn.addEventListener('click', () => {
    detailsVisible = !detailsVisible;
    detailsSection.classList.toggle('hidden', !detailsVisible);
    toggleDetailsBtn.textContent = detailsVisible ? 'Voir moins de détails' : 'Voir plus de détails';
    });

    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            durationButtons.forEach(b => b.classList.remove('bg-indigo-500','text-white'));
            btn.classList.add('bg-indigo-500','text-white');
            totalDuration = parseInt(btn.dataset.minutes, 10);
            updateTotalTime();
            updateTimeline();
            validateCalculateButton();
        });
    });

    activityCards.forEach(card => {
        card.addEventListener('click', function () {
            activityCards.forEach(c => c.classList.remove('border-indigo-500', 'bg-indigo-50'));
            this.classList.add('border-indigo-500', 'bg-indigo-50');

            selectedActivity = {
                name: this.dataset.activity,
                category: this.dataset.category
            };
            selectedActivityEl.textContent = getActivityFullName(selectedActivity.name);
            // Show call quality if it's a call

            if (selectedActivity.name === 'call') {
            callQualitySelect.classList.remove('hidden');
            } else {
            callQualitySelect.classList.add('hidden');
            }

            // Handle quality options
            const qualityOptions = this.dataset.qualityOptions;
            if (qualityOptions) {
                const qualities = JSON.parse(qualityOptions);
                qualitySelect.innerHTML = '';
                qualities.forEach(q => {
                    const opt = document.createElement('option');
                    opt.value = q.toLowerCase();  // lowercase for matching backend
                    opt.textContent = q;          // display as-is
                    qualitySelect.appendChild(opt);
                });
                qualityWrapper.classList.remove('hidden');
            } else {
                qualityWrapper.classList.add('hidden');
            }
        });
    });


    addActivityBtn.addEventListener('click', function() {
        if (!selectedActivity) return;
        const duration = parseInt(activityDurationInput.value);
        if (isNaN(duration) || duration <= 0) {
            alert('Veuillez entrer une durée valide');
            return;
        }

        const startTime = findEarliestAvailableSlot(duration);
        if (startTime === null) {
            alert('Pas de créneau disponible.');
            return;
        }
        const endTime = startTime + duration;

        // Dynamically choose the right quality select input
        let quality = undefined;
        if (selectedActivity.name === 'call') {
            const callSelect = document.getElementById('call-tech');
            quality = callSelect?.value;
        } else if (!qualityWrapper.classList.contains('hidden')) {
            quality = qualitySelect?.value;
        }

        plannedActivities.push({
            name: selectedActivity.name,
            category: selectedActivity.category,
            duration: duration,
            startTime: startTime,
            endTime: endTime,
            quality: quality
        });

        updateTimeline();
        validateCalculateButton();
    });

    function findEarliestAvailableSlot(duration) {
        // Calculate when all existing activities end
        const usedTime = plannedActivities.reduce((sum, a) => sum + a.duration, 0);
        const startTime = usedTime;
    
        // If there’s room in the timeline, return the end‐of‐line slot
        return startTime;
    }
    
    if (batteryInfoBtn && batteryInfoModal) {
        batteryInfoBtn.addEventListener('click', () => {
            batteryInfoModal.classList.remove('hidden');
        });

        // Optional: Close modal when clicking on the background
        batteryInfoModal.addEventListener('click', (event) => {
            if (event.target === batteryInfoModal) {
                batteryInfoModal.classList.add('hidden');
            }
        });
    }

    resetBtn.addEventListener('click', function() {
        plannedActivities = [];
        selectedActivity = null;
        activityCards.forEach(card => card.classList.remove('border-indigo-500', 'bg-indigo-50'));
        selectedActivityEl.textContent = 'Aucune';
        activityDurationInput.value = '5';
        updateTimeline();
        validateCalculateButton();
    });

    calculateBtn.addEventListener('click', function() {
        if (plannedActivities.length === 0) {
            alert('Veuillez planifier au moins une activité');
            return;
        }
        const deviceType = document.getElementById('device-select').value;
        const networkType = document.getElementById('network-select').value;
        const mobility = document.querySelector('input[name="mobility"]:checked').value;
        const payload = {
            activities: plannedActivities.map(a => ({
                name: a.name,
                duration: a.duration,
                category: a.category,
                quality: a.quality || null
            })),
            device: deviceType,
            network: networkType,
            mobility: mobility
        };
        fetch('http://localhost:5000/calculate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("🧪 Server response:", data); // Debug log
        
            const missing = data.activities.filter(a => a.fallback === true);
        
            if (missing.length > 0) {
                console.log("🚨 Missing scenarios:", missing);
                results.classList.add('hidden');
        
                const list = document.getElementById('missing-combinations');
                list.innerHTML = '';
                missing.forEach(m => {
                    const li = document.createElement('li');
                    let qualityInfo = m.quality ? ` - Qualité: ${m.quality}` : '';
                    li.textContent = `${getActivityFullName(m.name)} - ${m.network.toUpperCase()} - ${m.mobility === 'moving' ? 'En déplacement' : 'Stationnaire'}${qualityInfo}`;
                    list.appendChild(li);
                });
        
                document.getElementById('no-data-popup').classList.remove('hidden');
                return;
            }
        
            results.classList.remove('hidden');
            results.scrollIntoView({ behavior: 'smooth' });
        
            totalEnergy.textContent = data.total_energy.toFixed(2);
            co2Equivalent.textContent = `${data.co2_min.toFixed(1)} – ${data.co2_max.toFixed(1)}`;
        
            batteryPercentage.textContent = `${Math.min(100, data.battery_percent.toFixed(1))}%`;
            batteryLevel.style.width = `${Math.min(100, data.battery_percent)}%`;
        
            batteryLevel.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
            if (data.battery_percent < 30) batteryLevel.classList.add('bg-green-500');
            else if (data.battery_percent < 70) batteryLevel.classList.add('bg-yellow-500');
            else batteryLevel.classList.add('bg-red-500');
            
            const rfEnergyValueEl = document.getElementById('rf-energy-value');
            const rfEnergyPercentageEl = document.getElementById('rf-energy-percentage');

            if (rfEnergyValueEl && rfEnergyPercentageEl) {
                // Display the RF energy consumption
                rfEnergyValueEl.textContent = data.total_rf_energy.toFixed(2);

                // Calculate the percentage of RF energy out of the total
                let rfPercentage = 0;
                if (data.total_energy > 0) { // Avoid division by zero
                    rfPercentage = (data.total_rf_energy / data.total_energy) * 100;
                }
                rfEnergyPercentageEl.textContent = rfPercentage.toFixed(1);
            }
            
            activitiesDetail.innerHTML = data.activities.map(a => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${getActivityFullName(a.name)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.duration} min</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.consumption.toFixed(2)} Wh</td>
                </tr>
            `).join('');
        })
        
        .catch(err => alert("Erreur lors du calcul : " + err));
    });

    newSimulation.addEventListener('click', function() {
        results.classList.add('hidden');
        resetBtn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function updateTotalTime() {
        totalTimeEl.textContent = totalDuration;
    }

    function getPlannedDuration() {
        return plannedActivities.reduce((total, activity) => total + activity.duration, 0);
    }

    function updateTimeline() {
        timeline.innerHTML = '';
        timelineMarkers.innerHTML = '';

        emptyTimelineMessage.classList.add('hidden');

        plannedActivities.sort((a, b) => a.startTime - b.startTime);

        // Calculate the actual sum of all planned durations
        const sumDuration = plannedActivities.reduce((sum, a) => sum + a.duration, 0);
        // If nothing is planned, show the "empty" message and bail out
        if (sumDuration === 0) {
            emptyTimelineMessage.classList.remove('hidden');
            return;
        }

        function recomputeActivityTimes() {
            let currentTime = 0;
            plannedActivities.forEach(activity => {
                activity.startTime = currentTime;
                activity.endTime = currentTime + activity.duration;
                currentTime = activity.endTime;
                });
        }

        plannedActivities.forEach((activity, index) => {
            const block = document.createElement('div');
            block.className = 'timeline-block absolute h-full rounded-md flex items-center justify-center text-white text-xs font-medium overflow-hidden';
            block.style.backgroundColor = categoryColors[activity.category] || '#6366f1';
            block.style.left = `${(activity.startTime / sumDuration) * 100}%`;
            block.style.width = `${(activity.duration / sumDuration) * 100}%`;
            let label = `${getActivityShortName(activity.name)} (${activity.duration}min)`;
            if (activity.quality) {
                label = `${getActivityShortName(activity.name)} (${activity.quality})`;
            }
            block.textContent = label;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl-md opacity-0 hover:opacity-100 transition-opacity';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                plannedActivities.splice(index, 1);
                recomputeActivityTimes();
                updateTimeline();
                validateCalculateButton();
            });
            block.appendChild(deleteBtn);
            timeline.appendChild(block);
        });

        const numMarkers = Math.min(sumDuration, 12);
        const step = sumDuration / numMarkers;
        for (let i = 0; i <= numMarkers; i++) {
            const marker = document.createElement('div');
            marker.className = 'text-center';
            marker.style.width = `${100 / numMarkers}%`;
            marker.textContent = `${Math.round(i * step)}`;
            timelineMarkers.appendChild(marker);
        }
    }

    function getActivityFullName(name) {
        const map = {
            'teams': 'Microsoft Teams',
            'meet': 'Google Meet',
            'zoom':'Zoom',
            'tiktok': 'TikTok',
            'insta': 'Insta Reels',
            'YTshorts': 'YouTube Shorts',
            'call': 'Appel téléphonique',
            'SMS': 'SMS/Messagerie',
            'netflix': 'Netflix',
            'apple': 'Apple TV',
            'disney': 'Disney+',
            'youtube': 'YouTube',
            'amazon': 'Prime Video',
            'web': 'Navigation Web',
            'Spotify': 'Spotify',
            'pubg': 'Jeux Casual'
        };
        return map[name] || name;
    }

    function getActivityShortName(name) {
        const map = {
            'teams':'Teams',
            'zoom':'Zoom',
            'meet':'Meet',
            'tiktok': 'TikTok',
            'insta': 'Reels',
            'YTshorts': 'Shorts',
            'call': 'Appel',
            'SMS': 'SMS',
            'netflix': 'Netflix',
            'apple': 'AppleTV',
            'disney': 'Disney+',
            'youtube': 'YT',
            'amazon': 'Prime',
            'web': 'Web',
            'Spotify': 'Spotify',
            'pubg': 'Jeux'
        };
        return map[name] || name;
    }

    function validateCalculateButton() {
        const calculateBtn = document.getElementById('calculate-btn');
        calculateBtn.disabled = plannedActivities.length === 0 ;
    }

    validateCalculateButton();
    updateTotalTime();
    updateTimeline();
});
