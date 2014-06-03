/* global brackets, define */


define(function (/* require, exports, module */) {
  'use strict';

  var CommandManager = brackets.getModule('command/CommandManager'),
    Commands = brackets.getModule('command/Commands'),
    DocumentManager = brackets.getModule('document/DocumentManager'),
    Editor = brackets.getModule('editor/Editor').Editor,
    Menus = brackets.getModule('command/Menus'),
    EXTENSION_KEY = 'com.github.dsbonev.WhitespaceNormalizer';

  function main(event, doc) {
    doc.batchOperation(function () {
      var line,
        lineIndex = 0,
        wsPattern = getWhiteSpaceReplacePattern(Editor),
        pattern,
        match;

      while ((line = doc.getLine(lineIndex)) !== undefined) {
        //trim trailing whitespaces
        pattern = /[ \t]+$/g;
        match = pattern.exec(line);
        if (match) {
          doc.replaceRange(
            '',
            {line: lineIndex, ch: match.index},
            {line: lineIndex, ch: pattern.lastIndex});
        }

        match = wsPattern.normalize(line);
        if ( match.replace ) {
          doc.replaceRange(
            match.replace,
            {line: lineIndex, ch: match.start},
            {line: lineIndex, ch: match.end});
        }

        lineIndex += 1;
      }

      //ensure newline at the end of file
      line = doc.getLine(lineIndex - 1);
      if (line !== undefined && line.length > 0 && line.slice(-1) !== '\n') {
        doc.replaceRange(
          '\n',
          {line: lineIndex, ch: line.slice(-1)});
      }
    });

    CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
  }


  function getWhiteSpaceReplacePattern(editor) {
    return editor.getUseTabChar() ? {
      units: editor.getTabSize(),
      normalize: function(line) {
        var regMatch = /^[ ]+/g.exec(line);
        var matches  = (regMatch || [''])[0];
        var indent   = Math.round(matches.length / this.units);
        var replace  = new Array(indent + 1).join('\t');

        return {
          replace: replace,
          start: 0,
          end: matches.length
        };
      }
    }: {
      units: editor.getSpaceUnits(),
      normalize: function(line) {
        var regMatch = /^[\t]+/g.exec(line);
        var matches  = (regMatch || [''])[0];
        var indent   = matches.length * this.units;
        var replace  = new Array(indent + 1).join(' ');

        return {
          replace: replace,
          start: 0,
          end: matches.length
        };
      }
    };
  }


  function setEnabled(prefs, command, enabled) {
    $(DocumentManager)[enabled ? 'on' : 'off']('documentSaved', main);
    prefs.set('enabled', enabled);
    prefs.save();
    command.setChecked(enabled);
  }

  var PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
    PREFERENCES_KEY = EXTENSION_KEY,
    prefs = PreferencesManager.getExtensionPrefs(PREFERENCES_KEY);

  prefs.definePreference("enabled", "boolean", "true");
  var enabled = prefs.get('enabled');


  var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU),
    COMMAND_ID = EXTENSION_KEY,
    onCommandExecute = function () {
      setEnabled(prefs, this, !this.getChecked());
    },
    COMMAND = CommandManager.register('Whitespace Normalizer', COMMAND_ID, onCommandExecute);

  menu.addMenuDivider();
  menu.addMenuItem(COMMAND_ID);

  setEnabled(prefs, COMMAND, enabled);
});
