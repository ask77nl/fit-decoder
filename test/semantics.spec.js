const semantics = require('../src/semantics');

describe('/src/semantics', () => {
  describe('parseRecord', () => {
    it('should parse a record using predefined set of constants', () => {
      const record = {
        globalMessageNumber: 0,
        fields: [
          { recordNumber: 1, baseType: 132, data: 1 },
          { recordNumber: 5, baseType: 132, data: 65535 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record);
      expect(parsedRecord).to.deep.equal({
        type: 'file_id',
        data: {
          manufacturer: 'garmin',
          number: 65535,
        },
      });
    });
    it('should parse a record with developer fields', () => {
      const record = {
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 253, baseType: 134, data: 864059850 },
          { recordNumber: 3, baseType: 2, data: 80 },
        ],
        devFields: [
          { developer_data_index: 0, field_definition_number: 6, size: 1, data: [82]},
        ],
      };
      const developers = {
        0: {
          6: {
            field_name: 'Heart Rate',
            units: 'bpm',
            fit_base_unit_id: 65535,
            native_mesg_num: 20,
            developer_data_index: 0,
            field_definition_number: 6,
            fit_base_type_id: 2,
            scale: 255,
            offset: 127,
            native_field_num: 3,
          },
        },
      };
      const parsedRecord = semantics.parseRecord(record, false, developers);
      expect(parsedRecord).to.deep.equal({
        type: 'record',
        data: {
          'Heart Rate': 82,
          heart_rate: 80,
          timestamp: new Date('2017-05-18T16:37:30.000Z'),
        },
      });
    });
    it('should return null if the message is unknown and skipUnknown is true', () => {
      const record = {
        globalMessageNumber: 216,
        fields: [
          { recordNumber: 1, baseType: 132, data: 1 },
          { recordNumber: 5, baseType: 132, data: 65535 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record, true);
      expect(parsedRecord).to.equal(null);
    });
    it('should return skip unknown record types', () => {
      const record = {
        globalMessageNumber: 0,
        fields: [
          { recordNumber: 1, baseType: 132, data: 1 },
          { recordNumber: 5, baseType: 132, data: 65535 },
          { recordNumber: 100, baseType: 132, data: 65535 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record, true);
      expect(parsedRecord).to.deep.equal({
        type: 'file_id',
        data: {
          manufacturer: 'garmin',
          number: 65535,
        },
      });
    });
    it('should return skip known record types with unknown values', () => {
      const record = {
        globalMessageNumber: 0,
        fields: [
          { recordNumber: 1, baseType: 132, data: 800 },
          { recordNumber: 5, baseType: 132, data: 65535 },
          { recordNumber: 5, baseType: 132, data: 65535 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record, true);
      expect(parsedRecord).to.deep.equal({
        type: 'file_id',
        data: {
          number: 65535,
        },
      });
    });
    it('should parse coordinates into degrees', () => {
      const record = {
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 0, baseType: 133, data: 506315433 },
          { recordNumber: 1, baseType: 133, data: -628855987 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record);
      expect(parsedRecord).to.deep.equal({
        type: 'record',
        data: {
          position_lat: 42.438852,
          position_long: -52.710084,
        },
      });
    });
    it('should parse a Garmin datestamp into a Date value', () => {
      const record = {
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 253, baseType: 134, data: 961672796 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record);
      expect(parsedRecord).to.deep.equal({
        type: 'record',
        data: {
          'timestamp': new Date('2020-06-21T11:19:56.000Z'),
        },
      });
    });
    it('should convert distance to meters', () => {
      const record = {
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 5, baseType: 134, data: 18 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record);
      expect(parsedRecord).to.deep.equal({
        type: 'record',
        data: {
          'distance': 0.18,
        },
      });
    });
    it('should convert speed to meters', () => {
      const record = {
        globalMessageNumber: 20,
        fields: [
          { recordNumber: 6, baseType: 132, data: 172 },
        ],
      };
      const parsedRecord = semantics.parseRecord(record);
      expect(parsedRecord).to.deep.equal({
        type: 'record',
        data: {
          'speed': 0.172,
        },
      });
    });
  });

  describe('parseRecords', () => {
    it('should parse all records of the site', () => {
      const record = {
        globalMessageNumber: 0,
        fields: [
          { recordNumber: 1, baseType: 132, data: 1 },
          { recordNumber: 5, baseType: 132, data: 65535 },
        ],
      };
      const json = {
        records: [record, record],
      };
      const parsedJson = semantics.parseRecords(json);
      expect(parsedJson).to.deep.equal({
        records: [{
          type: 'file_id',
          data: {
            manufacturer: 'garmin',
            number: 65535,
          },
        },
        {
          type: 'file_id',
          data: {
            manufacturer: 'garmin',
            number: 65535,
          },
        }],
      });
    });
    it('should build developers property with dev fields data', () => {
      const json = {
        littleEndian: true,
        records: [
          {
            globalMessageNumber: 207,
            fields: [
              {
                recordNumber: 3,
                baseType: 2,
                data: 0,
              }],
          },
          {
            globalMessageNumber: 206,
            fields: [
              {
                recordNumber: 0,
                baseType: 2,
                data: 0,
              },
              {
                recordNumber: 3,
                baseType: 7,
                data: 'Heart Rate',
              },
              {
                recordNumber: 1,
                baseType: 2,
                data: 6,
              },
              {
                recordNumber: 2,
                baseType: 2,
                data: 2,
              },
            ],
          },
        ],
      };
      const parsedJson = semantics.parseRecords(json);
      expect(parsedJson.developers).to.deep.equal({
        littleEndian: true,
        0: {
          6: {
            developer_data_index: 0,
            field_name: 'Heart Rate',
            field_definition_number: 6,
            fit_base_type_id: 2,
          },
        },
      });
    });
  });

});
