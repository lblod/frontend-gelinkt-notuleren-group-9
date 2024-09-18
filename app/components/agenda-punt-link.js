import Component from '@glimmer/component';
import { trackedFunction } from 'ember-resources/util/function';
import {
  DRAFT_STATUS_ID,
  PUBLISHED_STATUS_ID,
  PLANNED_STATUS_ID,
} from 'frontend-gelinkt-notuleren/utils/constants';
export default class AgendaPuntLinkComponent extends Component {
  editorStatus = trackedFunction(this, async () => {
    const status = await this.args.documentContainer.get('status');
    if (status.id == DRAFT_STATUS_ID) {
      return 'draft';
    } else if (status.id == PLANNED_STATUS_ID) {
      return 'planned';
    } else if (status.id == PUBLISHED_STATUS_ID) {
      return 'published';
    } else {
      return 'unknown';
    }
  });
}
