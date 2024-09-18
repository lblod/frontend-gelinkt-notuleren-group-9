import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { trackedFunction } from 'ember-resources/util/function';
import { service } from '@ember/service';
import { restartableTask, timeout } from 'ember-concurrency';

const SEARCH_DEBOUNCE_MS = 300;

export default class VerenigingsloketTeBehandelenController extends Controller {
  @service store;

  queryParams = ['filter', 'page', 'pageSize', 'sort'];
  @tracked filter;
  @tracked page = 0;
  @tracked pageSize = 10;
  @tracked sort = '-date';

  data = trackedFunction(this, async () => {
    return this.store.query('submission', {
      filter: {
        ':has-no:document-container': true,
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
      include: ['applicant', 'case', 'case.event'].join(','),
    });
  });

  updateFilter = restartableTask(async (event) => {
    const value = event.target.value;
    await timeout(SEARCH_DEBOUNCE_MS);
    this.filter = value;
  });
}
