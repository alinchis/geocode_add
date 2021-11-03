// extract address data from CSV file, for the indicated column

const fs = require('fs-extra');
const axios = require('axios');
require('dotenv').config();

// remote paths
const apiPath = 'https://maps.googleapis.com/maps/api/geocode';

// local paths
const inPath = './data/input/in_table.csv';
// const savePath = './data/output/out_table.json';
const outPath = './data/output/out_table.csv';
const logPath = './data/logs/download_log.csv';


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// load csv file
function readCSV(filePath, colDelimiter = ',', strDelimiter = '') {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    const newArray = fs.readFileSync(filePath, 'utf8').split('\n');
    return newArray.slice(1).filter(line => line).map(line => {
      if (strDelimiter !== '') {
        // if final column is missing, add empty value
        const newLine = line[line.length - 1] === colDelimiter ? `${line}""` : line;
        return newLine
            .split(`${strDelimiter}${colDelimiter}${strDelimiter}`)
            .map((item) => {
              let newItem = item.replace(/\s+/g, ' ');
              if (item[0] === strDelimiter) {
                newItem = newItem.slice(1);
              } else if (item[item.length - 1] === strDelimiter) {
                newItem = newItem.slice(0, -1);
              }
              // return new item
              return newItem;
            })
      } else {
        return line.split(colDelimiter);
      }
    });
  }
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: ${filePath} file NOT found!`);
  return [];
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// sleep function
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// geocode address
async function geocodeAdd(inArray, i, startIndex, item, index) {
  // console.log(`${i + index}\n`);
  try {
    // build request url
    const getUrl = `${apiPath}/json?address=${item[1]},+CA&key=${process.env.API_KEY}`;
    // send request
    const response = await axios(getUrl);

    // prepare write row
    const newRow = item;
    // if request is successful
    if (response.status == 200 && response.data.results && response.data.results.length > 0) {
      newRow.push(response.data.results[0].formatted_address);
      newRow.push(response.data.results[0].geometry.location.lat);
      newRow.push(response.data.results[0].geometry.location.lng);
      newRow.push(response.data.results[0].place_id);

      // write response to file
      fs.appendFileSync(outPath, `${newRow.join(';')}\n`);

      // save log
      const logLineArr = [i + index, item[0], "OK"];
      fs.appendFileSync(logPath, `${logLineArr.join(';')}\n`);
      // print status
      console.log(`${i + startIndex + index} / ${inArray.length - 1} : ${newRow[0]} :: "OK"`);

    } else {
      // save log
      const logLineArr = [i + index, item[0], "ERROR"];
      fs.appendFileSync(logPath, `${logLineArr.join(';')}\n`);
      // print status
      console.log(`${i + startIndex + index} / ${inArray.length - 1} : ${newRow[0]} :: "ERROR"`);
    }

  } catch (e) {
    console.log(e);
  }

  // sleep 1.5 sec
  await sleep(1500);
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// process list
async function downloadData(newDownloadFlag) {

  // read input file
  const inArray = readCSV(inPath, ';');

  // if it's a new download
  if(newDownloadFlag) {
    // init output file
    const headerArr = ['id', 'geoaddress', 'api_formatted_address', 'api_lat', 'api_lng', 'place_id'];
    // console.log(headerArr);
    fs.writeFileSync(outPath, `${headerArr.join(';')}\n`);

    // init log file
    const logHeaderArr = ['index', 'id', 'status_code']; // 200="OK"
    fs.writeFileSync(logPath, `${logHeaderArr.join(';')}\n`);

        // else, remove downloaded items from input array
  }

  // check log array for downloaded items
  const logArray = readCSV(logPath, ';');
  const downloadedItems = logArray.length > 0 ? logArray.filter(item => item[2] === "OK").map(item => item[1]) : [];
  console.log(`\tdownloaded: ${downloadedItems.length} items\n`);

  // prepare work array
  const workArray = inArray.filter(item => !downloadedItems.includes(item[0]));
  const totalItems = inArray.length - 1;
  const remainingItems = workArray.length - 1;
  console.log(`\n>>> ${remainingItems}/${totalItems} items for download:\n\n`);

  // for each item in array get data from google api
  const step = 30;
  const startIndex = downloadedItems.length;
  // console.log('startIndex: ', startIndex);
  for (let i = 0; i < workArray.length; i += step) {

    const batchArray = workArray.slice(i, i + step);
    // console.log(`\n${i}::`);
    // console.log(batchArray);

    for (const item of batchArray) {
      const index = batchArray.indexOf(item);
      // console.log(`\n\t> index: ${index}`)

      // geocode current address
      geocodeAdd(inArray, i, startIndex, item, index);

    }
  }
}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // MAIN function
async function main() {

  // help text
  const helpText = `\n Available commands:\n\n\
  1. -h : display help text\n\
  2. -d : call Google Geocode API for given list:\n\
          './data/input/in_table.csv' (cell delimiter = ;, no text delimiter).\n\
  3. -c : continue download, current log is parsed an downloaded items are skipped\n`;

  // get command line arguments
  const args = process.argv;
  console.log('\x1b[34m%s\x1b[0m', '\n@START: CLI arguments >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  console.table(args);
  console.log('\n');

  // get third command line argument
  // if argument is missing, -h is set by default
  const mainArg = process.argv[2] || '-h';
  // const secondaryArg = process.argv[3] || '';


  // run requested command
  // 1. if argument is 'h' or 'help' print available commands
  if (mainArg === '-h') {
    console.log(helpText);

  // 2. else if argument is 'd'
  } else if (mainArg === '-d') {
    console.log('\n>>> START NEW download...\n');

    // send requests for array
    downloadData(true);

    // 2. else if argument is 'c', continue previous download
  } else if (mainArg === '-c') {
    console.log('\n>>> CONTINUE download...\n');

    // send requests for array
    downloadData(false);

    // else print help
  } else {
    console.log(helpText);
  }

}


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // MAIN
main();
