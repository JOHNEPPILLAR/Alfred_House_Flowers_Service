/**
 * Import external libraries
 */
import DebugModule from 'debug';

const debug = new DebugModule('HousePlant:Schedules');

async function _needsWatering() {
  debug(`Checking water levels`);

  try {
    const results = await this._needsWater.call(this, null, null, null);
    if (results instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${results.message}`);
      return;
    }

    if (results.length === 0) {
      this.logger.info('House plants do not need watering');
    } else {
      for (const data of results) {
        debug(`${data.plant} in ${data.location} needs 💦`);
        this._sendPushNotification.call(
          this,
          `${data.location}: ${data.plant} needs 💦`,
        );
      }
    }
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

/**
 * Set up garden watering
 */
async function _setupSchedules() {
  try {
    // Clear current schedules array
    debug(`Clear current schedules`);
    this.schedules = [];

    // Morning water check
    this.schedules.push({
      hour: 8,
      minute: 0,
      description: 'Daily watering check',
      functionToCall: _needsWatering,
    });

    // Activate schedules
    await this.activateSchedules();
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

export default {
  _setupSchedules,
};
