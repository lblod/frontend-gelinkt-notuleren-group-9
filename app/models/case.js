import Model, { belongsTo, hasMany, attr } from '@ember-data/model';

export default class CaseModel extends Model {
  @attr uri;

  @belongsTo('event', { inverse: 'cases', async: true }) event;
  @hasMany('submission', { inverse: 'case', async: true }) submissions;
}
