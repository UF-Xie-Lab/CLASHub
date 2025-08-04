import pandas as pd
import glob
import os

input_dir = ""
output_file = os.path.join(input_dir, "filtered_miR-335_tdmd_hybrids.csv")
file_list = glob.glob(os.path.join(input_dir, "clash_search_miR-335-3p_in_*.csv"))

for f in file_list:
    print(f)

filtered_list = []

def is_valid(row):
    pattern = row["Pairing Pattern"]
    if not isinstance(pattern, str) or len(pattern) < 8:
        return False

    # Seed：2-8
    seed = pattern[1:8]
    if " " in seed:
        return False

    # last 10
    last10 = pattern[-10:]
    max_streak = 0
    streak = 0
    for c in last10:
        if c != " ":
            streak += 1
            if streak > max_streak:
                max_streak = streak
        else:
            streak = 0
    if max_streak < 8:
        return False

    return True

for file in file_list:
    df = pd.read_csv(file, sep=",")
    
    if "Pairing Pattern" not in df.columns:
        continue

    filtered_df = df[df.apply(is_valid, axis=1)]
    filtered_list.append(filtered_df)

if filtered_list:
    result_df = pd.concat(filtered_list, ignore_index=True)
    result_df.to_csv(output_file, index=False)
else:
    print("not found")