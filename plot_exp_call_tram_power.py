import os
import glob
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio

# Use browser renderer for interactive plots
pio.renderers.default = 'browser'

DATA_DIR = "./data/Experiment_Data/exp_call_tram"

def apply_exponential_moving_average(data, span):
    smoothed_data = data.ewm(span, adjust=False).mean()
    return smoothed_data

def parse_power_csv(filepath):
    """
    Parse a CSV file containing Timestamp and quoted power/voltage values.
    Returns a DataFrame with Timestamp, P_BAT and combined P_RFBB (P_BB + P_PA).
    """
    # Read CSV; assume header has Timestamp and a quoted list of nine values
    df = pd.read_csv(
        filepath,
        parse_dates=["Timestamp"],
        quotechar='"',
        skipinitialspace=True
    )
    # If P_BAT column not split, split the quoted values
    if "P_BAT" not in df.columns:
        cols = ['V_BAT','I_BAT','P_BAT','V_BB','I_BB','P_BB','V_PA','I_PA','P_PA']
        df[cols] = (
            df.iloc[:, 1]
              .str.strip('"')
              .str.split(',', expand=True)
              .astype(float)
        )
    # Compute combined RF + baseband power
    df['P_RFBB'] = df['P_BB'] + df['P_PA']
    df['P_RFBB'] = apply_exponential_moving_average(df['P_RFBB'], 10)
    df['P_BAT'] = apply_exponential_moving_average(df['P_BAT'], 10)

    return df[['Timestamp', 'P_BAT', 'P_RFBB']]
    
def display_statistics(df, name):
    """
    Print min, average, and max statistics for battery and RF+BB power.
    """
    bat = df['P_BAT']
    rfbb = df['P_RFBB']
    print(f"\nStatistics for {name}:")
    print(f"  P_BAT -> min: {bat.min():.4f} W, avg: {bat.mean():.4f} W, max: {bat.max():.4f} W")
    print(f"  P_RFBB -> min: {rfbb.min():.4f} W, avg: {rfbb.mean():.4f} W, max: {rfbb.max():.4f} W")


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


if __name__ == '__main__':
    # Find all CSV files in the data directory
    pattern = os.path.join(DATA_DIR, '*.csv')
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"❌ No CSV files found in '{DATA_DIR}'")
    for filepath in files:
        name = os.path.basename(filepath)
        df = parse_power_csv(filepath)
        display_statistics(df, name)
        plot_power(df, name)
