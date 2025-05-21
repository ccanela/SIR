import os
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots


DATA_PATH = "./data/Experiment_Data/call_test/iPX_CALL_Callee_RX_4G_pac1954.csv"

def parse_simple_power_csv(filepath, year=2024):
    timestamps = []
    p_bat, p_rf = [], []

    with open(filepath, 'r') as file:
        next(file)  # skip header
        for line in file:
            try:
                parts = line.strip().split(',', 2)
                if len(parts) < 3:
                    continue

                date_part = parts[0].strip()
                time_part = parts[1].strip()
                values = [float(v) for v in parts[2].strip().strip('"').split(',') if v.strip() != '']

                # Extract values
                pb, prf = values[0], values[1]

                # Sanity check: P_RF must not exceed P_BAT
                if prf > pb:
                    print(f"[⚠️ Skipped] RF > BAT at {date_part} {time_part} → P_RF={prf:.3f} W > P_BAT={pb:.3f} W")
                    continue

                # Reconstruct timestamp
                full_timestamp = f"{date_part}:{time_part}"
                timestamp = datetime.strptime(full_timestamp, "%d-%m %H:%M:%S.%f").replace(year=year)

                timestamps.append(timestamp)
                p_bat.append(pb)
                p_rf.append(prf)

            except Exception as e:
                print(f"Skipping line: {e}")

    df = pd.DataFrame({
        'timestamp': timestamps,
        'P_BAT': p_bat,
        'P_RF': p_rf
    })
    return df


def display_statistics(df):
    print("🔋 Battery Power Stats (P_BAT):")
    print(f"  Average: {df['P_BAT'].mean():.3f} W")
    print(f"  Min    : {df['P_BAT'].min():.3f} W")
    print(f"  Max    : {df['P_BAT'].max():.3f} W")

    print("\n📡 RF Power Stats (P_RF):")
    print(f"  Average: {df['P_RF'].mean():.3f} W")
    print(f"  Min    : {df['P_RF'].min():.3f} W")
    print(f"  Max    : {df['P_RF'].max():.3f} W")


def plot_power(df, title="Call Test – Power Consumption Over Time"):
    # Calculate statistics
    stats = {
        "P_BAT avg": f"{df['P_BAT'].mean():.3f} W",
        "P_BAT min": f"{df['P_BAT'].min():.3f} W",
        "P_BAT max": f"{df['P_BAT'].max():.3f} W",
        "P_RF avg": f"{df['P_RF'].mean():.3f} W",
        "P_RF min": f"{df['P_RF'].min():.3f} W",
        "P_RF max": f"{df['P_RF'].max():.3f} W"
    }

    # Create subplot: 1 row, 2 columns
    fig = make_subplots(
        rows=1, cols=2,
        column_widths=[0.75, 0.25],
        specs=[[{"type": "scatter"}, {"type": "table"}]],
        subplot_titles=[title, "Power Stats"]
    )

    # Add power traces
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['P_BAT'],
        mode='lines',
        name='Battery Power (P_BAT)',
        line=dict(color='red')
    ), row=1, col=1)

    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['P_RF'],
        mode='lines',
        name='RF Power (P_RF)',
        line=dict(color='blue')
    ), row=1, col=1)

    # Add statistics as table
    fig.add_trace(go.Table(
        header=dict(values=["Metric", "Value"], fill_color='lightgray', font=dict(size=12)),
        cells=dict(
            values=[list(stats.keys()), list(stats.values())],
            align='left',
            fill_color='white',
            font=dict(size=12)
        )
    ), row=1, col=2)

    # Layout settings
    fig.update_layout(
        height=500,
        width=1100,
        template='plotly_white',
        showlegend=True
    )

    fig.show()


if __name__ == "__main__":
    if not os.path.exists(DATA_PATH):
        print(f"❌ File not found: {DATA_PATH}")
    else:
        df = parse_simple_power_csv(DATA_PATH)
        display_statistics(df)
        plot_power(df)
