# fit-decoder

Javascript library for parsing ANT/Garmin `.FIT` files desinged to help developers to deal with complexities of FIT binary format. It's a small zero-dependency unopinionated library. 
Supports Node.js and browser environments.

The [Flexible and Interoperable Data Transfer (FIT)](https://developer.garmin.com/fit/protocol/) protocol is a format designed specifically for the storing and sharing of data that originates from sport, fitness and health devices. It is specifically designed to be compact, interoperable and extensible. 

## Install

```
$ npm install -s fit-decoder 
```

## Usage

```javascript
// Require the module
const fitDecoder = require('fit-decoder');

// fit2json expects binary represetnation in FIT format as ArrayBuffer
// You can get it by reading a file in Node:

const fs = require('fs').promises;
const file = await fs.readFile('activity.fit');
const buffer = file.buffer;

// Or, by fetching it from S3 in the browser
const awsRequest = await s3.getObject({ Bucket: 'fit', Key: 'activity.fit' }).promise();
const buffer = awsRequest.Body.buffer;


// fit2json converts binary FIT into a raw JSON representation. No record names, types or values 
// are parsed. It is useful for low level data analysis
const jsonRaw = fitDecoder.fit2json(buffer);

// parseRecords converts raw JSON format into readable format using current 
// Global FIT Profile (SDK 21.47.00)
// It also performs simple conversions for some data formats like time, distance, coordinates.
const json = fitDecoder.parseRecords(jsonRaw);


// The library also includes a couple of utils for simple data recovery.

// getRecordFieldValue returns the timerange, covered by a fit file
const { minTimestamp, maxTimestamp } = fitUtils.getTimeLimits(json);

// getRecordFieldValue returns an array of values of one field of one record type
const powerArray = fitDecoder.getRecordFieldValue(json, 'record', 'power');

//getValueOverTime returns values for one field of one record type over time
const powerOverTime = fitDecoder.getValueOverTime(json, 'record', 'power');
```

## Documentation
### fit2json(ArrayBuffer)

fit2json designed to simpliy convert binary FIT data representation into more easy-to-deal JSON format. 
It doesn't do any opinionated parsing. Data stored as is, record and field names are left in numeric 
format. No data is removed. Illegal fields are left as is. Developer data field names are not updated.

This is an example of a record after the conversion:

```
{
  recordHeader: {
      headerType: 1,
      messageType: 2,
      localMessageType: 0,
  },
  globalMessageNumber: 0,
  fields: [
      { recordNumber: 3, baseType: 140, data: 3958807899 },
      { recordNumber: 4, baseType: 134, data: 961672796 },
      { recordNumber: 7, baseType: 134, data: 4294967295 },
      { recordNumber: 1, baseType: 132, data: 1 },
      { recordNumber: 2, baseType: 132, data: 2833 },
      { recordNumber: 5, baseType: 132, data: 65535 },
      { recordNumber: 0, baseType: 0, data: 4 },
  ],
}
```


###parseRecords(json, options)
FIT format uses FIT Profiles to convey the meaning of data. This libaray can parse the FIT data 
using current Global FIT Profile. The Global FIT Profile is maintained by Garmin Canada Inc
and it's distributed as an XLSX file in [FIT SDK](https://www.thisisant.com/developer/resources/downloads/)

`parseRecords` converts raw JSON representation result from fit2json and creates readable records like this:

```
{
  "type": "record",
  "data": {
      "87": 0,
      "timestamp": "2020-06-21T11:47:51.000Z",
      "distance": 1451.93,
      "speed": 2.538,
      "cadence": 29,
      "fractional_cadence": 0
  },
},
```

It performs some data format conversions:

- Garmin timestamps are converted to Javascript Dates
- Coordinates are converted from semicircles to degrees
- Distance is converted to meters
- Speed is converted to meters/sec

 `options` allows to customize parsing. Currently supported options:
 - `skipUnknown` skips all records and fiels, not found in Global FIT profile. False by default.

 

## License

MIT license; see [LICENSE](./LICENSE).
