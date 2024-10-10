import { basicSetup, EditorView } from "codemirror"
import { EditorState, Compartment } from "@codemirror/state"
import { keymap } from "@codemirror/view"
import { yaml } from "@codemirror/lang-yaml"
import { vim } from "@replit/codemirror-vim"
import { indentWithTab } from "@codemirror/commands"
import { gruvboxDark } from "./themes/gruvbox-dark.js";
import * as Y from 'yjs';
import * as random from 'lib0/random';
import { yCollab } from 'y-codemirror.next';
import { getOrCreateDocAndToken } from "@y-sweet/sdk";
import { createYjsProvider } from '@y-sweet/client';

const HTTP_CONNECTION_STRING = window.location.origin + "/y-sweet/";
const WS_CONNECTION_STRING = HTTP_CONNECTION_STRING.replace(/^https:\/\//, "wss://");

const USER_NAMES = [
  'Adventurous Antelope',
  'Brave Bison',
  'Clever Cheetah',
  'Dizzy Dolphin',
  'Excited Eagle',
  'Friendly Frog',
  'Grumpy Gorilla',
  'Happy Hippo',
  'Inquisitive Iguana',
  'Jumpy Jaguar',
  'Kind Koala',
  'Lazy Llama',
  'Mighty Moose',
  'Nimble Newt',
  'Optimistic Owl',
  'Playful Panda',
  'Quiet Quokka',
  'Rapid Rabbit',
  'Silly Squirrel',
  'Timid Tortoise',
  'Unstoppable Unicorn',
  'Vibrant Vulture',
  'Wild Wolf',
  'Zany Zebra'
];
const USER_NAME = USER_NAMES[random.uint32() % USER_NAMES.length];
const USER_COLORS = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' }
];
const USER_COLOR = USER_COLORS[random.uint32() % USER_COLORS.length];

const yDoc = new Y.Doc();
const ySrc = yDoc.getText('src');
const yUndoManager = new Y.UndoManager(ySrc);

let provider = null;
let init = null;

const vimMode = new Compartment;

function requireDidInit(fnName) {
  if (init === null) {
    throw new Error(`Expected init function to have been called and completed before calling ${fnName}.`);
  }
}

function requireDidNotInit(fnName) {
  if (init !== null) {
    throw new Error(`Cannot call init function ${fnName} after an init function has already been called.`);
  }
}

export async function initCollab(docId) {
  requireDidNotInit('initCollab');

  const clientToken = await getOrCreateDocAndToken(HTTP_CONNECTION_STRING, docId);
  clientToken.url = clientToken.url.replace(/^ws:\/\/.*?\//, WS_CONNECTION_STRING);
  provider = await createYjsProvider(yDoc, clientToken, { disableBc: true });

  provider.awareness.setLocalStateField('user', {
    name: USER_NAME,
    color: USER_COLOR.color,
    colorLight: USER_COLOR.light
  });

  await new Promise(resolve => {
    provider.on('synced', () => {
      resolve();
    });
  });

  init = { mode: 'collab' };
}

export async function initLocal(docStr) {
  requireDidNotInit('initLocal');

  init = { mode: 'local', docStr: docStr };
}

export function createEditor(parentNode, { enableVimMode }, onDocChanged) {
  requireDidInit('createEditor');

  const state = EditorState.create({
    doc: init.mode === 'collab' ? ySrc.toString() : init.docStr,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged(e);
          }
      }),
      init.mode === 'collab' ? yCollab(ySrc, provider.awareness, { yUndoManager }) : [],
      vimMode.of(enableVimMode ? vim() : []), basicSetup, keymap.of([indentWithTab]), yaml(), gruvboxDark
    ]
  });
  return new EditorView({
    state: state,
    parent: parentNode
  });
}

export function getSrc(view) {
  return view.state.doc.toString();
}

export function setVimModeEnabled(view, enabled) {
  requireDidInit('setVimModeEnabled');

  view.dispatch({
    effects: vimMode.reconfigure(enabled ? vim() : [])
  });
}
