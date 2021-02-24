const constants = require('./constants');

/**
 * Parses one record of a FIT file
 * Modifieds json by adding new item to the `records` array for data records
 * Modifies json by adding new property to `localMessageDefinitions` object for definition records
 * @param {DataView} fit Binary fit file content
 * @param {Object} json Current JSON representation of the fit file (mutated)
 * @param {Number} pointer Pointer to the current byte being parsed
 * @returns {Number} Pointer to the next byte of the fit file
 */
function parseRecord (fit, json, pointer) {
  json.lineNumber++;
  const record = {};
  let recordPointer;
  record.recordHeader = parseRecordHeader(fit.getUint8(pointer));
  if (record.recordHeader.messageType === constants.MESSAGE_TYPE.DEFINITION) {
    record.architecture = fit.getUint8(pointer + 2) === 0 ? 'LE' : 'BE';
    json.littleEndian = record.architecture === 'LE';
    record.globalMessageNumber = fit.getUint16(pointer + 3, json.littleEndian);
    record.fieldsNumber = fit.getUint8(pointer + 5);
    record.fieldDefinitions = [];
    for (let i = 0; i < record.fieldsNumber; i++ ) {
      const fieldDefinition = {
        recordNumber: fit.getUint8(pointer + (i * 3) + 6),
        size: fit.getUint8(pointer + (i * 3) + 7),
        baseType: fit.getUint8(pointer + (i * 3) + 8),
      };
      record.fieldDefinitions[i] = fieldDefinition;
    }
    json.localMessageDefinitions[record.recordHeader.localMessageType] = record;
    recordPointer = pointer + 6 + record.fieldsNumber * 3; //pointer moved to next record, unless there is developer data data

    if (record.recordHeader.developerData) {
      record.devFieldsNumber = fit.getUint8(recordPointer);
      record.devFieldDefinitions = [];
      for (let i = 0; i < record.devFieldsNumber; i++ ) {
        const fieldDefinition = {
          field_definition_number: fit.getUint8(recordPointer + (i * 3) + 1),
          size: fit.getUint8(recordPointer + (i * 3) + 2),
          developer_data_index: fit.getUint8(recordPointer + (i * 3) + 3),
        };
        record.devFieldDefinitions[i] = fieldDefinition;
      }
      recordPointer = recordPointer + 1 + record.devFieldsNumber * 3; //pointer also skipped developer fields
    }
  } else { // DATA record type
    const recordTemplate = json.localMessageDefinitions[record.recordHeader.localMessageType];
    if (!recordTemplate) {
      console.log('error finding local message type ', record.recordHeader.localMessageType, ' for a data message');
      console.log('this is strange, the whole record header is ', record.recordHeader);
      throw new Error(`Cannot find local Message type ${record.recordHeader.localMessageType} for record ${json.lineNumber} at pointer ${pointer}`);
    }
    record.globalMessageNumber = recordTemplate.globalMessageNumber;
    recordPointer = pointer + 1;
    record.fields = [];
    for (let i = 0; i < recordTemplate.fieldsNumber; i++ ) {
      const data = readDataField(recordTemplate.fieldDefinitions[i].baseType, fit, recordPointer,
        recordTemplate.fieldDefinitions[i].size, json.littleEndian);
      record.fields.push({
        recordNumber: recordTemplate.fieldDefinitions[i].recordNumber,
        baseType: recordTemplate.fieldDefinitions[i].baseType,
        data,
      });
      if (recordTemplate.fieldDefinitions[i].recordNumber === 253) {  // 253 is timestamp everywhere
        json.latestTimestamp = data;
      }
      recordPointer += recordTemplate.fieldDefinitions[i].size;
    }
    if (recordTemplate.recordHeader.developerData) {
      record.devFields = [];
      for (let i = 0; i < recordTemplate.devFieldsNumber; i++ ) {
        record.devFields.push({
          field_definition_number: recordTemplate.devFieldDefinitions[i].field_definition_number,
          size: recordTemplate.devFieldDefinitions[i].size,
          developer_data_index: recordTemplate.devFieldDefinitions[i].developer_data_index,
          data: readDataField(0x0D, fit, recordPointer,
            recordTemplate.devFieldDefinitions[i].size, json.littleEndian),
        });
        recordPointer += recordTemplate.devFieldDefinitions[i].size;
      }
    }

    if (recordTemplate.recordHeader.headerType === constants.HEADER_TYPE.COMPRESSED) {
      let realTimestamp = json.latestTimestamp & 0xFFFFFFE0 + record.recordHeader.timestampOffset;
      if (record.recordHeader.timestampOffset < json.latestTimestamp & 0x0000001F) {
        realTimestamp += 0x20;
      }
      record.fields.push({
        recordNumber: 253, // 253 is timestamp everywhere
        baseType: 134,
        data: realTimestamp,
      });
    }
    json.records.push(record);
  }
  return recordPointer;
}

