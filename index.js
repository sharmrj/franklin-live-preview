import { docx2md } from '@adobe/helix-docx2md';
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
import extractMetadata from '@adobe/helix-html-pipeline/src/steps/extract-metadata.js';
import stringify from '@adobe/helix-html-pipeline/src/steps/stringify-response.js';
import parseMarkdown from '@adobe/helix-html-pipeline/src/steps/parse-markdown.js';

import { readFileSync, writeFileSync, watchFile } from 'node:fs';
import { toHtml } from 'hast-util-to-html';
import GithubSlugger from 'github-slugger';
import { execSync } from 'child_process';

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

async function docx2html(doc, opts) {
  console.info('Converting Docx to html');
  const md = await docx2md(doc, {});
  const state = { 
    content: {
      data: md,
      slugger: new GithubSlugger(),
    },
    info: {
      selector: 'notplain',
      path: '',
    },
    metadata: {
      getModifiers: (...args) => ({}),
    },
    mappedMetadata: {
      getModifiers: (...args) => ({}),
    },
    log: {
      warn: (...args) => console.warn(args)
    },
    config: {
      host: 'localhost'
    },
    helixConfig: {
      head: {
        data: {
          html:`
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <script src="/scripts/fallback.js" nomodule></script>
            <script src="/scripts/scripts.js" type="module"></script>
            <style>body { display: none; }</style>
            <link rel="icon" href="data:,">
          ` 
        }
      }
    }
  };
  const req = { url: {pathname: ''}};
  const res = { document: {} };
  await parseMarkdown(state);
  await splitSections(state);
  await getMetadata(state);
  await unwrapSoleImages(state);
  await html(state);
  await rewriteUrls(state);
  await rewriteIcons(state);
  await fixSections(state);
  await createPageBlocks(state);
  await createPictures(state);
  setDummyMetadata(state);
  await extractMetadata(state, req);
  await addHeadingIds(state)
  await render(state, req, res);
  await removeHlxProps(state, req, res);
  await stringify(state, req, res);
  console.info('done');
  return res.body;
}

const [docx] = process.argv.slice(2);

const doTheThing = () => {
  const file = readFileSync(docx);
  docx2html(file, {}).then(r => {
    writeFileSync('helpx-internal/out.html', r);
  });
}

execSync('rm -rf helpx-internal');
execSync('git clone https://github.com/adobecom/helpx-internal.git', {
  stdio: [0, 1, 2], // we need this so node will print the command output
  cwd: '.', // path to where you want to save the file
})

doTheThing();

watchFile(docx ,() => {
  console.log('Change Detected');
  doTheThing();
});
