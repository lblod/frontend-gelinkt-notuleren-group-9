import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class SubmissionModel extends Model {
  @attr uri;
  @attr('datetime') date;

  @belongsTo('organization', { inverse: 'submissions', async: true }) applicant;
  @belongsTo('case', { inverse: 'submissions', async: true }) case;
  @belongsTo('bestuurseenheid') administrativeUnit;
  @belongsTo('editor-document') editorDocument;
}