/**
 * Parses and returns a record header
 * @param {Number} recordHeader - 1-byte record header
 * @returns {Object} JSON representation of a record header
 */

function parseRecordHeader (recordHeader) {
  const result = {};
  if ((recordHeader & 0b10000000) === 0) {
    // Normal Header
    result.headerType = constants.HEADER_TYPE.NORMAL;
    if ((recordHeader & 0b1000000) > 0 ) {
      result.messageType = constants.MESSAGE_TYPE.DEFINITION;
    } else {
      result.messageType = constants.MESSAGE_TYPE.DATA;
    }
    if ((recordHeader & 0b100000) > 0) {
      result.developerData = true;
    }
    result.localMessageType = recordHeader & 0b1111;
  } else {
    //compressed timestamp header
    result.headerType = constants.HEADER_TYPE.COMPRESSED;
    result.messageType = constants.MESSAGE_TYPE.DATA;
    result.localMessageType = (recordHeader & 0b1100000) >> 5;
    result.timestampOffset = recordHeader & 0b11111;
  }
  return result;
}

/**
 * Reads and returns the content of one data field from fit file
 * @param {Number} baseType - type of FIT data field
 * @param {DataView} fit Binary fit file content
 * @param {Number} pointer Pointer to the data field
 * @param {Number} size Data field size
 * @param {Boolean} littleEndian Byte order for multi-byte data fields
 * @returns {Object} Data in different formats.
 */

function readDataField (baseType, fit, pointer, size, littleEndian) {
  let result;
  switch (baseType) {
    case 0x00: return fit.getUint8(pointer);
    case 0x01: return fit.getInt8(pointer);
    case 0x02: return fit.getUint8(pointer);
    case 0x83: return fit.getInt16(pointer, littleEndian);
    case 0x84: return fit.getUint16(pointer, littleEndian);
    case 0x85: return fit.getInt32(pointer, littleEndian);
    case 0x86: return fit.getUint32(pointer, littleEndian);
    case 0x0A: return fit.getUint8(pointer);
    case 0x8B: return fit.getUint16(pointer, littleEndian);
    case 0x8C: return fit.getUint32(pointer, littleEndian);
    case 0x88: return fit.getFloat32(pointer, littleEndian);
    case 0x89: return fit.getFloat64(pointer, littleEndian);
    case 0x0D:
      result = [];
      for (let i = 0; i < size; i++) {
        result.push(fit.getUint8(pointer + i));
      }
      return result;
    case 0x8E: return fit.getBigInt64(pointer, littleEndian);
    case 0x8F: return fit.getBigUint64(pointer, littleEndian);
    case 0x90: return fit.getBigUint64(pointer, littleEndian);
    case 0x07:
      result = [];
      for (let i = 0; i < size; i++) {
        const char = fit.getUint8(pointer + i);
        if (char) {
          result.push(fit.getUint8(pointer + i));
        }
      }
      return String.fromCharCode(...result);
  }
}

