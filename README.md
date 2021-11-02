Geocode addresses using Google Geocoding API

1. download /clone repository
2. from terminal app, navigate into repository folder
3. run `npm install` to install node packages
4. copy &rename CSV input table into './data/input/in_table.csv' (cell delimiter = ;, no text delimiter).
5. create `.env` file to store Google API user code (`API_KEY={user_api_code}`)
6. run `node . -p` or `node index.js -p` to run program
7. results are saved in CSV file: './data/output/out_table.csv' (cell delimiter = ;, no text delimiter). New columns are added ['api_formatted_address', 'api_lat', 'api_lng', 'place_id'].
