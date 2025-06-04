// script.js

// Global variables
let totalDuration = 0; // Total simulation time (minutes)
let plannedActivities = []; // Planned activities array
let selectedActivity = null;

const categoryColors = {
    'communication': '#6366f1',  // Indigo
    'streaming': '#ef4444',      // Red
    'short-video': '#3b82f6',    // Blue
    'autres': '#fbbf24'          // Yellow
};

// DOM Selectors
document.addEventListener('DOMContentLoaded', () => {
    const durationButtons = document.querySelectorAll('.duration-btn');
    const customDurationEl = document.getElementById('custom-duration');
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
    const mobilityTip = document.getElementById('mobility-tip');

    durationButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            durationButtons.forEach(b => b.classList.remove('bg-indigo-500','text-white'));
            btn.classList.add('bg-indigo-500','text-white');
            totalDuration = parseInt(btn.dataset.minutes, 10);
            customDurationEl.value = '';
            updateTotalTime();
            updateTimeline();
            updateRemainingTime();
            validateCalculateButton();
        });
    });

    customDurationEl.addEventListener('input', () => {
        const v = parseInt(customDurationEl.value, 10);
        if (!isNaN(v) && v > 0) {
            totalDuration = v;
            durationButtons.forEach(b => b.classList.remove('bg-indigo-500','text-white'));
            updateTotalTime();
            updateTimeline();
            updateRemainingTime();
            validateCalculateButton();
        }
    });

    activityCards.forEach(card => {
        card.addEventListener('click', function() {
            activityCards.forEach(c => c.classList.remove('border-indigo-500', 'bg-indigo-50'));
            this.classList.add('border-indigo-500', 'bg-indigo-50');
            selectedActivity = {
                name: this.dataset.activity,
                category: this.dataset.category
            };
            selectedActivityEl.textContent = getActivityFullName(selectedActivity.name);
            addActivityBtn.disabled = getRemainingTime() <= 0;
        });
    });

    addActivityBtn.addEventListener('click', function() {
        if (!selectedActivity) return;
        const duration = parseInt(activityDurationInput.value);
        if (isNaN(duration) || duration <= 0) {
            alert('Veuillez entrer une durée valide');
            return;
        }
        if (duration > getRemainingTime()) {
            alert('La durée dépasse le temps restant disponible');
            return;
        }

        const startTime = findEarliestAvailableSlot(duration);
        if (startTime === null) {
            alert('Pas de créneau disponible.');
            return;
        }

        const endTime = startTime + duration;

        plannedActivities.push({
            name: selectedActivity.name,
            category: selectedActivity.category,
            duration: duration,
            startTime: startTime,
            endTime: endTime
        });

        updateTimeline();
        updateRemainingTime();
        validateCalculateButton();
    });

    function findEarliestAvailableSlot(duration) {
        const timeline = new Array(totalDuration).fill(null);
        plannedActivities.forEach(a => {
            for (let i = a.startTime; i < a.endTime; i++) {
                timeline[i] = true;
            }
        });

        for (let start = 0; start <= totalDuration - duration; start++) {
            let free = true;
            for (let i = start; i < start + duration; i++) {
                if (timeline[i]) {
                    free = false;
                    break;
                }
            }
            if (free) return start;
        }
        return null;
    }

    resetBtn.addEventListener('click', function() {
        plannedActivities = [];
        selectedActivity = null;
        activityCards.forEach(card => card.classList.remove('border-indigo-500', 'bg-indigo-50'));
        selectedActivityEl.textContent = 'Aucune';
        activityDurationInput.value = '5';
        updateTimeline();
        updateRemainingTime();
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
                category: a.category
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

            activitiesDetail.innerHTML = data.activities.map(a => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${getActivityFullName(a.name)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.duration} min</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.consumption.toFixed(2)} Wh</td>
                </tr>
            `).join('');

            if (mobility === 'moving') mobilityTip.classList.remove('hidden');
            else mobilityTip.classList.add('hidden');
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

    function updateRemainingTime() {
        const remaining = getRemainingTime();
        remainingTimeEl.textContent = remaining;
        if (selectedActivity) addActivityBtn.disabled = remaining <= 0;
    }

    function getRemainingTime() {
        return totalDuration - getPlannedDuration();
    }

    function getPlannedDuration() {
        return plannedActivities.reduce((total, activity) => total + activity.duration, 0);
    }

    function updateTimeline() {
        timeline.innerHTML = '';
        timelineMarkers.innerHTML = '';
        if (totalDuration <= 0) {
            emptyTimelineMessage.classList.remove('hidden');
            return;
        }
        emptyTimelineMessage.classList.add('hidden');

        plannedActivities.sort((a, b) => a.startTime - b.startTime);

        plannedActivities.forEach((activity, index) => {
            const block = document.createElement('div');
            block.className = 'timeline-block absolute h-full rounded-md flex items-center justify-center text-white text-xs font-medium overflow-hidden';
            block.style.backgroundColor = categoryColors[activity.category] || '#6366f1';
            block.style.left = `${(activity.startTime / totalDuration) * 100}%`;
            block.style.width = `${(activity.duration / totalDuration) * 100}%`;
            if (activity.duration >= 5) block.textContent = `${getActivityShortName(activity.name)} (${activity.duration}min)`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl-md opacity-0 hover:opacity-100 transition-opacity';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                plannedActivities.splice(index, 1);
                updateTimeline();
                updateRemainingTime();
                validateCalculateButton();
            });
            block.appendChild(deleteBtn);
            timeline.appendChild(block);
        });

        const numMarkers = Math.min(totalDuration, 12);
        const step = totalDuration / numMarkers;
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
            'tiktok': 'TikTok',
            'Insta': 'Insta Reels',
            'YT Shorts': 'YouTube Shorts',
            'appel': 'Appel téléphonique',
            'SMS': 'SMS/Messagerie',
            'netflix': 'Netflix',
            'AppleTV': 'Apple TV',
            'Disney+': 'Disney+',
            'YT': 'YouTube',
            'Prime': 'Prime Video',
            'web': 'Navigation Web',
            'Spotify': 'Spotify',
            'jeux-casual': 'Jeux Casual'
        };
        return map[name] || name;
    }

    function getActivityShortName(name) {
        const map = {
            'tiktok': 'TikTok',
            'Insta': 'Reels',
            'YT Shorts': 'Shorts',
            'appel': 'Appel',
            'SMS': 'SMS',
            'netflix': 'Netflix',
            'AppleTV': 'AppleTV',
            'Disney+': 'Disney+',
            'YT': 'YT',
            'Prime': 'Prime',
            'web': 'Web',
            'Spotify': 'Spotify',
            'jeux-casual': 'Jeux'
        };
        return map[name] || name;
    }

    function validateCalculateButton() {
        const calculateBtn = document.getElementById('calculate-btn');
        calculateBtn.disabled = plannedActivities.length === 0 || totalDuration === 0;
    }

    validateCalculateButton();
    updateTotalTime();
    updateTimeline();
    updateRemainingTime();
});
