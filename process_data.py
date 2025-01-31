import pandas as pd

file_path = "data1.csv"
data = pd.read_csv(file_path)

country_column = "ReportCountry"

target_total = 1000000

country_counts = data[country_column].value_counts()

sampled_data = pd.DataFrame(columns=data.columns)

for country, count in country_counts.items():
    if count < 100:
        sampled_data = pd.concat([sampled_data, data[data[country_column] == country]])
    else:
        proportion = count / len(data)
        target_count = int(proportion * target_total)

        target_count = max(100, min(target_count, 900))
        sampled_data = pd.concat(
            [sampled_data, data[data[country_column] == country].sample(n=target_count, random_state=42)]
        )

sampled_data = sampled_data.sort_values(by=country_column)

output_path = "data2.csv"
sampled_data.to_csv(output_path, index=False, float_format='%.15g')

print(f"Processed file saved as: {output_path}")
