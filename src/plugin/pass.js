import { Notice } from 'obsidian';
import { spawn } from 'child_process';
import fileSystem from 'fs';
import operatingSystem from 'os';
import path from 'path';
import { LINUX_TERMINALS, COLOR_NUM } from './shared.js';

// Claude Code: the setting, else the native installer's
// ~/.local/bin/claude(.exe), else `claude` on PATH.
function claudeBin(setting) {
  if (setting) {
    return setting;
  }
  const local = path.join(
    operatingSystem.homedir(),
    '.local',
    'bin',
    process.platform === 'win32' ? 'claude.exe' : 'claude',
  );
  return fileSystem.existsSync(local) ? local : 'claude';
}

// The pass's agent as [command, ...arguments]: the "Agent command" setting
// (quoted parts stay one word, {prompt} is replaced, else the prompt goes
// last), or Claude Code when the setting is empty.
function agentWords(setting, prompt) {
  const template = String(setting || '').trim();
  if (!template) {
    return [claudeBin(''), prompt];
  }
  const words = (template.match(/"[^"]*"|\S+/g) || []).map((word) =>
    word.replace(/^"|"$/g, ''),
  );
  const hasPrompt = words.some((word) => word.includes('{prompt}'));
  const filled = words.map((word) => word.replace(/\{prompt\}/g, prompt));
  return hasPrompt ? filled : [...filled, prompt];
}

// The pass's terminal when the "Terminal command" setting is empty: [command,
// args], or null (no terminal found). Windows Terminal; macOS Terminal.app
// through AppleScript (paths passed as argv, quoted by the shell); on Linux the
// first known terminal on PATH. The agent runs in the vault folder with the
// pass prompt.
function onPath(binary) {
  return String(process.env.PATH || '')
    .split(path.delimiter)
    .some(
      (folder) => folder && fileSystem.existsSync(path.join(folder, binary)),
    );
}

// AppleScript run with argv = [vault, ...agent words]: cd to the vault, then
// the agent, every part quoted by the shell.
const MAC_SCRIPT = [
  'on run argv',
  'set agentLine to ""',
  'repeat with wordIndex from 2 to count of argv',
  'set agentLine to agentLine & " " & quoted form of item wordIndex of argv',
  'end repeat',
  'tell application "Terminal"',
  'activate',
  'do script "cd " & quoted form of item 1 of argv & " &&" & agentLine',
  'end tell',
  'end run',
];

function defaultLaunch({ vault, board, agent }) {
  if (process.platform === 'win32') {
    return [
      'wt.exe',
      [
        '-w',
        'kanvas-board',
        'new-tab',
        '-d',
        vault,
        '--title',
        `pass ${board}`,
        ...agent,
      ],
    ];
  }
  if (process.platform === 'darwin') {
    const script = MAC_SCRIPT.flatMap((line) => ['-e', line]);
    return ['osascript', [...script, vault, ...agent]];
  }
  const found = LINUX_TERMINALS.find(({ binary }) => onPath(binary));
  return found ? [found.binary, found.args(vault, agent)] : null;
}

// [command, arguments] from the "Terminal command" setting, quotes allowed,
// {vault} {board} filled in and a {agent} word (old name {claude}) replaced by
// the agent command with its prompt; else the platform's default terminal
// (null when none is found).
function terminalLaunch(template, { vault, board, agent }) {
  if (!template) {
    return defaultLaunch({ vault, board, agent });
  }
  const values = { vault, board };
  const words = (template.match(/"[^"]*"|\S+/g) || []).flatMap((word) => {
    const bare = word.replace(/^"|"$/g, '');
    if (bare === '{agent}' || bare === '{claude}') {
      return agent;
    }
    return [bare.replace(/\{(vault|board)\}/g, (match, name) => values[name])];
  });
  const [command, ...commandArguments] = words;
  return [command, commandArguments];
}

// What the agent is told on a pass: a plain sentence any agent understands,
// pointing at the instructions file in the plugin folder.
function passPrompt(instructionsPath, board) {
  return `Run a Kanvas board pass on ${board}: follow ${instructionsPath}`;
}

// The icon's next rotation for a direction: the shortest way there, so cycling
// keeps turning the same way.
function nextTurn(current, target) {
  return current + ((((target - current) % 360) + 540) % 360) - 180;
}

function parseColors(value) {
  return new Set(
    String(value || '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((color) => COLOR_NUM[color.toLowerCase()] || color)
      .filter((color) => /^[1-6]$/.test(color)),
  );
}

// The terminal runs on its own: closing Obsidian does not stop the pass.
function startPass([command, commandArguments], { vault, board }) {
  function failed(error) {
    return new Notice(
      `Kanvas board: could not start the pass (${error.message})`,
    );
  }
  try {
    const child = spawn(command, commandArguments, {
      cwd: vault,
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', failed);
    child.unref();
    new Notice(`Kanvas board: pass started on ${board}`);
  } catch (error) {
    failed(error);
  }
}

export {
  claudeBin,
  agentWords,
  onPath,
  defaultLaunch,
  terminalLaunch,
  passPrompt,
  nextTurn,
  parseColors,
  startPass,
};
