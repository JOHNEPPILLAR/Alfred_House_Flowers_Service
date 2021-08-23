/**
 * Import external libraries
 */
import Service from 'alfred-base';
import DebugModule from 'debug';
import { createRequire } from 'module';

/**
 * Import internal libraries
 */
import sensors from '../api/sensors/sensors.mjs';
import schedules from '../schedules/controller.mjs';

const debug = new DebugModule('HousePlant:Server');

// Setup service options
const require = createRequire(import.meta.url); // construct the require method
const nodePackageConfig = require('../../package.json');

const options = {
  serviceName: nodePackageConfig.description,
  namespace: nodePackageConfig.name,
  serviceVersion: nodePackageConfig.version,
};

// Bind api functions to base class
Object.assign(Service.prototype, sensors);

// Bind schedule functions to base class
Object.assign(Service.prototype, schedules);

// Create base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.restifyServer.get('/sensors/:sensorAddress', (req, res, next) =>
    service._sensors(req, res, next),
  );
  debug(`Added get '/sensors/:sensorAddress' api`);

  service.restifyServer.get('/sensors/current', (req, res, next) =>
    service._current(req, res, next),
  );
  debug(`Added get '/sensors/current' api`);

  service.restifyServer.get('/zones/:zone', (req, res, next) =>
    service._zones(req, res, next),
  );
  debug(`Added get '/zones/:zone' api`);

  service.restifyServer.get('/sensors/zone/:zone', (req, res, next) =>
    service._sensorsZone(req, res, next),
  );
  debug(`Added get '/sensors/zone/:zone' api`);

  service.restifyServer.get('/needswater', (req, res, next) =>
    service._needsWater(req, res, next),
  );
  debug(`Added get '/needsWater' api`);

  debug('Set up schedules');
  await service._setupSchedules();

  // Listen for api requests
  service.listen();
}
setupServer();
