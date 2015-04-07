
/* global brackets, define */

define(function (/* require, exports, module */) {
  'use strict';

  var CommandManager = brackets.getModule('command/CommandManager'),
    Commands = brackets.getModule('command/Commands'),
    DocumentManager = brackets.getModule('document/DocumentManager'),
    Editor = brackets.getModule('editor/Editor').Editor,
    Menus = brackets.getModule('command/Menus'),
    EXTENSION_KEY = 'com.github.dsbonev.WhitespaceNormalizer',
    PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
    PREFERENCES_KEY = EXTENSION_KEY,
    prefs = PreferencesManager.getExtensionPrefs(PREFERENCES_KEY),
    justModified = false;

    $(DocumentManager).on('documentSaved', main);

  function main(event, doc) {
    if (!extensionEnabledPref.enabled()) return;
    if (justModified) {
      justModified = false;
      return;
    }

    doc.batchOperation(function () {
      var line,
        lineIndex = 0,
        indentSize = getIndentSize(),
        indent = new Array(indentSize + 1).join(' '),
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
            line = doc.getLine(lineIndex);
          }
        }

        // transform spaces to tabs
        var replString = "",
          pattern = /^[ \t]+/g,
          rAllTabs = /\t/g,
          rAllSpaces = new RegExp(indent,'g');
        match = pattern.exec(line);
        if (match) {
          replString = match[0];
          if (transfEnabledPref.enabled()) {
            replString = match[0].replace(rAllTabs, indent);
          }
          if (toTabsEnabledPref.enabled()) {
            //Flick tabs to spaces, then convert the spaces back to tabs, to handle intermediary spaces, ex "\t  \t  "
            replString = match[0].replace(rAllTabs, indent).replace(rAllSpaces, "\t");
          }
          doc.replaceRange(
            replString,
            {line: lineIndex, ch: match.index},
            {line: lineIndex, ch: pattern.lastIndex});
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
    justModified = true;
    CommandManager.execute(Commands.FILE_SAVE, {doc: doc});
  }

  function getIndentSize() {
    return Editor.getUseTabChar() ?
      Editor.getTabSize() :
      Editor.getSpaceUnits();
  }

  function setEnabled(prefs, command, enabled) {
    prefs.set('enabled', enabled);
    prefs.save();
    command.setChecked(enabled);
  }

  function Preference(name, label, commandIdSuffix) {
    this.name = name;
    this.label = label;
    this.commandId = EXTENSION_KEY + (commandIdSuffix ? ('.' + commandIdSuffix) : '');
    this.command = this.registerCommand();
    prefs.definePreference(this.name, "boolean", "true")
    this.set(prefs.get(this.name))
    this.constructor.menu.addMenuItem(this.commandId)
  }
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

  var extensionEnabledPref = new Preference('enabled', 'Enable Whitespace Normalizer', ''),
    trimEnabledPref = new Preference('trim', 'Trim trailing whitespace', 'trim'),
    toTabsEnabledPref = new Preference('totabs', 'Normalize to tabs', 'totabs'),
    transfEnabledPref = new Preference('transf', 'Normalize to spaces', 'transf'),
    eofnlEnabledPref = new Preference('eofnl', 'End file with newline', 'eofnl');

});
