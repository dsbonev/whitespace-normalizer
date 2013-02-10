
define(function (require, exports, module) {
  'use strict';

  var CommandManager = brackets.getModule('command/CommandManager'),
    Commands = brackets.getModule('command/Commands'),
    DocumentManager = brackets.getModule('document/DocumentManager'),
    Editor = brackets.getModule('editor/Editor'),
    Menus = brackets.getModule('command/Menus'),
    PreferencesManager = brackets.getModule('preferences/PreferencesManager');

  function main(event, doc) {
    var editor = doc._masterEditor,
      text;

    doc.batchOperation(function () {
      var currentLineIndex = 0,
        tabSize = Editor.Editor.getTabSize(),
        tabSpaces = new Array(tabSize + 1).join(' '),
        regex,
        match;

      while ((text = doc.getLine(currentLineIndex)) != undefined) {
        //trim trailing whitespaces
        regex = /[ \t]+$/g;
        match = regex.exec(text);
        if (match) {
          doc.replaceRange(
            '',
            {line: currentLineIndex, ch: match.index},
            {line: currentLineIndex, ch: regex.lastIndex});

          text = doc.getLine(currentLineIndex);
        }

        //transform tabs to spaces
        regex = /\t/g;
        match = regex.exec(text);
        while (match) {
          doc.replaceRange(
            tabSpaces,
            {line: currentLineIndex, ch: match.index},
            {line: currentLineIndex, ch: regex.lastIndex});

          text = doc.getLine(currentLineIndex);

          match = regex.exec(text);
        }

        currentLineIndex += 1;
      }

      //ensure newline at the end of file
      text = doc.getLine(currentLineIndex - 1);
      if (text != undefined && text.length > 0 && text[text.length - 1] !== '\n') {
        doc.replaceRange(
          '\n',
          {line: currentLineIndex, ch: text[text.length - 1]});
      }
    });

    CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
  }

  function setEnabled(prefs, command, enabled) {
    $(DocumentManager)[enabled ? 'on' : 'off']('documentSaved', main);
    prefs.setValue('enabled', enabled);
    command.setChecked(enabled);
  }

  var PREFERENCES_KEY = 'com.github.dsbonev.WhitespaceNormalizer',
    prefs = PreferencesManager.getPreferenceStorage(PREFERENCES_KEY, {enabled: false}),
    enabled = prefs.getValue('enabled'),
    COMMAND_ID = PREFERENCES_KEY,
    onCommandExecute = function () {
      setEnabled(prefs, this, !this.getChecked());
    },
    COMMAND = CommandManager.register('Whitespace Normalizer', COMMAND_ID, onCommandExecute);

  setEnabled(prefs, COMMAND, enabled);

  var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
  menu.addMenuDivider();
  menu.addMenuItem(COMMAND_ID);
});
