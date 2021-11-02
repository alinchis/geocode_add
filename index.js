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


// ////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////
// load csv file
function readCSV(filePath, colDelimiter = ',', strDelimiter = '') {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    const newArray = fs.readFileSync(filePath, 'utf8').split('\n');
    return newArray.filter(line => line).map(line => {
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


// ////////////////////////////////////////////////////////////////////////////
// // MAIN function
async function main() {

  // help text
  const helpText = `\n Available commands:\n\n\
  1. -h : display help text\n\
  2. -p : call Google Geocode API for given list:\n\
          './data/input/in_table.csv' (cell delimiter = ;, no text delimiter).\n`;

  // get command line arguments
  const arguments = process.argv;
  console.log('\x1b[34m%s\x1b[0m', '\n@START: CLI arguments >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  console.table(arguments);
  console.log('\n');

  // get third command line argument
  // if argument is missing, -h is set by default
  const mainArg = process.argv[2] || '-h';
  // const secondaryArg = process.argv[3] || '';


  // run requested command
  // 1. if argument is 'h' or 'help' print available commands
  if (mainArg === '-h') {
    console.log(helpText);

  // 2. else if argument is 'e'
  } else if (mainArg === '-p') {
    // read input file
    const inArray = readCSV(inPath, ';');
    // console.log(inArray);
    // test api key
    // console.log(`Google API key = ${process.env.API_KEY}`);

    // start output write array
    const headerArr = [...inArray[0], 'api_formatted_address', 'api_lat', 'api_lng', 'place_id'];
    // console.log(headerArr);
    fs.writeFileSync(outPath, `${headerArr.join(';')}\n`);

    // start downloads log file
    const logHeaderArr = ['index', 'id', 'status_code']; // 200="OK"
    fs.writeFileSync(logPath, `${logHeaderArr.join(';')}\n`);

    // prepare downloads array
    // const downArray = [];

    // for each item in array get data from google api
    for (let i = 1; i < inArray.length; i += 1) {
      try {
        // build request url
        const getUrl = `${apiPath}/json?address=${inArray[i][1]},+CA&key=${process.env.API_KEY}`;
        // send request
        const response = await axios(getUrl);

        // save log
        const logLineArr = [i, inArray[i][0], response.status];
        fs.appendFileSync(logPath, `${logLineArr.join(';')}\n`);
        // print status
        console.log(`${i} / ${inArray.length}:: ${response.status == 200 ? "OK" : "ERROR"}`);

        // prepare write row
        const newRow = inArray[i];
        // if request is successful
        if (response.status = 'OK' && response.data.results && response.data.results.length > 0) {
          newRow.push(response.data.results[0].formatted_address);
          newRow.push(response.data.results[0].geometry.location.lat);
          newRow.push(response.data.results[0].geometry.location.lng);
          newRow.push(response.data.results[0].place_id);
        }

        // write response to file
        fs.appendFileSync(outPath, `${newRow.join(';')}\n`);

      } catch (e) {
        console.log(e);
      }

    }

    // else print help
  } else {
    console.log(helpText);
  }

}


// ////////////////////////////////////////////////////////////////////////////
// // MAIN
main();
