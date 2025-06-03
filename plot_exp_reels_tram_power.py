import os
import glob
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio

# Tell Plotly to open figures in your default web browser
pio.renderers.default = 'browser'

# ──────────────────────────────────────────────────────────────────────────────
# UPDATE THIS to the folder where your CSVs live. For example:
#    exp_call_tram/1_5_6pro_3G_CS_insta_stat_64sps-1.csv, etc.
DATA_DIR = "./data/Experiment_Data/SIR_Experiment/Reels"
# ──────────────────────────────────────────────────────────────────────────────


def apply_exponential_moving_average(data, span):
    smoothed_data = data.ewm(span, adjust=False).mean()
    return smoothed_data


def parse_power_csv(filepath: str, ema_span: int = 10) -> pd.DataFrame:
    """
    Parse one of your CSV files into a DataFrame with:
      - Timestamp (datetime)
      - P_BAT  (battery power)
      - P_RFBB (RF + Baseband power), smoothed by EMA(span=ema_span)
    """

    # Read CSV with pandas, parsing the 'Timestamp' column.
    # The second column is a quoted string "V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA"
    df = pd.read_csv(
        filepath,
        parse_dates=["Timestamp"],
        quotechar='"',
        skipinitialspace=True
    )

    # If pandas didn't automatically split out P_BAT, P_BB, P_PA, etc.,
    # then the nine values will be in the second column (index=1). We must split.
    if "P_BAT" not in df.columns:
        # Define the nine voltage/current/power column names, in order
        cols = ["V_BAT", "I_BAT", "P_BAT", "V_BB", "I_BB", "P_BB", "V_PA", "I_PA", "P_PA"]
        # Split the quoted string column into 9 separate float columns
        df[cols] = (
            df.iloc[:, 1]                              # second column (string)
              .str.strip('"')                           # remove surrounding quotes
              .str.split(",", expand=True)              # split on commas
              .astype(float)                            # convert all to float
        )

    # Compute combined RF+BB power:
    df["P_RFBB"] = df["P_BB"] + df["P_PA"]
    print(f"span {ema_span}")
    # Apply EMA smoothing to P_BAT and P_RFBB:
    df["P_BAT"] = apply_exponential_moving_average(df["P_BAT"], span=ema_span)
    df["P_RFBB"] = apply_exponential_moving_average(df["P_RFBB"], span=ema_span)

    # Return only the columns we care about
    return df[["Timestamp", "P_BAT", "P_RFBB"]]


def display_statistics(df: pd.DataFrame, name: str) -> None:
    """
    Print min/avg/max for P_BAT and P_RFBB in the given DataFrame.
    """
    bat = df["P_BAT"]
    rfbb = df["P_RFBB"]
    print(f"\nStatistics for {name}:")
    print(f"  P_BAT   → min: {bat.min():.4f} W, avg: {bat.mean():.4f} W, max: {bat.max():.4f} W")
    print(f"  P_RFBB  → min: {rfbb.min():.4f} W, avg: {rfbb.mean():.4f} W, max: {rfbb.max():.4f} W")


def plot_power(df, name):
    """
    Create an interactive Plotly figure with two subplots:
      1) Time-series of P_BAT and P_RFBB
      2) Table of summary statistics
    """
    # Prepare stats for table
    bat = df['P_BAT']
    rfbb = df['P_RFBB']
    stats = {
        'Metric': ['P_BAT min', 'P_BAT avg', 'P_BAT max', 'P_RFBB min', 'P_RFBB avg', 'P_RFBB max'],
        'Value': [
            f"{bat.min():.4f} W", f"{bat.mean():.4f} W", f"{bat.max():.4f} W",
            f"{rfbb.min():.4f} W", f"{rfbb.mean():.4f} W", f"{rfbb.max():.4f} W"
        ]
    }

    # Create subplot layout: 1 row, 2 cols
    fig = make_subplots(
        rows=1, cols=2,
        column_widths=[0.7, 0.3],
        specs=[[{"type": "scatter"}, {"type": "table"}]],
        subplot_titles=[name, "Summary Statistics"]
    )

    # Add time-series traces
    fig.add_trace(
        go.Scatter(
            x=df['Timestamp'],
            y=df['P_BAT'],
            mode='lines',
            name='P_BAT (Battery)'
        ), row=1, col=1
    )
    fig.add_trace(
        go.Scatter(
            x=df['Timestamp'],
            y=df['P_RFBB'],
            mode='lines',
            name='P_RFBB (RF+BB)'
        ), row=1, col=1
    )

    # Add stats table
    fig.add_trace(
        go.Table(
            header=dict(values=list(stats.keys()), align='left'),
            cells=dict(values=list(stats.values()), align='left')
        ), row=1, col=2
    )

    # Update layout
    fig.update_layout(
        title_text=name,
        template='plotly_white',
        showlegend=True,
        width=1000,
        height=500,
        margin=dict(l=40, r=40, t=60, b=40)
    )

    # Display in browser
    fig.show()


if __name__ == "__main__":
    # Find all CSV files in DATA_DIR
    pattern = os.path.join(DATA_DIR, "*.csv")
    files = sorted(glob.glob(pattern))

    if not files:
        print(f"❌ No CSV files found in '{DATA_DIR}'")
    else:
        for filepath in files:
            name = os.path.basename(filepath)
            df = parse_power_csv(filepath, ema_span=100)
            display_statistics(df, name)
            plot_power(df, name)
