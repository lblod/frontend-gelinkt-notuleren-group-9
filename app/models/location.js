import Model, { attr, belongsTo } from '@ember-data/model';

export default class LocationModel extends Model {
  @attr uri;
  @attr('string') name;

  @belongsTo('event', { inverse: 'locations', async: true }) event;
}
