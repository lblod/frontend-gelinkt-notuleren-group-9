import { service } from '@ember/service';
import Controller from '@ember/controller';
import { trackedFunction } from 'ember-resources/util/function';

export default class InboxVerenigingsloketController extends Controller {
  @service store;
  newSubmissionCount = trackedFunction(this, async () => {
    return this.store.count('submission', {
      filter: {
        ':has-no:document-container': true,
      },
    });
  });
}
