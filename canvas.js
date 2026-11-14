// Built from src/ by `npm run build`; edit src/, not this file.
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/board/constants.js
var require_constants = __commonJS({
  "src/board/constants.js"(exports2, module2) {
    var path2 = require("path");
    var ROOT = path2.resolve(__dirname, "..", "..", "..");
    var DEFAULT_BOARD2 = "Board.canvas";
    var SKIP_DIRS = /* @__PURE__ */ new Set([".git", ".obsidian", ".trash", "node_modules"]);
    var COLORS = {
      red: "1",
      orange: "2",
      yellow: "3",
      green: "4",
      cyan: "5",
      purple: "6"
    };
    var URGENCY = ["1", "3", "2", "5", "6", "4"];
    var TEMPLATE_DIR = "Templates/Canvas";
    var ARCHIVE_DIR = "Board notes/Archive";
    var OBSIDIAN = [
      "obsidian",
      "C:\\Program Files\\Obsidian\\Obsidian.com",
      "/Applications/Obsidian.app/Contents/MacOS/Obsidian"
    ];
    var SIDES2 = {
      TB: ["bottom", "top"],
      LR: ["right", "left"],
      BT: ["top", "bottom"],
      RL: ["left", "right"]
    };
    module2.exports = {
      ROOT,
      DEFAULT_BOARD: DEFAULT_BOARD2,
      SKIP_DIRS,
      COLORS,
      URGENCY,
      TEMPLATE_DIR,
      ARCHIVE_DIR,
      OBSIDIAN,
      SIDES: SIDES2
    };
  }
});

// src/workflow/constants.js
var require_constants2 = __commonJS({
  "src/workflow/constants.js"(exports2, module2) {
    var ORANGE_STALE_MS = 36e5;
    var DEFAULT_PASS_COLORS = "cyan purple";
    var DEFAULT_NOTES_FOLDER = "Board notes";
    var WORKING = "2";
    var WAITING = /* @__PURE__ */ new Set(["1", "3"]);
    module2.exports = {
      ORANGE_STALE_MS,
      DEFAULT_PASS_COLORS,
      DEFAULT_NOTES_FOLDER,
      WORKING,
      WAITING
    };
  }
});

// src/workflow/activeNode.js
var require_activeNode = __commonJS({
  "src/workflow/activeNode.js"(exports2, module2) {
    var { WAITING } = require_constants2();
    function activeNode(boardTree, total, active) {
      const ids = new Set(
        boardTree.cards.filter((card) => active.has(card.color)).map((card) => card.id)
      );
      const near = /* @__PURE__ */ new Set();
      for (const edge of boardTree.edges) {
        if (ids.has(edge.from) && !ids.has(edge.to)) near.add(edge.to);
        if (ids.has(edge.to) && !ids.has(edge.from)) near.add(edge.from);
      }
      const cards = [], context = [];
      for (const card of boardTree.cards) {
        if (WAITING.has(card.color)) total.waiting++;
        const inside = card.inside && activeNode(card.inside, total, active);
        if (ids.has(card.id) || inside && inside.cards.length) {
          cards.push({
            ...card,
            inside: inside && inside.cards.length ? inside : void 0
          });
        } else if (near.has(card.id)) {
          context.push({
            id: card.id,
            color: card.color,
            text: card.text,
            file: card.file
          });
        }
      }
      const kept = new Set(cards.map((card) => card.id));
      const edges = boardTree.edges.filter(
        (edge) => kept.has(edge.from) || kept.has(edge.to)
      );
      return { board: boardTree.board, cards, context, edges };
    }
    module2.exports = activeNode;
  }
});

// src/workflow/parseColors.js
var require_parseColors = __commonJS({
  "src/workflow/parseColors.js"(exports2, module2) {
    var { COLORS } = require_constants();
    function parseColors(value) {
      return new Set(
        String(value || "").split(/[\s,]+/).filter(Boolean).map((color) => COLORS[color.toLowerCase()] || color).filter((color) => /^[1-6]$/.test(color))
      );
    }
    module2.exports = parseColors;
  }
});

// src/workflow/settings.js
var require_settings = __commonJS({
  "src/workflow/settings.js"(exports2, module2) {
    var fileSystem2 = require("fs");
    var path2 = require("path");
    var settings2 = () => {
      try {
        return JSON.parse(
          fileSystem2.readFileSync(path2.join(__dirname, "data.json"), "utf8")
        );
      } catch (error) {
        return {};
      }
    };
    module2.exports = settings2;
  }
});

// src/workflow/goColors.js
var require_goColors = __commonJS({
  "src/workflow/goColors.js"(exports2, module2) {
    var { DEFAULT_PASS_COLORS } = require_constants2();
    var parseColors = require_parseColors();
    var settings2 = require_settings();
    function goColors() {
      const value = settings2().passColors;
      return parseColors(value === void 0 ? DEFAULT_PASS_COLORS : value);
    }
    module2.exports = goColors;
  }
});

// src/workflow/activeTree.js
var require_activeTree = __commonJS({
  "src/workflow/activeTree.js"(exports2, module2) {
    var { WORKING } = require_constants2();
    var activeNode = require_activeNode();
    var goColors = require_goColors();
    function activeTree2(boardTree) {
      const active = /* @__PURE__ */ new Set([...goColors(), WORKING]);
      const total = { waiting: 0 };
      const filtered = activeNode(boardTree, total, active);
      return {
        board: filtered.board,
        waiting: total.waiting,
        cards: filtered.cards,
        context: filtered.context,
        edges: filtered.edges
      };
    }
    module2.exports = activeTree2;
  }
});

// src/board/vaultPath.js
var require_vaultPath = __commonJS({
  "src/board/vaultPath.js"(exports2, module2) {
    var { ROOT } = require_constants();
    var path2 = require("path");
    var vaultPath2 = (relativePath) => path2.join(ROOT, relativePath);
    module2.exports = vaultPath2;
  }
});

// src/board/settings.js
var require_settings2 = __commonJS({
  "src/board/settings.js"(exports2, module2) {
    var fileSystem2 = require("fs");
    var path2 = require("path");
    var settings2 = () => {
      try {
        return JSON.parse(
          fileSystem2.readFileSync(path2.join(__dirname, "data.json"), "utf8")
        );
      } catch (error) {
        return {};
      }
    };
    module2.exports = settings2;
  }
});

// src/board/vaultFileIndex.js
var require_vaultFileIndex = __commonJS({
  "src/board/vaultFileIndex.js"(exports2, module2) {
    var { SKIP_DIRS } = require_constants();
    var vaultPath2 = require_vaultPath();
    var fileSystem2 = require("fs");
    var path2 = require("path");
    var settings2 = require_settings2();
    var VaultFileIndex = class {
      constructor() {
        this.files = null;
      }
      get(name) {
        return this.load().get(name) || null;
      }
      paths() {
        return new Set(this.load().values());
      }
      load() {
        if (!this.files) {
          this.files = /* @__PURE__ */ new Map();
          const skip = /* @__PURE__ */ new Set([...SKIP_DIRS, ...settings2().skipFolders || []]);
          const walk = (folder) => {
            for (const entry of fileSystem2.readdirSync(vaultPath2(folder), {
              withFileTypes: true
            })) {
              if (entry.isDirectory()) {
                if (!skip.has(entry.name)) {
                  walk(path2.posix.join(folder, entry.name));
                }
                continue;
              }
              const relativePath = path2.posix.join(folder, entry.name);
              const key = entry.name.endsWith(".md") ? entry.name.slice(0, -3) : entry.name;
              if (!this.files.has(key)) this.files.set(key, relativePath);
              this.files.set(relativePath, relativePath);
              this.files.set(relativePath.replace(/\.md$/, ""), relativePath);
            }
          };
          walk("");
        }
        return this.files;
      }
    };
    module2.exports = new VaultFileIndex();
  }
});

// src/board/findFile.js
var require_findFile = __commonJS({
  "src/board/findFile.js"(exports2, module2) {
    var vaultFileIndex = require_vaultFileIndex();
    function findFile(name) {
      return vaultFileIndex.get(name);
    }
    module2.exports = findFile;
  }
});

// src/board/cardLinks.js
var require_cardLinks = __commonJS({
  "src/board/cardLinks.js"(exports2, module2) {
    var findFile = require_findFile();
    function cardLinks2(node) {
      const targets = node.type === "file" ? [node.file] : [
        ...(node.text || "").matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)
      ].map((match) => findFile(match[1].trim()));
      const found = targets.filter(Boolean);
      return {
        note: found.find((file) => file.endsWith(".md")) || null,
        canvas: found.find((file) => file.endsWith(".canvas")) || null
      };
    }
    module2.exports = cardLinks2;
  }
});

// src/workflow/cardTextOk.js
var require_cardTextOk = __commonJS({
  "src/workflow/cardTextOk.js"(exports2, module2) {
    var cardTextOk = (raw) => {
      const text = raw.trim();
      if (!text.includes("[[")) return text.split("\n").length <= 3;
      return /^\[\[[^\]]+\]\]( · .+)?$/.test(text) || /^[^\n]+ · done · \[\[[^\]]+\]\]$/.test(text);
    };
    module2.exports = cardTextOk;
  }
});

// src/board/noteContexts.js
var require_noteContexts = __commonJS({
  "src/board/noteContexts.js"(exports2, module2) {
    function noteContexts(frontmatter) {
      if (!frontmatter) return [];
      const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");
      const match = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m.exec(frontmatter);
      if (!match) return [];
      return (match[1].trim() ? match[1].replace(/^\[|\]$/g, "").split(",") : match[2].split(/\r?\n/).filter((line) => line.trim()).map((line) => line.replace(/^\s+-\s*/, ""))).map(unquote).filter(Boolean);
    }
    module2.exports = noteContexts;
  }
});

// src/workflow/notesFolder.js
var require_notesFolder = __commonJS({
  "src/workflow/notesFolder.js"(exports2, module2) {
    var { DEFAULT_NOTES_FOLDER } = require_constants2();
    var settings2 = require_settings();
    var notesFolder = () => String(settings2().notesFolder || DEFAULT_NOTES_FOLDER).replace(/[/]+$/, "") + "/";
    module2.exports = notesFolder;
  }
});

// src/board/obsidianEval.js
var require_obsidianEval = __commonJS({
  "src/board/obsidianEval.js"(exports2, module2) {
    var { execFileSync } = require("child_process");
    var { OBSIDIAN } = require_constants();
    function obsidianEval(code) {
      for (const binary of OBSIDIAN) {
        try {
          const out = execFileSync(binary, ["eval", `code=${code}`], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"]
          });
          const match = out.match(/=>\s?([\s\S]*)$/);
          if (!match) throw new Error(out.trim());
          return match[1].trim();
        } catch (error) {
          if (error.code === "ENOENT") continue;
          return null;
        }
      }
      return null;
    }
    module2.exports = obsidianEval;
  }
});

// src/board/api.js
var require_api = __commonJS({
  "src/board/api.js"(exports2, module2) {
    var obsidianEval = require_obsidianEval();
    var api = (method, ...values) => obsidianEval(
      `(async()=>{const p=app.plugins.plugins['canvas-board'];if(!p||!p.api)return 'no plugin';const r=await p.api.${method}(${values.map((x) => JSON.stringify(x)).join(",")});return r===null?'closed':r})()`
    );
    module2.exports = api;
  }
});

// src/board/readFileBoard.js
var require_readFileBoard = __commonJS({
  "src/board/readFileBoard.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var fileSystem2 = require("fs");
    var readFileBoard = (board) => {
      const canvasData = JSON.parse(
        fileSystem2.readFileSync(vaultPath2(board), "utf8") || "{}"
      );
      canvasData.nodes ||= [];
      canvasData.edges ||= [];
      return canvasData;
    };
    module2.exports = readFileBoard;
  }
});

// src/board/readBoard.js
var require_readBoard = __commonJS({
  "src/board/readBoard.js"(exports2, module2) {
    var api = require_api();
    var readFileBoard = require_readFileBoard();
    function readBoard2(board) {
      const out = api("read", board);
      if (out && out.startsWith("{")) {
        const canvasData = JSON.parse(out);
        return { nodes: canvasData.nodes || [], edges: canvasData.edges || [] };
      }
      return readFileBoard(board);
    }
    module2.exports = readBoard2;
  }
});

// src/workflow/check.js
var require_check = __commonJS({
  "src/workflow/check.js"(exports2, module2) {
    var { ORANGE_STALE_MS, WORKING } = require_constants2();
    var vaultPath2 = require_vaultPath();
    var cardLinks2 = require_cardLinks();
    var cardTextOk = require_cardTextOk();
    var findFile = require_findFile();
    var fileSystem2 = require("fs");
    var noteContexts = require_noteContexts();
    var notesFolder = require_notesFolder();
    var readBoard2 = require_readBoard();
    function check2(board, ids) {
      const issues = [];
      const walk = (board2, depth, seen) => {
        seen.add(board2);
        const canvasData = readBoard2(board2);
        for (const node of canvasData.nodes) {
          if (node.type === "group" || !node.color) continue;
          const add = (issue) => issues.push({
            board: board2,
            id: node.id,
            text: (node.text || node.file || "").split("\n")[0],
            issue
          });
          const scoped = !ids || ids.has(node.id);
          const links = node.type === "file" ? [node.file] : [
            ...(node.text || "").matchAll(
              /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g
            )
          ].map((match) => match[1].trim());
          if (scoped) {
            for (const link of links) {
              if (!findFile(link)) add(`broken link [[${link}]]`);
            }
          }
          if (scoped && node.type === "text" && depth === 0 && !cardTextOk(node.text || "")) {
            add(
              "card text is neither a wish (\u2264 3 lines), `[[Note]] \xB7 reason` nor `<recap> \xB7 done \xB7 [[Output]]`"
            );
          }
          const { note, canvas } = cardLinks2(node);
          if (note && note.startsWith(folder)) {
            const source = fileSystem2.readFileSync(vaultPath2(note), "utf8");
            if (scoped) {
              const frontmatter = (source.match(/^---\n([\s\S]*?)\n---/) || [])[1];
              const keys = frontmatter ? [...frontmatter.matchAll(/^(\w[\w-]*):/gm)].map(
                (match) => match[1]
              ) : [];
              if (keys.join() !== "context") {
                add(
                  `note frontmatter is not \`context\` only (${keys.join(", ") || "none"})`
                );
              }
              if (noteContexts(frontmatter).length !== 1) {
                add("note does not have exactly one context");
              }
              for (const section of ["Aim", "Design"]) {
                if (!new RegExp(`^## ${section}\\s*$`, "m").test(source)) {
                  add(`note has no ## ${section}`);
                }
              }
              if (!/^### Done when\s*$/m.test(source)) {
                add("note has no ### Done when (under Aim)");
              }
              if (node.color === "4" && !/^## Output\s*$/m.test(source)) {
                add("green card, note has no ## Output");
              }
            }
            if (node.color === WORKING && Date.now() - fileSystem2.statSync(vaultPath2(note)).mtimeMs > ORANGE_STALE_MS) {
              add("orange card, note untouched for 1h+ (interrupted pass?)");
            }
          }
          if (canvas && !seen.has(canvas) && depth < 2) {
            walk(canvas, depth + 1, seen);
          }
        }
      };
      const folder = notesFolder();
      walk(board, 0, /* @__PURE__ */ new Set());
      return { issues };
    }
    module2.exports = check2;
  }
});

// src/workflow/desiredColor.js
var require_desiredColor = __commonJS({
  "src/workflow/desiredColor.js"(exports2, module2) {
    function desiredColor(card, inner, goColors) {
      if (goColors.has(card.color)) return card.color;
      const rolled = card.text !== void 0 && / · \d+ inside/.test(card.text);
      const own = rolled ? null : card.color;
      if (inner.red || own === "1") return "1";
      if (inner.yellow || own === "3") return "3";
      if (rolled && (card.color === "1" || card.color === "3")) {
        return inner.allGreen ? "4" : null;
      }
      return card.color || null;
    }
    module2.exports = desiredColor;
  }
});

// src/workflow/staleDays.js
var require_staleDays = __commonJS({
  "src/workflow/staleDays.js"(exports2, module2) {
    var settings2 = require_settings();
    var staleDays = () => {
      const days = Number(settings2().staleDays);
      return Number.isFinite(days) && settings2().staleDays !== void 0 ? days : 7;
    };
    module2.exports = staleDays;
  }
});

// src/board/tree.js
var require_tree = __commonJS({
  "src/board/tree.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var cardLinks2 = require_cardLinks();
    var fileSystem2 = require("fs");
    var readBoard2 = require_readBoard();
    function tree(board, { noteInfo } = {}, depth = 0, seen = /* @__PURE__ */ new Set()) {
      seen.add(board);
      const canvasData = readBoard2(board);
      return {
        board,
        cards: canvasData.nodes.filter((node) => node.type !== "group").map((node) => {
          const { note, canvas } = cardLinks2(node);
          const card = {
            id: node.id,
            color: node.color || null,
            text: node.type === "text" ? node.text : void 0,
            file: node.file
          };
          if (note) {
            const ageDays = Math.floor(
              (Date.now() - fileSystem2.statSync(vaultPath2(note)).mtimeMs) / 864e5
            );
            card.note = {
              path: note,
              ageDays,
              ...noteInfo ? noteInfo(note) : {}
            };
          }
          if (canvas && !seen.has(canvas) && depth < 2) {
            card.inside = tree(canvas, { noteInfo }, depth + 1, seen);
          }
          return card;
        }),
        edges: canvasData.edges.map((edge) => ({
          from: edge.fromNode,
          to: edge.toNode,
          label: edge.label
        }))
      };
    }
    module2.exports = tree;
  }
});

// src/workflow/noteState.js
var require_noteState = __commonJS({
  "src/workflow/noteState.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var fileSystem2 = require("fs");
    function noteState(relativePath) {
      const text = fileSystem2.readFileSync(vaultPath2(relativePath), "utf8");
      const parts = [...text.matchAll(/^\s*- \[([ xX])\] /gm)];
      const done = parts.filter((match) => match[1] !== " ").length;
      const questions = [
        ...text.split(/^## Decisions Record/m)[0].matchAll(/^\s*- \[\?\] /gm)
      ].length;
      return {
        level: parts.length ? "plan" : "brief",
        parts: { done, total: parts.length },
        questions
      };
    }
    module2.exports = noteState;
  }
});

// src/workflow/tree.js
var require_tree2 = __commonJS({
  "src/workflow/tree.js"(exports2, module2) {
    var baseTree = require_tree();
    var noteState = require_noteState();
    var tree = (board) => baseTree(board, { noteInfo: noteState });
    module2.exports = tree;
  }
});

// src/board/applyOps.js
var require_applyOps = __commonJS({
  "src/board/applyOps.js"(exports2, module2) {
    function applyOps(canvasData, operations) {
      const retyped = [];
      for (const operation of operations) {
        if (operation.op === "set") {
          const node = canvasData.nodes.find((node2) => node2.id === operation.id);
          if (!node) throw new Error("no node " + operation.id);
          if (operation.color !== void 0) {
            if (operation.color) node.color = operation.color;
            else delete node.color;
          }
          if (operation.file !== void 0) {
            if (node.type !== "file") retyped.push(node.id);
            node.type = "file";
            node.file = operation.file;
            delete node.text;
          }
          if (operation.text !== void 0) {
            if (node.type !== "text") retyped.push(node.id);
            node.type = "text";
            node.text = operation.text;
            delete node.file;
          }
          for (const field of ["x", "y", "width", "height"]) {
            if (operation[field] !== void 0) node[field] = operation[field];
          }
        } else if (operation.op === "sides") {
          const edge = canvasData.edges.find((edge2) => edge2.id === operation.id);
          if (edge) {
            edge.fromSide = operation.fromSide;
            edge.toSide = operation.toSide;
          }
        } else if (operation.op === "add") canvasData.nodes.push(operation.node);
        else if (operation.op === "remove") {
          canvasData.nodes = canvasData.nodes.filter(
            (node) => node.id !== operation.id
          );
          canvasData.edges = canvasData.edges.filter(
            (edge) => edge.fromNode !== operation.id && edge.toNode !== operation.id
          );
        } else if (operation.op === "edge") canvasData.edges.push(operation.edge);
        else if (operation.op === "retarget") {
          const edge = canvasData.edges.find((edge2) => edge2.id === operation.id);
          if (edge) {
            edge.fromNode = operation.fromNode;
            edge.toNode = operation.toNode;
          }
        } else if (operation.op === "ends") {
          const edge = canvasData.edges.find((edge2) => edge2.id === operation.id);
          if (edge) {
            edge.fromEnd = operation.fromEnd;
            edge.toEnd = operation.toEnd;
          }
        } else if (operation.op === "unedge") {
          canvasData.edges = canvasData.edges.filter(
            (edge) => edge.id !== operation.id
          );
        }
      }
      return retyped;
    }
    module2.exports = applyOps;
  }
});

