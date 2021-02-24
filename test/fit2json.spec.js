const fit2json = require('../src/fit2json');
const constants = require('../src/constants');

describe('/src/fit2json', () => {
  describe('parseRecordHeader', () => {
    it('should correctly parse definition header', () => {
      expect(fit2json.parseRecordHeader(0b01000011)).to.deep.equal({
        headerType: constants.HEADER_TYPE.NORMAL,
        messageType: constants.MESSAGE_TYPE.DEFINITION,
        localMessageType: 3,
      });
    });
    it('should correctly parse normal data header', () => {
      expect(fit2json.parseRecordHeader(0b00000011)).to.deep.equal({
        headerType: constants.HEADER_TYPE.NORMAL,
        messageType: constants.MESSAGE_TYPE.DATA,
        localMessageType: 3,
      });
    });
    it('should correctly parse normal data header with dev data', () => {
      expect(fit2json.parseRecordHeader(0b00100011)).to.deep.equal({
        headerType: constants.HEADER_TYPE.NORMAL,
        messageType: constants.MESSAGE_TYPE.DATA,
        localMessageType: 3,
        developerData: true,
      });
    });
    it('should correctly parse compressed data header', () => {
      expect(fit2json.parseRecordHeader(0b10110010)).to.deep.equal({
        headerType: constants.HEADER_TYPE.COMPRESSED,
        messageType: constants.MESSAGE_TYPE.DATA,
        localMessageType: 1,
        timestampOffset: 18,
      });
    });
  });

  describe('readDataField', () => {
    it('should read a enum base type (0x00)', () => {
      const fit = new DataView(new Uint8Array([7,8]).buffer);
      const result = fit2json.readDataField(0x00, fit, 0, 1);
      expect(result).to.equal(7);
    });
    it('should read a sint8 base type (0x01)', () => {
      const fit = new DataView(new Uint8Array([7,8]).buffer);
      const result = fit2json.readDataField(0x01, fit, 0, 1);
      expect(result).to.equal(7);
    });
    it('should read a sint8 base type (0x01) with negative value', () => {
      const fit = new DataView(new Uint8Array([-7,8]).buffer);
      const result = fit2json.readDataField(0x01, fit, 0, 1);
      expect(result).to.equal(-7);
    });
    it('should read a uint8 base type (0x02)', () => {
      const fit = new DataView(new Uint8Array([7,8]).buffer);
      const result = fit2json.readDataField(0x01, fit, 0, 1);
      expect(result).to.equal(7);
    });
    it('should read a uint8z base type (0x0A)', () => {
      const fit = new DataView(new Uint8Array([7,8]).buffer);
      const result = fit2json.readDataField(0x0A, fit, 0, 1);
      expect(result).to.equal(7);
    });
    it('should read a sint16 base type (0x83) in little endian notation', () => {
      const fit = new DataView(new Uint16Array([-7,0]).buffer);
      const result = fit2json.readDataField(0x83, fit, 0, 2, true);
      expect(result).to.equal(-7);
    });
    it('should read a sint16 base type (0x83) in big endian notation', () => {
      const fit = new DataView(new Uint16Array([-7,0]).buffer);
      const result = fit2json.readDataField(0x83, fit, 0, 2, false);
      expect(result).to.equal(-1537);
    });
    it('should read a uint16 base type (0x84) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([7,0]).buffer);
      const result = fit2json.readDataField(0x84, fit, 0, 2, true);
      expect(result).to.equal(7);
    });
    it('should read a uint16z base type (0x8B) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([7,0]).buffer);
      const result = fit2json.readDataField(0x8B, fit, 0, 2, true);
      expect(result).to.equal(7);
    });
    it('should read a uint16 base type (0x84) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([7,0]).buffer);
      const result = fit2json.readDataField(0x84, fit, 0, 2, false);
      expect(result).to.equal(1792);
    });
    it('should read a sint32 base type (0x85) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x85, fit, 0, 4, true);
      expect(result).to.equal(-16711423);
    });
    it('should read a sint32 base type (0x85) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x86, fit, 0, 4, false);
      expect(result).to.equal(16843263);
    });
    it('should read a uint32 base type (0x86) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x86, fit, 0, 4, true);
      expect(result).to.equal(4278255873);
    });
    it('should read a uint32 base type (0x86) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x86, fit, 0, 4, false);
      expect(result).to.equal(16843263);
    });
    it('should read a uint32z base type (0x86) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x8C, fit, 0, 4, false);
      expect(result).to.equal(16843263);
    });
    it('should read a string base type (0x07) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([115,116,114,105,110,103]).buffer);
      const result = fit2json.readDataField(0x07, fit, 0, 6, false);
      expect(result).to.equal('string');
    });
    it('should read a byte base type (0x0D) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([115,116,114,105,110,103]).buffer);
      const result = fit2json.readDataField(0x0D, fit, 0, 6, false);
      expect(result).to.deep.equal([115,116,114,105,110,103]);
    });
    it('should read a sint64 base type (0x8E) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x8E, fit, 0, 8, true);
      expect(result).to.equal(-71775015237779199n);
    });
    it('should read a sint64 base type (0x8E) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x8E, fit, 0, 8, false);
      expect(result).to.equal(72340172838076927n);
    });
    it('should read a float32 base type (0x88)', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1]).buffer);
      const result = fit2json.readDataField(0x88, fit, 0, 8, false);
      expect(result).to.equal(2.3694278276172396e-38);
    });
    it('should read a uint64 base type (0x8F) in little endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x8F, fit, 0, 8, true);
      expect(result).to.equal(18374969058471772417n);
    });
    it('should read a uint64 base type (0x8F) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x8F, fit, 0, 8, false);
      expect(result).to.equal(72340172838076927n);
    });
    it('should read a uint64z base type (0x90) in big endian notation', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x90, fit, 0, 8, false);
      expect(result).to.equal(72340172838076927n);
    });
    it('should read a float64 base type (0x89)', () => {
      const fit = new DataView(new Uint8Array([1,1,1,1,1,1,1,-1]).buffer);
      const result = fit2json.readDataField(0x89, fit, 0, 8, false);
      expect(result).to.equal(7.748604185489759e-304);
    });
  });
  describe('calculateCrc', () => {
    it('should calculate crc of a binary dataview ranges', () => {
      const fit = new DataView(new Uint8Array([1,2,3,4,5,6,7,8,9,0]).buffer);
      const result = fit2json.calculateCrc(fit, 3, 7);
      expect(result).to.equal(21331);
      const fullResult = fit2json.calculateCrc(fit, 0, 10);
      expect(fullResult).to.equal(49987);
    });
  });
  describe('parseHeader', () => {
    it('should parse a 14-byte FIT header', () => {
      const fit = new DataView(new Uint8Array([0x0E, 0x10, 0x32, 0x08, 0x1C, 0x30, 0x00,
        0x00, 0x2E, 0x46, 0x49, 0x54, 0x94, 0x2A]).buffer);
      const json = {};
      const pointer = fit2json.parseHeader(fit, json, 0);
      expect(pointer).to.equal(14);
      expect(json).to.deep.equal({
        header: {
          headerSize: 14,
          protocolVersion: 16,
          profileVersion: 12808,
          dataSize: 472907776,
          dataSignature: '\u0000',
          headerCrc: 10900,
        },
      });
    });
    it('should throw an exception of header crc doesnt match', () => {
      const fit = new DataView(new Uint8Array([0x0E, 0x10, 0x32, 0x08, 0x1C, 0x30, 0x00,
        0x00, 0x2E, 0x46, 0x49, 0x54, 0x94, 0x2B]).buffer);
      const json = {};
      expect(() => fit2json.parseHeader(fit, json, 0))
        .to.throw(/Header CRC mismatch/);

    });
    it('should parse a 12-byte FIT header', () => {
      const fit = new DataView(new Uint8Array([0x0C, 0x10, 0x32, 0x08, 0x1C, 0x30, 0x00,
        0x00, 0x2E, 0x46, 0x49, 0x54]).buffer);
      const json = {};
      const pointer = fit2json.parseHeader(fit, json, 0);
      expect(pointer).to.equal(12);
      expect(json).to.deep.equal({
        header: {
          headerSize: 12,
          protocolVersion: 16,
          profileVersion: 12808,
          dataSize: 472907776,
          dataSignature: '\u0000',
        },
      });
    });
  });
  describe('parseRecord', () => {
    it('should parse and save a definition record', () => {
      const fit = new DataView(new Uint8Array([0x40, 0x00, 0x00, 0x00, 0x00, 0x07, 0x03, 0x04, 0x8C,
        0x04, 0x04, 0x86, 0x07, 0x04, 0x86, 0x01, 0x02, 0x84,
        0x02, 0x02, 0x84, 0x05, 0x02, 0x84, 0x00, 0x01, 0x00]).buffer);
      const json = {
        localMessageDefinitions: {},
      };
      const pointer = fit2json.parseRecord(fit, json, 0);
      expect(pointer).to.equal(27);
      expect(json.localMessageDefinitions).to.deep.equal({
        0: {
          recordHeader: {
            headerType: constants.HEADER_TYPE.NORMAL,
            messageType: constants.MESSAGE_TYPE.DEFINITION,
            localMessageType: 0,
          },
          architecture: 'LE',
          globalMessageNumber: 0,
          fieldsNumber: 7,
          fieldDefinitions: [
            { recordNumber: 3, size: 4, baseType: 140 },
            { recordNumber: 4, size: 4, baseType: 134 },
            { recordNumber: 7, size: 4, baseType: 134 },
            { recordNumber: 1, size: 2, baseType: 132 },
            { recordNumber: 2, size: 2, baseType: 132 },
            { recordNumber: 5, size: 2, baseType: 132 },
            { recordNumber: 0, size: 1, baseType: 0 },
          ],
        },
      });
    });
    it('should parse and save a definition record with dev fields', () => {
      const fit = new DataView(new Uint8Array([0x6F, 0x00, 0x00, 0x14, 0x00, 0x08,
        0xFD, 0x04, 0x86, 0x05, 0x04, 0x86, 0x02, 0x02,
        0x84, 0x57, 0x02, 0x84, 0x58, 0x02, 0x84, 0x03,
        0x01, 0x02, 0x04, 0x01, 0x02, 0x35, 0x01, 0x02,
        0x05, 0x00, 0x04, 0x00, 0x03, 0x04, 0x00, 0x06,
        0x01, 0x00, 0x09, 0x01, 0x00, 0x0C, 0x02, 0x00]).buffer);
      const json = {
        localMessageDefinitions: {},
      };
      const pointer = fit2json.parseRecord(fit, json, 0);
      expect(pointer).to.equal(46);
      expect(json.localMessageDefinitions).to.deep.equal({
        15: {
          recordHeader: {
            developerData: true,
            headerType: constants.HEADER_TYPE.NORMAL,
            messageType: constants.MESSAGE_TYPE.DEFINITION,
            localMessageType: 15,
          },
          architecture: 'LE',
          globalMessageNumber: 20,
          fieldsNumber: 8,
          fieldDefinitions: [
            { recordNumber: 253, size: 4, baseType: 134 },
            { recordNumber: 5, size: 4, baseType: 134 },
            { recordNumber: 2, size: 2, baseType: 132 },
            { recordNumber: 87, size: 2, baseType: 132 },
            { recordNumber: 88, size: 2, baseType: 132 },
            { recordNumber: 3, size: 1, baseType: 2 },
            { recordNumber: 4, size: 1, baseType: 2 },
            { recordNumber: 53, size: 1, baseType: 2 },
          ],
          devFieldsNumber: 5,
          devFieldDefinitions: [
            { developer_data_index: 0, field_definition_number: 0, size: 4 },
            { developer_data_index: 0, field_definition_number: 3, size: 4 },
            { developer_data_index: 0, field_definition_number: 6, size: 1 },
            { developer_data_index: 0, field_definition_number: 9, size: 1 },
            { developer_data_index: 0, field_definition_number: 12, size: 2 },
          ],
        },
      });
    });

    it('should parse and save a data record', () => {
      const fit = new DataView(new Uint8Array([0x00, 0x5B, 0x9D, 0xF6, 0xEB, 0x5C, 0xF6,
        0x51, 0x39, 0xFF, 0xFF, 0xFF, 0xFF, 0x01, 0x00, 0x11, 0x0B, 0xFF, 0xFF, 0x04, 0x41, 0x00, 0x00,
        0x31, 0x00, 0x03, 0x02, 0x14, 0x07, 0x00, 0x02, 0x84, 0x01, 0x01, 0x02, 0x01, 0x00]).buffer);
      const json = {
        littleEndian: true,
        localMessageDefinitions: {
          0: {
            recordHeader: {
              headerType: constants.HEADER_TYPE.NORMAL,
              messageType: constants.MESSAGE_TYPE.DEFINITION,
              localMessageType: 0,
            },
            architecture: 'LE',
            globalMessageNumber: 0,
            fieldsNumber: 7,
            fieldDefinitions: [
              { recordNumber: 3, size: 4, baseType: 140 },
              { recordNumber: 4, size: 4, baseType: 134 },
              { recordNumber: 7, size: 4, baseType: 134 },
              { recordNumber: 1, size: 2, baseType: 132 },
              { recordNumber: 2, size: 2, baseType: 132 },
              { recordNumber: 5, size: 2, baseType: 132 },
              { recordNumber: 0, size: 1, baseType: 0 },
            ],
          },
        },
        records: [],
      };
      const pointer = fit2json.parseRecord(fit, json, 0);
      expect(pointer).to.equal(20);
      expect(json.records[0]).to.deep.equal({
        recordHeader: {
          headerType: constants.HEADER_TYPE.NORMAL,
          messageType: constants.MESSAGE_TYPE.DATA,
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
      });
    });

    it('should parse and save a data record with dev fields', () => {
      const fit = new DataView(new Uint8Array([0x0F, 0xCA, 0x81, 0x80, 0x33, 0x00,
        0x00, 0x00, 0x00, 0x96, 0x09, 0x00, 0x00, 0x2C, 0x01, 0x50,
        0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x52, 0x00, 0x00, 0x00]).buffer);
      const json = {
        littleEndian: true,
        localMessageDefinitions: {
          15: {
            recordHeader: {
              developerData: true,
              headerType: constants.HEADER_TYPE.NORMAL,
              messageType: constants.MESSAGE_TYPE.DEFINITION,
              localMessageType: 15,
            },
            architecture: 'LE',
            globalMessageNumber: 20,
            fieldsNumber: 8,
            fieldDefinitions: [
              { recordNumber: 253, size: 4, baseType: 134 },
              { recordNumber: 5, size: 4, baseType: 134 },
              { recordNumber: 2, size: 2, baseType: 132 },
              { recordNumber: 87, size: 2, baseType: 132 },
              { recordNumber: 88, size: 2, baseType: 132 },
              { recordNumber: 3, size: 1, baseType: 2 },
              { recordNumber: 4, size: 1, baseType: 2 },
              { recordNumber: 53, size: 1, baseType: 2 },
            ],
            devFieldsNumber: 5,
            devFieldDefinitions: [
              { developer_data_index: 0, field_definition_number: 0, size: 4 },
              { developer_data_index: 0, field_definition_number: 3, size: 4 },
              { developer_data_index: 0, field_definition_number: 6, size: 1 },
              { developer_data_index: 0, field_definition_number: 9, size: 1 },
              { developer_data_index: 0, field_definition_number: 12, size: 2 },
            ],
          },
        },
        records: [],
      };
      const pointer = fit2json.parseRecord(fit, json, 0);
      expect(pointer).to.equal(30);
      expect(json.records[0]).to.deep.equal({
        recordHeader: {
          headerType: constants.HEADER_TYPE.NORMAL,
          messageType: constants.MESSAGE_TYPE.DATA,
          localMessageType: 15,
        },
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 253, baseType: 134, data: 864059850 },
          { recordNumber: 5, baseType: 134, data: 0 },
          { recordNumber: 2, baseType: 132, data: 2454 },
          { recordNumber: 87, baseType: 132, data: 0 },
          { recordNumber: 88, baseType: 132, data: 300 },
          { recordNumber: 3, baseType: 2, data: 80 },
          { recordNumber: 4, baseType: 2, data: 0 },
          { recordNumber: 53, baseType: 2, data: 0 },
        ],
        devFields: [
          { developer_data_index: 0, field_definition_number: 0, size: 4, data: [1,0,0,0]},
          { developer_data_index: 0, field_definition_number: 3, size: 4, data: [0,0,0,0]},
          { developer_data_index: 0, field_definition_number: 6, size: 1, data: [82]},
          { developer_data_index: 0, field_definition_number: 9, size: 1, data: [0]},
          { developer_data_index: 0, field_definition_number: 12, size: 2, data: [0,0]},
        ],
      });
    });
  });
});
