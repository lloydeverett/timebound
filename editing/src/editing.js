import { basicSetup, EditorView } from "codemirror"
import { keymap } from "@codemirror/view"
import { yaml } from "@codemirror/lang-yaml"
import { vim } from "@replit/codemirror-vim"
import { indentWithTab } from "@codemirror/commands"

import { birdsOfParadise } from "./themes/birds-of-paradise.js";
import { gruvboxDark } from "./themes/gruvbox-dark.js";
import { gruvboxLight } from "./themes/gruvbox-light.js";

export function createEditor(str, parentNode, onDocChanged) {
  return new EditorView({
    doc: str,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged(e);
          }
        }),
        vim(), basicSetup, keymap.of([indentWithTab]), yaml(), gruvboxDark
      ],
    parent: parentNode
  });
}

/*

export function createMarkupEditor(parentNode, onDocChanged) {
  return createEditor(yMarkup, yMarkupUndoManager, [html(), gruvboxLight], parentNode, onDocChanged);
}

export function createSrcEditor(parentNode, onDocChanged) {
  return createEditor(ySrc, ySrcUndoManager, [javascript(), gruvboxDark], parentNode, onDocChanged);
}

export function createCssEditor(parentNode, onDocChanged) {
  return createEditor(yCss, yCssUndoManager, [css(), birdsOfParadise], parentNode, onDocChanged);
}

*/