// src/board/serialize.js
var require_serialize = __commonJS({
  "src/board/serialize.js"(exports2, module2) {
    function serialize2(canvasData) {
      const line = (x) => "		" + JSON.stringify(x);
      return `{
	"nodes":[
${canvasData.nodes.map(line).join(",\n")}
	],
	"edges":[
${canvasData.edges.map(line).join(",\n")}
	]
}
`;
    }
    module2.exports = serialize2;
  }
});

// src/board/writeOps.js
var require_writeOps = __commonJS({
  "src/board/writeOps.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var api = require_api();
    var applyOps = require_applyOps();
    var fileSystem2 = require("fs");
    var readFileBoard = require_readFileBoard();
    var serialize2 = require_serialize();
    function writeOps2(board, operations) {
      const out = api("apply", board, operations);
      if (out === "obsidian") return "obsidian";
      if (out !== null && out !== "closed") {
        throw new Error(`Obsidian edit failed: ${out}`);
      }
      const canvasData = readFileBoard(board);
      applyOps(canvasData, operations);
      fileSystem2.writeFileSync(vaultPath2(board), serialize2(canvasData));
      return "file";
    }
    module2.exports = writeOps2;
  }
});

// src/workflow/rollup.js
var require_rollup = __commonJS({
  "src/workflow/rollup.js"(exports2, module2) {
    var desiredColor = require_desiredColor();
    var goColors = require_goColors();
    var staleDays = require_staleDays();
    var tree = require_tree2();
    var writeOps2 = require_writeOps();
    function rollup2(board) {
      const goColorSet = goColors();
      const boardTree = tree(board);
      const changes = [];
      const walk = (node) => {
        const operations = [];
        let red = 0, yellow = 0, cards = 0, green = 0;
        for (const card of node.cards) {
          let color = card.color;
          if (card.inside) {
            const inner = walk(card.inside);
            const want = desiredColor(card, inner, goColorSet);
            let text = card.text;
            if (text !== void 0) {
              text = text.replace(/ · \d+ inside| · \d+d$/g, "");
              if (inner.red + inner.yellow) {
                text += ` \xB7 ${inner.red + inner.yellow} inside`;
              }
            }
            if (want !== color || text !== void 0 && text !== card.text) {
              operations.push({
                op: "set",
                id: card.id,
                color: want === null ? "" : want,
                ...text !== card.text ? { text } : {}
              });
              color = want;
            }
          }
          if (color === "1") red++;
          if (color === "3") yellow++;
          cards++;
          if (color === "4") green++;
        }
        for (const card of node.cards) {
          if (card.color !== "3" || !card.note || card.text === void 0 || card.inside) {
            continue;
          }
          const base = card.text.replace(/ · \d+d$/, "");
          const days = staleDays();
          const text = days > 0 && card.note.ageDays >= days ? `${base} \xB7 ${card.note.ageDays}d` : base;
          if (text !== card.text) operations.push({ op: "set", id: card.id, text });
        }
        if (operations.length) {
          changes.push({
            board: node.board,
            via: writeOps2(node.board, operations),
            operations
          });
        }
        return { red, yellow, allGreen: cards > 0 && green === cards };
      };
      walk(boardTree);
      return changes;
    }
    module2.exports = rollup2;
  }
});

// src/board/archiveDir.js
var require_archiveDir = __commonJS({
  "src/board/archiveDir.js"(exports2, module2) {
    var { ARCHIVE_DIR } = require_constants();
    var path2 = require("path");
    function archiveDir2(board, options = {}) {
      if (options.archiveMode === "global") {
        return String(options.archiveFolder || ARCHIVE_DIR).trim().replace(/[/\\]+$/, "") || ARCHIVE_DIR;
      }
      const boardPath = String(board).replace(/\\/g, "/"), folder = path2.posix.dirname(boardPath);
      return (folder === "." ? "" : folder + "/") + path2.posix.basename(boardPath, ".canvas") + " archive";
    }
    module2.exports = archiveDir2;
  }
});

// src/board/noteName.js
var require_noteName = __commonJS({
  "src/board/noteName.js"(exports2, module2) {
    var noteName = (text) => (String(text).split("\n").find((line) => line.trim()) || "Card").replace(/^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/, "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/[#^|[\]*_`>:\\/"?<]/g, "").replace(/\s+/g, " ").trim().slice(0, 60).trim() || "Card";
    module2.exports = noteName;
  }
});

// src/board/yamlStr.js
var require_yamlStr = __commonJS({
  "src/board/yamlStr.js"(exports2, module2) {
    var yamlStr = (value) => JSON.stringify(String(value));
    module2.exports = yamlStr;
  }
});

// src/board/archiveNote.js
var require_archiveNote = __commonJS({
  "src/board/archiveNote.js"(exports2, module2) {
    var noteName = require_noteName();
    var yamlStr = require_yamlStr();
    function archiveNote2(canvasData, id, board, date, contexts = ["G&A"]) {
      const node = canvasData.nodes.find((node2) => node2.id === id);
      if (!node) throw new Error("no node " + id);
      const edges = canvasData.edges.filter((edge) => edge.fromNode === id || edge.toNode === id).map(
        (edge) => yamlStr(
          [
            edge.id,
            edge.fromNode,
            edge.fromSide || "",
            edge.toNode,
            edge.toSide || "",
            edge.label || ""
          ].join(" | ")
        )
      );
      const frontmatter = [
        "---",
        "context:",
        ...contexts.map((context) => `  - ${context}`),
        `archived-from: "[[${board}]]"`,
        `archived: ${date}`,
        `card-id: ${yamlStr(node.id)}`,
        `card-type: ${node.type}`,
        ...node.type === "file" ? [`card-file: ${yamlStr(node.file)}`] : [],
        ...node.type === "link" ? [`card-url: ${yamlStr(node.url)}`] : [],
        `x: ${node.x}`,
        `y: ${node.y}`,
        `width: ${node.width}`,
        `height: ${node.height}`,
        `color: ${yamlStr(node.color || "")}`,
        edges.length ? "edges:" : "edges: []",
        ...edges.map((edge) => `  - ${edge}`),
        "---",
        ""
      ].join("\n");
      const body = node.type === "text" ? node.text : node.type === "file" ? `[[${node.file}]]` : node.type === "link" ? node.url : node.label || "";
      return {
        name: noteName(
          node.type === "text" ? node.text : node.file || node.url || node.label
        ),
        content: frontmatter + body + "\n",
        operations: [{ op: "remove", id }]
      };
    }
    module2.exports = archiveNote2;
  }
});

// src/board/cardContexts.js
var require_cardContexts = __commonJS({
  "src/board/cardContexts.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var cardLinks2 = require_cardLinks();
    var fileSystem2 = require("fs");
    var noteContexts = require_noteContexts();
    function cardContexts2(node) {
      const { note } = cardLinks2(node);
      const frontmatter = note && (fileSystem2.readFileSync(vaultPath2(note), "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
      const contexts = noteContexts(frontmatter);
      return contexts.length ? contexts : void 0;
    }
    module2.exports = cardContexts2;
  }
});

// src/board/bounds.js
var require_bounds = __commonJS({
  "src/board/bounds.js"(exports2, module2) {
    var bounds = (nodes) => {
      const x = Math.min(...nodes.map((node) => node.x)), y = Math.min(...nodes.map((node) => node.y));
      return {
        x,
        y,
        w: Math.max(...nodes.map((node) => node.x + node.width)) - x,
        h: Math.max(...nodes.map((node) => node.y + node.height)) - y
      };
    };
    module2.exports = bounds;
  }
});

// src/board/newId.js
var require_newId = __commonJS({
  "src/board/newId.js"(exports2, module2) {
    var newId2 = () => [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    module2.exports = newId2;
  }
});

// src/board/withGroupMembers.js
var require_withGroupMembers = __commonJS({
  "src/board/withGroupMembers.js"(exports2, module2) {
    function withGroupMembers(canvasData, ids) {
      const pick = new Set(ids);
      for (const group of canvasData.nodes.filter(
        (node) => node.type === "group" && pick.has(node.id)
      )) {
        for (const node of canvasData.nodes) {
          if (node.x >= group.x && node.y >= group.y && node.x + node.width <= group.x + group.width && node.y + node.height <= group.y + group.height) {
            pick.add(node.id);
          }
        }
      }
      return pick;
    }
    module2.exports = withGroupMembers;
  }
});

// src/board/collapseOps.js
var require_collapseOps = __commonJS({
  "src/board/collapseOps.js"(exports2, module2) {
    var bounds = require_bounds();
    var newId2 = require_newId();
    var withGroupMembers = require_withGroupMembers();
    function collapseOps2(canvasData, ids, file, label) {
      const pick = withGroupMembers(canvasData, ids);
      const moving = canvasData.nodes.filter((node) => pick.has(node.id));
      if (!moving.length) throw new Error("nothing to collapse");
      const box = bounds(moving);
      const subcanvas = {
        nodes: moving.map((node) => ({
          ...node,
          x: node.x - box.x,
          y: node.y - box.y
        })),
        edges: canvasData.edges.filter(
          (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode)
        )
      };
      const cardWidth = 320, cardHeight = 60;
      const card = {
        id: newId2(),
        type: "text",
        text: `[[${file}|${label}]]`,
        x: Math.round(box.x + (box.w - cardWidth) / 2),
        y: Math.round(box.y + (box.h - cardHeight) / 2),
        width: cardWidth,
        height: cardHeight
      };
      const operations = [{ op: "add", node: card }];
      for (const edge of canvasData.edges) {
        const from = pick.has(edge.fromNode), isToInside = pick.has(edge.toNode);
        if (from !== isToInside) {
          operations.push({
            op: "retarget",
            id: edge.id,
            fromNode: from ? card.id : edge.fromNode,
            toNode: isToInside ? card.id : edge.toNode
          });
        }
      }
      for (const node of moving) operations.push({ op: "remove", id: node.id });
      return { operations, subcanvas, id: card.id };
    }
    module2.exports = collapseOps2;
  }
});

// src/board/colorArg.js
var require_colorArg = __commonJS({
  "src/board/colorArg.js"(exports2, module2) {
    var { COLORS } = require_constants();
    var colorArg2 = (color) => color === void 0 ? void 0 : color === "none" ? "" : COLORS[color] || color;
    module2.exports = colorArg2;
  }
});

// src/board/defaultDir.js
var require_defaultDir = __commonJS({
  "src/board/defaultDir.js"(exports2, module2) {
    var { SIDES: SIDES2 } = require_constants();
    var settings2 = require_settings2();
    var defaultDir2 = () => SIDES2[settings2().layoutDirection] ? settings2().layoutDirection : "TB";
    module2.exports = defaultDir2;
  }
});

// src/board/byReading.js
var require_byReading = __commonJS({
  "src/board/byReading.js"(exports2, module2) {
    var byReading = (first, second) => first.y - second.y || first.x - second.x;
    module2.exports = byReading;
  }
});

// src/board/expandOps.js
var require_expandOps = __commonJS({
  "src/board/expandOps.js"(exports2, module2) {
    var bounds = require_bounds();
    var byReading = require_byReading();
    var newId2 = require_newId();
    function expandOps2(canvasData, id, subcanvas, { group } = {}) {
      const card = canvasData.nodes.find((node) => node.id === id);
      if (!card) throw new Error("no node " + id);
      if (!subcanvas.nodes.length) throw new Error("empty subcanvas");
      const taken = new Set(
        canvasData.nodes.map((node) => node.id).concat(canvasData.edges.map((edge) => edge.id))
      );
      const ids = new Map(
        subcanvas.nodes.map((node) => [
          node.id,
          taken.has(node.id) ? newId2() : node.id
        ])
      );
      const box = bounds(subcanvas.nodes);
      const others = canvasData.nodes.filter((node) => node.id !== id);
      let offsetX = Math.round(card.x + (card.width - box.w) / 2) - box.x;
      const offsetY = Math.round(card.y + (card.height - box.h) / 2) - box.y;
      const hits = () => subcanvas.nodes.some(
        (subNode) => others.some(
          (node) => subNode.x + offsetX < node.x + node.width + 40 && subNode.x + offsetX + subNode.width + 40 > node.x && subNode.y + offsetY < node.y + node.height + 40 && subNode.y + offsetY + subNode.height + 40 > node.y
        )
      );
      for (let attempt = 0; attempt < 200 && hits(); attempt++) offsetX += 40;
      const nodes = subcanvas.nodes.map((node) => ({
        ...node,
        id: ids.get(node.id),
        x: node.x + offsetX,
        y: node.y + offsetY
      }));
      let first = nodes.filter((node) => node.type !== "group").sort(byReading)[0] || nodes[0];
      const operations = [];
      if (group) {
        const padding = 30;
        const groupX = Math.min(...nodes.map((node) => node.x)) - padding, groupY = Math.min(...nodes.map((node) => node.y)) - padding;
        first = {
          id: newId2(),
          type: "group",
          label: group,
          x: groupX,
          y: groupY,
          width: Math.max(...nodes.map((node) => node.x + node.width)) + padding - groupX,
          height: Math.max(...nodes.map((node) => node.y + node.height)) + padding - groupY
        };
        operations.push({ op: "add", node: first });
      }
      operations.push(...nodes.map((node) => ({ op: "add", node })));
      for (const edge of subcanvas.edges) {
        operations.push({
          op: "edge",
          edge: {
            ...edge,
            id: taken.has(edge.id) ? newId2() : edge.id,
            fromNode: ids.get(edge.fromNode),
            toNode: ids.get(edge.toNode)
          }
        });
      }
      for (const edge of canvasData.edges) {
        if (edge.fromNode === id || edge.toNode === id) {
          operations.push({
            op: "retarget",
            id: edge.id,
            fromNode: edge.fromNode === id ? first.id : edge.fromNode,
            toNode: edge.toNode === id ? first.id : edge.toNode
          });
        }
      }
      operations.push({ op: "remove", id });
      return group ? Object.assign(operations, { group: first.id }) : operations;
    }
    module2.exports = expandOps2;
  }
});

// src/board/fitHeight.js
var require_fitHeight = __commonJS({
  "src/board/fitHeight.js"(exports2, module2) {
    function fitHeight2(text, width) {
      const perLine = Math.max(10, Math.floor((width - 40) / 8));
      const lines = String(text || "").split("\n").reduce(
        (lines2, line) => lines2 + Math.max(
          1,
          Math.ceil(
            line.replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").length / perLine
          )
        ),
        0
      );
      return Math.max(60, lines * 26 + 34);
    }
    module2.exports = fitHeight2;
  }
});

// src/board/extractOps.js
var require_extractOps = __commonJS({
  "src/board/extractOps.js"(exports2, module2) {
    var fitHeight2 = require_fitHeight();
    var newId2 = require_newId();
    function extractOps2(canvasData, id, part, from) {
      const card = canvasData.nodes.find((node2) => node2.id === id);
      if (!card || card.type !== "text") {
        throw new Error("extract takes one text card");
      }
      const offset = from !== void 0 && card.text.slice(from, from + part.length) === part ? from : card.text.indexOf(part);
      if (!part.trim() || offset < 0) throw new Error("text not found in the card");
      const left = (card.text.slice(0, offset) + card.text.slice(offset + part.length)).replace(/\n{3,}/g, "\n\n").trim();
      const text = part.trim();
      const height = fitHeight2(text, card.width);
      let y = card.y;
      while (canvasData.nodes.some(
        (node2) => node2.x === card.x + card.width + 40 && node2.y === y
      )) {
        y += 40;
      }
      const node = {
        id: newId2(),
        type: "text",
        text,
        x: card.x + card.width + 40,
        y,
        width: card.width,
        height
      };
      if (card.color) node.color = card.color;
      return [
        { op: "set", id, text: left, height: fitHeight2(left, card.width) },
        { op: "add", node }
      ];
    }
    module2.exports = extractOps2;
  }
});

// src/board/freePath.js
var require_freePath = __commonJS({
  "src/board/freePath.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var fileSystem2 = require("fs");
    var path2 = require("path");
    function freePath2(folder, name, extension) {
      for (let attempt = 1; ; attempt++) {
        const candidate = path2.posix.join(
          folder,
          `${name}${attempt > 1 ? " " + attempt : ""}${extension}`
        );
        if (!fileSystem2.existsSync(vaultPath2(candidate))) return candidate;
      }
    }
    module2.exports = freePath2;
  }
});

// src/board/layoutOps.js
var require_layoutOps = __commonJS({
  "src/board/layoutOps.js"(exports2, module2) {
    var { SIDES: SIDES2 } = require_constants();
    var fitHeight2 = require_fitHeight();
    function layoutOps2(canvasData, { ids, direction = "TB", isFitToText = false, dagre, flow = "out" }) {
      const cards = canvasData.nodes.filter((node) => node.type !== "group");
      const pick = new Set(ids && ids.length ? ids : cards.map((node) => node.id));
      const moving = cards.filter((node) => pick.has(node.id));
      const fixed = cards.filter((node) => !pick.has(node.id));
      if (!moving.length) return [];
      const graph = new dagre.graphlib.Graph();
      graph.setGraph({
        rankdir: direction,
        nodesep: 40,
        ranksep: 80,
        marginx: 0,
        marginy: 0
      });
      graph.setDefaultEdgeLabel(() => ({}));
      const size = (node) => ({
        width: node.width,
        height: isFitToText && node.type === "text" ? fitHeight2(node.text, node.width) : node.height
      });
      for (const node of moving) graph.setNode(node.id, size(node));
      const inner = canvasData.edges.filter(
        (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode)
      );
      const back = (edge) => flow === "in" || /depends on/i.test(edge.label || "");
      for (const edge of inner) {
        back(edge) ? graph.setEdge(edge.toNode, edge.fromNode) : graph.setEdge(edge.fromNode, edge.toNode);
      }
      dagre.layout(graph);
      const box = (nodes) => nodes.reduce(
        (box2, node) => ({
          x0: Math.min(box2.x0, node.x),
          y0: Math.min(box2.y0, node.y),
          x1: Math.max(box2.x1, node.x + node.width),
          y1: Math.max(box2.y1, node.y + node.height)
        }),
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
      );
      const placed = moving.map((node) => {
        const position = graph.node(node.id);
        return {
          id: node.id,
          x: Math.round(position.x - position.width / 2),
          y: Math.round(position.y - position.height / 2),
          width: position.width,
          height: position.height
        };
      });
      const placedBox = box(placed), was = box(moving);
      const shiftX = Math.round(
        (was.x0 + was.x1 - placedBox.x0 - placedBox.x1) / 2
      ), shiftY = Math.round((was.y0 + was.y1 - placedBox.y0 - placedBox.y1) / 2);
      let offsetX = shiftX, offsetY = shiftY;
      const hits = () => placed.some(
        (placedNode) => fixed.some(
          (node) => placedNode.x + offsetX < node.x + node.width + 40 && placedNode.x + offsetX + placedNode.width + 40 > node.x && placedNode.y + offsetY < node.y + node.height + 40 && placedNode.y + offsetY + placedNode.height + 40 > node.y
        )
      );
      for (let attempt = 1; attempt <= 400 && hits(); attempt++) {
        const step = (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 40;
        if (direction === "LR" || direction === "RL") offsetY = shiftY + step;
        else offsetX = shiftX + step;
      }
      const operations = placed.map((placedNode) => ({
        op: "set",
        id: placedNode.id,
        x: placedNode.x + offsetX,
        y: placedNode.y + offsetY,
        width: placedNode.width,
        height: placedNode.height
      }));
      const [fromSide, toSide] = SIDES2[direction];
      for (const edge of inner) {
        operations.push(
          back(edge) ? { op: "sides", id: edge.id, fromSide: toSide, toSide: fromSide } : { op: "sides", id: edge.id, fromSide, toSide }
        );
      }
      return operations;
    }
    module2.exports = layoutOps2;
  }
});

// src/board/relinkText.js
var require_relinkText = __commonJS({
  "src/board/relinkText.js"(exports2, module2) {
    var path2 = require("path");
    function relinkText(text, hits, replace) {
      return (text || "").replace(
        /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
        (link, target, subpath, alias) => hits(target.trim()) ? replace(
          alias || path2.posix.basename(target.trim()).replace(/\.canvas$/, "")
        ) : link
      );
    }
    module2.exports = relinkText;
  }
});

// src/board/linksTo.js
var require_linksTo = __commonJS({
  "src/board/linksTo.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var findFile = require_findFile();
    var fileSystem2 = require("fs");
    var path2 = require("path");
    var relinkText = require_relinkText();
    var vaultFileIndex = require_vaultFileIndex();
    function linksTo2(relativePath, board, skipId) {
      const out = [];
      const hits = (target) => findFile(target) === relativePath;
      for (const file of vaultFileIndex.paths()) {
        if (file === relativePath || !/\.(md|canvas)$/.test(file)) continue;
        let source;
        try {
          source = fileSystem2.readFileSync(vaultPath2(file), "utf8");
        } catch (error) {
          continue;
        }
        if (!source.includes(path2.posix.basename(relativePath))) continue;
        if (file.endsWith(".md")) {
          if (relinkText(source, hits, () => "\0") !== source) out.push(file);
          continue;
        }
        let canvasData;
        try {
          canvasData = JSON.parse(source || "{}");
        } catch (error) {
          continue;
        }
        for (const node of canvasData.nodes || []) {
          if (!(file === board && node.id === skipId) && (node.type === "file" ? node.file === relativePath : relinkText(node.text, hits, () => "\0") !== (node.text || ""))) {
            out.push(`${file} (${node.id})`);
          }
        }
      }
      return out;
    }
    module2.exports = linksTo2;
  }
});

// src/board/mostUrgent.js
var require_mostUrgent = __commonJS({
  "src/board/mostUrgent.js"(exports2, module2) {
    var { URGENCY } = require_constants();
    var mostUrgent = (colors) => URGENCY.find((color) => colors.includes(color)) || "";
    module2.exports = mostUrgent;
  }
});

// src/board/mergeOps.js
var require_mergeOps = __commonJS({
  "src/board/mergeOps.js"(exports2, module2) {
    var byReading = require_byReading();
    var fitHeight2 = require_fitHeight();
    var mostUrgent = require_mostUrgent();
    function mergeOps2(canvasData, ids) {
      const cards = canvasData.nodes.filter((node) => ids.includes(node.id)).sort(byReading);
      if (cards.length < 2) throw new Error("merge needs 2+ cards");
      if (cards.some((node) => node.type !== "text")) {
        throw new Error("merge takes text cards only");
      }
      const [keep, ...rest] = cards;
      const gone = new Set(rest.map((node) => node.id));
      const all = new Set(cards.map((node) => node.id));
      const text = cards.map((node) => node.text.trim()).join("\n\n");
      const width = Math.max(...cards.map((node) => node.width));
      const operations = [
        {
          op: "set",
          id: keep.id,
          text,
          color: mostUrgent(cards.map((node) => node.color || "")),
          width,
          height: fitHeight2(text, width)
        }
      ];
      const center = (node) => [node.x + node.width / 2, node.y + node.height / 2];
      const distance = (first, second) => Math.hypot(
        center(first)[0] - center(second)[0],
        center(first)[1] - center(second)[1]
      );
      const twoWay = (edge) => edge.fromEnd === "arrow" && edge.toEnd !== "none";
      const byOther = /* @__PURE__ */ new Map();
      for (const edge of canvasData.edges) {
        if (!all.has(edge.fromNode) && !all.has(edge.toNode)) continue;
        if (all.has(edge.fromNode) && all.has(edge.toNode)) {
          if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
            operations.push({ op: "unedge", id: edge.id });
          }
          continue;
        }
        const out = all.has(edge.fromNode), other = out ? edge.toNode : edge.fromNode;
        const length = distance(
          canvasData.nodes.find(
            (node) => node.id === (out ? edge.fromNode : edge.toNode)
          ),
          canvasData.nodes.find((node) => node.id === other) || keep
        );
        if (!byOther.has(other)) byOther.set(other, []);
        byOther.get(other).push({ edge, out, length });
      }
      for (const list of byOther.values()) {
        list.sort((first, second) => first.length - second.length);
        const best = list.find((x) => twoWay(x.edge)) || list[0];
        const both = list.some((x) => x.out) && list.some((x) => !x.out);
        for (const x of list) {
          if (x !== best) operations.push({ op: "unedge", id: x.edge.id });
        }
        const edge = best.edge;
        if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
          operations.push({
            op: "retarget",
            id: edge.id,
            fromNode: gone.has(edge.fromNode) ? keep.id : edge.fromNode,
            toNode: gone.has(edge.toNode) ? keep.id : edge.toNode
          });
        }
        if (both && !twoWay(edge)) {
          operations.push({
            op: "ends",
            id: edge.id,
            fromEnd: "arrow",
            toEnd: "arrow"
          });
        }
      }
      for (const node of rest) operations.push({ op: "remove", id: node.id });
      return operations;
    }
    module2.exports = mergeOps2;
  }
});

