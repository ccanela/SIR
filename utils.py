import plotly.express as px
import plotly.graph_objects as go
import time
from pathlib import Path
import pandas as pd
import numpy as np
import os

result_df = pd.DataFrame()
result_df_ip = pd.DataFrame()
plot_df_caller = pd.DataFrame()

global rep
global df

def open_file_nf_6pro_3ch_rasp_ff(file_name):
    """
    Reads a CSV file for reels video experiment with the new format.
    Calculates energy consumption for video watching sessions using both original and optimized methods.
    
    New format includes:
    - Proper datetime timestamps
    - Pre-calculated accumulated energy (acc_BAT_Wh, acc_BB_Wh, acc_PA_Wh)
    - acc_samples_total instead of count
    
    Returns:
        pd.DataFrame: Processed DataFrame with timestamps, SPS, and energy data.
        float: Mean SPS.
        float: Count-based mean SPS.
        float: Log duration in seconds.
        dict: Energy calculations (original method).
        dict: Energy calculations (optimized method).
    """
    # Read CSV file
    df = pd.read_csv(file_name)
    
    # Parse the combined voltage/current/power column
    power_data = df['V_BAT,I_BAT,P_BAT,V_BB,I_BB,P_BB,V_PA,I_PA,P_PA'].str.split(',', expand=True)
    power_data.columns = ['V_BAT', 'I_BAT', 'P_BAT', 'V_BB', 'I_BB', 'P_BB', 'V_PA', 'I_PA', 'P_PA']
    
    # Convert to numeric
    power_data = power_data.apply(pd.to_numeric, errors='coerce')
    
    # Add parsed columns to dataframe
    df = pd.concat([df, power_data], axis=1)
    
    # Convert timestamp to datetime
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    
    # Calculate time differences in seconds
    df['dt'] = df['Timestamp'].diff().dt.total_seconds().fillna(0)
    
    # Calculate RF power (BB + PA)
    df['P_RF'] = df['P_BB'] + df['P_PA']
    
    # =================== ORIGINAL METHOD (Trapezoidal Integration) ===================
    # Initialize energy columns for original method
    df['E_BAT_orig'] = 0.0
    df['E_RF_orig'] = 0.0
    df['E_PA_orig'] = 0.0
    df['E_BB_orig'] = 0.0
    
    # Calculate cumulative energy using trapezoidal rule (original method)
    for i in range(1, len(df)):
        if df.at[i, 'dt'] > 0:  # Only calculate if time difference is positive
            # Battery energy
            df.at[i, 'E_BAT_orig'] = df.at[i-1, 'E_BAT_orig'] + np.trapz(
                [df.at[i-1, 'P_BAT'], df.at[i, 'P_BAT']], 
                x=[0, df.at[i, 'dt']]
            )
            
            # RF energy
            df.at[i, 'E_RF_orig'] = df.at[i-1, 'E_RF_orig'] + np.trapz(
                [df.at[i-1, 'P_RF'], df.at[i, 'P_RF']], 
                x=[0, df.at[i, 'dt']]
            )
            
            # PA energy
            df.at[i, 'E_PA_orig'] = df.at[i-1, 'E_PA_orig'] + np.trapz(
                [df.at[i-1, 'P_PA'], df.at[i, 'P_PA']], 
                x=[0, df.at[i, 'dt']]
            )
            
            # BB energy
            df.at[i, 'E_BB_orig'] = df.at[i-1, 'E_BB_orig'] + np.trapz(
                [df.at[i-1, 'P_BB'], df.at[i, 'P_BB']], 
                x=[0, df.at[i, 'dt']]
            )
        else:
            # Copy previous values if no time difference
            df.at[i, 'E_BAT_orig'] = df.at[i-1, 'E_BAT_orig']
            df.at[i, 'E_RF_orig'] = df.at[i-1, 'E_RF_orig']
            df.at[i, 'E_PA_orig'] = df.at[i-1, 'E_PA_orig']
            df.at[i, 'E_BB_orig'] = df.at[i-1, 'E_BB_orig']
    
    # =================== OPTIMIZED METHOD (Pre-calculated Values) ===================
    # Convert accumulated energy from Wh to Joules (1 Wh = 3600 J)
    # df['E_BAT_opt'] = df['acc_BAT_Wh'] * 3600
    # df['E_BB_opt'] = df['acc_BB_Wh'] * 3600
    # df['E_PA_opt'] = df['acc_PA_Wh'] * 3600
    # df['E_RF_opt'] = (df['acc_BB_Wh'] + df['acc_PA_Wh']) * 3600
    
    # =================== SPS CALCULATIONS ===================
    # Calculate SPS using sample count differences
    df['sample_diff'] = df['acc_samples_total'].diff().fillna(0)
    df['SPS'] = np.where(df['dt'] > 0, df['sample_diff'] / df['dt'], 0)
    
    # Calculate mean SPS (excluding zeros and invalid values)
    valid_sps = df['SPS'][(df['SPS'] > 0) & (df['dt'] > 0)]
    sps_mean = valid_sps.mean() if len(valid_sps) > 0 else 0
    
    # Alternative SPS calculation using time windows
    df['time_second'] = df['Timestamp'].dt.floor('s')
    sps_by_second = df.groupby('time_second')['sample_diff'].sum()
    sps_count_mean = sps_by_second.mean() if len(sps_by_second) > 0 else 0
    
    # =================== TIME FORMATTING ===================
    df['time_sec_abs'] = (df['Timestamp'] - df['Timestamp'].min()).dt.total_seconds()
    df['minutes'], df['seconds'] = divmod(df['time_sec_abs'], 60)
    df['seconds'], df['milliseconds'] = divmod(df['seconds'], 1)
    df['milliseconds'] *= 1000
    df['time_formated_abs'] = (df['minutes'].astype(int).astype(str).str.zfill(2) + ':' + 
                              df['seconds'].astype(int).astype(str).str.zfill(2) + '.' + 
                              df['milliseconds'].astype(int).astype(str).str.zfill(3))
    
    # Calculate log duration
    log_duration = (df['Timestamp'].max() - df['Timestamp'].min()).total_seconds()
    
    # =================== VIDEO WATCHING PHASES ===================
    # Process useful_data for video watching phases (if applicable)
    if 'useful_data' in df.columns:
        # Create groups based on useful_data changes (video watching periods)
        df['video_session'] = (df['useful_data'].diff() != 0).cumsum()
        df['is_watching'] = df['useful_data'] == 1
    else:
        # If no useful_data column, consider entire session as watching
        df['video_session'] = 1
        df['is_watching'] = True
    
    # =================== ENERGY CALCULATIONS FOR BOTH METHODS ===================
    # Original method - total accumulated energy
    energy_orig = {
        'total_E_BAT': df['E_BAT_orig'].iloc[-1] if len(df) > 0 else 0,
        'total_E_RF': df['E_RF_orig'].iloc[-1] if len(df) > 0 else 0,
        'total_E_PA': df['E_PA_orig'].iloc[-1] if len(df) > 0 else 0,
        'total_E_BB': df['E_BB_orig'].iloc[-1] if len(df) > 0 else 0
    }
    

    
    return df, sps_mean, sps_count_mean, log_duration, energy_orig


