const utils = require('../src/utils');

describe('/src/utils', () => {
  describe('getTimeLimits', () => {
    it('should return min and max timestamp of a file based on a session record', () => {
      const json = {
        records: [{
          type: 'session',
          data: {
            start_time: new Date('2020-06-21T11:19:56.000Z'),
            total_elapsed_time: 1990756,
          },
        }],
      };
      expect(utils.getTimeLimits(json)).to.deep.equal({
        minTimestamp: new Date('2020-06-21T11:19:56.000Z'),
        maxTimestamp: new Date('2020-06-21T11:53:06.756Z'),
      });
    });
    it('should return zeros min and max timestamp if there is no session record', () => {
      const json = {
        records: [{}],
      };
      expect(utils.getTimeLimits(json)).to.deep.equal({
        minTimestamp: 0,
        maxTimestamp: 0,
      });
    });
  });

  describe('getRecordFieldValue', () => {
    it('should return an array with values for a field or a record', () => {
      const json = {
        records: [
          { type: 'record', data: { heart_rate: 60 }},
          { type: 'record', data: { heart_rate: 61 }},
          { type: 'record', data: { heart_rate: 62 }},
        ],
      };
      expect(utils.getRecordFieldValue(json, 'record', 'heart_rate')).to.deep.equal([60, 61, 62]);
    });
  });

  describe('getValueOverTime', () => {
    it('should return an array with strings with tuples (timestamp, value) for any field or any record', () => {
      const json = {
        records: [
          { type: 'record', data: { timestamp: new Date('2020-06-21T11:19:56.000Z'), heart_rate: 60 }},
          { type: 'record', data: { timestamp: new Date('2020-06-21T11:19:57.000Z'), heart_rate: 61 }},
          { type: 'record', data: { timestamp: new Date('2020-06-21T11:19:58.000Z'), heart_rate: 62 }},
        ],
      };
      expect(utils.getValueOverTime(json, 'record', 'heart_rate')).to.deep.equal([
        `${new Date('2020-06-21T11:19:56.000Z')},60`,
        `${new Date('2020-06-21T11:19:57.000Z')},61`,
        `${new Date('2020-06-21T11:19:58.000Z')},62`,
      ]);
    });
  });

});