/**
 * Calculates CRC of a fit file range.
 * Algorithm is taken from FIT Format documentation
 * @param {DataView} fit Binary fit file content
 * @param {Number} startPointer - first byte of the range
 * @param {Number} endPointer - first byte behind the range
 * @returns {Number} CRC of of all bytes of the fit file in a range.
 */

function calculateCrc (fit, startPointer, endPointer) {
  const crcTable = [
    0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
    0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
  ];

  let crc = 0;
  for (let i = startPointer; i < endPointer; i++) {
    const byte = fit.getUint8(i);
    let tmp = crcTable[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ crcTable[byte & 0xF];
    tmp = crcTable[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xF];
  }
  return crc;
}

/**
 * Parses Fit file header starting from pointer.
 * Modifieds json by adding `header` object to it
 * @param {DataView} fit Binary fit file content
 * @param {Object} json Current JSON representation of the fit file (mutated)
 * @param {Number} pointer Pointer to the current byte being parsed
 * @returns {Number} Pointer to the next byte of the fit file
 */

function parseHeader (fit, json, pointer) {
  const header = {};
  header.headerSize = fit.getUint8(pointer);
  header.protocolVersion = fit.getUint8(pointer + 1);
  header.profileVersion = fit.getUint16(pointer + 2, json.littleEndian);
  header.dataSize = fit.getUint32(pointer + 4, json.littleEndian);
  header.dataSignature = String.fromCharCode(fit.buffer.slice(pointer + 8, pointer + 12));

  if (header.headerSize === 14) {
    header.headerCrc = fit.getUint16(pointer + 12, true);
    if (header.headerCrc) {
      const headerCrc = calculateCrc(fit, pointer, pointer + 12);
      if (header.headerCrc !== headerCrc) {
        throw new Error(`Header CRC mismatch. Expecting ${header.headerCrc}, calculated ${headerCrc}`);
      }
    }
  }
  json.header = header;
  return pointer += header.headerSize;
}

/**
 * Converts binary data in FIT format to a simple JSON
 * No record or fields parsing is performed. Everything is left in numeric format.
 * @param {ArrayBuffer} fitBuffer - Binary fit file content
 * @returns {Object} JSON representation of the fit file
 */

function fit2json (fitBuffer) {
  const fit = new DataView(fitBuffer);
  const json = {
    records: [],
    littleEndian: true,
    localMessageDefinitions: {},
    latestTimestamp: null,
    lineNumber: 1,
  };

  let pointer = 0;
  let startOfDataRecords = 0;
  let endOfDataRecords = 0;

  while (pointer < fit.byteLength - 2) {
    pointer = parseHeader(fit, json, pointer);
    startOfDataRecords = pointer;
    endOfDataRecords = startOfDataRecords + json.header.dataSize;
    if (endOfDataRecords > fit.byteLength - 2) {
      endOfDataRecords = fit.byteLength - 2;
    }
    while (pointer < endOfDataRecords) {
      pointer = parseRecord(fit, json, pointer);
    }
    json.crc = fit.getUint16(pointer, true);
    let dataRecordsCrc;
    if (!json.header.headerCrc) {
      dataRecordsCrc = calculateCrc(fit, 0 , endOfDataRecords);
    } else {
      dataRecordsCrc = calculateCrc(fit, startOfDataRecords , endOfDataRecords);
    }
    if (json.crc !== dataRecordsCrc) {
      throw new Error(`Data Records CRC mismatch. Expecting ${json.crc}, calculated ${dataRecordsCrc}`);
    }
    pointer += 2;
  }

  delete json.localMessageDefinitions;
  delete json.lineNumber;

  return json;
}

module.exports = {
  fit2json,
  parseRecord,
  parseRecordHeader,
  readDataField,
  calculateCrc,
  parseHeader,
};