def open_file_nf1(file_name):   
    df = pd.read_csv(file_name)
    # Split the 'Data' column into separate columns
    df[['V_BAT', 'I_BAT', 'P_BAT', 'V_RF', 'I_RF', 'P_RF', 'useful_data', 'useful_state','count']] = df['V_BAT'].str.split(',', expand=True)
    # Convert the data in the new columns to numeric type
    df['V_BAT'] = pd.to_numeric(df['V_BAT'])
    df['I_BAT'] = pd.to_numeric(df['I_BAT'])
    df['P_BAT'] = pd.to_numeric(df['P_BAT'])
    df['V_RF'] = pd.to_numeric(df['V_RF'])
    df['I_RF'] = pd.to_numeric(df['I_RF'])
    df['P_RF'] = pd.to_numeric(df['P_RF'])
    df['useful_data'] = pd.to_numeric(df['useful_data'])
    df['useful_state'] = pd.to_numeric(df['useful_state'])
    df['count'] = pd.to_numeric(df['count'])
        # Drop the original 'Data' column
    df.drop('V_BAT', axis=1, inplace=True)
    df = df[(df['useful_data'] == True)]
    df['m_sec_ms'] = pd.to_datetime(df['m_sec_ms'],format='%M:%S.%f')
    df['minute'] = df['m_sec_ms'].dt.minute
    df['second'] = df['m_sec_ms'].dt.second
    df['millisecond'] = df['m_sec_ms'].dt.microsecond // 1000  # Convert microseconds to milliseconds
    df['total_milliseconds'] = (df['minute'] * 60 * 1000) + (df['second'] * 1000) + df['millisecond']
    previous_value = None
    for index, current_value in df['total_milliseconds'].items():
            # Check if there is a previous value and if the current value is less than the previous value
        if previous_value is not None and current_value < previous_value:
            # Perform the desired action (e.g., get the index of the lowest value)
            low_index = df['total_milliseconds'].idxmin()
            correction_value = df.loc[low_index -1, 'total_milliseconds']
            df.loc[low_index:, 'total_milliseconds'] += correction_value
            min_total_milliseconds = df['total_milliseconds'].min()
            df['adjusted_total_milliseconds'] = df['total_milliseconds'] - min_total_milliseconds
            break  # Exit the loop after finding the first transition from high to low
    # Update the previous value for the next iteration
        previous_value = current_value
    else:
        # Handle the case when no transition from high to low is found
        min_total_milliseconds = df['total_milliseconds'].min()
        df['adjusted_total_milliseconds'] = df['total_milliseconds'] - min_total_milliseconds

    df['seconds'], df['milliseconds'] = divmod(df['adjusted_total_milliseconds'], 1000)
    df['minutes'], df['seconds'] = divmod(df['seconds'], 60)
    df['time'] = df['minutes'].astype(str).str.zfill(2) + ':' + \
                 df['seconds'].astype(str).str.zfill(2) + '.' + \
                 df['milliseconds'].astype(str).str.zfill(3)
    df['time'] = pd.to_datetime(df['time'],format='%M:%S.%f')
    count_avg = df['count'].mean()
    sps = 1024/count_avg
    duration = df['time'].max()
    
    return df,sps,duration


