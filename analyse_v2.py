import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import os
from glob import glob

# 📂 Dossier contenant les CSVs
folder = r"data\Experiment_Data\SIR_Experiment\Reels"
files = glob(os.path.join(folder, "*LTE*_stat_*.csv"))  # LTE statique uniquement

# Regroupement des fichiers par plateforme
platform_files = {}
for file in files:
    name = os.path.basename(file).lower()
    if 'insta' in name:
        platform_files.setdefault('instagram', []).append(file)
    elif 'tiktok' in name:
        platform_files.setdefault('tiktok', []).append(file)
    elif 'ytshorts' in name:
        platform_files.setdefault('youtube shorts', []).append(file)

# 📋 Affichage des fichiers sélectionnés
print("📂 Fichiers utilisés par plateforme (LTE statique uniquement) :")
for platform, f_list in platform_files.items():
    print(f"  {platform} ({len(f_list)} fichiers):")
    for f in f_list:
        print(f"     └─ {os.path.basename(f)}")

# ------------------------------------------------------------
# 🔹 1. COURBES DE PUISSANCE RF LISSÉES (rolling mean)
# ------------------------------------------------------------
fig_rf = go.Figure()
rolling_window = 100  # Taille de la fenêtre de moyennage (échantillons)

for platform, file_list in platform_files.items():
    for i, filepath in enumerate(file_list):
        df = pd.read_csv(filepath)
        df['timestamp'] = pd.to_datetime(df['Timestamp'])

        # Extraction des colonnes RF : V_PA, I_PA
        parts = df["V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA"].str.split(",", expand=True)
        df['V_RF'] = parts[6].astype(float)
        df['I_RF'] = parts[7].astype(float)
        df['P_RF'] = df['V_RF'] * df['I_RF']

        df = df.sort_values('timestamp').reset_index(drop=True)
        df['time_sec'] = (df['timestamp'] - df['timestamp'].iloc[0]).dt.total_seconds()

        # Lissage
        df['P_RF_smooth'] = df['P_RF'].rolling(window=rolling_window, center=True, min_periods=1).mean()

        trace_label = f"{platform.title()} #{i+1}" if len(file_list) > 1 else platform.title()
        fig_rf.add_trace(go.Scatter(
            x=df['time_sec'],
            y=df['P_RF_smooth'],
            mode='lines',
            name=trace_label,
            line=dict(width=1.5)
        ))

fig_rf.update_layout(
    title="Puissance RF lissée par plateforme (LTE statique)",
    xaxis_title="Temps (s)",
    yaxis_title="Puissance RF (W)",
    template="plotly_white",
    legend_title="Plateforme"
)
fig_rf.show()

# ------------------------------------------------------------
# 🔹 2. BOX PLOT DES VALEURS INSTANTANÉES DE PUISSANCE RF
# ------------------------------------------------------------
rf_samples = []

for platform, file_list in platform_files.items():
    for filepath in file_list:
        df = pd.read_csv(filepath)
        parts = df["V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA"].str.split(",", expand=True)
        df['V_RF'] = parts[6].astype(float)
        df['I_RF'] = parts[7].astype(float)
        df['P_RF'] = df['V_RF'] * df['I_RF']

        for val in df['P_RF'].dropna():
            rf_samples.append({
                "Plateforme": platform,
                "Puissance RF (W)": val
            })

# Convertir en DataFrame
rf_df = pd.DataFrame(rf_samples)

# 📈 Boxplot
fig_box = px.box(
    rf_df,
    x="Plateforme",
    y="Puissance RF (W)",
    points="all",
    title="Distribution de la puissance RF instantanée (LTE statique)",
    template="plotly_white",
    color="Plateforme"
)
fig_box.show()

# ------------------------------------------------------------
# 🔹 3. STATISTIQUES DESCRIPTIVES PAR PLATEFORME
# ------------------------------------------------------------
stats = []

for platform in rf_df['Plateforme'].unique():
    subset = rf_df[rf_df['Plateforme'] == platform]['Puissance RF (W)']
    stats.append({
        'Plateforme': platform.title(),
        'Moyenne (W)': subset.mean(),
        'Médiane (W)': subset.median(),
        'Écart-type (W)': subset.std(),
        'Min (W)': subset.min(),
        'Max (W)': subset.max()
    })

stats_df = pd.DataFrame(stats)

# 📈 Boxplot statistique alternatif (si besoin, désactiver si redondant)
fig_stats = px.box(
    rf_df,
    x='Plateforme',
    y='Puissance RF (W)',
    points="outliers",
    title="Boîte à moustaches - RF par plateforme",
    template="plotly_white",
    color="Plateforme"
)
fig_stats.show()

# 📋 Impression console
print("\n📊 Statistiques RF par plateforme (LTE statique) :\n")
print(stats_df.round(4).to_string(index=False))