// src/board/place.js
var require_place = __commonJS({
  "src/board/place.js"(exports2, module2) {
    function place2(canvasData, near, width, height) {
      const nearNode = canvasData.nodes.find((node) => node.id === near);
      if (!nearNode) throw new Error("no node " + near);
      const overlaps = (x, y) => canvasData.nodes.some(
        (node) => x < node.x + node.width + 20 && x + width + 20 > node.x && y < node.y + node.height + 20 && y + height + 20 > node.y
      );
      for (let step = 0; step < 20; step++) {
        const right = {
          x: nearNode.x + nearNode.width + 40,
          y: nearNode.y + step * (height + 40)
        };
        if (!overlaps(right.x, right.y)) return right;
        const below = {
          x: nearNode.x + step * (width + 40),
          y: nearNode.y + nearNode.height + 40
        };
        if (!overlaps(below.x, below.y)) return below;
      }
      return { x: nearNode.x + nearNode.width + 40, y: nearNode.y };
    }
    module2.exports = place2;
  }
});

// src/board/restoreOps.js
var require_restoreOps = __commonJS({
  "src/board/restoreOps.js"(exports2, module2) {
    var newId2 = require_newId();
    function restoreOps2(canvasData, source) {
      const frontmatter = (source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/) || [])[1];
      if (!frontmatter || !/^archived-from:/m.test(frontmatter)) {
        throw new Error("not an archived card note");
      }
      const get = (field) => {
        const match = new RegExp(`^${field}: (.*)$`, "m").exec(frontmatter);
        if (!match) return void 0;
        const value = match[1].trim();
        return value.startsWith('"') ? JSON.parse(value) : value;
      };
      const board = get("archived-from").replace(/^\[\[|\]\]$/g, "");
      const body = source.slice(source.indexOf("---", 3) + 3).replace(/^\r?\n/, "").replace(/\s+$/, "");
      const type = get("card-type") || "text";
      const ids = new Set(canvasData.nodes.map((node2) => node2.id));
      const id = ids.has(get("card-id")) ? newId2() : get("card-id");
      const node = {
        id,
        type,
        x: Number(get("x")),
        y: Number(get("y")),
        width: Number(get("width")),
        height: Number(get("height"))
      };
      if (type === "text") node.text = body;
      if (type === "file") node.file = get("card-file");
      if (type === "link") node.url = get("card-url");
      if (get("color")) node.color = get("color");
      const operations = [{ op: "add", node }];
      const old = get("card-id");
      const edgeIds = new Set(canvasData.edges.map((edge) => edge.id));
      for (const edgeLine of frontmatter.matchAll(/^ {2}- (".*")$/gm)) {
        const [edgeId, from, fromSide, toId, toSide, label] = JSON.parse(
          edgeLine[1]
        ).split(" | ");
        const fromNode = from === old ? id : from, toNode = toId === old ? id : toId;
        if (edgeIds.has(edgeId) || !(fromNode === id || ids.has(fromNode)) || !(toNode === id || ids.has(toNode))) {
          continue;
        }
        const edge = { id: edgeId, fromNode, toNode };
        if (fromSide) edge.fromSide = fromSide;
        if (toSide) edge.toSide = toSide;
        if (label) edge.label = label;
        operations.push({ op: "edge", edge });
      }
      return { board, operations };
    }
    module2.exports = restoreOps2;
  }
});

// src/board/splitText.js
var require_splitText = __commonJS({
  "src/board/splitText.js"(exports2, module2) {
    function splitText(text, separator) {
      const headingMatch = /^h([1-6])$/.exec(separator);
      const starts = headingMatch ? new RegExp(`^#{${headingMatch[1]}} `) : separator === "bullet" ? /^([-*+]|\d+[.)]) / : null;
      const pieces = starts ? text.split("\n").reduce((pieces2, line) => {
        if (starts.test(line) || !pieces2.length) pieces2.push([]);
        pieces2[pieces2.length - 1].push(line);
        return pieces2;
      }, []).map((pieceLines) => pieceLines.join("\n")) : text.split(/\n\s*\n/);
      return pieces.map((piece) => piece.trim()).filter(Boolean);
    }
    module2.exports = splitText;
  }
});

// src/board/splitOps.js
var require_splitOps = __commonJS({
  "src/board/splitOps.js"(exports2, module2) {
    var fitHeight2 = require_fitHeight();
    var newId2 = require_newId();
    var splitText = require_splitText();
    function splitOps2(canvasData, id, separator = "paragraph") {
      const card = canvasData.nodes.find((node) => node.id === id);
      if (!card || card.type !== "text") {
        throw new Error("split takes one text card");
      }
      const pieces = splitText(card.text || "", separator);
      if (pieces.length < 2) throw new Error(`nothing to split by ${separator}`);
      let y = card.y;
      return pieces.map((text, index) => {
        const height = fitHeight2(text, card.width);
        const node = { ...card, id: index ? newId2() : card.id, text, y, height };
        y += height + 20;
        return index ? { op: "add", node } : { op: "set", id, text, height };
      });
    }
    module2.exports = splitOps2;
  }
});

// src/board/today.js
var require_today = __commonJS({
  "src/board/today.js"(exports2, module2) {
    var today2 = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    module2.exports = today2;
  }
});

// src/board/toTrash.js
var require_toTrash = __commonJS({
  "src/board/toTrash.js"(exports2, module2) {
    var vaultPath2 = require_vaultPath();
    var fileSystem2 = require("fs");
    var path2 = require("path");
    var toTrash2 = (relativePath) => {
      const destination = vaultPath2(
        path2.posix.join(".trash", path2.posix.basename(relativePath))
      );
      fileSystem2.mkdirSync(path2.dirname(destination), { recursive: true });
      fileSystem2.renameSync(vaultPath2(relativePath), destination);
    };
    module2.exports = toTrash2;
  }
});

