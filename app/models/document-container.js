import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class DocumentContainerModel extends Model {
  @attr identifier;
  @hasMany('editor-document', { inverse: 'documentContainer' }) revisions;
  @belongsTo('editor-document', { inverse: null }) currentVersion;
  @belongsTo('concept', { inverse: null }) status;
  @belongsTo('editor-document-folder', { inverse: null }) folder;
  @belongsTo('bestuurseenheid', { inverse: null }) publisher;
  @belongsTo('concept', { inverse: null }) type;

  @hasMany('versioned-agenda') versionedAgendas;
  @hasMany('versioned-notulen') versionedNotulen;
  @hasMany('versioned-besluiten-lijst') versionedBesluitenLijsten;
  @hasMany('versioned-behandelingen') versionedBehandelingen;
  @hasMany('attachment', { inverse: 'documentContainer' }) attachments;
}