def measurement_dataset_analyze(file_name, d, result_df=None):

    if result_df is None:
        result_df = pd.DataFrame()
    df,sps,duration = open_file_nf1(file_name)
    section = df[(df['useful_data'] == True)]
    start_time = section['time'].min()
    end_time = start_time + pd.Timedelta(minutes=d)
    mask = (section['time'] >= start_time) & (section['time'] <= end_time)
    section_df = section[mask]
    file_name = os.path.basename(file_name)  # Extract filename from path
    filename_parts = file_name.split('_')
    rep = filename_parts[0] if len(filename_parts) >= 1 else None  # Handle cases with less than 3 underscores
    device_name = filename_parts[2] if len(filename_parts) >= 3 else None  # Handle cases with less than 3 underscores
    thecno = filename_parts[3] if len(filename_parts) >= 4 else None
    plat = filename_parts[4] if len(filename_parts) >= 5 else None
    File_Time = filename_parts[5] if len(filename_parts) >= 6 else None
    quality = filename_parts[6] if len(filename_parts) >= 7 else None

    with pd.option_context("mode.copy_on_write", True):
        # Replace total power by average
        avg_RF = section_df['P_RF'].mean()
        avg_BAT = section_df['P_BAT'].mean()
        
        section_duration = section_df['time'].max() - section_df['time'].min()
        total_duration_seconds = section_duration.total_seconds()

        total_time_duration = section['time'].max().strftime('%M:%S.%f')[:-3]
        section_time_duration = section_df['time'].max().strftime('%M:%S.%f')[:-3]

    row = {
        'File name': file_name,
        'Exp Repetition': rep,
        'Device': device_name,
        'Technology': thecno,
        'Platform': plat,
        'File duration': File_Time,
        'Quality': quality,
        'Avg RF Power W': round(avg_RF, 4),
        'Avg BAT Power W': round(avg_BAT, 4),
        'Total duration': total_time_duration,
        'Useful Data duration': section_time_duration,
        'Total Sec': total_duration_seconds,
    }

    count_avg = section_df['count'].mean()
    sps = 1024/count_avg
    result_df = pd.concat([result_df, pd.DataFrame(row, index=[0])], ignore_index=True)
    duplicate_rows_result_df = result_df[result_df.duplicated()]
    return result_df

