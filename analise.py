import pandas as pd

# Prend le CSV en local
df = pd.read_csv(r"data\Experiment_Data\SIR_Experiment\Reels\1_5_6pro_LTE_insta_Dyna_T1_Prefecture_INSA_64sps.csv")
# print("colunas no arquico csv")
# print(df.columns.tolist())
# with open(r"D:\Daniel\INSA\Materias\4TCA\SIR_2\data\Experiment_Data\SIR_Experiment\Reels\1_5_6pro_3G_insta_stat_64sps.csv", encoding="utf-8") as f:
#     for i in range(15):
#         print(f.readline().strip())


#0. Organisation des colonnes
# fait une division de la colonne avec les valeurs qui nous interessent
colunas_embutidas = ['V_BAT', 'I_BAT', 'P_BAT', 'V_BB', 'I_BB', 'P_BB', 'V_PA', 'I_PA', 'P_PA']
df[colunas_embutidas] = df["V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA"].str.split(",", expand=True).astype(float)


# 1. Recalcule la puissance pour vérifier la consistance des données
df["P_BAT_calc"] = df["V_BAT"] * df["I_BAT"]
df["P_PA_calc"] = df["V_PA"] * df["I_PA"]

# 2. Calcul de l'erreur percentuel relactif entre puissance moyenne et calculée
df["P_BAT_error_pct"] = (df["P_BAT_calc"] - df["P_BAT"]) / df["P_BAT"] * 100
df["P_PA_error_pct"] = (df["P_PA_calc"] - df["P_PA"]) / df["P_PA"] * 100

# 3. Stats des variables
desc_stats = df[["V_BAT", "I_BAT", "P_BAT", "V_PA", "I_PA", "P_PA"]].describe()
print("Estatísticas descritivas:\n", desc_stats)

# 4. Erreur moyenne entre puissance réele et calculée
bat_error_mean = df["P_BAT_error_pct"].mean()
pa_error_mean = df["P_PA_error_pct"].mean()
print(f"\nErro médio P_BAT: {bat_error_mean:.3f}%")
print(f"Erro médio P_PA: {pa_error_mean:.3f}%")

# 5. [Energie totale
# On pose 64 samples par seconde
sampling_rate = 64
delta_t = 1 / sampling_rate  # segundos por amostra

# Energia total em Joules = somatório de P (W) * tempo (s)
total_energy_joules = (df["P_BAT"] * delta_t).sum()
print(f"\nEnergia total consumida: {total_energy_joules:.2f} Joules")

# Converter para Wh
total_energy_wh = total_energy_joules / 3600
print(f"Energia total consumida: {total_energy_wh:.4f} Wh")

