# 📱 SIR 

> Projet SIR – INSA Lyon  
> 4TCA – 2024-2025  
> Analyse et visualisation de la consommation énergétique des smartphones via des scénarios réels

---

## 🎯 Objectif général

Le projet **SIR** s’inscrit dans le programme **ECOMOME**, visant à mieux comprendre l’impact énergétique réel des smartphones et à sensibiliser le public. Contrairement aux approches par modélisation théorique, **des mesures matérielles réelles** sont ici utilisées, à partir de téléphones modifiés.

Le projet propose un **simulateur web** permettant de :
- construire des scénarios d’usage (streaming, appel, navigation, etc.) ;
- estimer la **consommation d’énergie** et les **émissions de CO₂ associées** ;
- visualiser l’impact sur la batterie ;
- sensibiliser à l’empreinte numérique personnelle.

---

## 🧪 Contexte technique

- 📲 **Téléphones instrumentés** : accès physique aux lignes d'alimentation internes.
- ⚡ **Capteurs PAC1954** connectés à un Raspberry Pi.
- 📊 **Scénarios réels** enregistrés pour divers réseaux, applications, et situations (mobilité).
- 🗂️ Données disponibles :
  - énergie consommée par la batterie (`E_BAT_Jm`) ;
  - consommation module RF (`E_RF_Jm`), ... (`E_BB_Jm`) et .... (`E_PA_Jm`) ;
  - spécifications des appareils (capacité batterie, taille écran…).

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
│
├── data/                # Fichiers CSV de mesure et de spécifications
│   ├── scenario_summary_df.csv
│   └── batteries_ue.csv
│
├── processing_ready.ipynb  # Notebook de préparation et traitement des données
├── result_df.csv           # Résultats énergétiques formatés
├── README.md
└── ...

```
## ⚙️ Fonctionnement de l’API
Le backend `/server.js` :

-> lit les fichiers CSV de scénarios (scenario_summary_df.csv) et specs (batteries_ue.csv) ;

-> reçoit activités planifiées, duration, type d’appareil, réseau et état (statique ou mobile) ;

-> cherche le scénario correspondant (sinon fallback vers Google 6Pro) ;

-> calcule l’énergie consommée (Wh), le % de batterie utilisé et le CO₂ émis (min–max) ;

-> renvoie les résultats au frontend.
