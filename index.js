import { docx2dast, dast2mdast } from '@adobe/helix-docx2md';
import getHast from '@adobe/helix-html-pipeline/src/utils/mdast-to-hast.js';
import splitSections from '@adobe/helix-html-pipeline/src/steps/split-sections.js';
import getMetadata from '@adobe/helix-html-pipeline/src/steps/get-metadata.js';
import unwrapSoleImages from '@adobe/helix-html-pipeline/src/steps/unwrap-sole-images.js';
import html from '@adobe/helix-html-pipeline/src/steps/make-html.js';
import rewriteUrls from '@adobe/helix-html-pipeline/src/steps/rewrite-urls.js';
import rewriteIcons from '@adobe/helix-html-pipeline/src/steps/rewrite-icons.js';
import fixSections from '@adobe/helix-html-pipeline/src/steps/fix-sections.js';
import createPageBlocks from '@adobe/helix-html-pipeline/src/steps/create-page-blocks.js';
import createPictures from '@adobe/helix-html-pipeline/src/steps/create-pictures.js';
import addHeadingIds from '@adobe/helix-html-pipeline/src/steps/add-heading-ids.js';
import render from '@adobe/helix-html-pipeline/src/steps/render.js';
import removeHlxProps from '@adobe/helix-html-pipeline/src/steps/removeHlxProps.js';

import { readFileSync, writeFileSync, watchFile } from 'node:fs';
import { toHtml } from 'hast-util-to-html';
import GithubSlugger from 'github-slugger'

function setDummyMetadata(state) {
  state.content = {
    ...state.content,
    meta: {
      title: '',
      description: '',
      url:'',
      image: '',
      imageAlt: '',
      modified_time: '',
      section: '',
      published_time: '',
      modified_time: '',
      'twitter:card': {},
    }
  }
}

async function docx2mdast(doc, opts) {
  const dast = await docx2dast(doc, {});
  const mdast = await dast2mdast(dast, opts); 
  const state = { 
    content: {
      mdast,
      slugger: new GithubSlugger(),
    },
    info: {
      selector: 'notplain'
    },
    helixConfig: {
      head: {
        data: {
          html:`
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <script src="../helpx-internal/scripts/fallback.js" nomodule></script>
            <script src="../helpx-internal/scripts/scripts.js" type="module"></script>
            <style>body { display: none; }</style>
            <link rel="icon" href="data:,">
          ` 
        }
      }
    }
  };
  const req = {};
  const res = { document: {} };
  await splitSections(state);
  await getMetadata(state);
  await unwrapSoleImages(state);
  await html(state);
  await rewriteUrls(state);
  await rewriteIcons(state);
  await fixSections(state);
  await createPageBlocks(state);
  await createPictures(state);
  // skipping extractMetadata
  setDummyMetadata(state);
  await addHeadingIds(state)
  await render(state, req, res);
  await removeHlxProps(state, req, res);
  return res.document;
}

const doTheThing = () => {
  const file = readFileSync('../cci-cct-etf-guidelines.docx');
  docx2mdast(file, {}).then(r => {
    const final = toHtml(r, { upperDoctype: true})
    writeFileSync('../out.html', final);
  });
}

doTheThing();

watchFile('../cci-cct-etf-guidelines.docx',() => {
  console.log('Change Detected');
  doTheThing();
});
