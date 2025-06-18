# 📱 Simulateur de Consommation Énergétique Mobile

Ce projet est une **application web interactive** permettant de simuler l'impact énergétique de différentes activités numériques effectuées sur un smartphone. Elle est basée sur des données expérimentales mesurées sur du matériel réel dans le cadre du projet ECOMOME.

---

## 🌐 Fonctionnalités principales

- Sélection d’un appareil mobile, technologie réseau et état de mobilité.
- Choix d’activités (TikTok, appels, YouTube, etc.) à placer dans une timeline.
- Calcul de la consommation **énergétique (Wh)**, **impact CO₂ (g)** et **usure de batterie**.
- Affichage détaillé par activité.
- Informations pédagogiques sur la consommation RF et le mix énergétique français.

---

## 🧱 Structure du projet

```bash
SIR/
│
├── website/              # Interface utilisateur (HTML, CSS, JS)
│   ├── index.html       # Page principale du simulateur
│   ├── style.css        # Feuilles de style personnalisées
│   └── script.js        # Logique front-end interactive
│
├── server/              # API backend Express.js
│   └── server.js        # Endpoint /calculate pour les estimations
│   └── fichiers csv     # Données de consommation énergétique
```

---

## 🚀 Lancer l'application

### Prérequis
- Node.js (v16 ou +)
- npm

### Étapes

1. **Installer les dépendances**
```bash
npm install express cors body-parser csv-parser
```

2. **Lancer le serveur**
```bash
cd server
node server.js
```

3. **Ouvrir l'interface utilisateur**
Ouvrir `website/index.html` dans un navigateur web.

---

## 🔧 Ajouter ou modifier des activités

### Étape 1 : Modifier `index.html`

Localisez la section suivante dans le HTML :

```html
<div id="activities-container">
```

Chaque activité est représentée par une carte de ce type :

```html
<div class="activity-card"
     data-category="streaming"
     data-activity="netflix"
     data-quality-options='["Eco", "Max"]'
     draggable="true">
  <!-- contenu visuel -->
</div>
```

Attributs importants :
- `data-activity` : identifiant unique utilisé côté backend (ex: netflix, call, etc.).

- `data-category` : catégorie visuelle et logique (streaming, communication, short-video, visio, autres) — elle définit la couleur.

 - `data-quality-options (optionnel)` : active une liste déroulante pour les qualités vidéo ou audio.


### Étape 2 :  Ajouter les noms dans `script.js`
Dans le fichier `script.js`, les noms doivent être ajoutés dans deux fonctions pour que l’affichage soit correct dans les résultats :

```bash
function getActivityFullName(name) {
  const map = {
    'netflix': 'Netflix',
    'tiktok': 'TikTok',
    'spotify': 'Spotify',
    'deezer': 'Deezer'  // ← Ajouter ici
    };
  return map[name] || name;
}
```

```bash
function getActivityShortName(name) {
  const map = {
    'netflix': 'Netflix',
    'tiktok': 'TikTok',
    'spotify': 'Spotify',
    'deezer': 'Deezer'  // ← Ajouter ici
  };
  return map[name] || name;
}
```