def dataset_analyze_rasp_ff(file_name, result_df=None):
    """
    Analyzes reels video experiment data and assembles results in a standardized table.
    Supports both static and dynamic experiment conditions.
    
    Filename formats:
    Static: exp_total_device_ran_platform_condition_sps.csv
    Dynamic: exp_total_device_ran_platform_condition_path_from_to_sps.csv
    """
    if result_df is None:
        result_df = pd.DataFrame()
    global section_df, duplicate_rows_result_df
    
    # Process the file
    df, sps, sps_count, duration, energy_orig = open_file_nf_6pro_3ch_rasp_ff(file_name)
    
    section_df = df
    
    # Parse filename components
    file_name_base = os.path.basename(file_name)
    filename_parts = file_name_base.replace('.csv', '').split('_')
    
    # Extract basic experiment info
    exp_number = filename_parts[0] if len(filename_parts) >= 1 else None
    total_exp = filename_parts[1] if len(filename_parts) >= 2 else None
    device = filename_parts[2] if len(filename_parts) >= 3 else None
    ran_tech = filename_parts[3] if len(filename_parts) >= 4 else None
    platform = filename_parts[4] if len(filename_parts) >= 5 else None
    condition = filename_parts[5] if len(filename_parts) >= 6 else None
    
    # Handle dynamic vs static experiments
    if condition and condition.lower() == 'dyna':
        # Dynamic experiment: exp_total_device_ran_platform_dyna_path_from_to_sps
        path = filename_parts[6] if len(filename_parts) >= 7 else None
        from_location = filename_parts[7] if len(filename_parts) >= 8 else None
        to_location = filename_parts[8] if len(filename_parts) >= 9 else None
        sps_info = filename_parts[9] if len(filename_parts) >= 10 else None
        experiment_type = "Dynamic"
        location_info = f"{from_location} to {to_location}" if from_location and to_location else "N/A"
        path_info = path if path else "N/A"
    else:
        # Static experiment: exp_total_device_ran_platform_stat_sps
        sps_info = filename_parts[6] if len(filename_parts) >= 7 else None
        experiment_type = "Static"
        location_info = "Fixed Location"
        path_info = "N/A"
    
    # Extract SPS value from sps_info (remove 'sps' suffix)
    sps_value = sps_info.replace('sps', '') if sps_info else None
    
    # Calculate duration in minutes for energy per minute calculations
    duration_minutes = duration / 60 if duration > 0 else 1  # Avoid division by zero
    
    # Helper function to safely format values
    def safe_format(value, format_str='{:.2f}'):
        return format_str.format(value) if not pd.isna(value) and value != 0 else '0.00'
    
    def safe_format_percent(value):
        return '{:.2f}%'.format(value) if not pd.isna(value) else 'N/A'
    
    # Calculate percentages with safety checks
    RF_percent_bat_orig = (energy_orig['total_E_RF'] / energy_orig['total_E_BAT'] * 100) if energy_orig['total_E_BAT'] != 0 else np.nan
  
    # Create result row
    row = {
        # Experiment Information
        'File name': file_name_base,
        'Exp Number': exp_number,
        'Total Experiments': total_exp,
        'Device': device,
        'RAN Technology': ran_tech,
        'Platform': platform,
        'Condition': condition,
        'Path': path_info,
        'Location Route': location_info,
        
        # Energy per Minute - Original Method (Trapezoidal Integration)
        'E_RF Jm': safe_format(energy_orig['total_E_RF'] / duration_minutes),
        'E_BAT Jm': safe_format(energy_orig['total_E_BAT'] / duration_minutes),

        'E_BB Jm': safe_format(energy_orig['total_E_BB'] / duration_minutes),
        'E_PA Jm': safe_format(energy_orig['total_E_PA'] / duration_minutes),

        

        
        # Total Energy - Original Method
        'Total E_RF J': safe_format(energy_orig['total_E_RF']),
        'Total E_BAT J': safe_format(energy_orig['total_E_BAT']),

        'Total E_PA J': safe_format(energy_orig['total_E_PA']),
        'Total E_BB J': safe_format(energy_orig['total_E_BB']),
        
        # Percentages - Original Method
        'E_RF % BAT': safe_format_percent(RF_percent_bat_orig),

        

        # Session Information
        'Total Duration (sec)': safe_format(duration),
        'Total Duration (min)': safe_format(duration_minutes),
        'Measured SPS': '{:.5f}'.format(sps) if not pd.isna(sps) else '0.00000',
        'SPS Count Method': '{:.5f}'.format(sps_count) if not pd.isna(sps_count) else '0.00000',
        
    }
    
    # Add to result dataframe
    result_df = pd.concat([result_df, pd.DataFrame([row])], ignore_index=True)
    duplicate_rows_result_df = result_df[result_df.duplicated()]
    
    return result_df


def apply_exponential_moving_average(data, span):
    """
    Apply exponential moving average to smooth data.
    
    Args:
        data: pandas Series or array-like data
        span: int, span for the exponential moving average
        
    Returns:
        pandas Series: smoothed data
    """
    return data.ewm(span=span, adjust=False).mean()

# Initialize global variables if they don't exist
try:
    result_df
except NameError:
    result_df = pd.DataFrame()

try:
    section_df
except NameError:
    section_df = pd.DataFrame()

try:
    duplicate_rows_result_df
except NameError:
    duplicate_rows_result_df = pd.DataFrame()

def seconds_to_duration(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remaining_seconds = seconds % 60
    return f'{hours:02}:{minutes:02}:{remaining_seconds:06.3f}'