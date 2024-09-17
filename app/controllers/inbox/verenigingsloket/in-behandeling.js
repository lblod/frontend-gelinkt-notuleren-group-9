import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { trackedFunction } from 'ember-resources/util/function';
import { service } from '@ember/service';
import { restartableTask, timeout } from 'ember-concurrency';
import {
  DRAFT_STATUS_ID,
  PLANNED_STATUS_ID,
} from 'frontend-gelinkt-notuleren/utils/constants';
const SEARCH_DEBOUNCE_MS = 300;

export default class VerenigingsloketInBehandelingController extends Controller {
  @service store;

  queryParams = ['filter', 'page', 'pageSize', 'sort'];
  @tracked filter;
  @tracked page = 0;
  @tracked pageSize = 10;
  @tracked sort = '-date';

  data = trackedFunction(this, async () => {
    return this.store.query('submission', {
      filter: {
        ':has-no:editor-document': false,
        'editor-document': {
          'document-container': {
            status: {
              ':id:': [DRAFT_STATUS_ID, PLANNED_STATUS_ID].join(','),
            },
          },
        },
        ...(this.filter && {
          case: {
            event: {
              description: this.filter,
            },
          },
        }),
      },
      sort: this.sort,
      page: {
        number: this.page,
        size: this.pageSize,
      },
      include: ['applicant', 'case', 'case.event', 'editor-document'].join(','),
    });
  });

  updateFilter = restartableTask(async (event) => {
    const value = event.target.value;
    await timeout(SEARCH_DEBOUNCE_MS);
    this.filter = value;
  });
}
