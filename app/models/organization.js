import Model, { attr, hasMany } from '@ember-data/model';

export default class OrganizationModel extends Model {
  @attr('string') uri;
  @attr('string') name;

  @hasMany('user', { inverse: 'organization', async: true }) users;
}