// dagre.min.js
var require_dagre_min = __commonJS({
  "dagre.min.js"(exports2, module2) {
    (function(f) {
      if (typeof exports2 === "object" && typeof module2 !== "undefined") {
        module2.exports = f();
      } else if (typeof define === "function" && define.amd) {
        define([], f);
      } else {
        var g;
        if (typeof window !== "undefined") {
          g = window;
        } else if (typeof global !== "undefined") {
          g = global;
        } else if (typeof self !== "undefined") {
          g = self;
        } else {
          g = this;
        }
        g.dagre = f();
      }
    })(function() {
      var define2, module3, exports3;
      return (/* @__PURE__ */ (function() {
        function r(e, n, t) {
          function o(i2, f) {
            if (!n[i2]) {
              if (!e[i2]) {
                var c = "function" == typeof require && require;
                if (!f && c) return c(i2, true);
                if (u) return u(i2, true);
                var a = new Error("Cannot find module '" + i2 + "'");
                throw a.code = "MODULE_NOT_FOUND", a;
              }
              var p = n[i2] = { exports: {} };
              e[i2][0].call(p.exports, function(r2) {
                var n2 = e[i2][1][r2];
                return o(n2 || r2);
              }, p, p.exports, r, e, n, t);
            }
            return n[i2].exports;
          }
          for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
          return o;
        }
        return r;
      })())({ 1: [function(require2, module4, exports4) {
        module4.exports = { graphlib: require2("@dagrejs/graphlib"), layout: require2("./lib/layout"), debug: require2("./lib/debug"), util: { time: require2("./lib/util").time, notime: require2("./lib/util").notime }, version: require2("./lib/version") };
      }, { "./lib/debug": 6, "./lib/layout": 8, "./lib/util": 27, "./lib/version": 28, "@dagrejs/graphlib": 29 }], 2: [function(require2, module4, exports4) {
        "use strict";
        let greedyFAS = require2("./greedy-fas");
        let uniqueId = require2("./util").uniqueId;
        module4.exports = { run, undo };
        function run(g) {
          let fas = g.graph().acyclicer === "greedy" ? greedyFAS(g, weightFn(g)) : dfsFAS(g);
          fas.forEach((e) => {
            let label = g.edge(e);
            g.removeEdge(e);
            label.forwardName = e.name;
            label.reversed = true;
            g.setEdge(e.w, e.v, label, uniqueId("rev"));
          });
          function weightFn(g2) {
            return (e) => {
              return g2.edge(e).weight;
            };
          }
        }
        function dfsFAS(g) {
          let fas = [];
          let stack = {};
          let visited = {};
          function dfs(v) {
            if (Object.hasOwn(visited, v)) {
              return;
            }
            visited[v] = true;
            stack[v] = true;
            g.outEdges(v).forEach((e) => {
              if (Object.hasOwn(stack, e.w)) {
                fas.push(e);
              } else {
                dfs(e.w);
              }
            });
            delete stack[v];
          }
          g.nodes().forEach(dfs);
          return fas;
        }
        function undo(g) {
          g.edges().forEach((e) => {
            let label = g.edge(e);
            if (label.reversed) {
              g.removeEdge(e);
              let forwardName = label.forwardName;
              delete label.reversed;
              delete label.forwardName;
              g.setEdge(e.w, e.v, label, forwardName);
            }
          });
        }
      }, { "./greedy-fas": 7, "./util": 27 }], 3: [function(require2, module4, exports4) {
        let util = require2("./util");
        module4.exports = addBorderSegments;
        function addBorderSegments(g) {
          function dfs(v) {
            let children = g.children(v);
            let node = g.node(v);
            if (children.length) {
              children.forEach(dfs);
            }
            if (Object.hasOwn(node, "minRank")) {
              node.borderLeft = [];
              node.borderRight = [];
              for (let rank = node.minRank, maxRank = node.maxRank + 1; rank < maxRank; ++rank) {
                addBorderNode(g, "borderLeft", "_bl", v, node, rank);
                addBorderNode(g, "borderRight", "_br", v, node, rank);
              }
            }
          }
          g.children().forEach(dfs);
        }
        function addBorderNode(g, prop, prefix, sg, sgNode, rank) {
          let label = { width: 0, height: 0, rank, borderType: prop };
          let prev = sgNode[prop][rank - 1];
          let curr = util.addDummyNode(g, "border", label, prefix);
          sgNode[prop][rank] = curr;
          g.setParent(curr, sg);
          if (prev) {
            g.setEdge(prev, curr, { weight: 1 });
          }
        }
      }, { "./util": 27 }], 4: [function(require2, module4, exports4) {
        "use strict";
        module4.exports = { adjust, undo };
        function adjust(g) {
          let rankDir = g.graph().rankdir.toLowerCase();
          if (rankDir === "lr" || rankDir === "rl") {
            swapWidthHeight(g);
          }
        }
        function undo(g) {
          let rankDir = g.graph().rankdir.toLowerCase();
          if (rankDir === "bt" || rankDir === "rl") {
            reverseY(g);
          }
          if (rankDir === "lr" || rankDir === "rl") {
            swapXY(g);
            swapWidthHeight(g);
          }
        }
        function swapWidthHeight(g) {
          g.nodes().forEach((v) => swapWidthHeightOne(g.node(v)));
          g.edges().forEach((e) => swapWidthHeightOne(g.edge(e)));
        }
        function swapWidthHeightOne(attrs) {
          let w = attrs.width;
          attrs.width = attrs.height;
          attrs.height = w;
        }
        function reverseY(g) {
          g.nodes().forEach((v) => reverseYOne(g.node(v)));
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            edge.points.forEach(reverseYOne);
            if (Object.hasOwn(edge, "y")) {
              reverseYOne(edge);
            }
          });
        }
        function reverseYOne(attrs) {
          attrs.y = -attrs.y;
        }
        function swapXY(g) {
          g.nodes().forEach((v) => swapXYOne(g.node(v)));
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            edge.points.forEach(swapXYOne);
            if (Object.hasOwn(edge, "x")) {
              swapXYOne(edge);
            }
          });
        }
        function swapXYOne(attrs) {
          let x = attrs.x;
          attrs.x = attrs.y;
          attrs.y = x;
        }
      }, {}], 5: [function(require2, module4, exports4) {
        class List {
          constructor() {
            let sentinel = {};
            sentinel._next = sentinel._prev = sentinel;
            this._sentinel = sentinel;
          }
          dequeue() {
            let sentinel = this._sentinel;
            let entry = sentinel._prev;
            if (entry !== sentinel) {
              unlink(entry);
              return entry;
            }
          }
          enqueue(entry) {
            let sentinel = this._sentinel;
            if (entry._prev && entry._next) {
              unlink(entry);
            }
            entry._next = sentinel._next;
            sentinel._next._prev = entry;
            sentinel._next = entry;
            entry._prev = sentinel;
          }
          toString() {
            let strs = [];
            let sentinel = this._sentinel;
            let curr = sentinel._prev;
            while (curr !== sentinel) {
              strs.push(JSON.stringify(curr, filterOutLinks));
              curr = curr._prev;
            }
            return "[" + strs.join(", ") + "]";
          }
        }
        function unlink(entry) {
          entry._prev._next = entry._next;
          entry._next._prev = entry._prev;
          delete entry._next;
          delete entry._prev;
        }
        function filterOutLinks(k, v) {
          if (k !== "_next" && k !== "_prev") {
            return v;
          }
        }
        module4.exports = List;
      }, {}], 6: [function(require2, module4, exports4) {
        let util = require2("./util");
        let Graph = require2("@dagrejs/graphlib").Graph;
        module4.exports = { debugOrdering };
        function debugOrdering(g) {
          let layerMatrix = util.buildLayerMatrix(g);
          let h = new Graph({ compound: true, multigraph: true }).setGraph({});
          g.nodes().forEach((v) => {
            h.setNode(v, { label: v });
            h.setParent(v, "layer" + g.node(v).rank);
          });
          g.edges().forEach((e) => h.setEdge(e.v, e.w, {}, e.name));
          layerMatrix.forEach((layer, i) => {
            let layerV = "layer" + i;
            h.setNode(layerV, { rank: "same" });
            layer.reduce((u, v) => {
              h.setEdge(u, v, { style: "invis" });
              return v;
            });
          });
          return h;
        }
      }, { "./util": 27, "@dagrejs/graphlib": 29 }], 7: [function(require2, module4, exports4) {
        let Graph = require2("@dagrejs/graphlib").Graph;
        let List = require2("./data/list");
        module4.exports = greedyFAS;
        let DEFAULT_WEIGHT_FN = () => 1;
        function greedyFAS(g, weightFn) {
          if (g.nodeCount() <= 1) {
            return [];
          }
          let state = buildState(g, weightFn || DEFAULT_WEIGHT_FN);
          let results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx);
          return results.flatMap((e) => g.outEdges(e.v, e.w));
        }
        function doGreedyFAS(g, buckets, zeroIdx) {
          let results = [];
          let sources = buckets[buckets.length - 1];
          let sinks = buckets[0];
          let entry;
          while (g.nodeCount()) {
            while (entry = sinks.dequeue()) {
              removeNode(g, buckets, zeroIdx, entry);
            }
            while (entry = sources.dequeue()) {
              removeNode(g, buckets, zeroIdx, entry);
            }
            if (g.nodeCount()) {
              for (let i = buckets.length - 2; i > 0; --i) {
                entry = buckets[i].dequeue();
                if (entry) {
                  results = results.concat(removeNode(g, buckets, zeroIdx, entry, true));
                  break;
                }
              }
            }
          }
          return results;
        }
        function removeNode(g, buckets, zeroIdx, entry, collectPredecessors) {
          let results = collectPredecessors ? [] : void 0;
          g.inEdges(entry.v).forEach((edge) => {
            let weight = g.edge(edge);
            let uEntry = g.node(edge.v);
            if (collectPredecessors) {
              results.push({ v: edge.v, w: edge.w });
            }
            uEntry.out -= weight;
            assignBucket(buckets, zeroIdx, uEntry);
          });
          g.outEdges(entry.v).forEach((edge) => {
            let weight = g.edge(edge);
            let w = edge.w;
            let wEntry = g.node(w);
            wEntry["in"] -= weight;
            assignBucket(buckets, zeroIdx, wEntry);
          });
          g.removeNode(entry.v);
          return results;
        }
        function buildState(g, weightFn) {
          let fasGraph = new Graph();
          let maxIn = 0;
          let maxOut = 0;
          g.nodes().forEach((v) => {
            fasGraph.setNode(v, { v, in: 0, out: 0 });
          });
          g.edges().forEach((e) => {
            let prevWeight = fasGraph.edge(e.v, e.w) || 0;
            let weight = weightFn(e);
            let edgeWeight = prevWeight + weight;
            fasGraph.setEdge(e.v, e.w, edgeWeight);
            maxOut = Math.max(maxOut, fasGraph.node(e.v).out += weight);
            maxIn = Math.max(maxIn, fasGraph.node(e.w)["in"] += weight);
          });
          let buckets = range(maxOut + maxIn + 3).map(() => new List());
          let zeroIdx = maxIn + 1;
          fasGraph.nodes().forEach((v) => {
            assignBucket(buckets, zeroIdx, fasGraph.node(v));
          });
          return { graph: fasGraph, buckets, zeroIdx };
        }
        function assignBucket(buckets, zeroIdx, entry) {
          if (!entry.out) {
            buckets[0].enqueue(entry);
          } else if (!entry["in"]) {
            buckets[buckets.length - 1].enqueue(entry);
          } else {
            buckets[entry.out - entry["in"] + zeroIdx].enqueue(entry);
          }
        }
        function range(limit) {
          const range2 = [];
          for (let i = 0; i < limit; i++) {
            range2.push(i);
          }
          return range2;
        }
      }, { "./data/list": 5, "@dagrejs/graphlib": 29 }], 8: [function(require2, module4, exports4) {
        "use strict";
        let acyclic = require2("./acyclic");
        let normalize = require2("./normalize");
        let rank = require2("./rank");
        let normalizeRanks = require2("./util").normalizeRanks;
        let parentDummyChains = require2("./parent-dummy-chains");
        let removeEmptyRanks = require2("./util").removeEmptyRanks;
        let nestingGraph = require2("./nesting-graph");
        let addBorderSegments = require2("./add-border-segments");
        let coordinateSystem = require2("./coordinate-system");
        let order = require2("./order");
        let position = require2("./position");
        let util = require2("./util");
        let Graph = require2("@dagrejs/graphlib").Graph;
        module4.exports = layout;
        function layout(g, opts) {
          let time = opts && opts.debugTiming ? util.time : util.notime;
          time("layout", () => {
            let layoutGraph = time("  buildLayoutGraph", () => buildLayoutGraph(g));
            time("  runLayout", () => runLayout(layoutGraph, time, opts));
            time("  updateInputGraph", () => updateInputGraph(g, layoutGraph));
          });
        }
        function runLayout(g, time, opts) {
          time("    makeSpaceForEdgeLabels", () => makeSpaceForEdgeLabels(g));
          time("    removeSelfEdges", () => removeSelfEdges(g));
          time("    acyclic", () => acyclic.run(g));
          time("    nestingGraph.run", () => nestingGraph.run(g));
          time("    rank", () => rank(util.asNonCompoundGraph(g)));
          time("    injectEdgeLabelProxies", () => injectEdgeLabelProxies(g));
          time("    removeEmptyRanks", () => removeEmptyRanks(g));
          time("    nestingGraph.cleanup", () => nestingGraph.cleanup(g));
          time("    normalizeRanks", () => normalizeRanks(g));
          time("    assignRankMinMax", () => assignRankMinMax(g));
          time("    removeEdgeLabelProxies", () => removeEdgeLabelProxies(g));
          time("    normalize.run", () => normalize.run(g));
          time("    parentDummyChains", () => parentDummyChains(g));
          time("    addBorderSegments", () => addBorderSegments(g));
          time("    order", () => order(g, opts));
          time("    insertSelfEdges", () => insertSelfEdges(g));
          time("    adjustCoordinateSystem", () => coordinateSystem.adjust(g));
          time("    position", () => position(g));
          time("    positionSelfEdges", () => positionSelfEdges(g));
          time("    removeBorderNodes", () => removeBorderNodes(g));
          time("    normalize.undo", () => normalize.undo(g));
          time("    fixupEdgeLabelCoords", () => fixupEdgeLabelCoords(g));
          time("    undoCoordinateSystem", () => coordinateSystem.undo(g));
          time("    translateGraph", () => translateGraph(g));
          time("    assignNodeIntersects", () => assignNodeIntersects(g));
          time("    reversePoints", () => reversePointsForReversedEdges(g));
          time("    acyclic.undo", () => acyclic.undo(g));
        }
        function updateInputGraph(inputGraph, layoutGraph) {
          inputGraph.nodes().forEach((v) => {
            let inputLabel = inputGraph.node(v);
            let layoutLabel = layoutGraph.node(v);
            if (inputLabel) {
              inputLabel.x = layoutLabel.x;
              inputLabel.y = layoutLabel.y;
              inputLabel.rank = layoutLabel.rank;
              if (layoutGraph.children(v).length) {
                inputLabel.width = layoutLabel.width;
                inputLabel.height = layoutLabel.height;
              }
            }
          });
          inputGraph.edges().forEach((e) => {
            let inputLabel = inputGraph.edge(e);
            let layoutLabel = layoutGraph.edge(e);
            inputLabel.points = layoutLabel.points;
            if (Object.hasOwn(layoutLabel, "x")) {
              inputLabel.x = layoutLabel.x;
              inputLabel.y = layoutLabel.y;
            }
          });
          inputGraph.graph().width = layoutGraph.graph().width;
          inputGraph.graph().height = layoutGraph.graph().height;
        }
        let graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
        let graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
        let graphAttrs = ["acyclicer", "ranker", "rankdir", "align"];
        let nodeNumAttrs = ["width", "height"];
        let nodeDefaults = { width: 0, height: 0 };
        let edgeNumAttrs = ["minlen", "weight", "width", "height", "labeloffset"];
        let edgeDefaults = { minlen: 1, weight: 1, width: 0, height: 0, labeloffset: 10, labelpos: "r" };
        let edgeAttrs = ["labelpos"];
        function buildLayoutGraph(inputGraph) {
          let g = new Graph({ multigraph: true, compound: true });
          let graph = canonicalize(inputGraph.graph());
          g.setGraph(Object.assign({}, graphDefaults, selectNumberAttrs(graph, graphNumAttrs), util.pick(graph, graphAttrs)));
          inputGraph.nodes().forEach((v) => {
            let node = canonicalize(inputGraph.node(v));
            const newNode = selectNumberAttrs(node, nodeNumAttrs);
            Object.keys(nodeDefaults).forEach((k) => {
              if (newNode[k] === void 0) {
                newNode[k] = nodeDefaults[k];
              }
            });
            g.setNode(v, newNode);
            g.setParent(v, inputGraph.parent(v));
          });
          inputGraph.edges().forEach((e) => {
            let edge = canonicalize(inputGraph.edge(e));
            g.setEdge(e, Object.assign({}, edgeDefaults, selectNumberAttrs(edge, edgeNumAttrs), util.pick(edge, edgeAttrs)));
          });
          return g;
        }
        function makeSpaceForEdgeLabels(g) {
          let graph = g.graph();
          graph.ranksep /= 2;
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            edge.minlen *= 2;
            if (edge.labelpos.toLowerCase() !== "c") {
              if (graph.rankdir === "TB" || graph.rankdir === "BT") {
                edge.width += edge.labeloffset;
              } else {
                edge.height += edge.labeloffset;
              }
            }
          });
        }
        function injectEdgeLabelProxies(g) {
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            if (edge.width && edge.height) {
              let v = g.node(e.v);
              let w = g.node(e.w);
              let label = { rank: (w.rank - v.rank) / 2 + v.rank, e };
              util.addDummyNode(g, "edge-proxy", label, "_ep");
            }
          });
        }
        function assignRankMinMax(g) {
          let maxRank = 0;
          g.nodes().forEach((v) => {
            let node = g.node(v);
            if (node.borderTop) {
              node.minRank = g.node(node.borderTop).rank;
              node.maxRank = g.node(node.borderBottom).rank;
              maxRank = Math.max(maxRank, node.maxRank);
            }
          });
          g.graph().maxRank = maxRank;
        }
        function removeEdgeLabelProxies(g) {
          g.nodes().forEach((v) => {
            let node = g.node(v);
            if (node.dummy === "edge-proxy") {
              g.edge(node.e).labelRank = node.rank;
              g.removeNode(v);
            }
          });
        }
        function translateGraph(g) {
          let minX = Number.POSITIVE_INFINITY;
          let maxX = 0;
          let minY = Number.POSITIVE_INFINITY;
          let maxY = 0;
          let graphLabel = g.graph();
          let marginX = graphLabel.marginx || 0;
          let marginY = graphLabel.marginy || 0;
          function getExtremes(attrs) {
            let x = attrs.x;
            let y = attrs.y;
            let w = attrs.width;
            let h = attrs.height;
            minX = Math.min(minX, x - w / 2);
            maxX = Math.max(maxX, x + w / 2);
            minY = Math.min(minY, y - h / 2);
            maxY = Math.max(maxY, y + h / 2);
          }
          g.nodes().forEach((v) => getExtremes(g.node(v)));
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            if (Object.hasOwn(edge, "x")) {
              getExtremes(edge);
            }
          });
          minX -= marginX;
          minY -= marginY;
          g.nodes().forEach((v) => {
            let node = g.node(v);
            node.x -= minX;
            node.y -= minY;
          });
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            edge.points.forEach((p) => {
              p.x -= minX;
              p.y -= minY;
            });
            if (Object.hasOwn(edge, "x")) {
              edge.x -= minX;
            }
            if (Object.hasOwn(edge, "y")) {
              edge.y -= minY;
            }
          });
          graphLabel.width = maxX - minX + marginX;
          graphLabel.height = maxY - minY + marginY;
        }
        function assignNodeIntersects(g) {
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            let nodeV = g.node(e.v);
            let nodeW = g.node(e.w);
            let p1, p2;
            if (!edge.points) {
              edge.points = [];
              p1 = nodeW;
              p2 = nodeV;
            } else {
              p1 = edge.points[0];
              p2 = edge.points[edge.points.length - 1];
            }
            edge.points.unshift(util.intersectRect(nodeV, p1));
            edge.points.push(util.intersectRect(nodeW, p2));
          });
        }
        function fixupEdgeLabelCoords(g) {
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            if (Object.hasOwn(edge, "x")) {
              if (edge.labelpos === "l" || edge.labelpos === "r") {
                edge.width -= edge.labeloffset;
              }
              switch (edge.labelpos) {
                case "l":
                  edge.x -= edge.width / 2 + edge.labeloffset;
                  break;
                case "r":
                  edge.x += edge.width / 2 + edge.labeloffset;
                  break;
              }
            }
          });
        }
        function reversePointsForReversedEdges(g) {
          g.edges().forEach((e) => {
            let edge = g.edge(e);
            if (edge.reversed) {
              edge.points.reverse();
            }
          });
        }
        function removeBorderNodes(g) {
          g.nodes().forEach((v) => {
            if (g.children(v).length) {
              let node = g.node(v);
              let t = g.node(node.borderTop);
              let b = g.node(node.borderBottom);
              let l = g.node(node.borderLeft[node.borderLeft.length - 1]);
              let r = g.node(node.borderRight[node.borderRight.length - 1]);
              node.width = Math.abs(r.x - l.x);
              node.height = Math.abs(b.y - t.y);
              node.x = l.x + node.width / 2;
              node.y = t.y + node.height / 2;
            }
          });
          g.nodes().forEach((v) => {
            if (g.node(v).dummy === "border") {
              g.removeNode(v);
            }
          });
        }
        function removeSelfEdges(g) {
          g.edges().forEach((e) => {
            if (e.v === e.w) {
              var node = g.node(e.v);
              if (!node.selfEdges) {
                node.selfEdges = [];
              }
              node.selfEdges.push({ e, label: g.edge(e) });
              g.removeEdge(e);
            }
          });
        }
        function insertSelfEdges(g) {
          var layers = util.buildLayerMatrix(g);
          layers.forEach((layer) => {
            var orderShift = 0;
            layer.forEach((v, i) => {
              var node = g.node(v);
              node.order = i + orderShift;
              (node.selfEdges || []).forEach((selfEdge) => {
                util.addDummyNode(g, "selfedge", { width: selfEdge.label.width, height: selfEdge.label.height, rank: node.rank, order: i + ++orderShift, e: selfEdge.e, label: selfEdge.label }, "_se");
              });
              delete node.selfEdges;
            });
          });
        }
        function positionSelfEdges(g) {
          g.nodes().forEach((v) => {
            var node = g.node(v);
            if (node.dummy === "selfedge") {
              var selfNode = g.node(node.e.v);
              var x = selfNode.x + selfNode.width / 2;
              var y = selfNode.y;
              var dx = node.x - x;
              var dy = selfNode.height / 2;
              g.setEdge(node.e, node.label);
              g.removeNode(v);
              node.label.points = [{ x: x + 2 * dx / 3, y: y - dy }, { x: x + 5 * dx / 6, y: y - dy }, { x: x + dx, y }, { x: x + 5 * dx / 6, y: y + dy }, { x: x + 2 * dx / 3, y: y + dy }];
              node.label.x = node.x;
              node.label.y = node.y;
            }
          });
        }
        function selectNumberAttrs(obj, attrs) {
          return util.mapValues(util.pick(obj, attrs), Number);
        }
        function canonicalize(attrs) {
          var newAttrs = {};
          if (attrs) {
            Object.entries(attrs).forEach(([k, v]) => {
              if (typeof k === "string") {
                k = k.toLowerCase();
              }
              newAttrs[k] = v;
            });
          }
          return newAttrs;
        }
      }, { "./acyclic": 2, "./add-border-segments": 3, "./coordinate-system": 4, "./nesting-graph": 9, "./normalize": 10, "./order": 15, "./parent-dummy-chains": 20, "./position": 22, "./rank": 24, "./util": 27, "@dagrejs/graphlib": 29 }], 9: [function(require2, module4, exports4) {
        let util = require2("./util");
        module4.exports = { run, cleanup };
        function run(g) {
          let root = util.addDummyNode(g, "root", {}, "_root");
          let depths = treeDepths(g);
          let depthsArr = Object.values(depths);
          let height = util.applyWithChunking(Math.max, depthsArr) - 1;
          let nodeSep = 2 * height + 1;
          g.graph().nestingRoot = root;
          g.edges().forEach((e) => g.edge(e).minlen *= nodeSep);
          let weight = sumWeights(g) + 1;
          g.children().forEach((child) => dfs(g, root, nodeSep, weight, height, depths, child));
          g.graph().nodeRankFactor = nodeSep;
        }
        function dfs(g, root, nodeSep, weight, height, depths, v) {
          let children = g.children(v);
          if (!children.length) {
            if (v !== root) {
              g.setEdge(root, v, { weight: 0, minlen: nodeSep });
            }
            return;
          }
          let top = util.addBorderNode(g, "_bt");
          let bottom = util.addBorderNode(g, "_bb");
          let label = g.node(v);
          g.setParent(top, v);
          label.borderTop = top;
          g.setParent(bottom, v);
          label.borderBottom = bottom;
          children.forEach((child) => {
            dfs(g, root, nodeSep, weight, height, depths, child);
            let childNode = g.node(child);
            let childTop = childNode.borderTop ? childNode.borderTop : child;
            let childBottom = childNode.borderBottom ? childNode.borderBottom : child;
            let thisWeight = childNode.borderTop ? weight : 2 * weight;
            let minlen = childTop !== childBottom ? 1 : height - depths[v] + 1;
            g.setEdge(top, childTop, { weight: thisWeight, minlen, nestingEdge: true });
            g.setEdge(childBottom, bottom, { weight: thisWeight, minlen, nestingEdge: true });
          });
          if (!g.parent(v)) {
            g.setEdge(root, top, { weight: 0, minlen: height + depths[v] });
          }
        }
        function treeDepths(g) {
          var depths = {};
          function dfs2(v, depth) {
            var children = g.children(v);
            if (children && children.length) {
              children.forEach((child) => dfs2(child, depth + 1));
            }
            depths[v] = depth;
          }
          g.children().forEach((v) => dfs2(v, 1));
          return depths;
        }
        function sumWeights(g) {
          return g.edges().reduce((acc, e) => acc + g.edge(e).weight, 0);
        }
        function cleanup(g) {
          var graphLabel = g.graph();
          g.removeNode(graphLabel.nestingRoot);
          delete graphLabel.nestingRoot;
          g.edges().forEach((e) => {
            var edge = g.edge(e);
            if (edge.nestingEdge) {
              g.removeEdge(e);
            }
          });
        }
      }, { "./util": 27 }], 10: [function(require2, module4, exports4) {
        "use strict";
        let util = require2("./util");
        module4.exports = { run, undo };
        function run(g) {
          g.graph().dummyChains = [];
          g.edges().forEach((edge) => normalizeEdge(g, edge));
        }
        function normalizeEdge(g, e) {
          let v = e.v;
          let vRank = g.node(v).rank;
          let w = e.w;
          let wRank = g.node(w).rank;
          let name = e.name;
          let edgeLabel = g.edge(e);
          let labelRank = edgeLabel.labelRank;
          if (wRank === vRank + 1) return;
          g.removeEdge(e);
          let dummy, attrs, i;
          for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
            edgeLabel.points = [];
            attrs = { width: 0, height: 0, edgeLabel, edgeObj: e, rank: vRank };
            dummy = util.addDummyNode(g, "edge", attrs, "_d");
            if (vRank === labelRank) {
              attrs.width = edgeLabel.width;
              attrs.height = edgeLabel.height;
              attrs.dummy = "edge-label";
              attrs.labelpos = edgeLabel.labelpos;
            }
            g.setEdge(v, dummy, { weight: edgeLabel.weight }, name);
            if (i === 0) {
              g.graph().dummyChains.push(dummy);
            }
            v = dummy;
          }
          g.setEdge(v, w, { weight: edgeLabel.weight }, name);
        }
        function undo(g) {
          g.graph().dummyChains.forEach((v) => {
            let node = g.node(v);
            let origLabel = node.edgeLabel;
            let w;
            g.setEdge(node.edgeObj, origLabel);
            while (node.dummy) {
              w = g.successors(v)[0];
              g.removeNode(v);
              origLabel.points.push({ x: node.x, y: node.y });
              if (node.dummy === "edge-label") {
                origLabel.x = node.x;
                origLabel.y = node.y;
                origLabel.width = node.width;
                origLabel.height = node.height;
              }
              v = w;
              node = g.node(v);
            }
          });
        }
      }, { "./util": 27 }], 11: [function(require2, module4, exports4) {
        module4.exports = addSubgraphConstraints;
        function addSubgraphConstraints(g, cg, vs) {
          let prev = {}, rootPrev;
          vs.forEach((v) => {
            let child = g.parent(v), parent, prevChild;
            while (child) {
              parent = g.parent(child);
              if (parent) {
                prevChild = prev[parent];
                prev[parent] = child;
              } else {
                prevChild = rootPrev;
                rootPrev = child;
              }
              if (prevChild && prevChild !== child) {
                cg.setEdge(prevChild, child);
                return;
              }
              child = parent;
            }
          });
        }
      }, {}], 12: [function(require2, module4, exports4) {
        module4.exports = barycenter;
        function barycenter(g, movable = []) {
          return movable.map((v) => {
            let inV = g.inEdges(v);
            if (!inV.length) {
              return { v };
            } else {
              let result = inV.reduce((acc, e) => {
                let edge = g.edge(e), nodeU = g.node(e.v);
                return { sum: acc.sum + edge.weight * nodeU.order, weight: acc.weight + edge.weight };
              }, { sum: 0, weight: 0 });
              return { v, barycenter: result.sum / result.weight, weight: result.weight };
            }
          });
        }
      }, {}], 13: [function(require2, module4, exports4) {
        let Graph = require2("@dagrejs/graphlib").Graph;
        let util = require2("../util");
        module4.exports = buildLayerGraph;
        function buildLayerGraph(g, rank, relationship) {
          let root = createRootNode(g), result = new Graph({ compound: true }).setGraph({ root }).setDefaultNodeLabel((v) => g.node(v));
          g.nodes().forEach((v) => {
            let node = g.node(v), parent = g.parent(v);
            if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
              result.setNode(v);
              result.setParent(v, parent || root);
              g[relationship](v).forEach((e) => {
                let u = e.v === v ? e.w : e.v, edge = result.edge(u, v), weight = edge !== void 0 ? edge.weight : 0;
                result.setEdge(u, v, { weight: g.edge(e).weight + weight });
              });
              if (Object.hasOwn(node, "minRank")) {
                result.setNode(v, { borderLeft: node.borderLeft[rank], borderRight: node.borderRight[rank] });
              }
            }
          });
          return result;
        }
        function createRootNode(g) {
          var v;
          while (g.hasNode(v = util.uniqueId("_root"))) ;
          return v;
        }
      }, { "../util": 27, "@dagrejs/graphlib": 29 }], 14: [function(require2, module4, exports4) {
        "use strict";
        let zipObject = require2("../util").zipObject;
        module4.exports = crossCount;
        function crossCount(g, layering) {
          let cc = 0;
          for (let i = 1; i < layering.length; ++i) {
            cc += twoLayerCrossCount(g, layering[i - 1], layering[i]);
          }
          return cc;
        }
        function twoLayerCrossCount(g, northLayer, southLayer) {
          let southPos = zipObject(southLayer, southLayer.map((v, i) => i));
          let southEntries = northLayer.flatMap((v) => {
            return g.outEdges(v).map((e) => {
              return { pos: southPos[e.w], weight: g.edge(e).weight };
            }).sort((a, b) => a.pos - b.pos);
          });
          let firstIndex = 1;
          while (firstIndex < southLayer.length) firstIndex <<= 1;
          let treeSize = 2 * firstIndex - 1;
          firstIndex -= 1;
          let tree = new Array(treeSize).fill(0);
          let cc = 0;
          southEntries.forEach((entry) => {
            let index = entry.pos + firstIndex;
            tree[index] += entry.weight;
            let weightSum = 0;
            while (index > 0) {
              if (index % 2) {
                weightSum += tree[index + 1];
              }
              index = index - 1 >> 1;
              tree[index] += entry.weight;
            }
            cc += entry.weight * weightSum;
          });
          return cc;
        }
      }, { "../util": 27 }], 15: [function(require2, module4, exports4) {
        "use strict";
        let initOrder = require2("./init-order");
        let crossCount = require2("./cross-count");
        let sortSubgraph = require2("./sort-subgraph");
        let buildLayerGraph = require2("./build-layer-graph");
        let addSubgraphConstraints = require2("./add-subgraph-constraints");
        let Graph = require2("@dagrejs/graphlib").Graph;
        let util = require2("../util");
        module4.exports = order;
        function order(g, opts) {
          if (opts && typeof opts.customOrder === "function") {
            opts.customOrder(g, order);
            return;
          }
          let maxRank = util.maxRank(g), downLayerGraphs = buildLayerGraphs(g, util.range(1, maxRank + 1), "inEdges"), upLayerGraphs = buildLayerGraphs(g, util.range(maxRank - 1, -1, -1), "outEdges");
          let layering = initOrder(g);
          assignOrder(g, layering);
          if (opts && opts.disableOptimalOrderHeuristic) {
            return;
          }
          let bestCC = Number.POSITIVE_INFINITY, best;
          for (let i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
            sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);
            layering = util.buildLayerMatrix(g);
            let cc = crossCount(g, layering);
            if (cc < bestCC) {
              lastBest = 0;
              best = Object.assign({}, layering);
              bestCC = cc;
            }
          }
          assignOrder(g, best);
        }
        function buildLayerGraphs(g, ranks, relationship) {
          return ranks.map(function(rank) {
            return buildLayerGraph(g, rank, relationship);
          });
        }
        function sweepLayerGraphs(layerGraphs, biasRight) {
          let cg = new Graph();
          layerGraphs.forEach(function(lg) {
            let root = lg.graph().root;
            let sorted = sortSubgraph(lg, root, cg, biasRight);
            sorted.vs.forEach((v, i) => lg.node(v).order = i);
            addSubgraphConstraints(lg, cg, sorted.vs);
          });
        }
        function assignOrder(g, layering) {
          Object.values(layering).forEach((layer) => layer.forEach((v, i) => g.node(v).order = i));
        }
      }, { "../util": 27, "./add-subgraph-constraints": 11, "./build-layer-graph": 13, "./cross-count": 14, "./init-order": 16, "./sort-subgraph": 18, "@dagrejs/graphlib": 29 }], 16: [function(require2, module4, exports4) {
        "use strict";
        let util = require2("../util");
        module4.exports = initOrder;
        function initOrder(g) {
          let visited = {};
          let simpleNodes = g.nodes().filter((v) => !g.children(v).length);
          let simpleNodesRanks = simpleNodes.map((v) => g.node(v).rank);
          let maxRank = util.applyWithChunking(Math.max, simpleNodesRanks);
          let layers = util.range(maxRank + 1).map(() => []);
          function dfs(v) {
            if (visited[v]) return;
            visited[v] = true;
            let node = g.node(v);
            layers[node.rank].push(v);
            g.successors(v).forEach(dfs);
          }
          let orderedVs = simpleNodes.sort((a, b) => g.node(a).rank - g.node(b).rank);
          orderedVs.forEach(dfs);
          return layers;
        }
      }, { "../util": 27 }], 17: [function(require2, module4, exports4) {
        "use strict";
        let util = require2("../util");
        module4.exports = resolveConflicts;
        function resolveConflicts(entries, cg) {
          let mappedEntries = {};
          entries.forEach((entry, i) => {
            let tmp = mappedEntries[entry.v] = { indegree: 0, in: [], out: [], vs: [entry.v], i };
            if (entry.barycenter !== void 0) {
              tmp.barycenter = entry.barycenter;
              tmp.weight = entry.weight;
            }
          });
          cg.edges().forEach((e) => {
            let entryV = mappedEntries[e.v];
            let entryW = mappedEntries[e.w];
            if (entryV !== void 0 && entryW !== void 0) {
              entryW.indegree++;
              entryV.out.push(mappedEntries[e.w]);
            }
          });
          let sourceSet = Object.values(mappedEntries).filter((entry) => !entry.indegree);
          return doResolveConflicts(sourceSet);
        }
        function doResolveConflicts(sourceSet) {
          let entries = [];
          function handleIn(vEntry) {
            return (uEntry) => {
              if (uEntry.merged) {
                return;
              }
              if (uEntry.barycenter === void 0 || vEntry.barycenter === void 0 || uEntry.barycenter >= vEntry.barycenter) {
                mergeEntries(vEntry, uEntry);
              }
            };
          }
          function handleOut(vEntry) {
            return (wEntry) => {
              wEntry["in"].push(vEntry);
              if (--wEntry.indegree === 0) {
                sourceSet.push(wEntry);
              }
            };
          }
          while (sourceSet.length) {
            let entry = sourceSet.pop();
            entries.push(entry);
            entry["in"].reverse().forEach(handleIn(entry));
            entry.out.forEach(handleOut(entry));
          }
          return entries.filter((entry) => !entry.merged).map((entry) => {
            return util.pick(entry, ["vs", "i", "barycenter", "weight"]);
          });
        }
        function mergeEntries(target, source) {
          let sum = 0;
          let weight = 0;
          if (target.weight) {
            sum += target.barycenter * target.weight;
            weight += target.weight;
          }
          if (source.weight) {
            sum += source.barycenter * source.weight;
            weight += source.weight;
          }
          target.vs = source.vs.concat(target.vs);
          target.barycenter = sum / weight;
          target.weight = weight;
          target.i = Math.min(source.i, target.i);
          source.merged = true;
        }
      }, { "../util": 27 }], 18: [function(require2, module4, exports4) {
        let barycenter = require2("./barycenter");
        let resolveConflicts = require2("./resolve-conflicts");
        let sort = require2("./sort");
        module4.exports = sortSubgraph;
        function sortSubgraph(g, v, cg, biasRight) {
          let movable = g.children(v);
          let node = g.node(v);
          let bl = node ? node.borderLeft : void 0;
          let br = node ? node.borderRight : void 0;
          let subgraphs = {};
          if (bl) {
            movable = movable.filter((w) => w !== bl && w !== br);
          }
          let barycenters = barycenter(g, movable);
          barycenters.forEach((entry) => {
            if (g.children(entry.v).length) {
              let subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
              subgraphs[entry.v] = subgraphResult;
              if (Object.hasOwn(subgraphResult, "barycenter")) {
                mergeBarycenters(entry, subgraphResult);
              }
            }
          });
          let entries = resolveConflicts(barycenters, cg);
          expandSubgraphs(entries, subgraphs);
          let result = sort(entries, biasRight);
          if (bl) {
            result.vs = [bl, result.vs, br].flat(true);
            if (g.predecessors(bl).length) {
              let blPred = g.node(g.predecessors(bl)[0]), brPred = g.node(g.predecessors(br)[0]);
              if (!Object.hasOwn(result, "barycenter")) {
                result.barycenter = 0;
                result.weight = 0;
              }
              result.barycenter = (result.barycenter * result.weight + blPred.order + brPred.order) / (result.weight + 2);
              result.weight += 2;
            }
          }
          return result;
        }
        function expandSubgraphs(entries, subgraphs) {
          entries.forEach((entry) => {
            entry.vs = entry.vs.flatMap((v) => {
              if (subgraphs[v]) {
                return subgraphs[v].vs;
              }
              return v;
            });
          });
        }
        function mergeBarycenters(target, other) {
          if (target.barycenter !== void 0) {
            target.barycenter = (target.barycenter * target.weight + other.barycenter * other.weight) / (target.weight + other.weight);
            target.weight += other.weight;
          } else {
            target.barycenter = other.barycenter;
            target.weight = other.weight;
          }
        }
      }, { "./barycenter": 12, "./resolve-conflicts": 17, "./sort": 19 }], 19: [function(require2, module4, exports4) {
        let util = require2("../util");
        module4.exports = sort;
        function sort(entries, biasRight) {
          let parts = util.partition(entries, (entry) => {
            return Object.hasOwn(entry, "barycenter");
          });
          let sortable = parts.lhs, unsortable = parts.rhs.sort((a, b) => b.i - a.i), vs = [], sum = 0, weight = 0, vsIndex = 0;
          sortable.sort(compareWithBias(!!biasRight));
          vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
          sortable.forEach((entry) => {
            vsIndex += entry.vs.length;
            vs.push(entry.vs);
            sum += entry.barycenter * entry.weight;
            weight += entry.weight;
            vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
          });
          let result = { vs: vs.flat(true) };
          if (weight) {
            result.barycenter = sum / weight;
            result.weight = weight;
          }
          return result;
        }
        function consumeUnsortable(vs, unsortable, index) {
          let last;
          while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
            unsortable.pop();
            vs.push(last.vs);
            index++;
          }
          return index;
        }
        function compareWithBias(bias) {
          return (entryV, entryW) => {
            if (entryV.barycenter < entryW.barycenter) {
              return -1;
            } else if (entryV.barycenter > entryW.barycenter) {
              return 1;
            }
            return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
          };
        }
      }, { "../util": 27 }], 20: [function(require2, module4, exports4) {
        module4.exports = parentDummyChains;
        function parentDummyChains(g) {
          let postorderNums = postorder(g);
          g.graph().dummyChains.forEach((v) => {
            let node = g.node(v);
            let edgeObj = node.edgeObj;
            let pathData = findPath(g, postorderNums, edgeObj.v, edgeObj.w);
            let path2 = pathData.path;
            let lca = pathData.lca;
            let pathIdx = 0;
            let pathV = path2[pathIdx];
            let ascending = true;
            while (v !== edgeObj.w) {
              node = g.node(v);
              if (ascending) {
                while ((pathV = path2[pathIdx]) !== lca && g.node(pathV).maxRank < node.rank) {
                  pathIdx++;
                }
                if (pathV === lca) {
                  ascending = false;
                }
              }
              if (!ascending) {
                while (pathIdx < path2.length - 1 && g.node(pathV = path2[pathIdx + 1]).minRank <= node.rank) {
                  pathIdx++;
                }
                pathV = path2[pathIdx];
              }
              g.setParent(v, pathV);
              v = g.successors(v)[0];
            }
          });
        }
        function findPath(g, postorderNums, v, w) {
          let vPath = [];
          let wPath = [];
          let low = Math.min(postorderNums[v].low, postorderNums[w].low);
          let lim = Math.max(postorderNums[v].lim, postorderNums[w].lim);
          let parent;
          let lca;
          parent = v;
          do {
            parent = g.parent(parent);
            vPath.push(parent);
          } while (parent && (postorderNums[parent].low > low || lim > postorderNums[parent].lim));
          lca = parent;
          parent = w;
          while ((parent = g.parent(parent)) !== lca) {
            wPath.push(parent);
          }
          return { path: vPath.concat(wPath.reverse()), lca };
        }
        function postorder(g) {
          let result = {};
          let lim = 0;
          function dfs(v) {
            let low = lim;
            g.children(v).forEach(dfs);
            result[v] = { low, lim: lim++ };
          }
          g.children().forEach(dfs);
          return result;
        }
      }, {}], 21: [function(require2, module4, exports4) {
        "use strict";
        let Graph = require2("@dagrejs/graphlib").Graph;
        let util = require2("../util");
        module4.exports = { positionX, findType1Conflicts, findType2Conflicts, addConflict, hasConflict, verticalAlignment, horizontalCompaction, alignCoordinates, findSmallestWidthAlignment, balance };
        function findType1Conflicts(g, layering) {
          let conflicts = {};
          function visitLayer(prevLayer, layer) {
            let k0 = 0, scanPos = 0, prevLayerLength = prevLayer.length, lastNode = layer[layer.length - 1];
            layer.forEach((v, i) => {
              let w = findOtherInnerSegmentNode(g, v), k1 = w ? g.node(w).order : prevLayerLength;
              if (w || v === lastNode) {
                layer.slice(scanPos, i + 1).forEach((scanNode) => {
                  g.predecessors(scanNode).forEach((u) => {
                    let uLabel = g.node(u), uPos = uLabel.order;
                    if ((uPos < k0 || k1 < uPos) && !(uLabel.dummy && g.node(scanNode).dummy)) {
                      addConflict(conflicts, u, scanNode);
                    }
                  });
                });
                scanPos = i + 1;
                k0 = k1;
              }
            });
            return layer;
          }
          layering.length && layering.reduce(visitLayer);
          return conflicts;
        }
        function findType2Conflicts(g, layering) {
          let conflicts = {};
          function scan(south, southPos, southEnd, prevNorthBorder, nextNorthBorder) {
            let v;
            util.range(southPos, southEnd).forEach((i) => {
              v = south[i];
              if (g.node(v).dummy) {
                g.predecessors(v).forEach((u) => {
                  let uNode = g.node(u);
                  if (uNode.dummy && (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)) {
                    addConflict(conflicts, u, v);
                  }
                });
              }
            });
          }
          function visitLayer(north, south) {
            let prevNorthPos = -1, nextNorthPos, southPos = 0;
            south.forEach((v, southLookahead) => {
              if (g.node(v).dummy === "border") {
                let predecessors = g.predecessors(v);
                if (predecessors.length) {
                  nextNorthPos = g.node(predecessors[0]).order;
                  scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos);
                  southPos = southLookahead;
                  prevNorthPos = nextNorthPos;
                }
              }
              scan(south, southPos, south.length, nextNorthPos, north.length);
            });
            return south;
          }
          layering.length && layering.reduce(visitLayer);
          return conflicts;
        }
        function findOtherInnerSegmentNode(g, v) {
          if (g.node(v).dummy) {
            return g.predecessors(v).find((u) => g.node(u).dummy);
          }
        }
        function addConflict(conflicts, v, w) {
          if (v > w) {
            let tmp = v;
            v = w;
            w = tmp;
          }
          let conflictsV = conflicts[v];
          if (!conflictsV) {
            conflicts[v] = conflictsV = {};
          }
          conflictsV[w] = true;
        }
        function hasConflict(conflicts, v, w) {
          if (v > w) {
            let tmp = v;
            v = w;
            w = tmp;
          }
          return !!conflicts[v] && Object.hasOwn(conflicts[v], w);
        }
        function verticalAlignment(g, layering, conflicts, neighborFn) {
          let root = {}, align = {}, pos = {};
          layering.forEach((layer) => {
            layer.forEach((v, order) => {
              root[v] = v;
              align[v] = v;
              pos[v] = order;
            });
          });
          layering.forEach((layer) => {
            let prevIdx = -1;
            layer.forEach((v) => {
              let ws = neighborFn(v);
              if (ws.length) {
                ws = ws.sort((a, b) => pos[a] - pos[b]);
                let mp = (ws.length - 1) / 2;
                for (let i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
                  let w = ws[i];
                  if (align[v] === v && prevIdx < pos[w] && !hasConflict(conflicts, v, w)) {
                    align[w] = v;
                    align[v] = root[v] = root[w];
                    prevIdx = pos[w];
                  }
                }
              }
            });
          });
          return { root, align };
        }
        function horizontalCompaction(g, layering, root, align, reverseSep) {
          let xs = {}, blockG = buildBlockGraph(g, layering, root, reverseSep), borderType = reverseSep ? "borderLeft" : "borderRight";
          function iterate(setXsFunc, nextNodesFunc) {
            let stack = blockG.nodes();
            let elem = stack.pop();
            let visited = {};
            while (elem) {
              if (visited[elem]) {
                setXsFunc(elem);
              } else {
                visited[elem] = true;
                stack.push(elem);
                stack = stack.concat(nextNodesFunc(elem));
              }
              elem = stack.pop();
            }
          }
          function pass1(elem) {
            xs[elem] = blockG.inEdges(elem).reduce((acc, e) => {
              return Math.max(acc, xs[e.v] + blockG.edge(e));
            }, 0);
          }
          function pass2(elem) {
            let min = blockG.outEdges(elem).reduce((acc, e) => {
              return Math.min(acc, xs[e.w] - blockG.edge(e));
            }, Number.POSITIVE_INFINITY);
            let node = g.node(elem);
            if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
              xs[elem] = Math.max(xs[elem], min);
            }
          }
          iterate(pass1, blockG.predecessors.bind(blockG));
          iterate(pass2, blockG.successors.bind(blockG));
          Object.keys(align).forEach((v) => xs[v] = xs[root[v]]);
          return xs;
        }
        function buildBlockGraph(g, layering, root, reverseSep) {
          let blockGraph = new Graph(), graphLabel = g.graph(), sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);
          layering.forEach((layer) => {
            let u;
            layer.forEach((v) => {
              let vRoot = root[v];
              blockGraph.setNode(vRoot);
              if (u) {
                var uRoot = root[u], prevMax = blockGraph.edge(uRoot, vRoot);
                blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0));
              }
              u = v;
            });
          });
          return blockGraph;
        }
        function findSmallestWidthAlignment(g, xss) {
          return Object.values(xss).reduce((currentMinAndXs, xs) => {
            let max = Number.NEGATIVE_INFINITY;
            let min = Number.POSITIVE_INFINITY;
            Object.entries(xs).forEach(([v, x]) => {
              let halfWidth = width(g, v) / 2;
              max = Math.max(x + halfWidth, max);
              min = Math.min(x - halfWidth, min);
            });
            const newMin = max - min;
            if (newMin < currentMinAndXs[0]) {
              currentMinAndXs = [newMin, xs];
            }
            return currentMinAndXs;
          }, [Number.POSITIVE_INFINITY, null])[1];
        }
        function alignCoordinates(xss, alignTo) {
          let alignToVals = Object.values(alignTo), alignToMin = util.applyWithChunking(Math.min, alignToVals), alignToMax = util.applyWithChunking(Math.max, alignToVals);
          ["u", "d"].forEach((vert) => {
            ["l", "r"].forEach((horiz) => {
              let alignment = vert + horiz, xs = xss[alignment];
              if (xs === alignTo) return;
              let xsVals = Object.values(xs);
              let delta = alignToMin - util.applyWithChunking(Math.min, xsVals);
              if (horiz !== "l") {
                delta = alignToMax - util.applyWithChunking(Math.max, xsVals);
              }
              if (delta) {
                xss[alignment] = util.mapValues(xs, (x) => x + delta);
              }
            });
          });
        }
        function balance(xss, align) {
          return util.mapValues(xss.ul, (num, v) => {
            if (align) {
              return xss[align.toLowerCase()][v];
            } else {
              let xs = Object.values(xss).map((xs2) => xs2[v]).sort((a, b) => a - b);
              return (xs[1] + xs[2]) / 2;
            }
          });
        }
        function positionX(g) {
          let layering = util.buildLayerMatrix(g);
          let conflicts = Object.assign(findType1Conflicts(g, layering), findType2Conflicts(g, layering));
          let xss = {};
          let adjustedLayering;
          ["u", "d"].forEach((vert) => {
            adjustedLayering = vert === "u" ? layering : Object.values(layering).reverse();
            ["l", "r"].forEach((horiz) => {
              if (horiz === "r") {
                adjustedLayering = adjustedLayering.map((inner) => {
                  return Object.values(inner).reverse();
                });
              }
              let neighborFn = (vert === "u" ? g.predecessors : g.successors).bind(g);
              let align = verticalAlignment(g, adjustedLayering, conflicts, neighborFn);
              let xs = horizontalCompaction(g, adjustedLayering, align.root, align.align, horiz === "r");
              if (horiz === "r") {
                xs = util.mapValues(xs, (x) => -x);
              }
              xss[vert + horiz] = xs;
            });
          });
          let smallestWidth = findSmallestWidthAlignment(g, xss);
          alignCoordinates(xss, smallestWidth);
          return balance(xss, g.graph().align);
        }
        function sep(nodeSep, edgeSep, reverseSep) {
          return (g, v, w) => {
            let vLabel = g.node(v);
            let wLabel = g.node(w);
            let sum = 0;
            let delta;
            sum += vLabel.width / 2;
            if (Object.hasOwn(vLabel, "labelpos")) {
              switch (vLabel.labelpos.toLowerCase()) {
                case "l":
                  delta = -vLabel.width / 2;
                  break;
                case "r":
                  delta = vLabel.width / 2;
                  break;
              }
            }
            if (delta) {
              sum += reverseSep ? delta : -delta;
            }
            delta = 0;
            sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
            sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;
            sum += wLabel.width / 2;
            if (Object.hasOwn(wLabel, "labelpos")) {
              switch (wLabel.labelpos.toLowerCase()) {
                case "l":
                  delta = wLabel.width / 2;
                  break;
                case "r":
                  delta = -wLabel.width / 2;
                  break;
              }
            }
            if (delta) {
              sum += reverseSep ? delta : -delta;
            }
            delta = 0;
            return sum;
          };
        }
        function width(g, v) {
          return g.node(v).width;
        }
      }, { "../util": 27, "@dagrejs/graphlib": 29 }], 22: [function(require2, module4, exports4) {
        "use strict";
        let util = require2("../util");
        let positionX = require2("./bk").positionX;
        module4.exports = position;
        function position(g) {
          g = util.asNonCompoundGraph(g);
          positionY(g);
          Object.entries(positionX(g)).forEach(([v, x]) => g.node(v).x = x);
        }
        function positionY(g) {
          let layering = util.buildLayerMatrix(g);
          let rankSep = g.graph().ranksep;
          let prevY = 0;
          layering.forEach((layer) => {
            const maxHeight = layer.reduce((acc, v) => {
              const height = g.node(v).height;
              if (acc > height) {
                return acc;
              } else {
                return height;
              }
            }, 0);
            layer.forEach((v) => g.node(v).y = prevY + maxHeight / 2);
            prevY += maxHeight + rankSep;
          });
        }
      }, { "../util": 27, "./bk": 21 }], 23: [function(require2, module4, exports4) {
        "use strict";
        var Graph = require2("@dagrejs/graphlib").Graph;
        var slack = require2("./util").slack;
        module4.exports = feasibleTree;
        function feasibleTree(g) {
          var t = new Graph({ directed: false });
          var start = g.nodes()[0];
          var size = g.nodeCount();
          t.setNode(start, {});
          var edge, delta;
          while (tightTree(t, g) < size) {
            edge = findMinSlackEdge(t, g);
            delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge);
            shiftRanks(t, g, delta);
          }
          return t;
        }
        function tightTree(t, g) {
          function dfs(v) {
            g.nodeEdges(v).forEach((e) => {
              var edgeV = e.v, w = v === edgeV ? e.w : edgeV;
              if (!t.hasNode(w) && !slack(g, e)) {
                t.setNode(w, {});
                t.setEdge(v, w, {});
                dfs(w);
              }
            });
          }
          t.nodes().forEach(dfs);
          return t.nodeCount();
        }
        function findMinSlackEdge(t, g) {
          const edges = g.edges();
          return edges.reduce((acc, edge) => {
            let edgeSlack = Number.POSITIVE_INFINITY;
            if (t.hasNode(edge.v) !== t.hasNode(edge.w)) {
              edgeSlack = slack(g, edge);
            }
            if (edgeSlack < acc[0]) {
              return [edgeSlack, edge];
            }
            return acc;
          }, [Number.POSITIVE_INFINITY, null])[1];
        }
        function shiftRanks(t, g, delta) {
          t.nodes().forEach((v) => g.node(v).rank += delta);
        }
      }, { "./util": 26, "@dagrejs/graphlib": 29 }], 24: [function(require2, module4, exports4) {
        "use strict";
        var rankUtil = require2("./util");
        var longestPath = rankUtil.longestPath;
        var feasibleTree = require2("./feasible-tree");
        var networkSimplex = require2("./network-simplex");
        module4.exports = rank;
        function rank(g) {
          switch (g.graph().ranker) {
            case "network-simplex":
              networkSimplexRanker(g);
              break;
            case "tight-tree":
              tightTreeRanker(g);
              break;
            case "longest-path":
              longestPathRanker(g);
              break;
            default:
              networkSimplexRanker(g);
          }
        }
        var longestPathRanker = longestPath;
        function tightTreeRanker(g) {
          longestPath(g);
          feasibleTree(g);
        }
        function networkSimplexRanker(g) {
          networkSimplex(g);
        }
      }, { "./feasible-tree": 23, "./network-simplex": 25, "./util": 26 }], 25: [function(require2, module4, exports4) {
        "use strict";
        var feasibleTree = require2("./feasible-tree");
        var slack = require2("./util").slack;
        var initRank = require2("./util").longestPath;
        var preorder = require2("@dagrejs/graphlib").alg.preorder;
        var postorder = require2("@dagrejs/graphlib").alg.postorder;
        var simplify = require2("../util").simplify;
        module4.exports = networkSimplex;
        networkSimplex.initLowLimValues = initLowLimValues;
        networkSimplex.initCutValues = initCutValues;
        networkSimplex.calcCutValue = calcCutValue;
        networkSimplex.leaveEdge = leaveEdge;
        networkSimplex.enterEdge = enterEdge;
        networkSimplex.exchangeEdges = exchangeEdges;
        function networkSimplex(g) {
          g = simplify(g);
          initRank(g);
          var t = feasibleTree(g);
          initLowLimValues(t);
          initCutValues(t, g);
          var e, f;
          while (e = leaveEdge(t)) {
            f = enterEdge(t, g, e);
            exchangeEdges(t, g, e, f);
          }
        }
        function initCutValues(t, g) {
          var vs = postorder(t, t.nodes());
          vs = vs.slice(0, vs.length - 1);
          vs.forEach((v) => assignCutValue(t, g, v));
        }
        function assignCutValue(t, g, child) {
          var childLab = t.node(child);
          var parent = childLab.parent;
          t.edge(child, parent).cutvalue = calcCutValue(t, g, child);
        }
        function calcCutValue(t, g, child) {
          var childLab = t.node(child);
          var parent = childLab.parent;
          var childIsTail = true;
          var graphEdge = g.edge(child, parent);
          var cutValue = 0;
          if (!graphEdge) {
            childIsTail = false;
            graphEdge = g.edge(parent, child);
          }
          cutValue = graphEdge.weight;
          g.nodeEdges(child).forEach((e) => {
            var isOutEdge = e.v === child, other = isOutEdge ? e.w : e.v;
            if (other !== parent) {
              var pointsToHead = isOutEdge === childIsTail, otherWeight = g.edge(e).weight;
              cutValue += pointsToHead ? otherWeight : -otherWeight;
              if (isTreeEdge(t, child, other)) {
                var otherCutValue = t.edge(child, other).cutvalue;
                cutValue += pointsToHead ? -otherCutValue : otherCutValue;
              }
            }
          });
          return cutValue;
        }
        function initLowLimValues(tree, root) {
          if (arguments.length < 2) {
            root = tree.nodes()[0];
          }
          dfsAssignLowLim(tree, {}, 1, root);
        }
        function dfsAssignLowLim(tree, visited, nextLim, v, parent) {
          var low = nextLim;
          var label = tree.node(v);
          visited[v] = true;
          tree.neighbors(v).forEach((w) => {
            if (!Object.hasOwn(visited, w)) {
              nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v);
            }
          });
          label.low = low;
          label.lim = nextLim++;
          if (parent) {
            label.parent = parent;
          } else {
            delete label.parent;
          }
          return nextLim;
        }
        function leaveEdge(tree) {
          return tree.edges().find((e) => tree.edge(e).cutvalue < 0);
        }
        function enterEdge(t, g, edge) {
          var v = edge.v;
          var w = edge.w;
          if (!g.hasEdge(v, w)) {
            v = edge.w;
            w = edge.v;
          }
          var vLabel = t.node(v);
          var wLabel = t.node(w);
          var tailLabel = vLabel;
          var flip = false;
          if (vLabel.lim > wLabel.lim) {
            tailLabel = wLabel;
            flip = true;
          }
          var candidates = g.edges().filter((edge2) => {
            return flip === isDescendant(t, t.node(edge2.v), tailLabel) && flip !== isDescendant(t, t.node(edge2.w), tailLabel);
          });
          return candidates.reduce((acc, edge2) => {
            if (slack(g, edge2) < slack(g, acc)) {
              return edge2;
            }
            return acc;
          });
        }
        function exchangeEdges(t, g, e, f) {
          var v = e.v;
          var w = e.w;
          t.removeEdge(v, w);
          t.setEdge(f.v, f.w, {});
          initLowLimValues(t);
          initCutValues(t, g);
          updateRanks(t, g);
        }
        function updateRanks(t, g) {
          var root = t.nodes().find((v) => !g.node(v).parent);
          var vs = preorder(t, root);
          vs = vs.slice(1);
          vs.forEach((v) => {
            var parent = t.node(v).parent, edge = g.edge(v, parent), flipped = false;
            if (!edge) {
              edge = g.edge(parent, v);
              flipped = true;
            }
            g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlen : -edge.minlen);
          });
        }
        function isTreeEdge(tree, u, v) {
          return tree.hasEdge(u, v);
        }
        function isDescendant(tree, vLabel, rootLabel) {
          return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
        }
      }, { "../util": 27, "./feasible-tree": 23, "./util": 26, "@dagrejs/graphlib": 29 }], 26: [function(require2, module4, exports4) {
        "use strict";
        const { applyWithChunking } = require2("../util");
        module4.exports = { longestPath, slack };
        function longestPath(g) {
          var visited = {};
          function dfs(v) {
            var label = g.node(v);
            if (Object.hasOwn(visited, v)) {
              return label.rank;
            }
            visited[v] = true;
            let outEdgesMinLens = g.outEdges(v).map((e) => {
              if (e == null) {
                return Number.POSITIVE_INFINITY;
              }
              return dfs(e.w) - g.edge(e).minlen;
            });
            var rank = applyWithChunking(Math.min, outEdgesMinLens);
            if (rank === Number.POSITIVE_INFINITY) {
              rank = 0;
            }
            return label.rank = rank;
          }
          g.sources().forEach(dfs);
        }
        function slack(g, e) {
          return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen;
        }
      }, { "../util": 27 }], 27: [function(require2, module4, exports4) {
        "use strict";
        let Graph = require2("@dagrejs/graphlib").Graph;
        module4.exports = { addBorderNode, addDummyNode, applyWithChunking, asNonCompoundGraph, buildLayerMatrix, intersectRect, mapValues, maxRank, normalizeRanks, notime, partition, pick, predecessorWeights, range, removeEmptyRanks, simplify, successorWeights, time, uniqueId, zipObject };
        function addDummyNode(g, type, attrs, name) {
          let v;
          do {
            v = uniqueId(name);
          } while (g.hasNode(v));
          attrs.dummy = type;
          g.setNode(v, attrs);
          return v;
        }
        function simplify(g) {
          let simplified = new Graph().setGraph(g.graph());
          g.nodes().forEach((v) => simplified.setNode(v, g.node(v)));
          g.edges().forEach((e) => {
            let simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
            let label = g.edge(e);
            simplified.setEdge(e.v, e.w, { weight: simpleLabel.weight + label.weight, minlen: Math.max(simpleLabel.minlen, label.minlen) });
          });
          return simplified;
        }
        function asNonCompoundGraph(g) {
          let simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
          g.nodes().forEach((v) => {
            if (!g.children(v).length) {
              simplified.setNode(v, g.node(v));
            }
          });
          g.edges().forEach((e) => {
            simplified.setEdge(e, g.edge(e));
          });
          return simplified;
        }
        function successorWeights(g) {
          let weightMap = g.nodes().map((v) => {
            let sucs = {};
            g.outEdges(v).forEach((e) => {
              sucs[e.w] = (sucs[e.w] || 0) + g.edge(e).weight;
            });
            return sucs;
          });
          return zipObject(g.nodes(), weightMap);
        }
        function predecessorWeights(g) {
          let weightMap = g.nodes().map((v) => {
            let preds = {};
            g.inEdges(v).forEach((e) => {
              preds[e.v] = (preds[e.v] || 0) + g.edge(e).weight;
            });
            return preds;
          });
          return zipObject(g.nodes(), weightMap);
        }
        function intersectRect(rect, point) {
          let x = rect.x;
          let y = rect.y;
          let dx = point.x - x;
          let dy = point.y - y;
          let w = rect.width / 2;
          let h = rect.height / 2;
          if (!dx && !dy) {
            throw new Error("Not possible to find intersection inside of the rectangle");
          }
          let sx, sy;
          if (Math.abs(dy) * w > Math.abs(dx) * h) {
            if (dy < 0) {
              h = -h;
            }
            sx = h * dx / dy;
            sy = h;
          } else {
            if (dx < 0) {
              w = -w;
            }
            sx = w;
            sy = w * dy / dx;
          }
          return { x: x + sx, y: y + sy };
        }
        function buildLayerMatrix(g) {
          let layering = range(maxRank(g) + 1).map(() => []);
          g.nodes().forEach((v) => {
            let node = g.node(v);
            let rank = node.rank;
            if (rank !== void 0) {
              layering[rank][node.order] = v;
            }
          });
          return layering;
        }
        function normalizeRanks(g) {
          let nodeRanks = g.nodes().map((v) => {
            let rank = g.node(v).rank;
            if (rank === void 0) {
              return Number.MAX_VALUE;
            }
            return rank;
          });
          let min = applyWithChunking(Math.min, nodeRanks);
          g.nodes().forEach((v) => {
            let node = g.node(v);
            if (Object.hasOwn(node, "rank")) {
              node.rank -= min;
            }
          });
        }
        function removeEmptyRanks(g) {
          let nodeRanks = g.nodes().map((v) => g.node(v).rank);
          let offset = applyWithChunking(Math.min, nodeRanks);
          let layers = [];
          g.nodes().forEach((v) => {
            let rank = g.node(v).rank - offset;
            if (!layers[rank]) {
              layers[rank] = [];
            }
            layers[rank].push(v);
          });
          let delta = 0;
          let nodeRankFactor = g.graph().nodeRankFactor;
          Array.from(layers).forEach((vs, i) => {
            if (vs === void 0 && i % nodeRankFactor !== 0) {
              --delta;
            } else if (vs !== void 0 && delta) {
              vs.forEach((v) => g.node(v).rank += delta);
            }
          });
        }
        function addBorderNode(g, prefix, rank, order) {
          let node = { width: 0, height: 0 };
          if (arguments.length >= 4) {
            node.rank = rank;
            node.order = order;
          }
          return addDummyNode(g, "border", node, prefix);
        }
        function splitToChunks(array, chunkSize = CHUNKING_THRESHOLD) {
          const chunks = [];
          for (let i = 0; i < array.length; i += chunkSize) {
            const chunk = array.slice(i, i + chunkSize);
            chunks.push(chunk);
          }
          return chunks;
        }
        const CHUNKING_THRESHOLD = 65535;
        function applyWithChunking(fn, argsArray) {
          if (argsArray.length > CHUNKING_THRESHOLD) {
            const chunks = splitToChunks(argsArray);
            return fn.apply(null, chunks.map((chunk) => fn.apply(null, chunk)));
          } else {
            return fn.apply(null, argsArray);
          }
        }
        function maxRank(g) {
          const nodes = g.nodes();
          const nodeRanks = nodes.map((v) => {
            let rank = g.node(v).rank;
            if (rank === void 0) {
              return Number.MIN_VALUE;
            }
            return rank;
          });
          return applyWithChunking(Math.max, nodeRanks);
        }
        function partition(collection, fn) {
          let result = { lhs: [], rhs: [] };
          collection.forEach((value) => {
            if (fn(value)) {
              result.lhs.push(value);
            } else {
              result.rhs.push(value);
            }
          });
          return result;
        }
        function time(name, fn) {
          let start = Date.now();
          try {
            return fn();
          } finally {
            console.log(name + " time: " + (Date.now() - start) + "ms");
          }
        }
        function notime(name, fn) {
          return fn();
        }
        let idCounter = 0;
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString(prefix) + id;
        }
        function range(start, limit, step = 1) {
          if (limit == null) {
            limit = start;
            start = 0;
          }
          let endCon = (i) => i < limit;
          if (step < 0) {
            endCon = (i) => limit < i;
          }
          const range2 = [];
          for (let i = start; endCon(i); i += step) {
            range2.push(i);
          }
          return range2;
        }
        function pick(source, keys) {
          const dest = {};
          for (const key of keys) {
            if (source[key] !== void 0) {
              dest[key] = source[key];
            }
          }
          return dest;
        }
        function mapValues(obj, funcOrProp) {
          let func = funcOrProp;
          if (typeof funcOrProp === "string") {
            func = (val) => val[funcOrProp];
          }
          return Object.entries(obj).reduce((acc, [k, v]) => {
            acc[k] = func(v, k);
            return acc;
          }, {});
        }
        function zipObject(props, values) {
          return props.reduce((acc, key, i) => {
            acc[key] = values[i];
            return acc;
          }, {});
        }
      }, { "@dagrejs/graphlib": 29 }], 28: [function(require2, module4, exports4) {
        module4.exports = "1.1.4";
      }, {}], 29: [function(require2, module4, exports4) {
        var lib = require2("./lib");
        module4.exports = { Graph: lib.Graph, json: require2("./lib/json"), alg: require2("./lib/alg"), version: lib.version };
      }, { "./lib": 45, "./lib/alg": 36, "./lib/json": 46 }], 30: [function(require2, module4, exports4) {
        module4.exports = components;
        function components(g) {
          var visited = {};
          var cmpts = [];
          var cmpt;
          function dfs(v) {
            if (Object.hasOwn(visited, v)) return;
            visited[v] = true;
            cmpt.push(v);
            g.successors(v).forEach(dfs);
            g.predecessors(v).forEach(dfs);
          }
          g.nodes().forEach(function(v) {
            cmpt = [];
            dfs(v);
            if (cmpt.length) {
              cmpts.push(cmpt);
            }
          });
          return cmpts;
        }
      }, {}], 31: [function(require2, module4, exports4) {
        module4.exports = dfs;
        function dfs(g, vs, order) {
          if (!Array.isArray(vs)) {
            vs = [vs];
          }
          var navigation = g.isDirected() ? (v) => g.successors(v) : (v) => g.neighbors(v);
          var orderFunc = order === "post" ? postOrderDfs : preOrderDfs;
          var acc = [];
          var visited = {};
          vs.forEach((v) => {
            if (!g.hasNode(v)) {
              throw new Error("Graph does not have node: " + v);
            }
            orderFunc(v, navigation, visited, acc);
          });
          return acc;
        }
        function postOrderDfs(v, navigation, visited, acc) {
          var stack = [[v, false]];
          while (stack.length > 0) {
            var curr = stack.pop();
            if (curr[1]) {
              acc.push(curr[0]);
            } else {
              if (!Object.hasOwn(visited, curr[0])) {
                visited[curr[0]] = true;
                stack.push([curr[0], true]);
                forEachRight(navigation(curr[0]), (w) => stack.push([w, false]));
              }
            }
          }
        }
        function preOrderDfs(v, navigation, visited, acc) {
          var stack = [v];
          while (stack.length > 0) {
            var curr = stack.pop();
            if (!Object.hasOwn(visited, curr)) {
              visited[curr] = true;
              acc.push(curr);
              forEachRight(navigation(curr), (w) => stack.push(w));
            }
          }
        }
        function forEachRight(array, iteratee) {
          var length = array.length;
          while (length--) {
            iteratee(array[length], length, array);
          }
          return array;
        }
      }, {}], 32: [function(require2, module4, exports4) {
        var dijkstra = require2("./dijkstra");
        module4.exports = dijkstraAll;
        function dijkstraAll(g, weightFunc, edgeFunc) {
          return g.nodes().reduce(function(acc, v) {
            acc[v] = dijkstra(g, v, weightFunc, edgeFunc);
            return acc;
          }, {});
        }
      }, { "./dijkstra": 33 }], 33: [function(require2, module4, exports4) {
        var PriorityQueue = require2("../data/priority-queue");
        module4.exports = dijkstra;
        var DEFAULT_WEIGHT_FUNC = () => 1;
        function dijkstra(g, source, weightFn, edgeFn) {
          return runDijkstra(g, String(source), weightFn || DEFAULT_WEIGHT_FUNC, edgeFn || function(v) {
            return g.outEdges(v);
          });
        }
        function runDijkstra(g, source, weightFn, edgeFn) {
          var results = {};
          var pq = new PriorityQueue();
          var v, vEntry;
          var updateNeighbors = function(edge) {
            var w = edge.v !== v ? edge.v : edge.w;
            var wEntry = results[w];
            var weight = weightFn(edge);
            var distance = vEntry.distance + weight;
            if (weight < 0) {
              throw new Error("dijkstra does not allow negative edge weights. Bad edge: " + edge + " Weight: " + weight);
            }
            if (distance < wEntry.distance) {
              wEntry.distance = distance;
              wEntry.predecessor = v;
              pq.decrease(w, distance);
            }
          };
          g.nodes().forEach(function(v2) {
            var distance = v2 === source ? 0 : Number.POSITIVE_INFINITY;
            results[v2] = { distance };
            pq.add(v2, distance);
          });
          while (pq.size() > 0) {
            v = pq.removeMin();
            vEntry = results[v];
            if (vEntry.distance === Number.POSITIVE_INFINITY) {
              break;
            }
            edgeFn(v).forEach(updateNeighbors);
          }
          return results;
        }
      }, { "../data/priority-queue": 43 }], 34: [function(require2, module4, exports4) {
        var tarjan = require2("./tarjan");
        module4.exports = findCycles;
        function findCycles(g) {
          return tarjan(g).filter(function(cmpt) {
            return cmpt.length > 1 || cmpt.length === 1 && g.hasEdge(cmpt[0], cmpt[0]);
          });
        }
      }, { "./tarjan": 41 }], 35: [function(require2, module4, exports4) {
        module4.exports = floydWarshall;
        var DEFAULT_WEIGHT_FUNC = () => 1;
        function floydWarshall(g, weightFn, edgeFn) {
          return runFloydWarshall(g, weightFn || DEFAULT_WEIGHT_FUNC, edgeFn || function(v) {
            return g.outEdges(v);
          });
        }
        function runFloydWarshall(g, weightFn, edgeFn) {
          var results = {};
          var nodes = g.nodes();
          nodes.forEach(function(v) {
            results[v] = {};
            results[v][v] = { distance: 0 };
            nodes.forEach(function(w) {
              if (v !== w) {
                results[v][w] = { distance: Number.POSITIVE_INFINITY };
              }
            });
            edgeFn(v).forEach(function(edge) {
              var w = edge.v === v ? edge.w : edge.v;
              var d = weightFn(edge);
              results[v][w] = { distance: d, predecessor: v };
            });
          });
          nodes.forEach(function(k) {
            var rowK = results[k];
            nodes.forEach(function(i) {
              var rowI = results[i];
              nodes.forEach(function(j) {
                var ik = rowI[k];
                var kj = rowK[j];
                var ij = rowI[j];
                var altDistance = ik.distance + kj.distance;
                if (altDistance < ij.distance) {
                  ij.distance = altDistance;
                  ij.predecessor = kj.predecessor;
                }
              });
            });
          });
          return results;
        }
      }, {}], 36: [function(require2, module4, exports4) {
        module4.exports = { components: require2("./components"), dijkstra: require2("./dijkstra"), dijkstraAll: require2("./dijkstra-all"), findCycles: require2("./find-cycles"), floydWarshall: require2("./floyd-warshall"), isAcyclic: require2("./is-acyclic"), postorder: require2("./postorder"), preorder: require2("./preorder"), prim: require2("./prim"), tarjan: require2("./tarjan"), topsort: require2("./topsort") };
      }, { "./components": 30, "./dijkstra": 33, "./dijkstra-all": 32, "./find-cycles": 34, "./floyd-warshall": 35, "./is-acyclic": 37, "./postorder": 38, "./preorder": 39, "./prim": 40, "./tarjan": 41, "./topsort": 42 }], 37: [function(require2, module4, exports4) {
        var topsort = require2("./topsort");
        module4.exports = isAcyclic;
        function isAcyclic(g) {
          try {
            topsort(g);
          } catch (e) {
            if (e instanceof topsort.CycleException) {
              return false;
            }
            throw e;
          }
          return true;
        }
      }, { "./topsort": 42 }], 38: [function(require2, module4, exports4) {
        var dfs = require2("./dfs");
        module4.exports = postorder;
        function postorder(g, vs) {
          return dfs(g, vs, "post");
        }
      }, { "./dfs": 31 }], 39: [function(require2, module4, exports4) {
        var dfs = require2("./dfs");
        module4.exports = preorder;
        function preorder(g, vs) {
          return dfs(g, vs, "pre");
        }
      }, { "./dfs": 31 }], 40: [function(require2, module4, exports4) {
        var Graph = require2("../graph");
        var PriorityQueue = require2("../data/priority-queue");
        module4.exports = prim;
        function prim(g, weightFunc) {
          var result = new Graph();
          var parents = {};
          var pq = new PriorityQueue();
          var v;
          function updateNeighbors(edge) {
            var w = edge.v === v ? edge.w : edge.v;
            var pri = pq.priority(w);
            if (pri !== void 0) {
              var edgeWeight = weightFunc(edge);
              if (edgeWeight < pri) {
                parents[w] = v;
                pq.decrease(w, edgeWeight);
              }
            }
          }
          if (g.nodeCount() === 0) {
            return result;
          }
          g.nodes().forEach(function(v2) {
            pq.add(v2, Number.POSITIVE_INFINITY);
            result.setNode(v2);
          });
          pq.decrease(g.nodes()[0], 0);
          var init = false;
          while (pq.size() > 0) {
            v = pq.removeMin();
            if (Object.hasOwn(parents, v)) {
              result.setEdge(v, parents[v]);
            } else if (init) {
              throw new Error("Input graph is not connected: " + g);
            } else {
              init = true;
            }
            g.nodeEdges(v).forEach(updateNeighbors);
          }
          return result;
        }
      }, { "../data/priority-queue": 43, "../graph": 44 }], 41: [function(require2, module4, exports4) {
        module4.exports = tarjan;
        function tarjan(g) {
          var index = 0;
          var stack = [];
          var visited = {};
          var results = [];
          function dfs(v) {
            var entry = visited[v] = { onStack: true, lowlink: index, index: index++ };
            stack.push(v);
            g.successors(v).forEach(function(w2) {
              if (!Object.hasOwn(visited, w2)) {
                dfs(w2);
                entry.lowlink = Math.min(entry.lowlink, visited[w2].lowlink);
              } else if (visited[w2].onStack) {
                entry.lowlink = Math.min(entry.lowlink, visited[w2].index);
              }
            });
            if (entry.lowlink === entry.index) {
              var cmpt = [];
              var w;
              do {
                w = stack.pop();
                visited[w].onStack = false;
                cmpt.push(w);
              } while (v !== w);
              results.push(cmpt);
            }
          }
          g.nodes().forEach(function(v) {
            if (!Object.hasOwn(visited, v)) {
              dfs(v);
            }
          });
          return results;
        }
      }, {}], 42: [function(require2, module4, exports4) {
        function topsort(g) {
          var visited = {};
          var stack = {};
          var results = [];
          function visit(node) {
            if (Object.hasOwn(stack, node)) {
              throw new CycleException();
            }
            if (!Object.hasOwn(visited, node)) {
              stack[node] = true;
              visited[node] = true;
              g.predecessors(node).forEach(visit);
              delete stack[node];
              results.push(node);
            }
          }
          g.sinks().forEach(visit);
          if (Object.keys(visited).length !== g.nodeCount()) {
            throw new CycleException();
          }
          return results;
        }
        class CycleException extends Error {
          constructor() {
            super(...arguments);
          }
        }
        module4.exports = topsort;
        topsort.CycleException = CycleException;
      }, {}], 43: [function(require2, module4, exports4) {
        class PriorityQueue {
          _arr = [];
          _keyIndices = {};
          /**
             * Returns the number of elements in the queue. Takes `O(1)` time.
             */
          size() {
            return this._arr.length;
          }
          /**
             * Returns the keys that are in the queue. Takes `O(n)` time.
             */
          keys() {
            return this._arr.map(function(x) {
              return x.key;
            });
          }
          /**
             * Returns `true` if **key** is in the queue and `false` if not.
             */
          has(key) {
            return Object.hasOwn(this._keyIndices, key);
          }
          /**
             * Returns the priority for **key**. If **key** is not present in the queue
             * then this function returns `undefined`. Takes `O(1)` time.
             *
             * @param {Object} key
             */
          priority(key) {
            var index = this._keyIndices[key];
            if (index !== void 0) {
              return this._arr[index].priority;
            }
          }
          /**
             * Returns the key for the minimum element in this queue. If the queue is
             * empty this function throws an Error. Takes `O(1)` time.
             */
          min() {
            if (this.size() === 0) {
              throw new Error("Queue underflow");
            }
            return this._arr[0].key;
          }
          /**
             * Inserts a new key into the priority queue. If the key already exists in
             * the queue this function returns `false`; otherwise it will return `true`.
             * Takes `O(n)` time.
             *
             * @param {Object} key the key to add
             * @param {Number} priority the initial priority for the key
             */
          add(key, priority) {
            var keyIndices = this._keyIndices;
            key = String(key);
            if (!Object.hasOwn(keyIndices, key)) {
              var arr = this._arr;
              var index = arr.length;
              keyIndices[key] = index;
              arr.push({ key, priority });
              this._decrease(index);
              return true;
            }
            return false;
          }
          /**
             * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
             */
          removeMin() {
            this._swap(0, this._arr.length - 1);
            var min = this._arr.pop();
            delete this._keyIndices[min.key];
            this._heapify(0);
            return min.key;
          }
          /**
             * Decreases the priority for **key** to **priority**. If the new priority is
             * greater than the previous priority, this function will throw an Error.
             *
             * @param {Object} key the key for which to raise priority
             * @param {Number} priority the new priority for the key
             */
          decrease(key, priority) {
            var index = this._keyIndices[key];
            if (priority > this._arr[index].priority) {
              throw new Error("New priority is greater than current priority. Key: " + key + " Old: " + this._arr[index].priority + " New: " + priority);
            }
            this._arr[index].priority = priority;
            this._decrease(index);
          }
          _heapify(i) {
            var arr = this._arr;
            var l = 2 * i;
            var r = l + 1;
            var largest = i;
            if (l < arr.length) {
              largest = arr[l].priority < arr[largest].priority ? l : largest;
              if (r < arr.length) {
                largest = arr[r].priority < arr[largest].priority ? r : largest;
              }
              if (largest !== i) {
                this._swap(i, largest);
                this._heapify(largest);
              }
            }
          }
          _decrease(index) {
            var arr = this._arr;
            var priority = arr[index].priority;
            var parent;
            while (index !== 0) {
              parent = index >> 1;
              if (arr[parent].priority < priority) {
                break;
              }
              this._swap(index, parent);
              index = parent;
            }
          }
          _swap(i, j) {
            var arr = this._arr;
            var keyIndices = this._keyIndices;
            var origArrI = arr[i];
            var origArrJ = arr[j];
            arr[i] = origArrJ;
            arr[j] = origArrI;
            keyIndices[origArrJ.key] = i;
            keyIndices[origArrI.key] = j;
          }
        }
        module4.exports = PriorityQueue;
      }, {}], 44: [function(require2, module4, exports4) {
        "use strict";
        var DEFAULT_EDGE_NAME = "\0";
        var GRAPH_NODE = "\0";
        var EDGE_KEY_DELIM = "";
        class Graph {
          _isDirected = true;
          _isMultigraph = false;
          _isCompound = false;
          // Label for the graph itself
          _label;
          // Defaults to be set when creating a new node
          _defaultNodeLabelFn = () => void 0;
          // Defaults to be set when creating a new edge
          _defaultEdgeLabelFn = () => void 0;
          // v -> label
          _nodes = {};
          // v -> edgeObj
          _in = {};
          // u -> v -> Number
          _preds = {};
          // v -> edgeObj
          _out = {};
          // v -> w -> Number
          _sucs = {};
          // e -> edgeObj
          _edgeObjs = {};
          // e -> label
          _edgeLabels = {};
          /* Number of nodes in the graph. Should only be changed by the implementation. */
          _nodeCount = 0;
          /* Number of edges in the graph. Should only be changed by the implementation. */
          _edgeCount = 0;
          _parent;
          _children;
          constructor(opts) {
            if (opts) {
              this._isDirected = Object.hasOwn(opts, "directed") ? opts.directed : true;
              this._isMultigraph = Object.hasOwn(opts, "multigraph") ? opts.multigraph : false;
              this._isCompound = Object.hasOwn(opts, "compound") ? opts.compound : false;
            }
            if (this._isCompound) {
              this._parent = {};
              this._children = {};
              this._children[GRAPH_NODE] = {};
            }
          }
          /* === Graph functions ========= */
          /**
             * Whether graph was created with 'directed' flag set to true or not.
             */
          isDirected() {
            return this._isDirected;
          }
          /**
             * Whether graph was created with 'multigraph' flag set to true or not.
             */
          isMultigraph() {
            return this._isMultigraph;
          }
          /**
             * Whether graph was created with 'compound' flag set to true or not.
             */
          isCompound() {
            return this._isCompound;
          }
          /**
             * Sets the label of the graph.
             */
          setGraph(label) {
            this._label = label;
            return this;
          }
          /**
             * Gets the graph label.
             */
          graph() {
            return this._label;
          }
          /* === Node functions ========== */
          /**
             * Sets the default node label. If newDefault is a function, it will be
             * invoked ach time when setting a label for a node. Otherwise, this label
             * will be assigned as default label in case if no label was specified while
             * setting a node.
             * Complexity: O(1).
             */
          setDefaultNodeLabel(newDefault) {
            this._defaultNodeLabelFn = newDefault;
            if (typeof newDefault !== "function") {
              this._defaultNodeLabelFn = () => newDefault;
            }
            return this;
          }
          /**
             * Gets the number of nodes in the graph.
             * Complexity: O(1).
             */
          nodeCount() {
            return this._nodeCount;
          }
          /**
             * Gets all nodes of the graph. Note, the in case of compound graph subnodes are
             * not included in list.
             * Complexity: O(1).
             */
          nodes() {
            return Object.keys(this._nodes);
          }
          /**
             * Gets list of nodes without in-edges.
             * Complexity: O(|V|).
             */
          sources() {
            var self2 = this;
            return this.nodes().filter((v) => Object.keys(self2._in[v]).length === 0);
          }
          /**
             * Gets list of nodes without out-edges.
             * Complexity: O(|V|).
             */
          sinks() {
            var self2 = this;
            return this.nodes().filter((v) => Object.keys(self2._out[v]).length === 0);
          }
          /**
             * Invokes setNode method for each node in names list.
             * Complexity: O(|names|).
             */
          setNodes(vs, value) {
            var args2 = arguments;
            var self2 = this;
            vs.forEach(function(v) {
              if (args2.length > 1) {
                self2.setNode(v, value);
              } else {
                self2.setNode(v);
              }
            });
            return this;
          }
          /**
             * Creates or updates the value for the node v in the graph. If label is supplied
             * it is set as the value for the node. If label is not supplied and the node was
             * created by this call then the default node label will be assigned.
             * Complexity: O(1).
             */
          setNode(v, value) {
            if (Object.hasOwn(this._nodes, v)) {
              if (arguments.length > 1) {
                this._nodes[v] = value;
              }
              return this;
            }
            this._nodes[v] = arguments.length > 1 ? value : this._defaultNodeLabelFn(v);
            if (this._isCompound) {
              this._parent[v] = GRAPH_NODE;
              this._children[v] = {};
              this._children[GRAPH_NODE][v] = true;
            }
            this._in[v] = {};
            this._preds[v] = {};
            this._out[v] = {};
            this._sucs[v] = {};
            ++this._nodeCount;
            return this;
          }
          /**
             * Gets the label of node with specified name.
             * Complexity: O(|V|).
             */
          node(v) {
            return this._nodes[v];
          }
          /**
             * Detects whether graph has a node with specified name or not.
             */
          hasNode(v) {
            return Object.hasOwn(this._nodes, v);
          }
          /**
             * Remove the node with the name from the graph or do nothing if the node is not in
             * the graph. If the node was removed this function also removes any incident
             * edges.
             * Complexity: O(1).
             */
          removeNode(v) {
            var self2 = this;
            if (Object.hasOwn(this._nodes, v)) {
              var removeEdge = (e) => self2.removeEdge(self2._edgeObjs[e]);
              delete this._nodes[v];
              if (this._isCompound) {
                this._removeFromParentsChildList(v);
                delete this._parent[v];
                this.children(v).forEach(function(child) {
                  self2.setParent(child);
                });
                delete this._children[v];
              }
              Object.keys(this._in[v]).forEach(removeEdge);
              delete this._in[v];
              delete this._preds[v];
              Object.keys(this._out[v]).forEach(removeEdge);
              delete this._out[v];
              delete this._sucs[v];
              --this._nodeCount;
            }
            return this;
          }
          /**
             * Sets node p as a parent for node v if it is defined, or removes the
             * parent for v if p is undefined. Method throws an exception in case of
             * invoking it in context of noncompound graph.
             * Average-case complexity: O(1).
             */
          setParent(v, parent) {
            if (!this._isCompound) {
              throw new Error("Cannot set parent in a non-compound graph");
            }
            if (parent === void 0) {
              parent = GRAPH_NODE;
            } else {
              parent += "";
              for (var ancestor = parent; ancestor !== void 0; ancestor = this.parent(ancestor)) {
                if (ancestor === v) {
                  throw new Error("Setting " + parent + " as parent of " + v + " would create a cycle");
                }
              }
              this.setNode(parent);
            }
            this.setNode(v);
            this._removeFromParentsChildList(v);
            this._parent[v] = parent;
            this._children[parent][v] = true;
            return this;
          }
          _removeFromParentsChildList(v) {
            delete this._children[this._parent[v]][v];
          }
          /**
             * Gets parent node for node v.
             * Complexity: O(1).
             */
          parent(v) {
            if (this._isCompound) {
              var parent = this._parent[v];
              if (parent !== GRAPH_NODE) {
                return parent;
              }
            }
          }
          /**
             * Gets list of direct children of node v.
             * Complexity: O(1).
             */
          children(v = GRAPH_NODE) {
            if (this._isCompound) {
              var children = this._children[v];
              if (children) {
                return Object.keys(children);
              }
            } else if (v === GRAPH_NODE) {
              return this.nodes();
            } else if (this.hasNode(v)) {
              return [];
            }
          }
          /**
             * Return all nodes that are predecessors of the specified node or undefined if node v is not in
             * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
             * Complexity: O(|V|).
             */
          predecessors(v) {
            var predsV = this._preds[v];
            if (predsV) {
              return Object.keys(predsV);
            }
          }
          /**
             * Return all nodes that are successors of the specified node or undefined if node v is not in
             * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
             * Complexity: O(|V|).
             */
          successors(v) {
            var sucsV = this._sucs[v];
            if (sucsV) {
              return Object.keys(sucsV);
            }
          }
          /**
             * Return all nodes that are predecessors or successors of the specified node or undefined if
             * node v is not in the graph.
             * Complexity: O(|V|).
             */
          neighbors(v) {
            var preds = this.predecessors(v);
            if (preds) {
              const union = new Set(preds);
              for (var succ of this.successors(v)) {
                union.add(succ);
              }
              return Array.from(union.values());
            }
          }
          isLeaf(v) {
            var neighbors;
            if (this.isDirected()) {
              neighbors = this.successors(v);
            } else {
              neighbors = this.neighbors(v);
            }
            return neighbors.length === 0;
          }
          /**
             * Creates new graph with nodes filtered via filter. Edges incident to rejected node
             * are also removed. In case of compound graph, if parent is rejected by filter,
             * than all its children are rejected too.
             * Average-case complexity: O(|E|+|V|).
             */
          filterNodes(filter) {
            var copy = new this.constructor({ directed: this._isDirected, multigraph: this._isMultigraph, compound: this._isCompound });
            copy.setGraph(this.graph());
            var self2 = this;
            Object.entries(this._nodes).forEach(function([v, value]) {
              if (filter(v)) {
                copy.setNode(v, value);
              }
            });
            Object.values(this._edgeObjs).forEach(function(e) {
              if (copy.hasNode(e.v) && copy.hasNode(e.w)) {
                copy.setEdge(e, self2.edge(e));
              }
            });
            var parents = {};
            function findParent(v) {
              var parent = self2.parent(v);
              if (parent === void 0 || copy.hasNode(parent)) {
                parents[v] = parent;
                return parent;
              } else if (parent in parents) {
                return parents[parent];
              } else {
                return findParent(parent);
              }
            }
            if (this._isCompound) {
              copy.nodes().forEach((v) => copy.setParent(v, findParent(v)));
            }
            return copy;
          }
          /* === Edge functions ========== */
          /**
             * Sets the default edge label or factory function. This label will be
             * assigned as default label in case if no label was specified while setting
             * an edge or this function will be invoked each time when setting an edge
             * with no label specified and returned value * will be used as a label for edge.
             * Complexity: O(1).
             */
          setDefaultEdgeLabel(newDefault) {
            this._defaultEdgeLabelFn = newDefault;
            if (typeof newDefault !== "function") {
              this._defaultEdgeLabelFn = () => newDefault;
            }
            return this;
          }
          /**
             * Gets the number of edges in the graph.
             * Complexity: O(1).
             */
          edgeCount() {
            return this._edgeCount;
          }
          /**
             * Gets edges of the graph. In case of compound graph subgraphs are not considered.
             * Complexity: O(|E|).
             */
          edges() {
            return Object.values(this._edgeObjs);
          }
          /**
             * Establish an edges path over the nodes in nodes list. If some edge is already
             * exists, it will update its label, otherwise it will create an edge between pair
             * of nodes with label provided or default label if no label provided.
             * Complexity: O(|nodes|).
             */
          setPath(vs, value) {
            var self2 = this;
            var args2 = arguments;
            vs.reduce(function(v, w) {
              if (args2.length > 1) {
                self2.setEdge(v, w, value);
              } else {
                self2.setEdge(v, w);
              }
              return w;
            });
            return this;
          }
          /**
             * Creates or updates the label for the edge (v, w) with the optionally supplied
             * name. If label is supplied it is set as the value for the edge. If label is not
             * supplied and the edge was created by this call then the default edge label will
             * be assigned. The name parameter is only useful with multigraphs.
             */
          setEdge() {
            var v, w, name, value;
            var valueSpecified = false;
            var arg0 = arguments[0];
            if (typeof arg0 === "object" && arg0 !== null && "v" in arg0) {
              v = arg0.v;
              w = arg0.w;
              name = arg0.name;
              if (arguments.length === 2) {
                value = arguments[1];
                valueSpecified = true;
              }
            } else {
              v = arg0;
              w = arguments[1];
              name = arguments[3];
              if (arguments.length > 2) {
                value = arguments[2];
                valueSpecified = true;
              }
            }
            v = "" + v;
            w = "" + w;
            if (name !== void 0) {
              name = "" + name;
            }
            var e = edgeArgsToId(this._isDirected, v, w, name);
            if (Object.hasOwn(this._edgeLabels, e)) {
              if (valueSpecified) {
                this._edgeLabels[e] = value;
              }
              return this;
            }
            if (name !== void 0 && !this._isMultigraph) {
              throw new Error("Cannot set a named edge when isMultigraph = false");
            }
            this.setNode(v);
            this.setNode(w);
            this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name);
            var edgeObj = edgeArgsToObj(this._isDirected, v, w, name);
            v = edgeObj.v;
            w = edgeObj.w;
            Object.freeze(edgeObj);
            this._edgeObjs[e] = edgeObj;
            incrementOrInitEntry(this._preds[w], v);
            incrementOrInitEntry(this._sucs[v], w);
            this._in[w][e] = edgeObj;
            this._out[v][e] = edgeObj;
            this._edgeCount++;
            return this;
          }
          /**
             * Gets the label for the specified edge.
             * Complexity: O(1).
             */
          edge(v, w, name) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name);
            return this._edgeLabels[e];
          }
          /**
             * Gets the label for the specified edge and converts it to an object.
             * Complexity: O(1)
             */
          edgeAsObj() {
            const edge = this.edge(...arguments);
            if (typeof edge !== "object") {
              return { label: edge };
            }
            return edge;
          }
          /**
             * Detects whether the graph contains specified edge or not. No subgraphs are considered.
             * Complexity: O(1).
             */
          hasEdge(v, w, name) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name);
            return Object.hasOwn(this._edgeLabels, e);
          }
          /**
             * Removes the specified edge from the graph. No subgraphs are considered.
             * Complexity: O(1).
             */
          removeEdge(v, w, name) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name);
            var edge = this._edgeObjs[e];
            if (edge) {
              v = edge.v;
              w = edge.w;
              delete this._edgeLabels[e];
              delete this._edgeObjs[e];
              decrementOrRemoveEntry(this._preds[w], v);
              decrementOrRemoveEntry(this._sucs[v], w);
              delete this._in[w][e];
              delete this._out[v][e];
              this._edgeCount--;
            }
            return this;
          }
          /**
             * Return all edges that point to the node v. Optionally filters those edges down to just those
             * coming from node u. Behavior is undefined for undirected graphs - use nodeEdges instead.
             * Complexity: O(|E|).
             */
          inEdges(v, u) {
            var inV = this._in[v];
            if (inV) {
              var edges = Object.values(inV);
              if (!u) {
                return edges;
              }
              return edges.filter((edge) => edge.v === u);
            }
          }
          /**
             * Return all edges that are pointed at by node v. Optionally filters those edges down to just
             * those point to w. Behavior is undefined for undirected graphs - use nodeEdges instead.
             * Complexity: O(|E|).
             */
          outEdges(v, w) {
            var outV = this._out[v];
            if (outV) {
              var edges = Object.values(outV);
              if (!w) {
                return edges;
              }
              return edges.filter((edge) => edge.w === w);
            }
          }
          /**
             * Returns all edges to or from node v regardless of direction. Optionally filters those edges
             * down to just those between nodes v and w regardless of direction.
             * Complexity: O(|E|).
             */
          nodeEdges(v, w) {
            var inEdges = this.inEdges(v, w);
            if (inEdges) {
              return inEdges.concat(this.outEdges(v, w));
            }
          }
        }
        function incrementOrInitEntry(map, k) {
          if (map[k]) {
            map[k]++;
          } else {
            map[k] = 1;
          }
        }
        function decrementOrRemoveEntry(map, k) {
          if (!--map[k]) {
            delete map[k];
          }
        }
        function edgeArgsToId(isDirected, v_, w_, name) {
          var v = "" + v_;
          var w = "" + w_;
          if (!isDirected && v > w) {
            var tmp = v;
            v = w;
            w = tmp;
          }
          return v + EDGE_KEY_DELIM + w + EDGE_KEY_DELIM + (name === void 0 ? DEFAULT_EDGE_NAME : name);
        }
        function edgeArgsToObj(isDirected, v_, w_, name) {
          var v = "" + v_;
          var w = "" + w_;
          if (!isDirected && v > w) {
            var tmp = v;
            v = w;
            w = tmp;
          }
          var edgeObj = { v, w };
          if (name) {
            edgeObj.name = name;
          }
          return edgeObj;
        }
        function edgeObjToId(isDirected, edgeObj) {
          return edgeArgsToId(isDirected, edgeObj.v, edgeObj.w, edgeObj.name);
        }
        module4.exports = Graph;
      }, {}], 45: [function(require2, module4, exports4) {
        module4.exports = { Graph: require2("./graph"), version: require2("./version") };
      }, { "./graph": 44, "./version": 47 }], 46: [function(require2, module4, exports4) {
        var Graph = require2("./graph");
        module4.exports = { write, read };
        function write(g) {
          var json = { options: { directed: g.isDirected(), multigraph: g.isMultigraph(), compound: g.isCompound() }, nodes: writeNodes(g), edges: writeEdges(g) };
          if (g.graph() !== void 0) {
            json.value = structuredClone(g.graph());
          }
          return json;
        }
        function writeNodes(g) {
          return g.nodes().map(function(v) {
            var nodeValue = g.node(v);
            var parent = g.parent(v);
            var node = { v };
            if (nodeValue !== void 0) {
              node.value = nodeValue;
            }
            if (parent !== void 0) {
              node.parent = parent;
            }
            return node;
          });
        }
        function writeEdges(g) {
          return g.edges().map(function(e) {
            var edgeValue = g.edge(e);
            var edge = { v: e.v, w: e.w };
            if (e.name !== void 0) {
              edge.name = e.name;
            }
            if (edgeValue !== void 0) {
              edge.value = edgeValue;
            }
            return edge;
          });
        }
        function read(json) {
          var g = new Graph(json.options).setGraph(json.value);
          json.nodes.forEach(function(entry) {
            g.setNode(entry.v, entry.value);
            if (entry.parent) {
              g.setParent(entry.v, entry.parent);
            }
          });
          json.edges.forEach(function(entry) {
            g.setEdge({ v: entry.v, w: entry.w, name: entry.name }, entry.value);
          });
          return g;
        }
      }, { "./graph": 44 }], 47: [function(require2, module4, exports4) {
        module4.exports = "2.2.4";
      }, {}] }, {}, [1])(1);
    });
  }
});

