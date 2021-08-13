/**
 * Import external libraries
 */
import DebugModule from 'debug';

const debug = new DebugModule('HousePlant:API_Sensors');

/**
 * @type get
 * @path /sensors/:sensorAddress
 */
async function _sensors(req, res, next) {
  debug(`Display sensor data API called`);

  let dbConnection;
  let aggregate;
  let timeBucket;

  const { sensorAddress } = req.params;
  let { duration } = req.params;

  if (
    typeof sensorAddress === 'undefined' ||
    sensorAddress === null ||
    sensorAddress === ''
  ) {
    const err = new Error('Missing param: sensorAddress');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  if (typeof duration === 'undefined' || duration === null || duration === '')
    duration = 'hour';

  try {
    switch (duration.toLowerCase()) {
      case 'year':
        timeBucket = moment().utc().subtract(1, 'year').toDate();
        aggregate = [
          {
            $addFields: {
              Month: { $month: '$time' },
            },
          },
          {
            $match: {
              time: { $gt: timeBucket },
              device: sensorAddress,
            },
          },
          {
            $group: {
              _id: '$Month',
              time: { $last: '$time' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              plant: { $last: '$plant' },
              zone: { $last: '$zone' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              lux: { $avg: '$lux' },
              moisture: { $avg: '$moisture' },
              fertility: { $avg: '$fertility' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'month':
        timeBucket = moment().utc().subtract(1, 'month').toDate();
        aggregate = [
          {
            $addFields: {
              Day: { $dayOfMonth: '$time' },
            },
          },
          {
            $match: {
              time: { $gt: timeBucket },
              device: sensorAddress,
            },
          },
          {
            $group: {
              _id: '$Day',
              time: { $last: '$time' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              plant: { $last: '$plant' },
              zone: { $last: '$zone' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              lux: { $avg: '$lux' },
              moisture: { $avg: '$moisture' },
              fertility: { $avg: '$fertility' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'week':
        timeBucket = moment().utc().subtract(1, 'week').toDate();
        aggregate = [
          {
            $addFields: {
              Day: { $dayOfMonth: '$time' },
              Hour: { $hour: '$time' },
            },
          },
          {
            $match: {
              time: { $gt: timeBucket },
              device: sensorAddress,
            },
          },
          {
            $group: {
              _id: { Day: '$Day', Hour: '$Hour' },
              time: { $last: '$time' },
              device: { $last: '$device' },
              location: { $last: '$location' },
              plant: { $last: '$plant' },
              zone: { $last: '$zone' },
              battery: { $avg: '$battery' },
              temperature: { $avg: '$temperature' },
              lux: { $avg: '$lux' },
              moisture: { $avg: '$moisture' },
              fertility: { $avg: '$fertility' },
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      case 'day':
        timeBucket = moment().utc().subtract(1, 'day').toDate();
        aggregate = [
          {
            $match: {
              time: { $gt: timeBucket },
              device: sensorAddress,
            },
          },
          { $sort: { _id: 1 } },
        ];
        break;
      default:
        // Hour
        timeBucket = moment().utc().subtract(1, 'hour').toDate();
        aggregate = [
          {
            $match: {
              time: { $gt: timeBucket },
              device: sensorAddress,
            },
          },
          { $sort: { time: 1 } },
        ];
        break;
    }

    debug(`Connect to db`);
    dbConnection = await this._connectToDB();

    debug(`Query DB`);
    const results = await dbConnection
      .db('alfred_flowercare_data_collector_service')
      .collection('alfred_flowercare_data_collector_service')
      .aggregate(aggregate)
      .toArray();

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

/**
 * @type get
 * @path /sensors/zones/:zone
 */
async function _zones(req, res, next) {
  debug(`Display sensors for a given zone API called`);

  let { zone } = req.params;
  if (typeof zone === 'undefined' || zone === null || zone === '') {
    const err = new Error('Missing param: zone');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null)
      this._sendResponse(res, next, 400, err);
    return err;
  }
  zone = zone.split`,`.map((x) => +x);

  let dbConnection;

  try {
    debug(`Connect to db`);
    dbConnection = await this._connectToDB();

    debug(`Query DB`);
    const query = { zone: { $in: zone } };
    const results = await dbConnection
      .db('alfred_flowercare_data_collector_service')
      .collection('devices')
      .find(query)
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, []);
      } else {
        return [];
      }
    }

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

/**
 * @type get
 * @path /sensors/zone/:zone
 */
async function _sensorsZone(req, res, next) {
  debug(`Display sensors for given zone(s) API called`);

  const { zone } = req.params;
  if (typeof zone === 'undefined' || zone === null || zone === '') {
    const err = new Error('Missing param: zone');
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 400, err);
    }
    return err;
  }

  debug(`Get zones`);
  try {
    let zoneData = await _zones.call(this, { params: req.params }, null, null);
    if (zoneData instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${zoneData.message}`);
      return zoneData;
    }

    debug(`Remove non active devices`);
    zoneData = zoneData.filter((d) => d.active);

    let returnData = [];
    debug(`Get readings for each device in the zone`);
    await Promise.all(
      zoneData.map(async (info) => {
        const tmpJSON = info;
        const tmpResult = await _sensors.call(
          this,
          {
            params: {
              sensorAddress: info.device,
              duration: req.params.duration,
            },
          },
          null,
          null,
        );
        if (tmpResult instanceof Error) {
          this.logger.error(`${this._traceStack()} - ${tmpResult.message}`);
        } else {
          tmpJSON.readings = tmpResult;
        }
        returnData.push(tmpJSON);
      }),
    );

    debug(`Sort by plant name`);
    returnData = returnData.sort((a, b) => (a.plant < b.plant ? -1 : 1));

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, returnData);
    }
    return returnData;
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  }
  return true;
}

/**
 * @type get
 * @path /sensors/current
 */
async function _current(req, res, next) {
  debug(`Display latest sensor data API called`);

  let dbConnection;

  try {
    debug(`Connect to db`);
    dbConnection = await this._connectToDB();

    debug(`Query DB`);
    const lastHour = moment().utc().subtract(1, 'hour').toDate();
    const results = await dbConnection
      .db('alfred_flowercare_data_collector_service')
      .collection('alfred_flowercare_data_collector_service')
      .aggregate([
        { $match: { time: { $gt: lastHour } } },
        {
          $group: {
            _id: '$device',
            time: { $last: '$time' },
            device: { $last: '$device' },
            location: { $last: '$location' },
            plant: { $last: '$plant' },
            zone: { $last: '$zone' },
            battery: { $last: '$battery' },
            temperature: { $last: '$temperature' },
            lux: { $last: '$lux' },
            moisture: { $last: '$moisture' },
            fertility: { $last: '$fertility' },
          },
        },
      ])
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, []);
      } else {
        return [];
      }
    }

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

/**
 * @type get
 * @path /needswater
 */
async function _needsWater(req, res, next) {
  debug(`Needs watering API called`);

  let dbConnection;

  try {
    debug(`Connect to db`);
    dbConnection = await this._connectToDB();

    debug(`Query DB`);
    const lastHour = moment().utc().subtract(1, 'hour').toDate();
    const results = await dbConnection
      .db('alfred_flowercare_data_collector_service')
      .collection('alfred_flowercare_data_collector_service')
      .aggregate([
        {
          $match: {
            time: { $gt: lastHour },
            $expr: { $lt: ['$moisture', '$thresholdMoisture'] },
          },
        },
        {
          $group: {
            _id: '$device',
            time: { $last: '$time' },
            device: { $last: '$device' },
            location: { $last: '$location' },
            plant: { $last: '$plant' },
            zone: { $last: '$zone' },
            battery: { $last: '$battery' },
            temperature: { $last: '$temperature' },
            lux: { $last: '$lux' },
            moisture: { $last: '$moisture' },
            fertility: { $last: '$fertility' },
            thresholdMoisture: { $last: '$thresholdMoisture' },
          },
        },
      ])
      .toArray();

    if (results.count === 0) {
      // Exit function as no data to process
      if (typeof res !== 'undefined' && res !== null) {
        this._sendResponse(res, next, 200, []);
      } else {
        return [];
      }
    }

    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 200, results);
    } else {
      return results;
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
    if (typeof res !== 'undefined' && res !== null) {
      this._sendResponse(res, next, 500, err);
    }
  } finally {
    try {
      debug(`Close DB connection`);
      await dbConnection.close();
    } catch (err) {
      debug('Not able to close DB');
    }
  }
  return true;
}

export default {
  _sensors,
  _zones,
  _sensorsZone,
  _current,
  _needsWater,
};
