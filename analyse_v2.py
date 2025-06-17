import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Load CSV
df = pd.read_csv(r"data\Experiment_Data\SIR_Experiment\Reels\1_5_6pro_LTE_insta_Dyna_T1_Prefecture_INSA_64sps.csv")

# Parse values from embedded column
colunas_embutidas = ['V_BAT', 'I_BAT', 'P_BAT', 'V_BB', 'I_BB', 'P_BB', 'V_PA', 'I_PA', 'P_PA']
df[colunas_embutidas] = df["V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA"].str.split(",", expand=True).astype(float)

# Parse timestamps
df['timestamp'] = pd.to_datetime(df['Date'] + ' ' + df['Time'])
df = df.sort_values('timestamp').reset_index(drop=True)

# Time deltas (in seconds)
df['delta_t'] = df['timestamp'].diff().dt.total_seconds()
df['delta_t'].iloc[0] = 0

# Power validation
df["P_BAT_calc"] = df["V_BAT"] * df["I_BAT"]
df["P_PA_calc"] = df["V_PA"] * df["I_PA"]

# Error metrics
df["P_BAT_error_pct"] = (df["P_BAT_calc"] - df["P_BAT"]) / df["P_BAT"] * 100
df["P_PA_error_pct"] = (df["P_PA_calc"] - df["P_PA"]) / df["P_PA"] * 100

# Energy in Joules and Wh
df['energy_J'] = df['P_BAT'] * df['delta_t']
df['cumulative_energy_Wh'] = df['energy_J'].cumsum() / 3600

total_energy_joules = df['energy_J'].sum()
total_energy_wh = total_energy_joules / 3600

print(f"Énergie totale consommée: {total_energy_wh:.4f} Wh")

# ----------- Plotly Visualizations -----------

# 1. Power comparison (measured vs calculated)
fig1 = go.Figure()
fig1.add_trace(go.Scatter(x=df['timestamp'], y=df['P_BAT'], mode='lines', name='P_BAT mesurée (W)', line=dict(color='blue')))
fig1.add_trace(go.Scatter(x=df['timestamp'], y=df['P_BAT_calc'], mode='lines', name='P_BAT calculée (V×I)', line=dict(color='orange', dash='dash')))
fig1.update_layout(title="Puissance de la batterie dans le temps", xaxis_title="Temps", yaxis_title="Puissance (W)", template="plotly_white")
fig1.show()

# 2. Cumulative energy consumption
fig2 = go.Figure()
fig2.add_trace(go.Scatter(x=df['timestamp'], y=df['cumulative_energy_Wh'], mode='lines+markers', name='Énergie cumulée (Wh)', line=dict(color='green')))
fig2.update_layout(title="Énergie cumulée consommée dans le temps", xaxis_title="Temps", yaxis_title="Énergie (Wh)", template="plotly_white")
fig2.show()

# 3. Error percentage
fig3 = go.Figure()
fig3.add_trace(go.Scatter(x=df['timestamp'], y=df['P_BAT_error_pct'], mode='lines', name='Erreur P_BAT (%)', line=dict(color='red')))
fig3.update_layout(title="Erreur relative entre P_BAT mesurée et calculée", xaxis_title="Temps", yaxis_title="Erreur (%)", template="plotly_white")
fig3.show()