// src/cli/canvas.js
var { DEFAULT_BOARD, SIDES } = require_constants();
var activeTree = require_activeTree();
var check = require_check();
var rollup = require_rollup();
var workflowTree = require_tree2();
var vaultPath = require_vaultPath();
var archiveDir = require_archiveDir();
var archiveNote = require_archiveNote();
var cardContexts = require_cardContexts();
var cardLinks = require_cardLinks();
var collapseOps = require_collapseOps();
var colorArg = require_colorArg();
var defaultDir = require_defaultDir();
var expandOps = require_expandOps();
var extractOps = require_extractOps();
var fitHeight = require_fitHeight();
var freePath = require_freePath();
var fileSystem = require("fs");
var layoutOps = require_layoutOps();
var linksTo = require_linksTo();
var mergeOps = require_mergeOps();
var newId = require_newId();
var path = require("path");
var place = require_place();
var readBoard = require_readBoard();
var restoreOps = require_restoreOps();
var serialize = require_serialize();
var settings = require_settings2();
var splitOps = require_splitOps();
var today = require_today();
var toTrash = require_toTrash();
var writeOps = require_writeOps();
var args = process.argv.slice(2);
var positional = args.filter((argument, index) => !argument.startsWith("--") && !(index > 0 && args[index - 1].startsWith("--")));
var option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : void 0;
};
{
  const [command, boardArg, ...rest] = positional;
  const board = boardArg || String(settings().defaultBoard || "").trim() || DEFAULT_BOARD;
  const print = (x) => console.log(JSON.stringify(x, null, 2));
  switch (command) {
    case "read":
      print(readBoard(board));
      break;
    case "tree":
      print(args.includes("--active") ? activeTree(workflowTree(board)) : workflowTree(board));
      break;
    case "set": {
      const operation = { op: "set", id: rest[0], color: colorArg(option("--color")) };
      if (option("--text") !== void 0) operation.text = option("--text");
      if (option("--file") !== void 0) operation.file = option("--file");
      console.log(writeOps(board, [operation]));
      break;
    }
    case "add": {
      const width = Number(option("--width") || 320), height = Number(option("--height") || fitHeight(option("--text"), width));
      const position = place(readBoard(board), option("--near"), width, height);
      const node = { id: newId(), type: "text", text: option("--text") || "", x: position.x, y: position.y, width, height };
      const color = colorArg(option("--color"));
      if (color) node.color = color;
      writeOps(board, [{ op: "add", node }]);
      console.log(node.id);
      break;
    }
    case "remove":
      console.log(writeOps(board, [{ op: "remove", id: rest[0] }]));
      break;
    case "edge": {
      const [fromSideDefault, toSideDefault] = SIDES[defaultDir()];
      const [fromSide, toSide] = /depends on/i.test(option("--label") || "") ? [toSideDefault, fromSideDefault] : [fromSideDefault, toSideDefault];
      const edge = { id: newId(), fromNode: rest[0], fromSide, toNode: rest[1], toSide };
      if (option("--label")) edge.label = option("--label");
      console.log(writeOps(board, [{ op: "edge", edge }]));
      break;
    }
    case "layout": {
      const ids = (option("--ids") || "").split(",").filter(Boolean);
      const direction = (option("--dir") || defaultDir()).toUpperCase();
      if (!SIDES[direction]) {
        console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`);
        process.exit(1);
      }
      const operations = layoutOps(readBoard(board), { ids, direction, isFitToText: args.includes("--fit"), dagre: require_dagre_min(), flow: settings().foldDirection });
      console.log(writeOps(board, operations), operations.filter((operation) => operation.op === "set").length, "cards");
      break;
    }
    case "pack":
    case "collapse": {
      const name = option("--name");
      if (!name) throw new Error("collapse needs --name");
      const file = freePath(path.posix.dirname(board), name, ".canvas");
      const { operations, subcanvas, id } = collapseOps(readBoard(board), (option("--ids") || "").split(",").filter(Boolean), file, name);
      fileSystem.writeFileSync(vaultPath(file), serialize(subcanvas));
      writeOps(board, operations);
      console.log(file, id);
      break;
    }
    case "unpack":
    case "expand": {
      const card = readBoard(board).nodes.find((node) => node.id === rest[0]);
      const subcanvas = card && cardLinks(card).canvas;
      if (!subcanvas) throw new Error("card links no canvas");
      const others = args.includes("--keep") ? [] : linksTo(subcanvas, board, rest[0]);
      writeOps(board, expandOps(readBoard(board), rest[0], readBoard(subcanvas)));
      if (args.includes("--keep")) console.log("unpacked (copy), kept", subcanvas);
      else if (others.length) console.log("unpacked, kept", subcanvas, "- still linked from:", others.join(", "));
      else {
        toTrash(subcanvas);
        console.log("unpacked (dissolve), trashed", subcanvas);
      }
      break;
    }
    case "merge":
      console.log(writeOps(board, mergeOps(readBoard(board), (option("--ids") || "").split(",").filter(Boolean))));
      break;
    case "split":
      console.log(writeOps(board, splitOps(readBoard(board), rest[0], option("--by") || "paragraph")));
      break;
    case "extract":
      console.log(writeOps(board, extractOps(readBoard(board), rest[0], option("--text") || "")));
      break;
    case "archive": {
      const canvasData = readBoard(board);
      const ids = rest[0].split(",");
      for (const id of ids) {
        const node = canvasData.nodes.find((node2) => node2.id === id);
        const archived = archiveNote(canvasData, id, board, today(), node && cardContexts(node));
        const folder = archiveDir(board, settings());
        const file = freePath(folder, archived.name, ".md");
        fileSystem.mkdirSync(vaultPath(folder), { recursive: true });
        fileSystem.writeFileSync(vaultPath(file), archived.content);
        console.log(file);
      }
      writeOps(board, ids.map((id) => ({ op: "remove", id })));
      break;
    }
    case "restore": {
      const source = fileSystem.readFileSync(vaultPath(boardArg), "utf8");
      const target = restoreOps({ nodes: [], edges: [] }, source).board;
      const { operations } = restoreOps(readBoard(target), source);
      console.log(writeOps(target, operations), target, operations[0].node.id);
      toTrash(boardArg);
      break;
    }
    case "rollup":
      print(rollup(board));
      break;
    case "check":
      print(check(board, option("--ids") ? new Set(option("--ids").split(",")) : void 0));
      break;
    default:
      console.error("Usage: node .obsidian/plugins/canvas-board/canvas.js read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|archive|restore|rollup|check <board> ... (see header)");
      process.exit(1);
  }
}
