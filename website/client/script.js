document.addEventListener('DOMContentLoaded', () => {
    let totalDuration = 0;
    let plannedActivities = [];
    let selectedActivity = null;

    const timeline = document.getElementById('timeline');
    const emptyMessage = document.getElementById('empty-message');
    const totalDurationEl = document.getElementById('total-duration');
    const calculateBtn = document.getElementById('calculate-btn');
    const results = document.getElementById('results');
    const totalEnergy = document.getElementById('total-energy');
    const batteryPercentage = document.getElementById('battery-percentage');
    const batteryLevel = document.getElementById('battery-level');
    const co2Equivalent = document.getElementById('co2-equivalent');
    const activitiesDetail = document.getElementById('activities-detail');
    const newSimulation = document.getElementById('new-simulation');
    const durationModal = document.getElementById('duration-modal');
    const selectedActivityName = document.getElementById('selected-activity-name');
    const activityDurationInput = document.getElementById('activity-duration');
    const cancelActivityBtn = document.getElementById('cancel-activity');
    const addActivityBtn = document.getElementById('add-activity');

    const categoryColors = {
        'communication': '#6366f1',
        'streaming': '#ef4444',
        'short-video': '#3b82f6',
        'visio': '#008000',
        'autres': '#fbbf24'
    };

    // Click activity to open duration modal
    document.querySelectorAll('.activity-card').forEach(card => {
        card.addEventListener('click', function () {
            selectedActivity = {
                name: this.dataset.activity,
                category: this.dataset.category
            };
            selectedActivityName.textContent = `Activité: ${getActivityFullName(selectedActivity.name)}`;
            activityDurationInput.value = 10;
            durationModal.classList.remove('hidden');
        });
    });

    cancelActivityBtn.addEventListener('click', () => {
        durationModal.classList.add('hidden');
        selectedActivity = null;
    });

    addActivityBtn.addEventListener('click', () => {
        const duration = parseInt(activityDurationInput.value);
        if (!duration || duration <= 0) {
            alert("Veuillez saisir une durée valide.");
            return;
        }
        if (!selectedActivity) return;

        plannedActivities.push({
            name: selectedActivity.name,
            category: selectedActivity.category,
            duration: duration
        });

        selectedActivity = null;
        durationModal.classList.add('hidden');
        updateTimeline();
    });

    function updateTimeline() {
        timeline.innerHTML = '';
        totalDuration = plannedActivities.reduce((sum, a) => sum + a.duration, 0);
        totalDurationEl.textContent = totalDuration;

        if (totalDuration === 0) {
            emptyMessage.style.display = 'flex';
            calculateBtn.disabled = true;
            return;
        }

        emptyMessage.style.display = 'none';
        calculateBtn.disabled = false;

        plannedActivities.forEach((activity, index) => {
            const widthPercent = (activity.duration / totalDuration) * 100;
            const block = document.createElement('div');
            block.className = `timeline-activity h-full flex items-center justify-center text-white relative text-sm font-medium truncate px-2`;
            block.style.width = `${widthPercent}%`;
            block.style.backgroundColor = categoryColors[activity.category] || '#6366f1';
            block.textContent = `${getActivityShortName(activity.name)} (${activity.duration}min)`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', () => {
                plannedActivities.splice(index, 1);
                updateTimeline();
            });

            block.appendChild(deleteBtn);
            timeline.appendChild(block);
        });
    }

    calculateBtn.addEventListener('click', () => {
        if (plannedActivities.length === 0) {
            alert("Ajoutez au moins une activité");
            return;
        }

        const device = document.getElementById('device-select').value;
        const network = document.getElementById('network-select').value;
        const mobility = document.querySelector('input[name="mobility"]:checked').value;

        const payload = {
            activities: plannedActivities,
            device,
            network,
            mobility
        };

        fetch('http://localhost:5000/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            })
            .catch(err => alert("Erreur lors du calcul : " + err));
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        plannedActivities = [];
        selectedActivity = null;
        updateTimeline();
        results.classList.add('hidden');
    });

    newSimulation.addEventListener('click', () => {
        results.classList.add('hidden');
        plannedActivities = [];
        updateTimeline();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function getActivityFullName(name) {
        const map = {
            'teams': 'Microsoft Teams',
            'googlemeet': 'Google Meet',
            'zoom': 'Zoom',
            'tiktok': 'TikTok',
            'insta': 'Insta Reels',
            'YTshorts': 'YouTube Shorts',
            'call': 'Appel téléphonique',
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
            'teams': 'Teams',
            'googlemeet': 'Meet',
            'zoom': 'Zoom',
            'tiktok': 'TikTok',
            'insta': 'Reels',
            'YTshorts': 'Shorts',
            'call': 'Appel',
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

    updateTimeline();
});
