import { basicSetup, EditorView } from "codemirror"
import { keymap } from "@codemirror/view"
import { yaml } from "@codemirror/lang-yaml"
import { vim } from "@replit/codemirror-vim"
import { indentWithTab } from "@codemirror/commands"
import { gruvboxDark } from "./themes/gruvbox-dark.js";

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
