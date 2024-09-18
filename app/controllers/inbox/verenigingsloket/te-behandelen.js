import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { trackedFunction } from 'ember-resources/util/function';
import { service } from '@ember/service';
import { restartableTask, timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import { v4 as uuidv4 } from 'uuid';
import { DRAFT_STATUS_ID } from '../../../utils/constants';
import { EDITOR_FOLDERS } from 'frontend-gelinkt-notuleren/config/constants';
import limitContent from '../../../helpers/limit-content';
import { detailedDate } from '../../../utils/detailed-date';
const SEARCH_DEBOUNCE_MS = 300;

export default class VerenigingsloketTeBehandelenController extends Controller {
  @service store;
  @service currentSession;
  @service documentService;
  @service router;

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
      include: [
        'applicant',
        'case',
        'case.event',
        'case.event.timeframes',
      ].join(','),
    });
  });

  updateFilter = restartableTask(async (event) => {
    const value = event.target.value;
    await timeout(SEARCH_DEBOUNCE_MS);
    this.filter = value;
  });

  timeTillEvent = async (submission) => {
    const t = await submission.case.get('event').get('timeframes');
    if (t.slice().length > 0) {
      const start = t.slice()[0].start;
      const today = new Date();
      const difference = start.getTime() - today.getTime();
      let days = Math.round(difference / (1000 * 3600 * 24));
      if (days === 1) {
        return `${days} dag`;
      } else {
        return `${days} dagen`;
      }
    } else {
      return '';
    }
  };

  @action
  async createAgendapoint(submission) {
    const besluitUri = `http://data.lblod.info/id/besluiten/${uuidv4()}`;
    const caseResource = await submission.case;
    const event = await caseResource.event;
    const timeframe = (await event.timeframes).firstObject;
    const applicant = await submission.applicant;
    const locations = await event.locations;
    const locationsHTML = /* html */ `
      <ul>
        ${locations.map((location) => `<li>${location.name}</li>`).join('\n')}
      </ul>
    `;
    const besluitTitle = `
      Afweging evenement: Inname van het openbaar domein - ${limitContent(event.description, 80)} - Goedkeuring
    `.trim();
    const document = /* html */ `
      <div
        about="${besluitUri}"
        typeof="http://data.vlaanderen.be/ns/besluit#Besluit http://mu.semte.ch/vocabularies/ext/BesluitNieuweStijl https://data.vlaanderen.be/id/concept/BesluitType/e96ec8af-6480-4b32-876a-fefe5f0a3793"
      >
        <div data-rdfa-container="true">
          <span
            about="${besluitUri}"
            property="https://data.vlaanderen.be/ns/omgevingsvergunning#voorwerp"
            resource="${submission.uri}"
          >
          </span>
        </div>
        <div data-content-container="true">
          <p>Openbare titel besluit:</p>
          <h4
            property="http://data.europa.eu/eli/ontology#title"
            datatype="http://www.w3.org/2001/XMLSchema#string"
            lang=""
          >${besluitTitle}</h4>
          <p>Korte openbare beschrijving:</p>
          <div
            property="http://data.europa.eu/eli/ontology#description"
            datatype="http://www.w3.org/2001/XMLSchema#string"
            lang=""
          >
            <p>Aan het college van burgemeester en schepenen wordt gevraagd: het gebruik van:</p>
            ${locationsHTML}
            <p>Voor de organisatie van ${event.description}.</p>
            <p>Van ${dateHtml(timeframe.start)} tot ${dateHtml(timeframe.end)}</p>
            <p>Door ${applicant?.name}</p>
          </div>
          <p><br></p>
          <div
            property="http://data.vlaanderen.be/ns/besluit#motivering"
            lang="nl"
          >
          </div>
          <h5>Beslissing</h5>
          <div
            property="http://www.w3.org/ns/prov#value"
            datatype="http://www.w3.org/2001/XMLSchema#string"
          >
          </div>
        </div>
      </div>
    `;
    const container = this.store.createRecord('document-container');
    container.status = await this.store.findRecord('concept', DRAFT_STATUS_ID);
    container.folder = await this.store.findRecord(
      'editor-document-folder',
      EDITOR_FOLDERS.DECISION_DRAFTS,
    );
    container.publisher = this.currentSession.group;
    const editorDocument =
      await this.documentService.createEditorDocument.perform(
        besluitTitle,
        document,
        container,
      );
    container.currentVersion = editorDocument;
    await container.save();
    this.router.transitionTo('agendapoints.edit', container.id);
  }
}

function dateHtml(date) {
  return `<span datatype="xsd:dateTime" content="${date.toISOString()}">${detailedDate(date)}</span>`;
}
