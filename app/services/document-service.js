import Service, { service } from '@ember/service';
import { analyse } from '@lblod/marawa/rdfa-context-scanner';
import { task } from 'ember-concurrency';

export default class DocumentService extends Service {
  @service store;

  extractTriplesFromDocument(editorDocument) {
    const node = document.createElement('body');
    const context = JSON.parse(editorDocument.context);
    const prefixes = this.convertPrefixesToString(context.prefix);
    node.setAttribute('vocab', context.vocab);
    node.setAttribute('prefix', prefixes);
    node.innerHTML = editorDocument.content;
    const contexts = analyse(node).map((c) => c.context);
    const triples = this.cleanupTriples(contexts.flat());
    return triples;
  }
  getDescription(editorDocument) {
    const triples = this.extractTriplesFromDocument(editorDocument);
    const decisionUris = triples.filter(
      (t) =>
        t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        t.object === 'http://data.vlaanderen.be/ns/besluit#Besluit',
    );
    const firstDecision = decisionUris[0];
    if (!firstDecision) return '';
    const descriptionOfFirstDecision = triples.filter(
      (t) =>
        t.predicate === 'http://data.europa.eu/eli/ontology#description' &&
        t.subject === firstDecision.subject,
    )[0].object;
    return descriptionOfFirstDecision;
  }
  cleanupTriples(triples) {
    const cleantriples = {};
    for (const triple of triples) {
      const hash = JSON.stringify(triple);
      cleantriples[hash] = triple;
    }
    return Object.keys(cleantriples).map((k) => cleantriples[k]);
  }
  convertPrefixesToString(prefix) {
    let prefixesString = '';
    for (let prefixKey in prefix) {
      prefixesString += `${prefixKey}: ${prefix[prefixKey]} `;
    }
    return prefixesString;
  }
  getDecisions(editorDocument) {
    const triples = this.extractTriplesFromDocument(editorDocument);
    const decisionUris = triples.filter(
      (t) =>
        t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
        t.object === 'http://data.vlaanderen.be/ns/besluit#Besluit',
    );
    const decisions = decisionUris.map((decisionUriTriple) => {
      const uri = decisionUriTriple.subject;
      const title = triples.filter(
        (t) =>
          t.predicate === 'http://data.europa.eu/eli/ontology#title' &&
          t.subject === uri,
      )[0].object;
      return {
        uri,
        title,
      };
    });
    return decisions;
  }

  getDocumentparts(editorDocument) {
    const triples = this.extractTriplesFromDocument(editorDocument);
    const documentpartUris = triples
      .filter(
        (t) =>
          t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
          t.object ===
            'https://data.vlaanderen.be/doc/applicatieprofiel/besluit-publicatie#Documentonderdeel',
      )
      .map((triple) => triple.subject);
    return documentpartUris;
  }

  extractSubmissions(editorDocument) {
    const triples = this.extractTriplesFromDocument(editorDocument);
    const decisionUris = triples
      .filter(
        (triple) =>
          (triple.predicate ===
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
            triple.predicate === 'a') &&
          triple.object === 'http://data.vlaanderen.be/ns/besluit#Besluit',
      )
      .map((triple) => triple.subject);
    const submissionUris = triples
      .filter((triple) => {
        return (
          decisionUris.includes(triple.subject) &&
          triple.predicate ===
            'https://data.vlaanderen.be/ns/omgevingsvergunning#voorwerp'
        );
      })
      .map((triple) => triple.object);
    return submissionUris;
  }

  createEditorDocument = task(
    async (title, content, documentContainer, previousDocument) => {
      if (!title || !documentContainer) {
        throw 'title and documentContainer are required';
      } else {
        const creationDate = new Date();
        const editorDocument = this.store.createRecord('editor-document', {
          createdOn: creationDate,
          updatedOn: creationDate,
          content: content ?? '',
          title: title.trim(),
        });
        if (previousDocument) {
          editorDocument.previousVersion = previousDocument;
        }
        editorDocument.documentContainer = documentContainer;
        editorDocument.parts = await this.retrieveDocumentParts(editorDocument);
        await editorDocument.save();
        if (previousDocument) {
          const previousSubmissions =
            await this.retrieveSubmissions(previousDocument);
          await Promise.all(
            previousSubmissions.map(async (submission) => {
              submission.documentContainer = null;
              await submission.save();
            }),
          );
        }
        const submissions = await this.retrieveSubmissions(editorDocument);

        await Promise.all(
          submissions.map(async (submission) => {
            submission.documentContainer = documentContainer;
            await submission.save();
          }),
        );
        documentContainer.currentVersion = editorDocument;
        await documentContainer.save();
        return editorDocument;
      }
    },
  );

  async retrieveDocumentParts(document) {
    return Promise.all(
      this.getDocumentparts(document).map(async (uri) => {
        const part = (
          await this.store.query('document-container', {
            'filter[:uri:]': uri,
            include: 'is-part-of',
          })
        ).firstObject;
        return part;
      }),
    );
  }

  async retrieveSubmissions(editorDocument) {
    return Promise.all(
      this.extractSubmissions(editorDocument).map(async (submissionUri) => {
        const submission = (
          await this.store.query('submission', {
            'filter[:uri:]': submissionUri,
            include: 'document-container',
          })
        ).firstObject;
        return submission;
      }),
    );
  }

  fetchRevisions = task(
    async (documentContainerId, revisionsToSkip, pageSize, pageNumber) => {
      const revisions = await this.store.query('editor-document', {
        'filter[document-container][id]': documentContainerId,
        include: 'status',
        sort: '-updated-on',
        'page[size]': pageSize,
        'page[number]': pageNumber,
      });
      const revisionsWithoutCurrentVersion = revisions.filter(
        (revision) => !revisionsToSkip.includes(revision.id),
      );
      return revisionsWithoutCurrentVersion;
    },
  );
}
