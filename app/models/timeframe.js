import Model, { attr, belongsTo } from '@ember-data/model';

export default class TimeframeModel extends Model {
  @attr uri;
  @attr('datetime') start;
  @attr('datetime') end;

  @belongsTo('event', { inverse: 'timeframes', async: true }) event;
}
