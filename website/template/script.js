// script.js

// Global variables
let totalDuration = 0; // Total simulation time (minutes)
let plannedActivities = []; // Planned activities array
let selectedActivity = null;

// DOM Selectors
document.addEventListener('DOMContentLoaded', () => {
    // Duration selectors
    const durationButtons = document.querySelectorAll('.duration-btn');
    const customDurationEl = document.getElementById('custom-duration');
    const totalTimeEl = document.getElementById('total-time');
    const remainingTimeEl = document.getElementById('remaining-time');
    const timeline = document.getElementById('timeline');
    const timelineMarkers = document.getElementById('timeline-markers');
    const emptyTimelineMessage = document.getElementById('empty-timeline-message');
    // Activity selectors
    const activityCards = document.querySelectorAll('.activity-card');
    const selectedActivityEl = document.getElementById('selected-activity');
    const activityDurationInput = document.getElementById('activity-duration');
    const addActivityBtn = document.getElementById('add-activity-btn');
    // Simulation controls
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

    // --- Duration selection ---
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

    // --- Activity selection ---
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

    // --- Add activity to timeline ---
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
        // Check for category/time conflicts
        const startTime = getPlannedDuration();
        const endTime = startTime + duration;
        for (const activity of plannedActivities) {
            if ((startTime < activity.endTime && endTime > activity.startTime) &&
                (activity.category === selectedActivity.category)) {
                alert('Vous ne pouvez pas utiliser deux activités de la même catégorie simultanément');
                return;
            }
        }
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

    // --- Reset simulation ---
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

    // --- Calculate (send to backend) ---
    calculateBtn.addEventListener('click', function() {
        if (plannedActivities.length === 0) {
            alert('Veuillez planifier au moins une activité');
            return;
        }
        const deviceType = document.getElementById('device-select').value;
        const networkType = document.getElementById('network-select').value;
        const mobility = document.querySelector('input[name="mobility"]:checked').value; // 'static' or 'moving'

        // Prepare payload for backend
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

        fetch('/calculate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            // Show results
            totalEnergy.textContent = data.total_energy.toFixed(2);
            co2Equivalent.textContent = data.co2_equivalent.toFixed(2);
            batteryPercentage.textContent = `${Math.min(100, data.battery_percent.toFixed(1))}%`;
            batteryLevel.style.width = `${Math.min(100, data.battery_percent)}%`;
            // Battery color
            batteryLevel.classList.remove('bg-green-500', 'bg-yellow-500', 'bg-red-500');
            if (data.battery_percent < 30) batteryLevel.classList.add('bg-green-500');
            else if (data.battery_percent < 70) batteryLevel.classList.add('bg-yellow-500');
            else batteryLevel.classList.add('bg-red-500');
            // Activities detail
            activitiesDetail.innerHTML = data.activities.map(a => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${getActivityFullName(a.name)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.duration} min</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${a.consumption.toFixed(2)} Wh</td>
                </tr>
            `).join('');
            // Mobility tip
            if (mobility === 'moving') mobilityTip.classList.remove('hidden');
            else mobilityTip.classList.add('hidden');
            // Show results
            results.classList.remove('hidden');
            results.classList.add('result-animation');
            results.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(err => alert("Erreur lors du calcul : " + err));
    });

    // --- New simulation ---
    newSimulation.addEventListener('click', function() {
        results.classList.add('hidden');
        resetBtn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Utility functions ---
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
        plannedActivities.forEach((activity, index) => {
            const block = document.createElement('div');
            block.className = 'timeline-block absolute h-full rounded-md flex items-center justify-center text-white text-xs font-medium overflow-hidden';
            block.style.backgroundColor = activityColors[activity.name] || '#6366f1';
            block.style.left = `${(activity.startTime / totalDuration) * 100}%`;
            block.style.width = `${(activity.duration / totalDuration) * 100}%`;
            if (activity.duration >= 5) block.textContent = `${getActivityShortName(activity.name)} (${activity.duration}min)`;
            // Delete button
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
        // Timeline markers
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
        switch(name) {
            case 'appel': return 'Appel téléphonique';
            case 'sms': return 'SMS/Messagerie';
            case 'netflix': return 'Netflix';
            case 'tiktok': return 'TikTok';
            case 'youtube': return 'YouTube';
            case 'web': return 'Navigation Web';
            case 'jeux-casual': return 'Jeux casual';
            case 'jeux-3d': return 'Jeux 3D';
            case 'social-media': return 'Réseaux sociaux';
            default: return name;
        }
    }
    function getActivityShortName(name) {
        switch(name) {
            case 'appel': return 'Appel';
            case 'sms': return 'SMS';
            case 'netflix': return 'Netflix';
            case 'tiktok': return 'TikTok';
            case 'youtube': return 'YT';
            case 'web': return 'Web';
            case 'jeux-casual': return 'Jeu';
            case 'jeux-3d': return 'Jeu 3D';
            case 'social-media': return 'Social';
            default: return name;
        }
    }
    function validateCalculateButton() {
        calculateBtn.disabled = plannedActivities.length === 0;
    }

    // --- Initial UI state ---
    updateTotalTime();
    updateTimeline();
    updateRemainingTime();
    validateCalculateButton();
});

// --- Activity colors (customize as needed) ---
const activityColors = {
    'appel': '#6366f1',
    'sms': '#06b6d4',
    'netflix': '#ef4444',
    'tiktok': '#ec4899',
    'youtube': '#f59e42',
    'web': '#10b981',
    'jeux-casual': '#a78bfa',
    'jeux-3d': '#fbbf24',
    'social-media': '#3b82f6'
};
