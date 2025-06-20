# SIR 

> Projet SIR – INSA Lyon  
> 4TCA – 2024-2025  
> Analyse et visualisation de la consommation énergétique des smartphones via des scénarios réels

---

## Objectif général

Ce projet **SIR** vise à mieux comprendre l’impact énergétique réel des smartphones et à sensibiliser le public. Contrairement aux approches par modélisation théorique, **des mesures matérielles réelles** sont ici utilisées, à partir de téléphones modifiés.

Le projet propose un **simulateur web** permettant de :
- construire des scénarios d’usage (streaming, appel, navigation, etc.) ;
- estimer la **consommation d’énergie** et les **émissions de CO₂ associées** ;
- visualiser l’impact sur la batterie ;
- sensibiliser à l’empreinte numérique personnelle.

---

## Contexte technique

- **Téléphones instrumentés** : accès physique aux lignes d'alimentation internes.
- **Capteurs PAC1954** connectés à un Raspberry Pi.
- **Scénarios réels** enregistrés pour divers réseaux, applications, et situations (mobilité).
- Données disponibles :
  - énergie consommée par la batterie (`E_BAT_Jm`) ;
  - consommation module RF (`E_RF_Jm`), BaseBand processor (`E_BB_Jm`) et Power Amplifier (`E_PA_Jm`) ;
  - spécifications des appareils (capacité batterie, taille écran).

---

## Structure du projet

```bash
SIR/
│
├── website/              # Interface utilisateur (HTML, CSS, JS)
│   ├── index.html       # Page principale du simulateur
│   ├── style.css        # Feuilles de style personnalisées
│   └── script.js        # Logique front-end interactive
│
├── server/                                    # API backend Express.js
│   └── server.js                              # Endpoint /calculate pour les estimations
│   ├── other_scenario_summary_df.csv          # Données scenarios catégorie "Autre"
│   └── call_scenario_summary.csv              # Données scenarios appel téléphonique
│   └── short_video_scenario_summary.csv       # Données  scenarios catégorie "Short Videos"
│   └── video_streaming_scenario_summary.csv   # Données  scenarios catégorie "Videostreaming"
│   └── visio_scenario_summary.csv             # Données  scenarios catégorie "Visioconférence"
│   └── batteries_ue.csv                       # Spécifications différents appareils
│
├── processing_ready.ipynb  # Notebook de préparation et traitement des données
├── result_df.csv           # Résultats énergétiques formatés
├── README.md
└── ...

```
## Fonctionnement de l’API
Le backend `/server.js` :

-> lit les fichiers CSV de scénarios (scenario_summary_df.csv) et specifications des appareils (batteries_ue.csv) ;

-> reçoit activités planifiées, duration, type d’appareil, réseau et état (statique ou mobile) ;

-> cherche le scénario correspondant (sinon fallback vers Google 6Pro) ;

-> calcule l’énergie consommée (Wh), le % de batterie utilisé et le CO₂ émis (min–max) ;

-> renvoie les résultats au frontend.

Exécuter le projet : 
1. Lancer le serveur
Ouvrir un terminal et se rendre dans le dossier website/server :
cd website/server
Installer les dépendances (si ce n’est pas déjà fait) :
npm install
Puis lancer le serveur avec :
node server.js
Par défaut, le serveur écoute sur le port 5000.
2. Lancer le client
Dans un deuxième terminal, se rendre dans le dossier website/client :
cd website/client
Lancer le client avec :
npx serve
Cette commande démarre un serveur local pour héberger la page HTML. Le terminal vous indiquera sur quelle adresse le site est accessible, généralement :
http://localhost:3000
Le site est maintenant opérationnel.
Vous pouvez :
Sélectionner un appareil, un réseau et une mobilité.
Planifier des activités (streaming, visio, appels, etc.).
Obtenir l’estimation de la consommation énergétique et du pourcentage de batterie utilisé.


Obtenir les données de mesure : 

Les fichiers de données sont compris dans le Git ci-dessous : 

https://gitlab.inria.fr/youssef.badra/Experiment_Data

Ce dossier est un submodule Git. Pour l'initialiser :

cd data/Experiment_Data
git submodule update --init --recursive
git pull origin master


Traitement des données brutes dans le notebook

Les fichier *_processing.ipynb automatisent le traitement des mesures réelles à partir de CSV de mesures. Pour traiter de nouveaux fichiers :

Ajouter des fichiers à traiter :

Placez vos fichiers .csv dans un dossier sous ./data/Experiment_Data/...

Le notebook scanne automatiquement les sous-dossiers (ex: Reels, Voice call)

Ajouter un fichier à la blacklist :

Si un fichier est bruité ou incorrect, ajoutez son nom au set blacklist_filenames dans le notebook :
blacklist_filenames = {
  "2_5_6pro_LTE_YTshorts_stat_64sps.csv",
  # Ajouter ici...
}

Chaque fichier notebook de traitement des données est composé de deux blocs :

1. Bloc de traitement des données : jouer ce bloc pour traiter les données de mesures. Retourne une table result_df qui contient toutes les métriques importantes : énergies moyennes (J/min), durée utile, % RF, etc.

2. Bloc d'export : Ce bloc génère un fichier de la forme *_scenario_summary_df : contient les consomations moyennes par scénario ID, sauvegardée dans un CSV utilisé par le serveur.

Ajouter un nouveau scénario de simulation

Ajouter le fichier CSV de mesure dans un sous-dossier de data/Experiment_Data/

Mettre à jour le notebook processing_ready.ipynb, en ajoutant le nouveau dossier parmi ceux traités par le fichier

Exécuter la cellule principale (boucle for) pour ajouter ce fichier au result_df. Le notebook ne traite pas les fichiers déjà traités et ajoutés à result_df

Ré executer le bloc de generation du scenario summary. Le serveur peut maintenant accéder au nouveau scénario traité.

Données de mesure (Git submodule)

Les fichiers de mesure sont dans le dépôt suivant :
https://gitlab.inria.fr/youssef.badra/Experiment_Data

cd data/Experiment_Data
git submodule update --init --recursive