import { basicSetup, EditorView } from "codemirror"
import { EditorState, Compartment } from "@codemirror/state"
import { keymap } from "@codemirror/view"
import { yaml } from "@codemirror/lang-yaml"
import { vim } from "@replit/codemirror-vim"
import { indentWithTab } from "@codemirror/commands"
import { gruvboxDark } from "./themes/gruvbox-dark.js";

const vimMode = new Compartment;

export function createEditor(str, parentNode, { enableVimMode }, onDocChanged) {
  const state = EditorState.create({
    doc: str,
    extensions: [
      EditorView.updateListener.of(
        function (e) {
          if (e.docChanged) {
            onDocChanged(e);
          }
      }),
      vimMode.of(enableVimMode ? vim() : []), basicSetup, keymap.of([indentWithTab]), yaml(), gruvboxDark
    ]
  });
  return new EditorView({
    state: state,
    parent: parentNode
  });
}

export function setVimModeEnabled(view, enabled) {
  view.dispatch({
    effects: vimMode.reconfigure(enabled ? vim() : [])
  });
}
