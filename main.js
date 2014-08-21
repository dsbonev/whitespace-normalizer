
/* global brackets, define */

define(function (/* require, exports, module */) {
  'use strict';

  var CommandManager = brackets.getModule('command/CommandManager'),
    Commands = brackets.getModule('command/Commands'),
    DocumentManager = brackets.getModule('document/DocumentManager'),
    Editor = brackets.getModule('editor/Editor').Editor,
    Menus = brackets.getModule('command/Menus'),
    EXTENSION_KEY = 'com.github.dsbonev.WhitespaceNormalizer';

  $(DocumentManager).on('documentSaved', main);

  function main(event, doc) {
    if (!extensionEnabledPref.enabled()) return;

    doc.batchOperation(function () {
      var line,
        lineIndex = 0,
        indent = new Array(getIndentSize(Editor) + 1).join(' '),
        pattern,
        match;

      while ((line = doc.getLine(lineIndex)) !== undefined) {
        // trim trailing whitespaces
        if (trimEnabledPref.enabled()) {
          pattern = /[ \t]+$/g;
          match = pattern.exec(line);
          if (match) {
            doc.replaceRange(
              '',
              {line: lineIndex, ch: match.index},
              {line: lineIndex, ch: pattern.lastIndex});

            line = getUpdatedLineAt(doc, lineIndex);
          }
        }

        // transform tabs to spaces
        if (transfEnabledPref.enabled()) {
          pattern = /\t/g;
          match = pattern.exec(line);
          while (match) {
            doc.replaceRange(
              indent,
              {line: lineIndex, ch: match.index},
              {line: lineIndex, ch: pattern.lastIndex});

            line = getUpdatedLineAt(doc, lineIndex);

            match = pattern.exec(line);
          }
        }

        lineIndex += 1;
      }
      lineIndex -= 1

      // ensure newline at the end of file
      if (eofnlEnabledPref.enabled()) {
        line = doc.getLine(lineIndex);
        if (line !== undefined && line.length > 0 && line.slice(-1) !== '\n') {
          doc.replaceRange(
            '\n',
            {line: lineIndex + 1, ch: line.slice(-1)});
        }
      }
    });

    CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
  }

  function getIndentSize(editor) {
    return editor.getUseTabChar() ?
      editor.getTabSize() :
      editor.getSpaceUnits();
  }

  function getUpdatedLineAt(doc, lineIndex) {
    return doc.getLine(lineIndex);
  }

  function setEnabled(prefs, command, enabled) {
    prefs.set('enabled', enabled);
    prefs.save();
    command.setChecked(enabled);
  }

  var PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
    PREFERENCES_KEY = EXTENSION_KEY,
    prefs = PreferencesManager.getExtensionPrefs(PREFERENCES_KEY);

  Preference.prototype = {
    constructor: Preference,
    set: function(state) {
      prefs.set(this.name, state)
      prefs.save()
      this.command.setChecked(state)
    },
    toggle: function () {
      this.set(!this.command.getChecked())
    },
    enabled: function () {
      return this.value() === 'true' || this.value() === true
    },
    value: function () {
      return prefs.get(this.name)
    },
    registerCommand: function () {
      var self = this;
      return CommandManager.register(this.label, this.commandId, function () {
        self.toggle()
      })
    }
  }

  Preference.menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU)
  Preference.menu.addMenuDivider()

  var extensionEnabledPref = new Preference('enabled', '', '')
  var trimEnabledPref = new Preference('trim', 'trim', 'trim')
  var transfEnabledPref = new Preference('transf', 'transf', 'transf')
  var eofnlEnabledPref = new Preference('eofnl', 'eofnl', 'eofnl')

  function Preference(name, label, commandIdSuffix) {
    this.name = name
    this.label = 'Whitespace Normalizer' + (label ? (' ' + label) : '')
    this.commandId = EXTENSION_KEY + (commandIdSuffix ? ('.' + commandIdSuffix) : '')
    this.command = this.registerCommand()

    prefs.definePreference(this.name, "boolean", "true")
    this.set(prefs.get(this.name))

    this.constructor.menu.addMenuItem(this.commandId)
  }
});
