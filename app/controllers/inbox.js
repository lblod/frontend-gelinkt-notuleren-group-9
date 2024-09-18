import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { trackedFunction } from 'ember-resources/util/function';

export default class InboxController extends Controller {
  @service currentSession; //used in template
  @service session;
  @service store;
  @action
  logout() {
    this.session.invalidate();
  }

  newSubmissionCount = trackedFunction(this, async () => {
    return this.store.count('submission', {
      filter: {
        ':has-no:document-container': true,
      },
    });
  });
}
