// Built from src/ by `npm run build`; edit src/, not this file.
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// src/plugin/constants.js
var require_constants = __commonJS({
  "src/plugin/constants.js"(exports2, module2) {
    var COLORS = [
      ["none", "", "0", "Inbox"],
      ["red", "1", "1", "Blocked"],
      ["orange", "2", "2", "In Progress"],
      ["yellow", "3", "3", "Review"],
      ["green", "4", "4", "Done"],
      ["cyan", "5", "5", "Do"],
      ["purple", "6", "6", "Clarify"]
    ];
    var DEFAULTS = {
      defaultBoard: "Board.canvas",
      claudePath: "",
      layoutDirection: "TB",
      // TB, LR, BT or RL
      colorLabels: {},
      // color name → label, when edited (Settings > Workflow)
      cardWarning: "60",
      staleDays: "7",
      // yellow cards whose note is untouched this long get a warning badge (and the rollup's `· Nd`)
      hideTagBranches: true,
      // a hidden tag also hides the cards below its cards (in the fold direction)
      foldDirection: "out",
      // fold hides the cards a card points to (out) or the cards pointing to it (in)
      terminal: "",
      passColors: "cyan purple",
      // cards that start a pass (and that tree --active takes, see workflow.js); empty = never
      notesFolder: "Board notes",
      // where the agent keeps the notes it makes for cards (read by workflow.js and the skill)
      archiveMode: "board",
      // board: archive notes in "<board> archive/" next to each board; global: all in archiveFolder
      archiveFolder: "Board notes/Archive"
      // the one archive folder when archiveMode is global
    };
    var COLOR_NUM = {
      red: "1",
      orange: "2",
      yellow: "3",
      green: "4",
      cyan: "5",
      purple: "6"
    };
    var WORKFLOW = [
      ["cyan", "The agent carries the card to done."],
      ["purple", "The agent takes one step, then hands back."],
      ["orange", "A pass is on the card."],
      ["yellow", "A question or a review for you."],
      ["red", "Nothing moves until it is unblocked."],
      ["green", "Finished. Remove the card when it no longer helps."],
      ["none", "No state. The agent never touches it."]
    ];
    var LAYOUT_DIRS = {
      TB: { name: "top to bottom", turn: 0 },
      LR: { name: "left to right", turn: -90 },
      BT: { name: "bottom to top", turn: 180 },
      RL: { name: "right to left", turn: 90 }
    };
    var LINUX_TERMINALS = [
      // [binary, (vault, command) => args]
      [
        "gnome-terminal",
        (vault, command) => [`--working-directory=${vault}`, "--", ...command]
      ],
      ["konsole", (vault, command) => ["--workdir", vault, "-e", ...command]],
      [
        "xfce4-terminal",
        (vault, command) => ["--working-directory", vault, "-x", ...command]
      ],
      ["kitty", (vault, command) => ["--directory", vault, ...command]],
      [
        "alacritty",
        (vault, command) => ["--working-directory", vault, "-e", ...command]
      ],
      ["wezterm", (vault, command) => ["start", "--cwd", vault, "--", ...command]],
      ["foot", (vault, command) => [`--working-directory=${vault}`, ...command]],
      ["x-terminal-emulator", (vault, command) => ["-e", ...command]],
      ["xterm", (vault, command) => ["-e", ...command]]
    ];
    module2.exports = {
      COLORS,
      DEFAULTS,
      COLOR_NUM,
      WORKFLOW,
      LAYOUT_DIRS,
      LINUX_TERMINALS
    };
  }
});

// src/apm/constants.js
var require_constants2 = __commonJS({
  "src/apm/constants.js"(exports2, module2) {
    var MINUTE_MS = 6e4;
    var INPUT_MS = 1e4;
    var MIN_PB = 5;
    var SAVE_EVERY_MS = 1e4;
    var CONTENT_KEYS = ["text", "file", "subpath", "url", "label", "color"];
    var DEFAULTS = {
      pb: 0,
      pbDate: "",
      lowPercent: 25,
      idleMinutes: 5,
      windowMinutes: 15
    };
    module2.exports = {
      MINUTE_MS,
      INPUT_MS,
      MIN_PB,
      SAVE_EVERY_MS,
      CONTENT_KEYS,
      DEFAULTS
    };
  }
});

// src/apm/band.js
var require_band = __commonJS({
  "src/apm/band.js"(exports2, module2) {
    var { MIN_PB } = require_constants2();
    function band(pace, personalBest, lowPercent, warmingUp = false) {
      if (personalBest < MIN_PB) return "calibrating";
      if (pace >= personalBest) return "best";
      const ratio = pace / personalBest * 100;
      if (ratio < lowPercent) return warmingUp ? "calibrating" : "low";
      if (ratio < 50) return "orange";
      if (ratio < 75) return "yellow";
      return "green";
    }
    module2.exports = band;
  }
});

// src/apm/cardsOf.js
var require_cardsOf = __commonJS({
  "src/apm/cardsOf.js"(exports2, module2) {
    var { CONTENT_KEYS } = require_constants2();
    var cardsOf = (json) => {
      const map = /* @__PURE__ */ new Map();
      for (const node of JSON.parse(json || "{}").nodes || []) {
        map.set(
          node.id,
          JSON.stringify(CONTENT_KEYS.map((key) => node[key] ?? null))
        );
      }
      return map;
    };
    module2.exports = cardsOf;
  }
});

// src/apm/rateName.js
var require_rateName = __commonJS({
  "src/apm/rateName.js"(exports2, module2) {
    var rateName = (windowMinutes) => windowMinutes === 1 ? "APM" : `AP${windowMinutes}M`;
    module2.exports = rateName;
  }
});

// src/apm/touchedCards.js
var require_touchedCards = __commonJS({
  "src/apm/touchedCards.js"(exports2, module2) {
    function touchedCards(before, after) {
      const out = [];
      for (const [id, content] of after) {
        if (before.get(id) !== content) out.push(id);
      }
      for (const id of before.keys()) if (!after.has(id)) out.push(id);
      return out;
    }
    module2.exports = touchedCards;
  }
});

// src/apm/unitOf.js
var require_unitOf = __commonJS({
  "src/apm/unitOf.js"(exports2, module2) {
    var unitOf = (windowMinutes) => `cards/${windowMinutes}`;
    module2.exports = unitOf;
  }
});

// src/apm/ApmCounter.js
var require_ApmCounter = __commonJS({
  "src/apm/ApmCounter.js"(exports2, module2) {
    var { INPUT_MS, MINUTE_MS, SAVE_EVERY_MS } = require_constants2();
    var band = require_band();
    var cardsOf = require_cardsOf();
    var rateName = require_rateName();
    var touchedCards = require_touchedCards();
    var unitOf = require_unitOf();
    var ApmCounter = class {
      // plugin: the Kanvas board plugin (registerEvent, registerDomEvent, registerInterval, addStatusBarItem, activeCanvas, app);
      // save(): writes the plugin's data.json, with this.settings in it.
      constructor(plugin, settings, save) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = settings;
        this.save = save;
        this.touched = /* @__PURE__ */ new Map();
        this.snapshots = /* @__PURE__ */ new Map();
        this.lastAction = 0;
        this.sessionStart = 0;
        this.lastInput = 0;
        this.lastSave = 0;
        this.dirty = false;
      }
      load() {
        const { plugin } = this;
        this.element = plugin.addStatusBarItem();
        this.element.addClass("apm-counter");
        const listen = (targetWindow) => {
          const input = () => {
            this.lastInput = Date.now();
          };
          plugin.registerDomEvent(targetWindow, "keydown", input, {
            capture: true,
            passive: true
          });
          plugin.registerDomEvent(targetWindow, "mousedown", input, {
            capture: true,
            passive: true
          });
        };
        listen(window);
        plugin.registerEvent(
          this.app.workspace.on(
            "window-open",
            (workspaceWindow) => listen(workspaceWindow.win)
          )
        );
        plugin.registerEvent(
          this.app.workspace.on("active-leaf-change", () => this.refresh())
        );
        this.app.workspace.onLayoutReady(async () => {
          for (const file of this.app.vault.getFiles()) {
            if (file.extension === "canvas") await this.snapshot(file);
          }
          plugin.registerEvent(
            this.app.vault.on("modify", (file) => this.onModify(file))
          );
          plugin.registerEvent(
            this.app.vault.on("rename", (file, old) => {
              if (this.snapshots.has(old)) {
                this.snapshots.set(file.path, this.snapshots.get(old));
                this.snapshots.delete(old);
              }
            })
          );
        });
        plugin.registerInterval(window.setInterval(() => this.refresh(), 1e3));
        this.refresh();
      }
      async unload() {
        if (this.dirty) await this.save();
      }
      // Returns the file's cards, or null when it can't be read as a canvas right now (a half-written file).
      async snapshot(file) {
        try {
          const cards = cardsOf(await this.app.vault.read(file));
          this.snapshots.set(file.path, cards);
          return cards;
        } catch {
          return null;
        }
      }
      async onModify(file) {
        if (file.extension !== "canvas") return;
        const before = this.snapshots.get(file.path);
        const after = await this.snapshot(file);
        if (!before || !after) return;
        const now = Date.now();
        if (now - this.lastInput > INPUT_MS || this.app.workspace.getActiveFile()?.path !== file.path) {
          return;
        }
        this.record(
          touchedCards(before, after).map((id) => `${file.path}#${id}`),
          now
        );
      }
      record(keys, now = Date.now()) {
        if (!keys.length) return;
        for (const cardId of keys) this.touched.set(cardId, now);
        if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
          this.sessionStart = now;
        }
        this.lastAction = now;
        this.refresh(now);
      }
      pace(now = Date.now()) {
        const windowMs = this.settings.windowMinutes * MINUTE_MS;
        for (const [cardId, touchedAt] of this.touched) {
          if (touchedAt <= now - windowMs) this.touched.delete(cardId);
        }
        return this.touched.size;
      }
      isIdle(now) {
        if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
          return true;
        }
        const windows = [
          window,
          ...[...this.app.workspace.floatingSplit?.children ?? []].map(
            (container) => container.win
          )
        ];
        return !windows.some(
          (candidateWindow) => candidateWindow && candidateWindow.document.hasFocus()
        );
      }
      refresh(now = Date.now()) {
        const pace = this.pace(now);
        const settings = this.settings;
        if (pace > settings.pb) {
          settings.pb = pace;
          settings.pbDate = new Date(now).toISOString().slice(0, 10);
          this.dirty = true;
        }
        if (this.dirty && now - this.lastSave >= SAVE_EVERY_MS) {
          this.dirty = false;
          this.lastSave = now;
          this.save();
        }
        const shown = !!this.plugin.activeCanvas();
        if (this.shown !== shown) {
          this.element.toggle(shown);
          this.shown = shown;
        }
        if (!shown) return;
        const state = this.isIdle(now) ? "idle" : band(
          pace,
          settings.pb,
          settings.lowPercent,
          now - this.sessionStart < settings.windowMinutes * MINUTE_MS
        );
        if (this.state !== state) {
          if (this.state) this.element.removeClass("apm-" + this.state);
          this.element.addClass("apm-" + state);
          this.state = state;
        }
        const text = `${pace} ${rateName(settings.windowMinutes)} \xB7 PB ${settings.pb}`;
        if (this.text !== text) {
          this.element.setText(text);
          this.text = text;
          const what = `Cards touched in the last ${settings.windowMinutes} min.`;
          this.element.setAttribute(
            "aria-label",
            settings.pbDate ? `${what} Personal best set ${settings.pbDate}.` : what
          );
        }
      }
      async resetPb() {
        this.settings.pb = 0;
        this.settings.pbDate = "";
        this.touched.clear();
        this.dirty = false;
        await this.save();
        this.refresh();
      }
      async setWindow(minutes) {
        this.settings.windowMinutes = minutes;
        this.settings.unit = unitOf(minutes);
        await this.resetPb();
      }
    };
    module2.exports = ApmCounter;
  }
});

// src/board/constants.js
var require_constants3 = __commonJS({
  "src/board/constants.js"(exports2, module2) {
    var path = require("path");
    var ROOT = path.resolve(__dirname, "..", "..", "..");
    var DEFAULT_BOARD = "Board.canvas";
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
    var SIDES = {
      TB: ["bottom", "top"],
      LR: ["right", "left"],
      BT: ["top", "bottom"],
      RL: ["left", "right"]
    };
    module2.exports = {
      ROOT,
      DEFAULT_BOARD,
      SKIP_DIRS,
      COLORS,
      URGENCY,
      TEMPLATE_DIR,
      ARCHIVE_DIR,
      OBSIDIAN,
      SIDES
    };
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

// src/board/archiveDir.js
var require_archiveDir = __commonJS({
  "src/board/archiveDir.js"(exports2, module2) {
    var { ARCHIVE_DIR } = require_constants3();
    var path = require("path");
    function archiveDir(board, options = {}) {
      if (options.archiveMode === "global") {
        return String(options.archiveFolder || ARCHIVE_DIR).trim().replace(/[/\\]+$/, "") || ARCHIVE_DIR;
      }
      const boardPath = String(board).replace(/\\/g, "/"), folder = path.posix.dirname(boardPath);
      return (folder === "." ? "" : folder + "/") + path.posix.basename(boardPath, ".canvas") + " archive";
    }
    module2.exports = archiveDir;
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
    function archiveNote(canvasData, id, board, date, contexts = ["G&A"]) {
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
    module2.exports = archiveNote;
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
    var newId = () => [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
    module2.exports = newId;
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
    var newId = require_newId();
    var withGroupMembers = require_withGroupMembers();
    function collapseOps(canvasData, ids, file, label) {
      const pick = withGroupMembers(canvasData, ids);
      const moving = canvasData.nodes.filter((node) => pick.has(node.id));
      if (!moving.length) throw new Error("nothing to collapse");
      const box = bounds(moving);
      const sub = {
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
        id: newId(),
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
      return { operations, sub, id: card.id };
    }
    module2.exports = collapseOps;
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
    var newId = require_newId();
    function expandOps(canvasData, id, sub, { group } = {}) {
      const card = canvasData.nodes.find((node) => node.id === id);
      if (!card) throw new Error("no node " + id);
      if (!sub.nodes.length) throw new Error("empty subcanvas");
      const taken = new Set(
        canvasData.nodes.map((node) => node.id).concat(canvasData.edges.map((edge) => edge.id))
      );
      const ids = new Map(
        sub.nodes.map((node) => [node.id, taken.has(node.id) ? newId() : node.id])
      );
      const box = bounds(sub.nodes);
      const others = canvasData.nodes.filter((node) => node.id !== id);
      let offsetX = Math.round(card.x + (card.width - box.w) / 2) - box.x;
      const offsetY = Math.round(card.y + (card.height - box.h) / 2) - box.y;
      const hits = () => sub.nodes.some(
        (subNode) => others.some(
          (node) => subNode.x + offsetX < node.x + node.width + 40 && subNode.x + offsetX + subNode.width + 40 > node.x && subNode.y + offsetY < node.y + node.height + 40 && subNode.y + offsetY + subNode.height + 40 > node.y
        )
      );
      for (let attempt = 0; attempt < 200 && hits(); attempt++) offsetX += 40;
      const nodes = sub.nodes.map((node) => ({
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
          id: newId(),
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
      for (const edge of sub.edges) {
        operations.push({
          op: "edge",
          edge: {
            ...edge,
            id: taken.has(edge.id) ? newId() : edge.id,
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
    module2.exports = expandOps;
  }
});

// src/board/fitHeight.js
var require_fitHeight = __commonJS({
  "src/board/fitHeight.js"(exports2, module2) {
    function fitHeight(text, width) {
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
    module2.exports = fitHeight;
  }
});

// src/board/extractOps.js
var require_extractOps = __commonJS({
  "src/board/extractOps.js"(exports2, module2) {
    var fitHeight = require_fitHeight();
    var newId = require_newId();
    function extractOps(canvasData, id, part, from) {
      const card = canvasData.nodes.find((node2) => node2.id === id);
      if (!card || card.type !== "text") {
        throw new Error("extract takes one text card");
      }
      const offset = from !== void 0 && card.text.slice(from, from + part.length) === part ? from : card.text.indexOf(part);
      if (!part.trim() || offset < 0) throw new Error("text not found in the card");
      const left = (card.text.slice(0, offset) + card.text.slice(offset + part.length)).replace(/\n{3,}/g, "\n\n").trim();
      const text = part.trim();
      const height = fitHeight(text, card.width);
      let y = card.y;
      while (canvasData.nodes.some(
        (node2) => node2.x === card.x + card.width + 40 && node2.y === y
      )) {
        y += 40;
      }
      const node = {
        id: newId(),
        type: "text",
        text,
        x: card.x + card.width + 40,
        y,
        width: card.width,
        height
      };
      if (card.color) node.color = card.color;
      return [
        { op: "set", id, text: left, height: fitHeight(left, card.width) },
        { op: "add", node }
      ];
    }
    module2.exports = extractOps;
  }
});

// src/board/layoutOps.js
var require_layoutOps = __commonJS({
  "src/board/layoutOps.js"(exports2, module2) {
    var { SIDES } = require_constants3();
    var fitHeight = require_fitHeight();
    function layoutOps(canvasData, { ids, direction = "TB", fit = false, dagre, flow = "out" }) {
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
        height: fit && node.type === "text" ? fitHeight(node.text, node.width) : node.height
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
      const [fromSide, toSide] = SIDES[direction];
      for (const edge of inner) {
        operations.push(
          back(edge) ? { op: "sides", id: edge.id, fromSide: toSide, toSide: fromSide } : { op: "sides", id: edge.id, fromSide, toSide }
        );
      }
      return operations;
    }
    module2.exports = layoutOps;
  }
});

// src/board/mostUrgent.js
var require_mostUrgent = __commonJS({
  "src/board/mostUrgent.js"(exports2, module2) {
    var { URGENCY } = require_constants3();
    var mostUrgent = (colors) => URGENCY.find((color) => colors.includes(color)) || "";
    module2.exports = mostUrgent;
  }
});

// src/board/mergeOps.js
var require_mergeOps = __commonJS({
  "src/board/mergeOps.js"(exports2, module2) {
    var byReading = require_byReading();
    var fitHeight = require_fitHeight();
    var mostUrgent = require_mostUrgent();
    function mergeOps(canvasData, ids) {
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
          height: fitHeight(text, width)
        }
      ];
      const center = (node) => [node.x + node.width / 2, node.y + node.height / 2];
      const dist = (first, second) => Math.hypot(
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
        const length = dist(
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
    module2.exports = mergeOps;
  }
});

// src/board/plainLines.js
var require_plainLines = __commonJS({
  "src/board/plainLines.js"(exports2, module2) {
    function plainLines(text) {
      const name = (node) => node.replace(/\.(md|canvas)$/, "").split("/").pop();
      return String(text || "").split("\n").map(
        (line) => line.replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(
          /!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g,
          (match, node, heading) => node ? `${name(node)} \u203A ${heading}` : heading
        ).replace(/!?\[\[([^\]]+)\]\]/g, (match, node) => name(node)).replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/, "").replace(/\*\*|__|~~|==|`/g, "").replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, "$1$2").replace(/\s+/g, " ").trim()
      ).filter(Boolean);
    }
    module2.exports = plainLines;
  }
});

// src/board/relinkText.js
var require_relinkText = __commonJS({
  "src/board/relinkText.js"(exports2, module2) {
    var path = require("path");
    function relinkText(text, hits, replace) {
      return (text || "").replace(
        /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g,
        (link, target, sub, alias) => hits(target.trim()) ? replace(
          alias || path.posix.basename(target.trim()).replace(/\.canvas$/, "")
        ) : link
      );
    }
    module2.exports = relinkText;
  }
});

// src/board/restoreOps.js
var require_restoreOps = __commonJS({
  "src/board/restoreOps.js"(exports2, module2) {
    var newId = require_newId();
    function restoreOps(canvasData, source) {
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
      const id = ids.has(get("card-id")) ? newId() : get("card-id");
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
        const [eid, from, fromSide, toId, toSide, label] = JSON.parse(
          edgeLine[1]
        ).split(" | ");
        const fromNode = from === old ? id : from, toNode = toId === old ? id : toId;
        if (edgeIds.has(eid) || !(fromNode === id || ids.has(fromNode)) || !(toNode === id || ids.has(toNode))) {
          continue;
        }
        const edge = { id: eid, fromNode, toNode };
        if (fromSide) edge.fromSide = fromSide;
        if (toSide) edge.toSide = toSide;
        if (label) edge.label = label;
        operations.push({ op: "edge", edge });
      }
      return { board, operations };
    }
    module2.exports = restoreOps;
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
    var fitHeight = require_fitHeight();
    var newId = require_newId();
    var splitText = require_splitText();
    function splitOps(canvasData, id, separator = "paragraph") {
      const card = canvasData.nodes.find((node) => node.id === id);
      if (!card || card.type !== "text") {
        throw new Error("split takes one text card");
      }
      const pieces = splitText(card.text || "", separator);
      if (pieces.length < 2) throw new Error(`nothing to split by ${separator}`);
      let y = card.y;
      return pieces.map((text, index) => {
        const height = fitHeight(text, card.width);
        const node = { ...card, id: index ? newId() : card.id, text, y, height };
        y += height + 20;
        return index ? { op: "add", node } : { op: "set", id, text, height };
      });
    }
    module2.exports = splitOps;
  }
});

// src/board/templateOps.js
var require_templateOps = __commonJS({
  "src/board/templateOps.js"(exports2, module2) {
    var newId = require_newId();
    function templateOps(tpl, origin) {
      const nodes = tpl.nodes || [];
      if (!nodes.length) throw new Error("empty template");
      const minX = Math.min(...nodes.map((node) => node.x)), minY = Math.min(...nodes.map((node) => node.y));
      const ids = new Map(nodes.map((node) => [node.id, newId()]));
      const operations = nodes.map((node) => ({
        op: "add",
        node: {
          ...node,
          id: ids.get(node.id),
          x: node.x - minX + origin.x,
          y: node.y - minY + origin.y
        }
      }));
      for (const edge of tpl.edges || []) {
        if (ids.has(edge.fromNode) && ids.has(edge.toNode)) {
          operations.push({
            op: "edge",
            edge: {
              ...edge,
              id: newId(),
              fromNode: ids.get(edge.fromNode),
              toNode: ids.get(edge.toNode)
            }
          });
        }
      }
      return operations;
    }
    module2.exports = templateOps;
  }
});

// src/plugin/boardLibrary.js
var require_boardLibrary = __commonJS({
  "src/plugin/boardLibrary.js"(exports2, module2) {
    var { SIDES, TEMPLATE_DIR } = require_constants3();
    module2.exports = {
      SIDES,
      TEMPLATE_DIR,
      applyOps: require_applyOps(),
      archiveDir: require_archiveDir(),
      archiveNote: require_archiveNote(),
      collapseOps: require_collapseOps(),
      expandOps: require_expandOps(),
      extractOps: require_extractOps(),
      layoutOps: require_layoutOps(),
      mergeOps: require_mergeOps(),
      plainLines: require_plainLines(),
      relinkText: require_relinkText(),
      restoreOps: require_restoreOps(),
      splitOps: require_splitOps(),
      templateOps: require_templateOps()
    };
  }
});

// src/plugin/parseColors.js
var require_parseColors = __commonJS({
  "src/plugin/parseColors.js"(exports2, module2) {
    var { COLOR_NUM } = require_constants();
    var parseColors = (value) => new Set(
      String(value || "").split(/[\s,]+/).filter(Boolean).map((color) => COLOR_NUM[color.toLowerCase()] || color).filter((color) => /^[1-6]$/.test(color))
    );
    module2.exports = parseColors;
  }
});

// src/plugin/CanvasBoardSettings.js
var require_CanvasBoardSettings = __commonJS({
  "src/plugin/CanvasBoardSettings.js"(exports2, module2) {
    var { COLORS, COLOR_NUM, DEFAULTS, WORKFLOW } = require_constants();
    var { Notice, PluginSettingTab, Setting } = require("obsidian");
    var fileSystem = require("fs");
    var parseColors = require_parseColors();
    var path = require("path");
    var CanvasBoardSettings = class extends PluginSettingTab {
      constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
      }
      display() {
        const { containerEl } = this;
        containerEl.empty();
        const text = (name, desc, key) => new Setting(containerEl).setName(name).setDesc(desc).addText(
          (component) => component.setPlaceholder(DEFAULTS[key]).setValue(this.plugin.settings[key]).onChange(async (value) => {
            this.plugin.settings[key] = value.trim() || DEFAULTS[key];
            await this.plugin.saveData(this.plugin.settings);
          })
        );
        const heading = (name) => new Setting(containerEl).setName(name).setHeading();
        new Setting(containerEl).setName("Hotkeys").setDesc(
          "Every canvas board command can have a key; buttons and menu items show it."
        ).addButton(
          (button) => button.setButtonText("Open hotkeys").onClick(() => {
            this.app.setting.openTabById("hotkeys");
            const tab = this.app.setting.activeTab;
            if (tab && tab.searchComponent) {
              tab.searchComponent.setValue(this.plugin.manifest.name);
              if (tab.setQuery) tab.setQuery(this.plugin.manifest.name);
            }
          })
        );
        heading("Board");
        new Setting(containerEl).setName("Starter board").setDesc(
          'A board with the color legend and first steps: the default board if it does not exist yet, else "Starter board.canvas".'
        ).addButton(
          (button) => button.setButtonText("Create").onClick(() => this.plugin.createStarterBoard())
        );
        text(
          "Default board",
          'Board used by "Run pass" when the active tab is not a canvas, and by "Open the board" (ribbon).',
          "defaultBoard"
        );
        text(
          "Card count warning",
          "The status bar card count turns to the warning color past this many cards (0: never).",
          "cardWarning"
        );
        text(
          "Stale after (days)",
          'A yellow card whose note is untouched this many days gets a warning badge with its age; the roll-up adds "\xB7 Nd" from the same value (0: never).',
          "staleDays"
        );
        text(
          "Agent notes folder",
          "Where the agent creates the notes and plan canvases for cards. Changing it does not move anything: rename the folder in Obsidian first, so links follow.",
          "notesFolder"
        );
        new Setting(containerEl).setName("Archive").setDesc(
          'Where "Archive selected cards" puts the notes: a "<board> archive" folder next to each board, or one folder for all boards. Changing it does not move notes already archived; restore works from any folder.'
        ).addDropdown(
          (dropdown) => dropdown.addOption("board", "Next to each board").addOption("global", "One folder for all boards").setValue(this.plugin.settings.archiveMode).onChange(async (value) => {
            this.plugin.settings.archiveMode = value;
            await this.plugin.saveData(this.plugin.settings);
            this.display();
          })
        );
        if (this.plugin.settings.archiveMode === "global") {
          text(
            "Archive folder",
            "The folder for all boards' archive notes.",
            "archiveFolder"
          );
        }
        heading("Workflow").setDesc(
          'What each color does and its label, shown in tooltips, the filter pane and the color commands. Toggle on: the color triggers the agent, so "Run pass" starts if the board has such a card and the agent takes those cards. All off: the agent never starts.'
        );
        const goColors = parseColors(this.plugin.settings.passColors);
        for (const [name, meaning] of WORKFLOW) {
          const colorNumber = COLOR_NUM[name];
          const row = new Setting(containerEl).setName(colorNumber ? name : "uncolored").setDesc(meaning);
          row.nameEl.prepend(
            createSpan({
              cls: "canvas-board-dot canvas-board-workflow-dot",
              attr: { style: this.plugin.dotStyle(colorNumber) }
            })
          );
          row.addText(
            (component) => component.setPlaceholder(COLORS.find((color) => color[0] === name)[3]).setValue((this.plugin.settings.colorLabels || {})[name] || "").onChange((value) => this.plugin.setColorLabel(name, value.trim()))
          );
          if (!colorNumber) {
            row.addToggle(
              (component) => component.setTooltip("Never triggers the agent").setValue(false).setDisabled(true)
            );
          } else {
            row.addToggle(
              (component) => component.setTooltip("Triggers the agent").setValue(goColors.has(colorNumber)).onChange(async (isOn) => {
                if (isOn) goColors.add(colorNumber);
                else goColors.delete(colorNumber);
                this.plugin.settings.passColors = WORKFLOW.map(([node]) => node).filter((node) => goColors.has(COLOR_NUM[node])).join(" ");
                await this.plugin.saveData(this.plugin.settings);
              })
            );
          }
        }
        heading("Pass");
        text(
          "Claude path",
          "Empty: ~/.local/bin/claude (claude.exe on Windows) if it exists, else claude on PATH.",
          "claudePath"
        );
        text(
          "Terminal command",
          "Starts the pass. Empty: Windows Terminal, macOS Terminal, or the first known terminal on Linux (gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, wezterm, foot, xterm). Otherwise {vault}, {board}, {claude} are replaced; quote parts with spaces.",
          "terminal"
        );
        const skillFile = this.plugin.skillPath();
        new Setting(containerEl).setName("Agent instructions").setDesc(
          "What the agent does on a pass. Saved when the field loses focus, to .claude/skills/canvas-board/SKILL.md (where Claude Code reads it; any agent can be pointed at it). Written once from the plugin, then yours: plugin updates never overwrite it. Reset brings back the plugin's version."
        ).addButton(
          (button) => button.setButtonText("Reset").setWarning().onClick(() => {
            this.plugin.syncSkill(
              path.join(
                this.app.vault.adapter.basePath,
                this.plugin.manifest.dir
              ),
              true
            );
            this.display();
          })
        );
        const editor = containerEl.createEl("textarea", {
          cls: "canvas-board-skill-editor",
          attr: { spellcheck: "false", rows: "24" }
        });
        try {
          editor.value = fileSystem.readFileSync(skillFile, "utf8");
        } catch (error) {
          editor.placeholder = "No instructions file yet: Reset writes the plugin's version.";
        }
        editor.addEventListener("change", () => {
          try {
            fileSystem.mkdirSync(path.dirname(skillFile), { recursive: true });
            fileSystem.writeFileSync(skillFile, editor.value);
            new Notice("Kanvas board: agent instructions saved");
          } catch (error) {
            new Notice(
              `Kanvas board: could not save the agent instructions (${error.message})`
            );
          }
        });
        heading("APM counter").setDesc(
          "Canvas cards touched in a rolling window, in the status bar while a canvas is the active tab."
        );
        const apm = this.plugin.apm;
        const apmSettings = apm.settings;
        new Setting(containerEl).setName("Personal best").setDesc(
          apmSettings.pb ? `${apmSettings.pb} cards in ${apmSettings.windowMinutes} min${apmSettings.pbDate ? `, set ${apmSettings.pbDate}` : ""}.` : "None yet."
        ).addButton(
          (button) => button.setButtonText("Reset").setWarning().onClick(async () => {
            await apm.resetPb();
            this.display();
          })
        );
        new Setting(containerEl).setName("Window (minutes)").setDesc(
          "Cards are counted over this rolling window. Changing it resets the personal best: the numbers are not comparable."
        ).addText((component) => {
          component.setValue(String(apmSettings.windowMinutes));
          component.inputEl.addEventListener("change", async () => {
            const node = Number(component.getValue());
            if (!(node > 0) || node === apmSettings.windowMinutes) return;
            await apm.setWindow(node);
            this.display();
          });
        });
        new Setting(containerEl).setName("Alert below").setDesc(
          "Percent of the personal best under which the counter turns red and pulses. Not in the first window of a session."
        ).addSlider(
          (slider) => slider.setLimits(5, 50, 5).setValue(apmSettings.lowPercent).setDynamicTooltip().onChange(async (value) => {
            apmSettings.lowPercent = value;
            await this.plugin.saveData(this.plugin.settings);
            apm.refresh();
          })
        );
        new Setting(containerEl).setName("Idle after (minutes)").setDesc(
          "Without an action for this long, the alert stops and the counter dims. It also dims while Obsidian is not focused."
        ).addText(
          (component) => component.setValue(String(apmSettings.idleMinutes)).onChange(async (value) => {
            const node = Number(value);
            if (!(node > 0)) return;
            apmSettings.idleMinutes = node;
            await this.plugin.saveData(this.plugin.settings);
            apm.refresh();
          })
        );
        heading("Layout");
        new Setting(containerEl).setName("Layout direction").setDesc(
          'Tidy layout and agent-made plan canvases: the card a branch starts from comes first, following arrows in the fold direction ("depends on" prerequisites too). Shift-click the Tidy layout button, or commands "Tidy layout direction: \u2026", switch it on the fly.'
        ).addDropdown(
          (dropdown) => dropdown.addOptions({
            TB: "Top to bottom",
            LR: "Left to right",
            BT: "Bottom to top",
            RL: "Right to left"
          }).setValue(this.plugin.settings.layoutDirection).onChange((value) => this.plugin.setLayoutDirection(value))
        );
        heading("View");
        new Setting(containerEl).setName("Fold direction").setDesc(
          'Fold branch hides the cards the card points to (outgoing) or the cards pointing to it (incoming), and so on down the branch. Tidy layout reads branches the same way. Commands "Fold direction: \u2026" switch it on the fly.'
        ).addDropdown(
          (dropdown) => dropdown.addOptions({ out: "Outgoing", in: "Incoming" }).setValue(this.plugin.settings.foldDirection).onChange(async (value) => {
            this.plugin.settings.foldDirection = value;
            await this.plugin.saveData(this.plugin.settings);
          })
        );
        new Setting(containerEl).setName("Hide cards under hidden tags").setDesc(
          "Hiding a tag in the filter pane also hides the branch of each card that has it, in the fold direction."
        ).addToggle(
          (component) => component.setValue(this.plugin.settings.hideTagBranches).onChange(async (value) => {
            this.plugin.settings.hideTagBranches = value;
            await this.plugin.saveData(this.plugin.settings);
            for (const canvas of this.plugin.panes.keys()) {
              this.plugin.refreshView(canvas);
            }
          })
        );
      }
    };
    module2.exports = CanvasBoardSettings;
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
            let path = pathData.path;
            let lca = pathData.lca;
            let pathIdx = 0;
            let pathV = path[pathIdx];
            let ascending = true;
            while (v !== edgeObj.w) {
              node = g.node(v);
              if (ascending) {
                while ((pathV = path[pathIdx]) !== lca && g.node(pathV).maxRank < node.rank) {
                  pathIdx++;
                }
                if (pathV === lca) {
                  ascending = false;
                }
              }
              if (!ascending) {
                while (pathIdx < path.length - 1 && g.node(pathV = path[pathIdx + 1]).minRank <= node.rank) {
                  pathIdx++;
                }
                pathV = path[pathIdx];
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
            var args = arguments;
            var self2 = this;
            vs.forEach(function(v) {
              if (args.length > 1) {
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
            var args = arguments;
            vs.reduce(function(v, w) {
              if (args.length > 1) {
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

// src/apm/loadSettings.js
var require_loadSettings = __commonJS({
  "src/apm/loadSettings.js"(exports2, module2) {
    var { DEFAULTS } = require_constants2();
    var unitOf = require_unitOf();
    function loadSettings(stored, legacy) {
      const settings = Object.assign({}, DEFAULTS, stored || legacy || {});
      if (settings.unit !== unitOf(settings.windowMinutes)) {
        Object.assign(settings, {
          pb: 0,
          pbDate: "",
          unit: unitOf(settings.windowMinutes)
        });
      }
      return settings;
    }
    module2.exports = loadSettings;
  }
});

// src/plugin/claudeBin.js
var require_claudeBin = __commonJS({
  "src/plugin/claudeBin.js"(exports2, module2) {
    var fileSystem = require("fs");
    var operatingSystem = require("os");
    var path = require("path");
    function claudeBin(setting) {
      if (setting) return setting;
      const local = path.join(
        operatingSystem.homedir(),
        ".local",
        "bin",
        process.platform === "win32" ? "claude.exe" : "claude"
      );
      return fileSystem.existsSync(local) ? local : "claude";
    }
    module2.exports = claudeBin;
  }
});

// src/plugin/onPath.js
var require_onPath = __commonJS({
  "src/plugin/onPath.js"(exports2, module2) {
    var fileSystem = require("fs");
    var path = require("path");
    var onPath = (bin) => String(process.env.PATH || "").split(path.delimiter).some((folder) => folder && fileSystem.existsSync(path.join(folder, bin)));
    module2.exports = onPath;
  }
});

// src/plugin/defaultLaunch.js
var require_defaultLaunch = __commonJS({
  "src/plugin/defaultLaunch.js"(exports2, module2) {
    var { LINUX_TERMINALS } = require_constants();
    var onPath = require_onPath();
    function defaultLaunch({ vault, board, claude }) {
      const prompt = `/canvas-board ${board}`;
      if (process.platform === "win32") {
        return [
          "wt.exe",
          [
            "-w",
            "canvas-board",
            "new-tab",
            "-d",
            vault,
            "--title",
            `pass ${board}`,
            claude,
            prompt
          ]
        ];
      }
      if (process.platform === "darwin") {
        return [
          "osascript",
          [
            "-e",
            "on run argv",
            "-e",
            'tell application "Terminal"',
            "-e",
            "activate",
            "-e",
            'do script "cd " & quoted form of item 1 of argv & " && " & quoted form of item 2 of argv & " " & quoted form of item 3 of argv',
            "-e",
            "end tell",
            "-e",
            "end run",
            vault,
            claude,
            prompt
          ]
        ];
      }
      const found = LINUX_TERMINALS.find(([bin]) => onPath(bin));
      return found ? [found[0], found[1](vault, [claude, prompt])] : null;
    }
    module2.exports = defaultLaunch;
  }
});

// src/plugin/FilterPane.js
var require_FilterPane = __commonJS({
  "src/plugin/FilterPane.js"(exports2, module2) {
    var { COLORS } = require_constants();
    var { Notice, setIcon } = require("obsidian");
    var FilterPane = class {
      constructor(plugin, canvas) {
        this.plugin = plugin;
        this.canvas = canvas;
        this.isOpen = false;
        this.key = "";
        const element = this.element = canvas.wrapperEl.createDiv({
          cls: "canvas-board-pane"
        });
        for (const eventName of [
          "pointerdown",
          "mousedown",
          "wheel",
          "dblclick",
          "contextmenu"
        ]) {
          element.addEventListener(eventName, (event) => event.stopPropagation());
        }
        const head = element.createDiv({ cls: "canvas-board-pane-head" });
        const button = head.createDiv({
          cls: "clickable-icon",
          attr: {
            "aria-label": plugin.keyedLabel("Filter cards", "filter"),
            "data-tooltip-position": "right"
          }
        });
        setIcon(button, "filter");
        button.addEventListener("click", () => this.toggle());
        this.badge = head.createSpan({ cls: "canvas-board-pane-badge" });
        this.body = element.createDiv({ cls: "canvas-board-pane-body" });
        const viewState = () => plugin.viewState(canvas);
        const apply = () => plugin.refreshView(canvas);
        const section = (title, reset) => {
          const sectionEl = this.body.createDiv({
            cls: "canvas-board-pane-section"
          });
          const headingEl = sectionEl.createDiv({
            cls: "canvas-board-pane-heading"
          });
          headingEl.createSpan({ text: title });
          if (reset) {
            const resetEl = headingEl.createSpan({
              cls: "clickable-icon canvas-board-pane-reset",
              attr: { "aria-label": "Reset" }
            });
            setIcon(resetEl, "rotate-ccw");
            resetEl.addEventListener("click", () => {
              reset();
              apply();
            });
          }
          return sectionEl;
        };
        this.colorsEl = section(
          "Colors",
          () => viewState().xcolors.clear()
        ).createDiv({
          cls: "canvas-board-chips"
        });
        this.tagsSection = section("Tags", () => viewState().xtags.clear());
        this.tagsEl = this.tagsSection.createDiv({ cls: "canvas-board-chips" });
        this.foldedSection = section(
          "Folded",
          () => plugin.setFolds(
            canvas,
            new Map([...plugin.folds(canvas).keys()].map((id) => [id, null]))
          )
        );
        this.foldedEl = this.foldedSection.createDiv({
          cls: "canvas-board-pane-list"
        });
        const foot = this.body.createDiv({ cls: "canvas-board-pane-foot" });
        const all = foot.createDiv({
          cls: "clickable-icon",
          attr: { "aria-label": "Unhide all (clear filter and folds)" }
        });
        setIcon(all, "eye");
        all.addEventListener("click", () => plugin.showAll(canvas));
        this.toggle(false);
      }
      tags() {
        const tags = /* @__PURE__ */ new Set();
        for (const node of this.canvas.nodes.values()) {
          for (const tag of this.plugin.cardTagSet(node)) tags.add(tag);
        }
        return tags;
      }
      toggle(open = !this.isOpen) {
        this.isOpen = open;
        this.element.toggleClass("is-open", open);
        this.key = "";
        this.update();
      }
      // Redraws the chips and lists only when something changed (called every 2 s), never the text fields.
      update() {
        const { plugin, canvas } = this;
        const viewSnapshot = plugin.viewState(canvas, false);
        const counts = {};
        for (const node of canvas.nodes.values()) {
          const data = node.getData();
          if (data.type !== "group") {
            counts[data.color || ""] = (counts[data.color || ""] || 0) + 1;
          }
        }
        const folds = plugin.folds(canvas);
        const active = plugin.filtering(viewSnapshot) || folds.size > 0;
        this.badge.setText(active ? plugin.viewLabel(canvas) : "");
        this.badge.toggle(!this.isOpen && active);
        if (!this.isOpen) return;
        const state = plugin.viewState(canvas);
        const tags = [.../* @__PURE__ */ new Set([...this.tags(), ...state.xtags])].sort();
        const foldedCards = [...folds.keys()].map((id) => canvas.nodes.get(id)).filter(Boolean).map((node) => [node.getData().color, plugin.cardText(node)]);
        const key = JSON.stringify([
          counts,
          [...state.xcolors],
          tags,
          [...state.xtags],
          [...folds],
          foldedCards,
          state.hidden.size
        ]);
        if (key === this.key) return;
        this.key = key;
        const apply = () => plugin.refreshView(canvas);
        const toggle = (set, x) => {
          if (set.has(x)) set.delete(x);
          else set.add(x);
          apply();
        };
        const select = (keep) => {
          if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {
            new Notice("Kanvas board: no visible card to select");
          }
        };
        this.colorsEl.empty();
        for (const [name, color] of COLORS) {
          const out = state.xcolors.has(color);
          const chip = this.colorsEl.createDiv({
            cls: "canvas-board-swatch",
            attr: {
              "aria-label": `${plugin.colorLabel(name)} \xB7 ${counts[color] || 0} cards \xB7 click to ${out ? "show" : "hide"} \xB7 shift-click to select`
            }
          });
          chip.toggleClass("is-out", out);
          chip.createSpan({
            cls: "canvas-board-dot",
            attr: {
              style: color ? `background: var(--canvas-color-${color})` : ""
            }
          });
          chip.addEventListener(
            "click",
            (event) => event.shiftKey ? select((node) => (node.getData().color || "") === color) : toggle(state.xcolors, color)
          );
        }
        this.tagsEl.empty();
        this.tagsSection.toggle(tags.length > 0);
        for (const tag of tags) {
          const out = state.xtags.has(tag);
          const chip = this.tagsEl.createDiv({
            cls: "canvas-board-chip",
            text: "#" + tag,
            attr: {
              "aria-label": `click to ${out ? "show" : "hide"} \xB7 shift-click to select`
            }
          });
          chip.toggleClass("is-out", out);
          chip.addEventListener(
            "click",
            (event) => event.shiftKey ? select((node) => plugin.cardTagSet(node).has(tag)) : toggle(state.xtags, tag)
          );
        }
        this.foldedEl.empty();
        this.foldedSection.toggle(folds.size > 0);
        for (const [id, direction] of folds) {
          const node = canvas.nodes.get(id);
          if (!node) continue;
          const row = this.foldedEl.createDiv({
            cls: "canvas-board-pane-row canvas-board-pane-card",
            attr: {
              "aria-label": "Click to unfold the whole branch \xB7 shift-click to select the card"
            }
          });
          row.createSpan({
            cls: "canvas-board-dot",
            attr: { style: plugin.dotStyle(node.getData().color) }
          });
          const text = row.createDiv({ cls: "canvas-board-pane-card-text" });
          const [title, ...rest] = plugin.boardLibrary.plainLines(
            plugin.cardText(node)
          );
          text.createDiv({
            cls: "canvas-board-pane-card-title",
            text: title || "(empty)"
          });
          if (rest.length) {
            text.createDiv({
              cls: "canvas-board-pane-card-rest",
              text: rest.join(" \xB7 ")
            });
          }
          row.createSpan({
            cls: "canvas-board-pane-card-count",
            text: `\xB7 ${plugin.branchLevels(canvas, id, direction).flat().length} folded`
          });
          row.addEventListener(
            "click",
            (event) => event.shiftKey ? select((node2) => node2.id === id) : plugin.unfold(canvas, [id], Infinity)
          );
        }
      }
      destroy() {
        this.element.remove();
      }
    };
    module2.exports = FilterPane;
  }
});

// src/plugin/clearFrames.js
var require_clearFrames = __commonJS({
  "src/plugin/clearFrames.js"(exports2, module2) {
    function clearFrames(root) {
      for (const frame of root.querySelectorAll(".canvas-board-find-text")) {
        const parent = frame.parentNode;
        frame.replaceWith(...frame.childNodes);
        parent.normalize();
      }
    }
    module2.exports = clearFrames;
  }
});

// src/plugin/matchOffsets.js
var require_matchOffsets = __commonJS({
  "src/plugin/matchOffsets.js"(exports2, module2) {
    function matchOffsets(text, query) {
      const pattern = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      return Array.from(text.matchAll(pattern), (match) => match.index);
    }
    module2.exports = matchOffsets;
  }
});

// src/plugin/frameText.js
var require_frameText = __commonJS({
  "src/plugin/frameText.js"(exports2, module2) {
    var matchOffsets = require_matchOffsets();
    function frameText(root, query) {
      const ownerDocument = root.ownerDocument;
      const walker = ownerDocument.createTreeWalker(root, 4);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      const frames = [];
      for (const node of texts) {
        if (node.parentElement.closest(".cm-editor, input, textarea")) continue;
        const here = [];
        for (const offset of matchOffsets(node.data, query).reverse()) {
          const hit = node.splitText(offset);
          hit.splitText(query.length);
          const frame = ownerDocument.createElement("span");
          frame.className = "canvas-board-find-text";
          hit.replaceWith(frame);
          frame.append(hit);
          here.unshift(frame);
        }
        frames.push(...here);
      }
      return frames;
    }
    module2.exports = frameText;
  }
});

// src/plugin/FindBar.js
var require_FindBar = __commonJS({
  "src/plugin/FindBar.js"(exports2, module2) {
    var { Notice, Scope, setIcon } = require("obsidian");
    var clearFrames = require_clearFrames();
    var frameText = require_frameText();
    var FindBar = class {
      constructor(plugin, canvas) {
        this.plugin = plugin;
        this.canvas = canvas;
        this.matches = [];
        this.index = -1;
        this.framed = [];
        this.observer = new MutationObserver(() => {
          window.clearTimeout(this.frameTimer);
          this.frameTimer = window.setTimeout(() => this.frame(), 100);
        });
        const element = this.element = canvas.wrapperEl.createDiv({
          cls: "document-search-container canvas-board-find"
        });
        for (const eventName of [
          "pointerdown",
          "mousedown",
          "wheel",
          "dblclick",
          "contextmenu"
        ]) {
          element.addEventListener(eventName, (event) => event.stopPropagation());
        }
        const box = element.createDiv({ cls: "document-search" });
        const field = this.field = box.createDiv({
          cls: "search-input-container document-search-input"
        });
        this.input = field.createEl("input", {
          type: "search",
          attr: { placeholder: "Find\u2026", spellcheck: "false" }
        });
        this.countEl = field.createDiv({ cls: "document-search-count" });
        const buttons = box.createDiv({ cls: "document-search-buttons" });
        const button = (icon, label, onClick) => {
          const buttonEl = buttons.createEl("button", {
            cls: "document-search-button clickable-icon",
            attr: { "aria-label": label }
          });
          setIcon(buttonEl, icon);
          buttonEl.addEventListener("click", onClick);
        };
        button("arrow-up", "Previous (Shift+Enter)", () => this.step(-1));
        button("arrow-down", "Next (Enter)", () => this.step(1));
        const all = buttons.createEl("button", {
          cls: "document-search-button",
          text: "All",
          attr: { "aria-label": "Select all matches (Alt+Enter)" }
        });
        all.addEventListener("click", () => this.selectAll());
        const close = box.createDiv({
          cls: "document-search-close-button clickable-icon",
          attr: { "aria-label": "Close (Escape)" }
        });
        setIcon(close, "x");
        close.addEventListener("click", () => this.close());
        this.scope = new Scope(plugin.app.scope);
        this.input.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && event.altKey) {
            event.preventDefault();
            this.selectAll();
          } else if (event.key === "Enter") {
            event.preventDefault();
            this.step(event.shiftKey ? -1 : 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            this.close();
          }
        });
        this.input.addEventListener(
          "focus",
          () => plugin.app.keymap.pushScope(this.scope)
        );
        this.input.addEventListener(
          "blur",
          () => plugin.app.keymap.popScope(this.scope)
        );
        this.input.addEventListener("input", () => this.search());
        element.hide();
      }
      open() {
        this.element.show();
        this.input.focus();
        this.input.select();
        if (this.input.value) this.search();
      }
      close() {
        this.mark([]);
        this.element.hide();
        this.input.blur();
      }
      search() {
        const query = this.input.value.trim().toLowerCase();
        const plugin = this.plugin;
        this.matches = !query ? [] : [...this.canvas.nodes.values()].filter((node) => plugin.cardText(node).toLowerCase().includes(query)).sort((first, second) => first.y - second.y || first.x - second.x);
        this.index = this.matches.length ? 0 : -1;
        this.mark(this.matches);
        this.show();
      }
      step(step) {
        if (!this.matches.length) return;
        this.index = (this.index + step + this.matches.length) % this.matches.length;
        this.show();
      }
      // Every match selected (so it can be moved, colored...) and in view; Enter goes back to one at a time.
      selectAll() {
        const { canvas, plugin, matches } = this;
        if (!matches.length) return;
        if (matches.some((node) => plugin.isHidden(canvas, node))) {
          plugin.showAll(canvas);
          new Notice("Kanvas board: filter and folds cleared to show the cards");
        }
        for (const node of matches) node.nodeEl.addClass("is-current");
        canvas.updateSelection(() => {
          canvas.selection.clear();
          for (const node of matches) canvas.selection.add(node);
        });
        canvas.zoomToSelection();
        this.countEl.setText(`all ${matches.length}`);
        this.input.focus();
      }
      mark(nodes) {
        for (const node of this.canvas.nodes.values()) {
          node.nodeEl.removeClass("canvas-board-find-match", "is-current");
        }
        for (const node of nodes) node.nodeEl.addClass("canvas-board-find-match");
        this.frame(nodes);
      }
      // Frames the query in the given cards (default: the same ones again) and watches for cards rendering.
      frame(nodes = this.framed) {
        const root = (node) => node.contentEl || node.nodeEl;
        this.observer.disconnect();
        for (const node of this.framed) clearFrames(root(node));
        this.framed = nodes;
        const query = this.input.value.trim();
        for (const node of nodes) {
          const frames = frameText(root(node), query);
          if (node === this.revealing && frames[0]) {
            this.reveal(frames[0]);
            this.revealing = null;
          }
        }
        if (nodes.length) {
          this.observer.observe(this.canvas.wrapperEl, {
            childList: true,
            subtree: true
          });
        }
      }
      // Scrolls a long card to its first match. By hand: scrollIntoView would also scroll the canvas itself.
      reveal(frame) {
        const box = frame.closest(".markdown-preview-view");
        if (!box) return;
        const frameBox = frame.getBoundingClientRect(), view = box.getBoundingClientRect();
        const zoom = view.height / box.offsetHeight || 1;
        box.scrollTop += (frameBox.top - view.top) / zoom - box.clientHeight / 2;
      }
      show() {
        const { canvas, plugin } = this;
        const query = this.input.value.trim();
        this.countEl.setText(
          !query ? "" : this.matches.length ? `${this.index + 1} / ${this.matches.length}` : "No results"
        );
        this.field.toggleClass("mod-no-match", !!query && !this.matches.length);
        const node = this.matches[this.index];
        if (!node) return;
        for (const matchNode of this.matches) {
          matchNode.nodeEl.toggleClass("is-current", matchNode === node);
        }
        if (plugin.isHidden(canvas, node)) {
          plugin.showAll(canvas);
          new Notice("Kanvas board: filter and folds cleared to show the card");
        }
        canvas.selectOnly(node);
        canvas.zoomToSelection();
        this.revealing = node;
        this.frame();
        this.input.focus();
      }
      destroy() {
        this.mark([]);
        window.clearTimeout(this.frameTimer);
        this.plugin.app.keymap.popScope(this.scope);
        this.element.remove();
      }
    };
    module2.exports = FindBar;
  }
});

// src/plugin/NameSuggest.js
var require_NameSuggest = __commonJS({
  "src/plugin/NameSuggest.js"(exports2, module2) {
    var { AbstractInputSuggest } = require("obsidian");
    var NameSuggest = class extends AbstractInputSuggest {
      constructor(app, inputEl, names, onPick) {
        super(app, inputEl);
        this.names = names;
        this.onPick = onPick;
      }
      getSuggestions(query) {
        query = query.trim().toLowerCase();
        return this.names.filter((node) => node.toLowerCase().includes(query)).sort((first, second) => first.localeCompare(second));
      }
      renderSuggestion(name, element) {
        element.setText(name);
        element.createSpan({ cls: "canvas-board-key", text: "overwrite" });
      }
      selectSuggestion(name) {
        this.onPick(name);
        this.close();
      }
    };
    module2.exports = NameSuggest;
  }
});

// src/plugin/NamePrompt.js
var require_NamePrompt = __commonJS({
  "src/plugin/NamePrompt.js"(exports2, module2) {
    var { Modal, Notice, Setting } = require("obsidian");
    var NameSuggest = require_NameSuggest();
    var NamePrompt = class extends Modal {
      constructor(app, title, onSubmit, options = {}) {
        super(app);
        this.title = title;
        this.onSubmit = onSubmit;
        this.options = options;
      }
      onOpen() {
        this.setTitle(this.title);
        const { suggestions, overwrite } = this.options;
        let value = "";
        let button, suggest, picked = false;
        const clean = (value2) => value2.trim().replace(/[\\/:#^|[\]]/g, "");
        const nameOf = (value2) => suggestions && suggestions.some(
          (suggestion) => suggestion.toLowerCase() === value2.trim().toLowerCase()
        ) ? value2.trim() : clean(value2);
        const refresh = () => {
          if (!button) return;
          const over = !!(overwrite && value.trim() && overwrite(nameOf(value)));
          button.setButtonText(over ? "Overwrite" : "Create");
          button.buttonEl.toggleClass("mod-warning", over);
          button.buttonEl.toggleClass("mod-cta", !over);
        };
        const submit = () => {
          const name = nameOf(value);
          if (!name) return;
          this.close();
          Promise.resolve(this.onSubmit(name)).catch(
            (error) => new Notice(`Kanvas board: ${error.message}`)
          );
        };
        new Setting(this.contentEl).addText((text) => {
          text.onChange((typed) => {
            value = typed;
            refresh();
          });
          if (suggestions && suggestions.length) {
            suggest = new NameSuggest(
              this.app,
              text.inputEl,
              suggestions,
              (suggestion) => {
                text.setValue(suggestion);
                value = suggestion;
                refresh();
                picked = true;
                setTimeout(() => {
                  picked = false;
                }, 0);
              }
            );
          }
          text.inputEl.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" || picked || suggest && suggest.suggestEl && suggest.suggestEl.isConnected) {
              return;
            }
            event.preventDefault();
            submit();
          });
          setTimeout(() => text.inputEl.focus(), 0);
        }).addButton((buttonComponent) => {
          button = buttonComponent;
          buttonComponent.setButtonText("Create").setCta().onClick(submit);
        });
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    module2.exports = NamePrompt;
  }
});

// src/plugin/nextTurn.js
var require_nextTurn = __commonJS({
  "src/plugin/nextTurn.js"(exports2, module2) {
    var nextTurn = (current, target) => current + ((target - current) % 360 + 540) % 360 - 180;
    module2.exports = nextTurn;
  }
});

// src/plugin/Picker.js
var require_Picker = __commonJS({
  "src/plugin/Picker.js"(exports2, module2) {
    var { FuzzySuggestModal, Notice } = require("obsidian");
    var Picker = class extends FuzzySuggestModal {
      constructor(app, placeholder, items, label, onChoose) {
        super(app);
        this.setPlaceholder(placeholder);
        this.items = items;
        this.label = label;
        this.onChoose = onChoose;
      }
      getItems() {
        return this.items;
      }
      getItemText(item) {
        return this.label(item);
      }
      onChooseItem(item) {
        Promise.resolve(this.onChoose(item)).catch(
          (error) => new Notice(`Kanvas board: ${error.message}`)
        );
      }
    };
    module2.exports = Picker;
  }
});

// src/plugin/UnpackChoice.js
var require_UnpackChoice = __commonJS({
  "src/plugin/UnpackChoice.js"(exports2, module2) {
    var { Modal, Setting } = require("obsidian");
    var UnpackChoice = class extends Modal {
      constructor(app, file, links, onPick) {
        super(app);
        this.file = file;
        this.links = links;
        this.onPick = onPick;
      }
      onOpen() {
        const count = this.links.length;
        this.setTitle(
          `${this.file.basename} is linked from ${count} other place${count > 1 ? "s" : ""}`
        );
        const list = this.contentEl.createEl("ul");
        for (const link of this.links.slice(0, 8)) {
          list.createEl("li", {
            text: link.id ? `${link.label} (${link.path})` : link.path
          });
        }
        if (count > 8) list.createEl("li", { text: `and ${count - 8} more` });
        const setting = new Setting(this.contentEl);
        const pick = (mode) => {
          this.close();
          this.onPick(mode);
        };
        setting.addButton(
          (button) => button.setButtonText("Unpack into a group, redirect links").setCta().onClick(() => pick("group"))
        );
        setting.addButton(
          (button) => button.setButtonText("Keep the file (copy)").onClick(() => pick("copy"))
        );
        setting.addButton(
          (button) => button.setButtonText("Break links and trash").setWarning().onClick(() => pick("dissolve"))
        );
        setting.addButton(
          (button) => button.setButtonText("Cancel").onClick(() => this.close())
        );
      }
      onClose() {
        this.contentEl.empty();
      }
    };
    module2.exports = UnpackChoice;
  }
});

// src/plugin/CanvasBoardPlugin.js
var require_CanvasBoardPlugin = __commonJS({
  "src/plugin/CanvasBoardPlugin.js"(exports2, module2) {
    var {
      COLORS,
      COLOR_NUM,
      DEFAULTS,
      LAYOUT_DIRS,
      WORKFLOW
    } = require_constants();
    var { Notice, Plugin, setIcon } = require("obsidian");
    var { spawn } = require("child_process");
    var ApmCounter = require_ApmCounter();
    var boardLibrary = require_boardLibrary();
    var CanvasBoardSettings = require_CanvasBoardSettings();
    var dagre = require_dagre_min();
    var loadSettings = require_loadSettings();
    var claudeBin = require_claudeBin();
    var defaultLaunch = require_defaultLaunch();
    var FilterPane = require_FilterPane();
    var FindBar = require_FindBar();
    var fileSystem = require("fs");
    var NamePrompt = require_NamePrompt();
    var nextTurn = require_nextTurn();
    var parseColors = require_parseColors();
    var path = require("path");
    var Picker = require_Picker();
    var UnpackChoice = require_UnpackChoice();
    var CanvasBoardPlugin = class extends Plugin {
      async onload() {
        this.settings = Object.assign({}, DEFAULTS, await this.loadData());
        this.addSettingTab(new CanvasBoardSettings(this.app, this));
        const pluginDir = path.join(
          this.app.vault.adapter.basePath,
          this.manifest.dir
        );
        const library = boardLibrary;
        const { applyOps, layoutOps } = library;
        this.boardLibrary = library;
        let legacyApm;
        if (!this.settings.apm) {
          try {
            legacyApm = JSON.parse(
              fileSystem.readFileSync(
                path.join(pluginDir, "..", "apm-counter", "data.json"),
                "utf8"
              )
            );
          } catch (error) {
          }
        }
        this.settings.apm = loadSettings(this.settings.apm, legacyApm);
        this.apm = new ApmCounter(
          this,
          this.settings.apm,
          () => this.saveData(this.settings)
        );
        this.apm.load();
        this.register(() => this.apm.unload());
        this.api = {
          read: (board) => {
            const canvas = this.openCanvas(board);
            return canvas ? JSON.stringify(canvas.getData()) : null;
          },
          // Changing a card's type needs setData() without the card, then with it, to keep its id.
          apply: async (board, operations) => {
            const canvas = this.openCanvas(board);
            if (!canvas) return null;
            const canvasData = canvas.getData();
            const retyped = applyOps(canvasData, operations);
            if (retyped.length) {
              canvas.setData({
                ...canvasData,
                nodes: canvasData.nodes.filter(
                  (node) => !retyped.includes(node.id)
                )
              });
            }
            canvas.setData(canvasData);
            canvas.requestSave();
            await new Promise((resolve) => setTimeout(resolve, 2500));
            return "obsidian";
          }
        };
        this.syncSkill(pluginDir);
        this.addCommand({
          id: "reset-skill",
          name: "Reset agent skill to the plugin's version (overwrites your edits)",
          callback: () => this.syncSkill(pluginDir, true)
        });
        for (const [name, color, key] of COLORS) {
          this.addCommand({
            id: `color-${key}`,
            name: this.colorCommandName(name),
            checkCallback: (checking) => {
              const canvas = this.activeCanvas();
              if (!canvas || canvas.selection.size === 0) return false;
              if (!checking) {
                for (const node of canvas.selection) node.setColor(color);
                canvas.requestSave();
              }
              return true;
            }
          });
        }
        this.addCommand({
          id: "tidy-layout",
          name: "Tidy layout (selected cards)",
          checkCallback: (checking) => {
            const canvas = this.activeCanvas();
            if (!canvas) return false;
            if (!checking) {
              if (canvas.selection.size < 2) {
                new Notice(
                  "Tidy layout: select the cards to tidy first (2 or more; Ctrl+A for the whole canvas)."
                );
                return true;
              }
              const ids = [...canvas.selection].map((node) => node.id);
              const canvasData = canvas.getData();
              this.edit(
                canvas,
                layoutOps(canvasData, {
                  ids,
                  direction: this.settings.layoutDirection,
                  dagre,
                  flow: this.settings.foldDirection
                }),
                canvasData
              );
            }
            return true;
          }
        });
        this.addCommand({
          id: "tidy-direction-next",
          name: "Tidy layout direction: next",
          callback: () => this.cycleLayoutDirection()
        });
        for (const [direction, { name }] of Object.entries(LAYOUT_DIRS)) {
          this.addCommand({
            id: `tidy-direction-${direction.toLowerCase()}`,
            name: `Tidy layout direction: ${name}`,
            checkCallback: (checking) => {
              if (this.settings.layoutDirection === direction) return false;
              if (!checking) this.setLayoutDirection(direction);
              return true;
            }
          });
        }
        const actions = this.actions = [];
        const runAction = this.runAction = (run, canvas, sel) => Promise.resolve(run(canvas, sel)).catch(
          (error) => new Notice(`Kanvas board: ${error.message}`)
        );
        const canvasCommand = (id, name, menu, test, run) => {
          actions.push({ id, menu, test, run });
          this.addCommand({
            id,
            name,
            checkCallback: (checking) => {
              const canvas = this.activeCanvas();
              if (!canvas || !test(canvas, [...canvas.selection])) return false;
              if (!checking) runAction(run, canvas, [...canvas.selection]);
              return true;
            }
          });
        };
        const isText = (node) => node.getData().type === "text";
        canvasCommand(
          "collapse",
          "Pack into subcanvas",
          ["Pack into subcanvas", "package"],
          (canvas, sel) => sel.length > 0,
          (canvas, sel) => new NamePrompt(this.app, "Subcanvas name", async (name) => {
            const board = this.activeFile();
            const folder = board.parent && board.parent.path !== "/" ? board.parent.path + "/" : "";
            const file = this.freePath(folder, name, ".canvas");
            const { operations, sub } = library.collapseOps(
              canvas.getData(),
              sel.map((node) => node.id),
              file,
              name
            );
            await this.app.vault.create(file, JSON.stringify(sub, null, "	"));
            this.edit(canvas, operations);
            this.undoNotice(
              canvas,
              `packed ${sel.length} card${sel.length > 1 ? "s" : ""} into ${file}`,
              [file]
            );
          }).open()
        );
        const linked = (canvas, sel) => sel.length === 1 && !!this.linkedCanvas(sel[0]);
        canvasCommand(
          "expand",
          "Unpack subcanvas (dissolve)",
          ["Unpack subcanvas (dissolve)", "package-open"],
          linked,
          async (canvas, [node]) => {
            const file = this.linkedCanvas(node);
            const links = await this.subcanvasLinks(file, canvas, node.id);
            if (!links.length) return this.unpack(canvas, node, file, "dissolve");
            new UnpackChoice(
              this.app,
              file,
              links,
              (mode) => this.unpack(canvas, node, file, mode, links).catch(
                (error) => new Notice(`Kanvas board: ${error.message}`)
              )
            ).open();
          }
        );
        canvasCommand(
          "unpack-copy",
          "Unpack subcanvas (copy)",
          ["Unpack subcanvas (copy)", "copy"],
          linked,
          (canvas, [node]) => this.unpack(canvas, node, this.linkedCanvas(node), "copy")
        );
        canvasCommand(
          "merge",
          "Merge selected cards",
          ["Merge cards", "merge"],
          (canvas, sel) => sel.length > 1 && sel.every(isText),
          (canvas, sel) => this.edit(
            canvas,
            library.mergeOps(
              canvas.getData(),
              sel.map((node) => node.id)
            )
          )
        );
        for (const [separator, label] of [
          ["paragraph", "paragraph"],
          ["bullet", "top-level bullet"],
          ["h1", "heading 1"],
          ["h2", "heading 2"],
          ["h3", "heading 3"]
        ]) {
          canvasCommand(
            `split-${separator}`,
            `Split card by ${label}`,
            separator === "bullet" ? ["Split by top-level bullet", "split"] : null,
            (canvas, sel) => sel.length === 1 && isText(sel[0]) && !sel[0].isEditing,
            (canvas, [node]) => this.edit(
              canvas,
              library.splitOps(canvas.getData(), node.id, separator)
            )
          );
        }
        canvasCommand(
          "extract",
          "Extract current selection to a new card",
          ["Extract current selection to a new card", "text-select"],
          (canvas, sel) => sel.length === 1 && sel[0].isEditing && !!this.cardEditor(sel[0]),
          (canvas, [node]) => {
            const editor = this.cardEditor(node);
            const part = editor.getSelection();
            if (!part.trim()) throw new Error("select some text in the card first");
            const from = editor.posToOffset(editor.getCursor("from"));
            const before = editor.getValue();
            editor.replaceSelection("");
            node.blur();
            const canvasData = canvas.getData();
            const savedNode = canvasData.nodes.find((x) => x.id === node.id);
            if (savedNode) savedNode.text = before;
            this.edit(
              canvas,
              library.extractOps(canvasData, node.id, part, from),
              canvasData
            );
          }
        );
        canvasCommand(
          "archive",
          "Archive selected cards",
          ["Archive", "archive"],
          (canvas, sel) => sel.length > 0,
          async (canvas, sel) => {
            const board = this.activeFile().path;
            const canvasData = canvas.getData();
            const folder = library.archiveDir(board, this.settings);
            if (!this.app.vault.getAbstractFileByPath(folder)) {
              await this.app.vault.createFolder(folder);
            }
            const notes = [];
            for (const node of sel) {
              const archived = library.archiveNote(
                canvasData,
                node.id,
                board,
                window.moment().format("YYYY-MM-DD"),
                this.cardContexts(node, board)
              );
              notes.push(this.freePath(folder + "/", archived.name, ".md"));
              await this.app.vault.create(
                notes[notes.length - 1],
                archived.content
              );
            }
            this.edit(
              canvas,
              sel.map((node) => ({ op: "remove", id: node.id }))
            );
            this.undoNotice(
              canvas,
              `archived ${sel.length} card${sel.length > 1 ? "s" : ""}`,
              notes
            );
          }
        );
        const canFold = (canvas, node) => !this.foldOf(node) && this.branchLinks(canvas, this.settings.foldDirection).has(node.id);
        canvasCommand(
          "fold",
          "Fold branch",
          ["Fold branch", "chevrons-down-up"],
          (canvas, sel) => sel.some((node) => canFold(canvas, node)),
          (canvas, sel) => this.setFolds(
            canvas,
            new Map(
              sel.filter((node) => canFold(canvas, node)).map((node) => [node.id, this.settings.foldDirection])
            )
          )
        );
        for (const [levels, id, name, menu] of [
          [
            1,
            "unfold",
            "Unfold branch 1 level",
            ["Unfold 1 level", "chevron-down"]
          ],
          [2, "unfold-2", "Unfold branch 2 levels", null],
          [3, "unfold-3", "Unfold branch 3 levels", null],
          [
            Infinity,
            "unfold-all",
            "Unfold whole branch",
            ["Unfold whole branch", "chevrons-up-down"]
          ]
        ]) {
          canvasCommand(
            id,
            name,
            menu,
            (canvas, sel) => sel.some((node) => this.unfoldTargets(canvas, node.id).length),
            (canvas, sel) => this.unfold(
              canvas,
              [
                ...new Set(
                  sel.flatMap((node) => this.unfoldTargets(canvas, node.id))
                )
              ],
              levels
            )
          );
        }
        for (const [direction, label] of [
          ["out", "outgoing (cards it points to)"],
          ["in", "incoming (cards pointing to it)"]
        ]) {
          this.addCommand({
            id: `fold-direction-${direction}`,
            name: `Fold direction: ${label}`,
            checkCallback: (checking) => {
              if (this.settings.foldDirection === direction) return false;
              if (!checking) {
                this.settings.foldDirection = direction;
                this.saveData(this.settings);
                new Notice(`Kanvas board: fold direction ${label}`);
              }
              return true;
            }
          });
        }
        const templates = () => this.app.vault.getFiles().filter(
          (file) => file.extension === "canvas" && file.path.startsWith(library.TEMPLATE_DIR + "/")
        );
        const templateName = (file) => file.path.slice(library.TEMPLATE_DIR.length + 1, -".canvas".length);
        canvasCommand(
          "template-save",
          "Save selected cards as a template",
          ["Save as template", "layout-template"],
          (canvas, sel) => sel.length > 0,
          (canvas) => {
            const existing = new Map(
              templates().map((file) => [templateName(file).toLowerCase(), file])
            );
            new NamePrompt(
              this.app,
              "Template name",
              async (name) => {
                const content = JSON.stringify(
                  (({ nodes, edges }) => ({ nodes, edges }))(
                    canvas.getSelectionData()
                  ),
                  null,
                  "	"
                );
                const old = existing.get(name.toLowerCase());
                if (old) {
                  await this.app.vault.modify(old, content);
                  new Notice(`Kanvas board: template ${old.path} overwritten`);
                  return;
                }
                if (!this.app.vault.getAbstractFileByPath(library.TEMPLATE_DIR)) {
                  await this.app.vault.createFolder(library.TEMPLATE_DIR);
                }
                const file = this.freePath(
                  library.TEMPLATE_DIR + "/",
                  name,
                  ".canvas"
                );
                await this.app.vault.create(file, content);
                new Notice(`Kanvas board: template saved to ${file}`);
              },
              {
                suggestions: [...existing.values()].map(templateName),
                overwrite: (name) => existing.has(name.toLowerCase())
              }
            ).open();
          }
        );
        const cards = (sel) => sel.filter((node) => !node.from && node.getData().type !== "group");
        const selectMore = this.selectMore = (canvas, sel, keep) => {
          const add = [...canvas.nodes.values()].filter(
            (node) => node.getData().type !== "group" && !this.isHidden(canvas, node) && keep(node)
          );
          canvas.updateSelection(() => {
            canvas.selection.clear();
            for (const node of [...sel, ...add]) canvas.selection.add(node);
          });
          return add.length;
        };
        const childIds = (canvas, sel) => new Set(
          cards(sel).flatMap(
            (node) => this.branchLevels(
              canvas,
              node.id,
              this.settings.foldDirection
            ).flat()
          )
        );
        canvasCommand(
          "select-children",
          "Select children (all levels down, in the fold direction)",
          ["Select children", "list-tree"],
          (canvas, sel) => [...childIds(canvas, sel)].some(
            (id) => canvas.nodes.get(id) && !this.isHidden(canvas, canvas.nodes.get(id)) && !canvas.selection.has(canvas.nodes.get(id))
          ),
          (canvas, sel) => {
            const ids = childIds(canvas, sel);
            selectMore(canvas, sel, (node) => ids.has(node.id));
          }
        );
        const tagsOf = (sel) => new Set(cards(sel).flatMap((node) => [...this.cardTagSet(node)]));
        canvasCommand(
          "select-same-tag",
          "Select cards with the same tag",
          ["Select same tag", "tag"],
          (canvas, sel) => tagsOf(sel).size > 0,
          (canvas, sel) => {
            const tags = tagsOf(sel);
            selectMore(
              canvas,
              sel,
              (node) => [...this.cardTagSet(node)].some((tag) => tags.has(tag))
            );
          }
        );
        canvasCommand(
          "select-same-color",
          "Select cards with the same color",
          ["Select same color", "palette"],
          (canvas, sel) => cards(sel).length > 0,
          (canvas, sel) => {
            const colors = new Set(
              cards(sel).map((node) => node.getData().color || "")
            );
            selectMore(
              canvas,
              sel,
              (node) => colors.has(node.getData().color || "")
            );
          }
        );
        this.addCommand({
          id: "template-insert",
          name: "Insert cards from template",
          checkCallback: (checking) => {
            const canvas = this.activeCanvas();
            if (!canvas) return false;
            if (!checking) {
              const files = this.app.vault.getFiles().filter(
                (file) => file.extension === "canvas" && file.path.startsWith(library.TEMPLATE_DIR + "/")
              );
              if (!files.length) {
                new Notice(
                  `Kanvas board: no template in ${library.TEMPLATE_DIR} (Save selected cards as a template)`
                );
              } else {
                new Picker(
                  this.app,
                  "Template",
                  files,
                  (file) => file.basename,
                  (file) => this.insertTemplate(canvas, file)
                ).open();
              }
            }
            return true;
          }
        });
        this.views = /* @__PURE__ */ new WeakMap();
        this.panes = /* @__PURE__ */ new Map();
        this.finds = /* @__PURE__ */ new Map();
        this.addCommand({
          id: "find",
          name: "Search current canvas",
          checkCallback: (checking) => {
            const canvas = this.activeCanvas();
            if (!canvas) return false;
            if (!checking) {
              let findBar = this.finds.get(canvas);
              if (!findBar) {
                findBar = new FindBar(this, canvas);
                this.finds.set(canvas, findBar);
              }
              findBar.open();
            }
            return true;
          }
        });
        this.addCommand({
          id: "filter",
          name: "Toggle filter pane",
          checkCallback: (checking) => {
            const canvas = this.activeCanvas();
            if (!canvas) return false;
            if (!checking) this.pane(canvas).toggle();
            return true;
          }
        });
        this.addCommand({
          id: "show-all",
          name: "Unhide all",
          checkCallback: (checking) => {
            const canvas = this.activeCanvas();
            if (!canvas || !this.viewLabel(canvas)) return false;
            if (!checking) this.showAll(canvas);
            return true;
          }
        });
        const addActions = (menu, canvas, sel) => {
          for (const action of actions) {
            if (action.menu && action.test(canvas, sel)) {
              menu.addItem(
                (item) => item.setTitle(this.keyedTitle(action.menu[0], action.id)).setIcon(action.menu[1]).setSection("canvas-board").onClick(() => runAction(action.run, canvas, sel))
              );
            }
          }
        };
        this.registerEvent(
          this.app.workspace.on(
            "canvas:selection-menu",
            (menu, canvas) => addActions(menu, canvas, [...canvas.selection])
          )
        );
        this.registerEvent(
          this.app.workspace.on(
            "canvas:node-menu",
            (menu, node) => addActions(
              menu,
              node.canvas,
              node.canvas.selection.has(node) ? [...node.canvas.selection] : [node]
            )
          )
        );
        this.registerEvent(
          this.app.workspace.on("editor-menu", (menu, editor) => {
            const canvas = this.activeCanvas();
            const node = canvas && [...canvas.selection].find(
              (node2) => node2.isEditing && this.cardEditor(node2) === editor
            );
            if (node) addActions(menu, canvas, [node]);
          })
        );
        const isArchived = (file) => {
          const frontmatter = file && file.extension === "md" && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
          return !!(frontmatter && frontmatter["archived-from"]);
        };
        this.addCommand({
          id: "restore",
          name: "Restore archived card (from its archive note)",
          checkCallback: (checking) => {
            const file = this.app.workspace.getActiveFile();
            if (!isArchived(file)) return false;
            if (!checking) {
              this.restore(file).catch(
                (error) => new Notice(`Kanvas board: ${error.message}`)
              );
            }
            return true;
          }
        });
        this.registerEvent(
          this.app.workspace.on("file-menu", (menu, file) => {
            if (isArchived(file)) {
              menu.addItem(
                (item) => item.setTitle("Restore archived card").setIcon("archive-restore").setSection("canvas-board").onClick(
                  () => this.restore(file).catch(
                    (error) => new Notice(`Kanvas board: ${error.message}`)
                  )
                )
              );
            }
          })
        );
        this.addCommand({
          id: "run-pass",
          name: "Run pass (recheck the board)",
          callback: () => this.runPass()
        });
        this.addCommand({
          id: "open-board",
          name: "Open the board",
          callback: () => this.openBoard()
        });
        this.addCommand({
          id: "create-starter-board",
          name: "Create a starter board (color legend and first cards)",
          callback: () => this.createStarterBoard()
        });
        this.addRibbonIcon(
          "kanban-square",
          "Open the board (Kanvas board)",
          () => this.openBoard()
        );
        this.countEl = this.addStatusBarItem();
        this.viewEl = this.addStatusBarItem();
        this.viewEl.addClass("mod-clickable");
        this.viewEl.onClickEvent(() => {
          const canvas = this.activeCanvas();
          if (canvas) this.pane(canvas).toggle(true);
        });
        const tick = () => {
          this.updateCount();
          const open = /* @__PURE__ */ new Set();
          for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
            const canvas = leaf.view.canvas;
            if (!canvas || !canvas.wrapperEl) continue;
            open.add(canvas);
            this.decorate(leaf.view);
            this.refreshView(canvas);
            this.pane(canvas).update();
          }
          for (const [canvas, pane] of this.panes) {
            if (!open.has(canvas)) {
              pane.destroy();
              this.panes.delete(canvas);
            }
          }
          for (const [canvas, findBar] of this.finds) {
            if (!open.has(canvas)) {
              findBar.destroy();
              this.finds.delete(canvas);
            }
          }
        };
        this.registerEvent(this.app.workspace.on("active-leaf-change", tick));
        this.registerInterval(window.setInterval(tick, 2e3));
        tick();
        this.register(() => {
          for (const pane of this.panes.values()) pane.destroy();
          this.panes.clear();
          for (const findBar of this.finds.values()) findBar.destroy();
          this.finds.clear();
          for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
            const canvas = leaf.view.canvas;
            this.undecorate(leaf.view);
            if (!this.views.has(canvas)) continue;
            delete canvas.updateSelection;
            delete canvas.applyHistory;
            this.paint(canvas, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Map());
          }
        });
      }
      // --- Presentation: where the commands show on screen ---------------------------------------------------------
      // Control bar and selection toolbar are undocumented canvas DOM (.canvas-controls, canvas.menu.render), like
      // folds and the filter pane: an Obsidian update may drop those buttons, the commands stay. Header action and
      // ribbon icon are documented API. See "Obsidian internals" in README.md.
      // Label of a color: the one edited in Settings > Workflow, else the default.
      colorLabel(name) {
        return (this.settings.colorLabels || {})[name] || COLORS.find((colorRow) => colorRow[0] === name)[3];
      }
      colorCommandName(name) {
        return `Color selected cards: ${name} (${this.colorLabel(name)})`;
      }
      // An edited label also renames its command in the palette and the hotkey list. The id, and so the key, stays.
      async setColorLabel(name, label) {
        const labels = this.settings.colorLabels = {
          ...this.settings.colorLabels
        };
        if (label) labels[name] = label;
        else delete labels[name];
        await this.saveData(this.settings);
        const row = COLORS.find((colorRow) => colorRow[0] === name);
        const cmd = this.app.commands && this.app.commands.commands[`${this.manifest.id}:color-${row[2]}`];
        if (cmd) cmd.name = `${this.manifest.name}: ${this.colorCommandName(name)}`;
        for (const canvas of this.panes.keys()) this.refreshView(canvas);
      }
      // Hotkey of a plugin command as Obsidian prints it ("Alt + ↑"), or ''.
      hotkey(id) {
        const hotkeyManager = this.app.hotkeyManager;
        try {
          return hotkeyManager && hotkeyManager.printHotkeyForCommand && hotkeyManager.printHotkeyForCommand(`${this.manifest.id}:${id}`) || "";
        } catch (error) {
          return "";
        }
      }
      // Tooltip with its key, the way the canvas's own buttons show it ("Zoom to selection\n(Shift + 2)").
      keyedLabel(label, id) {
        const hotkey = this.hotkey(id);
        return hotkey ? `${label}
(${hotkey})` : label;
      }
      // Menu item title with its key, muted, after the label.
      keyedTitle(label, id) {
        const hotkey = this.hotkey(id);
        if (!hotkey) return label;
        return createFragment((fragment) => {
          fragment.appendText(label);
          fragment.createSpan({ cls: "canvas-board-key", text: hotkey });
        });
      }
      // A notice with an Undo button: one canvas undo step and the files the action made go to the trash. Only while
      // the board has not changed since (else the undo would take back something else).
      // `restore` ({ path, content }) brings a trashed file back on undo (unpack). Redirected links are not undone.
      undoNotice(canvas, message, files = [], restore = null) {
        const history = canvas.history;
        const historyIndex = history ? history.current : null;
        const frag = createFragment((fragment) => {
          fragment.appendText(`Kanvas board: ${message} `);
          const button = fragment.createEl("button", {
            cls: "canvas-board-notice-undo",
            text: "Undo"
          });
          button.addEventListener("click", async () => {
            if (!history || history.current !== historyIndex) {
              new Notice("Kanvas board: the board changed since, use Ctrl+Z");
              return;
            }
            canvas.undo();
            for (const filePath of files) {
              const file = this.app.vault.getAbstractFileByPath(filePath);
              if (file) await this.app.fileManager.trashFile(file);
            }
            if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) {
              await this.app.vault.create(restore.path, restore.content);
            }
          });
        });
        new Notice(frag, 8e3);
      }
      async openBoard() {
        const board = this.settings.defaultBoard;
        const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view.file && leaf2.view.file.path === board);
        if (leaf) {
          this.app.workspace.setActiveLeaf(leaf, { focus: true });
          return;
        }
        const file = this.app.vault.getAbstractFileByPath(board);
        if (!file) {
          new Notice(
            createFragment((fragment) => {
              fragment.appendText(
                `Kanvas board: ${board} not found (setting "Default board"). `
              );
              const button = fragment.createEl("button", {
                cls: "canvas-board-notice-undo",
                text: "Create a starter board"
              });
              button.addEventListener("click", () => this.createStarterBoard());
            }),
            1e4
          );
          return;
        }
        await this.app.workspace.getLeaf(false).openFile(file);
      }
      // Onboarding: the default board when it does not exist yet, else "Starter board.canvas" (numbered when taken).
      // A legend group (one card per color: its label and what it does, from Settings > Workflow) and a group of
      // first steps, one of them a wish to color cyan and run a pass on. Opens it.
      async createStarterBoard() {
        const vault = this.app.vault;
        let board = this.settings.defaultBoard;
        if (vault.getAbstractFileByPath(board)) {
          const folder = path.posix.dirname(board) === "." ? "" : `${path.posix.dirname(board)}/`;
          let node = 1;
          do
            board = `${folder}Starter board${node > 1 ? ` ${node}` : ""}.canvas`;
          while (vault.getAbstractFileByPath(board) && ++node);
        }
        const id = () => Array.from(
          { length: 16 },
          () => Math.floor(Math.random() * 16).toString(16)
        ).join("");
        const nodes = [];
        const edges = [];
        const columnWidth = 400;
        nodes.push({
          id: id(),
          type: "group",
          label: "How the colors work",
          x: -40,
          y: -80,
          width: columnWidth + 80,
          height: WORKFLOW.length * 100 + 100
        });
        const DOT = {
          cyan: "\u{1F535}",
          purple: "\u{1F7E3}",
          orange: "\u{1F7E0}",
          yellow: "\u{1F7E1}",
          red: "\u{1F534}",
          green: "\u{1F7E2}",
          none: "\u26AA"
        };
        WORKFLOW.forEach(([name, meaning], index) => {
          nodes.push({
            id: id(),
            type: "text",
            text: `${DOT[name]} **${this.colorLabel(name)}** (${COLOR_NUM[name] ? name : "uncolored"})
${meaning}`,
            x: 0,
            y: index * 100,
            width: columnWidth,
            height: 80
          });
        });
        const steps = [
          "**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.",
          "**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Kanvas board > Hotkeys.",
          '**3. Run a pass**\nCommand "Kanvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
          "**4. Answer**\nYellow: a question or a review for you, in the card's note. Answer there, color the card cyan or purple again, run the next pass."
        ];
        const stepsX = columnWidth + 160;
        nodes.push({
          id: id(),
          type: "group",
          label: "First steps",
          x: stepsX - 40,
          y: -80,
          width: columnWidth + 80,
          height: steps.length * 160 + 280
        });
        let previous;
        steps.forEach((text, index) => {
          const card = {
            id: id(),
            type: "text",
            text,
            x: stepsX,
            y: index * 160,
            width: columnWidth,
            height: 130
          };
          nodes.push(card);
          if (previous) {
            edges.push({
              id: id(),
              fromNode: previous,
              fromSide: "bottom",
              toNode: card.id,
              toSide: "top"
            });
          }
          previous = card.id;
        });
        nodes.push({
          id: id(),
          type: "text",
          text: "Try it: color this card cyan, then run a pass.\n\nWrite a short note that explains this board in my own words.",
          x: stepsX,
          y: steps.length * 160 + 20,
          width: columnWidth,
          height: 130
        });
        try {
          const folder = path.posix.dirname(board);
          if (folder !== "." && !vault.getAbstractFileByPath(folder)) {
            await vault.createFolder(folder);
          }
          const file = await vault.create(
            board,
            JSON.stringify({ nodes, edges }, null, "	")
          );
          await this.app.workspace.getLeaf(false).openFile(file);
          new Notice(`Kanvas board: starter board created (${board})`);
        } catch (error) {
          new Notice(
            `Kanvas board: could not create the starter board (${error.message})`
          );
        }
      }
      async setLayoutDirection(direction) {
        this.settings.layoutDirection = direction;
        await this.saveData(this.settings);
        for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
          this.decorate(leaf.view);
        }
        new Notice(`Kanvas board: tidy layout ${LAYOUT_DIRS[direction].name}`);
      }
      cycleLayoutDirection() {
        const dirs = Object.keys(LAYOUT_DIRS);
        return this.setLayoutDirection(
          dirs[(dirs.indexOf(this.settings.layoutDirection) + 1) % dirs.length]
        );
      }
      // Runs a plugin command on this canvas view (made active first: a click on its buttons may not focus it).
      runOn(view, id) {
        const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view === view);
        if (leaf && this.app.workspace.activeLeaf !== leaf) {
          this.app.workspace.setActiveLeaf(leaf, { focus: true });
        }
        this.app.commands.executeCommandById(`${this.manifest.id}:${id}`);
      }
      // Buttons on a canvas view, added once (tick runs every 2 s and adds back what the canvas redrew away).
      decorate(view) {
        const canvas = view.canvas;
        if (!view.canvasBoardAction && view.addAction) {
          view.canvasBoardAction = view.addAction(
            "play",
            "Run pass",
            () => this.runPass()
          );
        }
        if (view.canvasBoardAction) {
          view.canvasBoardAction.setAttr(
            "aria-label",
            this.keyedLabel("Run pass", "run-pass")
          );
        }
        const controls = canvas.wrapperEl && canvas.wrapperEl.querySelector(".canvas-controls");
        if (controls) {
          let group = controls.querySelector(".canvas-board-controls");
          if (!group) {
            group = createDiv({
              cls: "canvas-control-group mod-raised canvas-board-controls"
            });
            const help = controls.lastElementChild;
            controls.insertBefore(group, help);
            for (const [id, label, icon] of [
              ["find", "Search current canvas", "search"],
              ["filter", "Filter cards", "filter"],
              ["tidy-layout", "Tidy layout", "network"]
            ]) {
              const button = group.createDiv({
                cls: "canvas-control-item",
                attr: {
                  "data-command": id,
                  "data-label": label,
                  "data-tooltip-position": "left"
                }
              });
              setIcon(button, icon);
              button.addEventListener("click", (event) => {
                if (id === "tidy-layout" && event.shiftKey) {
                  this.cycleLayoutDirection();
                } else this.runOn(view, id);
              });
            }
          }
          for (const button of group.children) {
            button.setAttr(
              "aria-label",
              this.keyedLabel(button.dataset.label, button.dataset.command)
            );
          }
          const tidy = group.querySelector('[data-command="tidy-layout"]');
          const direction = LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
          if (tidy) {
            this.tidyTurn = nextTurn(
              this.tidyTurn ?? direction.turn,
              direction.turn
            );
            tidy.style.setProperty(
              "--canvas-board-tidy-turn",
              `${this.tidyTurn}deg`
            );
            tidy.setAttr(
              "aria-label",
              this.keyedLabel(
                `Tidy layout: ${direction.name}
Shift-click: next direction`,
                "tidy-layout"
              )
            );
          }
        }
        const menu = canvas.menu;
        if (menu && menu.render && !menu.canvasBoardRender) {
          const orig = menu.canvasBoardRender = menu.render;
          const plugin = this;
          menu.render = function(...values) {
            const result = orig.apply(this, values);
            try {
              plugin.menuButtons(canvas);
            } catch (error) {
              console.error("canvas-board: selection toolbar", error);
            }
            return result;
          };
          menu.canvasBoardObserver = new MutationObserver(() => {
            for (const item of menu.menuEl.querySelectorAll(
              ".canvas-color-picker-item:not(.canvas-color-picker-custom)"
            )) {
              const color = (item.className.match(/mod-canvas-color-(\d)/) || [])[1] || "";
              const row = COLORS.find((x) => x[1] === color);
              if (row) {
                item.setAttrs({
                  "aria-label": this.keyedLabel(
                    this.colorLabel(row[0]),
                    `color-${row[2]}`
                  ),
                  "data-tooltip-position": "top"
                });
              }
            }
          });
          menu.canvasBoardObserver.observe(menu.menuEl, {
            childList: true,
            subtree: true
          });
        }
      }
      menuButtons(canvas) {
        const element = canvas.menu.menuEl;
        const sel = [...canvas.selection];
        if (!sel.length || !element.childElementCount || element.querySelector(".canvas-board-menu-btn")) {
          return;
        }
        for (const id of ["fold", "unfold", "archive"]) {
          const action = this.actions.find((x) => x.id === id);
          if (!action || !action.test(canvas, sel)) continue;
          const button = element.createEl("button", {
            cls: "clickable-icon canvas-board-menu-btn",
            attr: {
              "aria-label": this.keyedLabel(action.menu[0], id),
              "data-tooltip-position": "top"
            }
          });
          setIcon(button, action.menu[1]);
          button.addEventListener(
            "click",
            () => this.runAction(action.run, canvas, [...canvas.selection])
          );
        }
      }
      undecorate(view) {
        const canvas = view.canvas;
        if (view.canvasBoardAction) {
          view.canvasBoardAction.remove();
          delete view.canvasBoardAction;
        }
        if (canvas.wrapperEl) {
          for (const element of canvas.wrapperEl.querySelectorAll(
            ".canvas-board-controls, .canvas-board-menu-btn"
          )) {
            element.remove();
          }
        }
        const menu = canvas.menu;
        if (menu && menu.canvasBoardRender) {
          menu.render = menu.canvasBoardRender;
          delete menu.canvasBoardRender;
          menu.canvasBoardObserver.disconnect();
          delete menu.canvasBoardObserver;
        }
      }
      // Filter state of an open canvas. `create` false only reads (an empty state, not stored).
      viewState(canvas, create = true) {
        const empty = () => ({
          xcolors: /* @__PURE__ */ new Set(),
          xtags: /* @__PURE__ */ new Set(),
          hidden: /* @__PURE__ */ new Set()
        });
        let state = this.views.get(canvas);
        if (state || !create) return state || empty();
        state = empty();
        this.views.set(canvas, state);
        const plugin = this;
        const orig = canvas.updateSelection;
        canvas.updateSelection = function(callback) {
          const result = orig.call(this, () => {
            callback();
            for (const x of [...this.selection]) {
              if (state.hidden.has(x.id) || x.from && (state.hidden.has(x.from.node.id) || state.hidden.has(x.to.node.id))) {
                this.selection.delete(x);
              }
            }
          });
          plugin.updateCount();
          return result;
        };
        const history = canvas.applyHistory;
        if (history) {
          canvas.applyHistory = function(...values) {
            const result = history.apply(this, values);
            plugin.refreshView(this);
            return result;
          };
        }
        return state;
      }
      isHidden(canvas, node) {
        return this.viewState(canvas, false).hidden.has(node.id);
      }
      // Clears the filter and unfolds every card (one undo step for the folds).
      showAll(canvas) {
        const state = this.viewState(canvas, false);
        state.xcolors.clear();
        state.xtags.clear();
        const folds = this.folds(canvas);
        if (folds.size) {
          this.setFolds(canvas, new Map([...folds.keys()].map((id) => [id, null])));
        } else this.refreshView(canvas);
      }
      // A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"} (the fold direction). JSON Canvas
      // 1.0 has no such field; other readers ignore it and show every card. Obsidian keeps it (node.unknownData).
      foldOf(node) {
        const boardData = node.getData().canvasBoard;
        return boardData && boardData.folded || null;
      }
      folds(canvas) {
        const folds = /* @__PURE__ */ new Map();
        for (const node of canvas.nodes.values()) {
          const direction = this.foldOf(node);
          if (direction) folds.set(node.id, direction);
        }
        return folds;
      }
      // `changes`: card id → direction to fold, or null to unfold. One canvas edit, one undo step.
      setFolds(canvas, changes) {
        if (!changes.size) return;
        const canvasData = canvas.getData();
        for (const node of canvasData.nodes) {
          if (!changes.has(node.id)) continue;
          const boardData = { ...node.canvasBoard || {} };
          const direction = changes.get(node.id);
          if (direction) boardData.folded = direction;
          else delete boardData.folded;
          if (Object.keys(boardData).length) node.canvasBoard = boardData;
          else delete node.canvasBoard;
        }
        this.edit(canvas, [], canvasData);
        this.refreshView(canvas);
      }
      pane(canvas) {
        let pane = this.panes.get(canvas);
        if (!pane) {
          pane = new FilterPane(this, canvas);
          this.panes.set(canvas, pane);
        }
        return pane;
      }
      // Card id → ids one edge away, following edges out (from → to) or in (to → from).
      branchLinks(canvas, direction) {
        const links = /* @__PURE__ */ new Map();
        for (const edge of canvas.edges.values()) {
          const [source, target] = direction === "in" ? [edge.to.node.id, edge.from.node.id] : [edge.from.node.id, edge.to.node.id];
          if (source !== target) {
            links.set(source, (links.get(source) || []).concat(target));
          }
        }
        return links;
      }
      // Ids below a folded card, level by level (level 1 first).
      branchLevels(canvas, root, direction) {
        const links = this.branchLinks(canvas, direction);
        const seen = /* @__PURE__ */ new Set([root]);
        const levels = [];
        let level = [root];
        while (level.length) {
          const next = [];
          for (const id of level) {
            for (const x of links.get(id) || []) {
              if (!seen.has(x)) {
                seen.add(x);
                next.push(x);
              }
            }
          }
          if (next.length) levels.push(next);
          level = next;
        }
        return levels;
      }
      // The cards an unfold on `id` applies to: the card itself if folded, else the nearest folded cards of its open
      // branch (in the fold direction, not past another fold), so pressing unfold again opens the next level.
      unfoldTargets(canvas, id) {
        const node = canvas.nodes.get(id);
        if (!node) return [];
        if (this.foldOf(node)) return [id];
        const links = this.branchLinks(canvas, this.settings.foldDirection);
        const seen = /* @__PURE__ */ new Set([id]);
        const found = [];
        let level = [id];
        while (level.length) {
          const next = [];
          for (const x of level) {
            for (const y of links.get(x) || []) {
              if (seen.has(y)) continue;
              seen.add(y);
              const node2 = canvas.nodes.get(y);
              if (node2 && this.foldOf(node2)) found.push(y);
              else next.push(y);
            }
          }
          level = next;
        }
        return found;
      }
      // Shows `levels` levels of each folded branch; the cards at the last shown level that lead further get folded.
      unfold(canvas, ids, levels) {
        const changes = /* @__PURE__ */ new Map();
        for (const id of ids) {
          const node = canvas.nodes.get(id);
          const direction = node && this.foldOf(node);
          if (!direction) continue;
          changes.set(id, null);
          const below = this.branchLevels(canvas, id, direction);
          const links = this.branchLinks(canvas, direction);
          if (levels < below.length) {
            for (const x of below[levels - 1]) {
              if ((links.get(x) || []).length) changes.set(x, direction);
            }
          }
        }
        this.setFolds(canvas, changes);
      }
      // Tags of a card (no #): the `#tags` in its own text, never those of the notes it links. Exact match only:
      // #tag1 is not #tag10.
      cardTagSet(node) {
        const tags = /* @__PURE__ */ new Set();
        for (const match of (node.getData().text || "").matchAll(
          /(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g
        )) {
          if (!/^\d+$/.test(match[1])) tags.add(match[1]);
        }
        return tags;
      }
      // Every color and tag shows by default; a hidden color, or any hidden tag, hides the card.
      matches(node, state) {
        if (state.xcolors.has(node.getData().color || "")) return false;
        if (!state.xtags.size) return true;
        const tags = this.cardTagSet(node);
        return ![...state.xtags].some((tag) => tags.has(tag));
      }
      filtering(state) {
        return !!(state.xcolors.size || state.xtags.size);
      }
      // Hidden = not matching the filter (groups always show), or below a folded card. With the setting "Hide cards
      // under hidden tags", a card hidden by a tag also hides its branch, as a fold in the fold direction would.
      refreshView(canvas) {
        const state = this.viewState(canvas);
        const hidden = /* @__PURE__ */ new Set();
        if (this.filtering(state)) {
          for (const node of canvas.nodes.values()) {
            if (node.getData().type !== "group" && !this.matches(node, state)) {
              hidden.add(node.id);
            }
          }
        }
        if (state.xtags.size && this.settings.hideTagBranches) {
          for (const node of canvas.nodes.values()) {
            const tags = this.cardTagSet(node);
            if (![...state.xtags].some((tag) => tags.has(tag))) continue;
            for (const id of this.branchLevels(
              canvas,
              node.id,
              this.settings.foldDirection
            ).flat()) {
              if (canvas.nodes.get(id) && canvas.nodes.get(id).getData().type !== "group") {
                hidden.add(id);
              }
            }
          }
        }
        const folded = /* @__PURE__ */ new Map();
        for (const [root, direction] of this.folds(canvas)) {
          const below = this.branchLevels(canvas, root, direction).flat();
          folded.set(root, below.length);
          for (const id of below) hidden.add(id);
        }
        state.hidden = hidden;
        this.paint(canvas, hidden, folded);
        if ([...canvas.selection].some((x) => hidden.has(x.id))) {
          canvas.updateSelection(() => {
          });
        }
        if (canvas === this.activeCanvas()) this.updateViewLabel(canvas);
        const pane = this.panes.get(canvas);
        if (pane) pane.update();
      }
      // Hides the `hidden` cards and their edges; `folded` (id → count) gets the "· N folded" badge, a click on it
      // unfolds one level.
      paint(canvas, hidden, folded) {
        for (const node of canvas.nodes.values()) {
          node.nodeEl.toggleClass("canvas-board-hidden", hidden.has(node.id));
          let badge = node.nodeEl.querySelector(":scope > .canvas-board-folded");
          if (!folded.has(node.id)) {
            if (badge) badge.remove();
            continue;
          }
          if (!badge) {
            badge = node.nodeEl.createDiv({
              cls: "canvas-board-folded",
              attr: { "data-tooltip-position": "bottom" }
            });
            for (const eventName of ["pointerdown", "mousedown", "dblclick"]) {
              badge.addEventListener(eventName, (event) => event.stopPropagation());
            }
            badge.addEventListener("click", (event) => {
              event.stopPropagation();
              this.unfold(canvas, [node.id], 1);
            });
          }
          badge.setText(`\xB7 ${folded.get(node.id)} folded`);
          badge.setAttr("aria-label", this.keyedLabel("Unfold 1 level", "unfold"));
        }
        this.paintStale(canvas);
        for (const edge of canvas.edges.values()) {
          const off = hidden.has(edge.from.node.id) || hidden.has(edge.to.node.id);
          for (const element of [
            edge.lineGroupEl,
            edge.lineEndGroupEl,
            edge.labelElement && edge.labelElement.wrapperEl
          ]) {
            if (element) element.classList.toggle("canvas-board-hidden", off);
          }
        }
      }
      // Yellow (needs me) cards whose note was not touched for "Stale after" days: a warning badge (the icon of
      // `- [!]`) with the time since the note last changed. Cards without a note have no date: no badge.
      paintStale(canvas) {
        const days = Number(this.settings.staleDays) || 0;
        const board = canvas.view && canvas.view.file ? canvas.view.file.path : "";
        for (const node of canvas.nodes.values()) {
          const canvasData = node.getData();
          let age = -1;
          if (days > 0 && canvasData.color === "3") {
            let file = null;
            if (canvasData.type === "file") {
              file = this.app.vault.getAbstractFileByPath(canvasData.file);
            } else if (canvasData.type === "text") {
              const match = /\[\[([^\]|#]+)/.exec(canvasData.text || "");
              if (match) {
                file = this.app.metadataCache.getFirstLinkpathDest(
                  match[1].trim(),
                  board
                );
              }
            }
            if (file && file.stat) {
              age = Math.floor((Date.now() - file.stat.mtime) / 864e5);
            }
          }
          let badge = node.nodeEl.querySelector(":scope > .canvas-board-stale");
          if (age < days || age < 0) {
            if (badge) badge.remove();
            continue;
          }
          if (!badge) {
            badge = node.nodeEl.createDiv({
              cls: "canvas-board-stale",
              attr: { "data-tooltip-position": "top" }
            });
            setIcon(
              badge.createSpan({ cls: "canvas-board-stale-icon" }),
              "triangle-alert"
            );
            badge.createSpan({ cls: "canvas-board-stale-text" });
          }
          const label = age < 1 ? "today" : `${age}d`;
          if (badge.dataset.age !== label) {
            badge.dataset.age = label;
            badge.querySelector(".canvas-board-stale-text").setText(label);
            badge.setAttr(
              "aria-label",
              `Waiting on you \xB7 note untouched for ${age} day${age === 1 ? "" : "s"} (stale after ${days})`
            );
          }
        }
      }
      // Status bar and closed pane: only how many cards are hidden (filter and folds); the pane says by what.
      viewLabel(canvas) {
        const node = this.viewState(canvas, false).hidden.size;
        return node ? `${node} card${node > 1 ? "s" : ""} hidden` : "";
      }
      updateViewLabel(canvas) {
        const label = canvas ? this.viewLabel(canvas) : "";
        this.viewEl.setText(label);
        this.viewEl.toggle(!!label);
      }
      cardText(node) {
        const canvasData = node.getData();
        return String(
          (canvasData.type === "text" ? canvasData.text : canvasData.type === "file" ? canvasData.file : canvasData.type === "link" ? canvasData.url : canvasData.label) || ""
        );
      }
      // Background of a color dot: a preset canvas color ('1'…'6'), a custom hex, or none.
      dotStyle(color) {
        return !color ? "" : `background: ${color.startsWith("#") ? color : `var(--canvas-color-${color})`}`;
      }
      // Template cards are centered on the visible canvas, whatever is selected; they end up selected.
      async insertTemplate(canvas, file) {
        const tpl = JSON.parse(await this.app.vault.read(file));
        const nodes = tpl.nodes || [];
        const viewport = canvas.getViewportBBox();
        const width = nodes.length ? Math.max(...nodes.map((node) => node.x + node.width)) - Math.min(...nodes.map((node) => node.x)) : 0;
        const height = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) - Math.min(...nodes.map((node) => node.y)) : 0;
        const origin = {
          x: Math.round((viewport.minX + viewport.maxX - width) / 2),
          y: Math.round((viewport.minY + viewport.maxY - height) / 2)
        };
        const operations = this.boardLibrary.templateOps(tpl, origin);
        this.edit(canvas, operations);
        const added = operations.filter((operation) => operation.op === "add").map((operation) => canvas.nodes.get(operation.node.id)).filter(Boolean);
        canvas.updateSelection(() => {
          canvas.selection.clear();
          for (const node of added) canvas.selection.add(node);
        });
      }
      updateCount() {
        const canvas = this.activeCanvas();
        this.updateViewLabel(canvas);
        if (!canvas) {
          this.countEl.setText("");
          this.countEl.hide();
          return;
        }
        const cards = [...canvas.nodes.values()].map((node) => node.getData()).filter((node) => node.type !== "group");
        const names = {
          "": "none",
          1: "red",
          2: "orange",
          3: "yellow",
          4: "green",
          5: "cyan",
          6: "purple"
        };
        const byColor = {};
        for (const node of cards) {
          const colorName = names[node.color || ""] || "custom";
          byColor[colorName] = (byColor[colorName] || 0) + 1;
        }
        const max = Number(this.settings.cardWarning) || 0;
        const over = max > 0 && cards.length > max;
        const sel = [...canvas.selection].filter((x) => !x.from).length;
        this.countEl.empty();
        this.countEl.createSpan({
          text: `${cards.length} cards`,
          cls: over ? "canvas-board-over" : ""
        });
        if (sel) this.countEl.appendText(` \xB7 ${sel} selected`);
        this.countEl.setAttr(
          "aria-label",
          (over ? `over ${max} \xB7 ` : "") + Object.entries(byColor).map(([colorName, count]) => `${colorName} ${count}`).join(" \xB7 ")
        );
        this.countEl.setAttr("data-tooltip-position", "top");
        this.countEl.show();
      }
      // The plugin folder holds the skill's default; the vault copy is written only when missing (then it is the
      // user's, plugin updates never overwrite it) or on "Reset agent skill" (`force`).
      skillPath() {
        return path.join(
          this.app.vault.adapter.basePath,
          ".claude",
          "skills",
          "canvas-board",
          "SKILL.md"
        );
      }
      syncSkill(pluginDir, force = false) {
        const source = path.join(pluginDir, "skill", "SKILL.md");
        const dest = this.skillPath();
        try {
          if (!force && fileSystem.existsSync(dest)) return;
          fileSystem.mkdirSync(path.dirname(dest), { recursive: true });
          fileSystem.copyFileSync(source, dest);
          if (force) {
            new Notice("Kanvas board: agent skill reset to the plugin's version");
          }
        } catch (error) {
          console.error("canvas-board: skill sync failed", error);
          if (force) {
            new Notice(`Kanvas board: skill reset failed (${error.message})`);
          }
        }
      }
      // One undo step: the state before is pushed (unless the history already ends with it), then the edited data
      // is set, which pushes it, so Ctrl+Z and Ctrl+Y each take one step. `d` is passed when the caller already changed it (extract).
      edit(canvas, operations, canvasData = canvas.getData()) {
        const before = canvas.getData();
        const retyped = this.boardLibrary.applyOps(canvasData, operations);
        const history = canvas.history;
        const last = history && history.data && history.data[history.current];
        const same = (x) => JSON.stringify(
          x,
          (key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort()) : value
        );
        if (canvas.pushHistory && (!last || same(last) !== same(before))) {
          canvas.pushHistory(before);
        }
        if (retyped.length) {
          canvas.setData({
            ...canvasData,
            nodes: canvasData.nodes.filter((node) => !retyped.includes(node.id))
          });
        }
        canvas.setData(canvasData);
        canvas.requestSave(false);
      }
      activeFile() {
        const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
        return view && view.file;
      }
      freePath(folder, name, ext) {
        for (let attempt = 1; ; attempt++) {
          const candidate = `${folder}${name}${attempt > 1 ? " " + attempt : ""}${ext}`;
          if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
        }
      }
      // Cards (on any canvas) and notes that link `file`, except card `skipId` on `canvas`: [{ path, id?, label }].
      async subcanvasLinks(file, canvas, skipId) {
        const out = [];
        const here = this.canvasFile(canvas);
        const hits = (from) => (target) => {
          const destination = this.app.metadataCache.getFirstLinkpathDest(
            target,
            from
          );
          return !!destination && destination.path === file.path;
        };
        for (const canvasFile of this.app.vault.getFiles().filter(
          (candidateFile) => candidateFile.extension === "canvas" && candidateFile.path !== file.path
        )) {
          const open = canvasFile.path === here ? canvas : this.openCanvas(canvasFile.path);
          let canvasData;
          try {
            canvasData = open ? open.getData() : JSON.parse(await this.app.vault.cachedRead(canvasFile) || "{}");
          } catch (error) {
            continue;
          }
          for (const node of canvasData.nodes || []) {
            if (canvasFile.path === here && node.id === skipId) continue;
            const hit = node.type === "file" ? node.file === file.path : node.type === "text" && this.boardLibrary.relinkText(
              node.text,
              hits(canvasFile.path),
              () => "\0"
            ) !== node.text;
            if (hit) {
              out.push({
                path: canvasFile.path,
                id: node.id,
                label: (node.text || node.file || "").split("\n")[0]
              });
            }
          }
        }
        const resolved = this.app.metadataCache.resolvedLinks;
        for (const source in resolved) {
          if (source !== file.path && !source.endsWith(".canvas") && resolved[source][file.path]) {
            out.push({ path: source, label: source });
          }
        }
        return out;
      }
      canvasFile(canvas) {
        const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view.canvas === canvas);
        return leaf && leaf.view.file ? leaf.view.file.path : null;
      }
      // mode: dissolve (file to trash, other links break), copy (file kept), group (cards in a group named after the
      // file, other links redirected: cards on this board get an edge to the group, other cards and notes link this board).
      async unpack(canvas, node, file, mode, links = []) {
        const sub = JSON.parse(await this.app.vault.read(file) || "{}");
        const content = JSON.stringify(
          { nodes: sub.nodes || [], edges: sub.edges || [] },
          null,
          "	"
        );
        const label = (((node.getData().text || "").match(/\|([^\]]+)\]\]/) || [])[1] || file.basename).trim();
        const operations = this.boardLibrary.expandOps(
          canvas.getData(),
          node.id,
          { nodes: sub.nodes || [], edges: sub.edges || [] },
          mode === "group" ? { group: label } : {}
        );
        const here = this.canvasFile(canvas);
        const isSub = (from) => (target) => {
          const destination = this.app.metadataCache.getFirstLinkpathDest(
            target,
            from
          );
          return !!destination && destination.path === file.path;
        };
        if (mode === "group") {
          const [fromSide, toSide] = this.boardLibrary.SIDES[this.settings.layoutDirection] || this.boardLibrary.SIDES.TB;
          for (const link of links.filter((link2) => link2.path === here)) {
            const node2 = canvas.getData().nodes.find((x) => x.id === link.id);
            if (!node2) continue;
            operations.push({
              op: "set",
              id: node2.id,
              text: node2.type === "text" ? this.boardLibrary.relinkText(
                node2.text,
                isSub(here),
                (linkText) => linkText
              ) : label
            });
            operations.push({
              op: "edge",
              edge: {
                id: [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join(""),
                fromNode: node2.id,
                fromSide,
                toNode: operations.group,
                toSide
              }
            });
          }
        }
        this.edit(canvas, operations);
        if (mode === "group") {
          const toLink = (alias) => `[[${here}|${alias}]]`;
          for (const filePath of [
            ...new Set(
              links.filter((link) => link.path !== here).map((link) => link.path)
            )
          ]) {
            const linkingFile = this.app.vault.getAbstractFileByPath(filePath);
            if (!linkingFile) continue;
            if (filePath.endsWith(".canvas")) {
              const relink = (canvasData) => {
                for (const node2 of canvasData.nodes || []) {
                  if (node2.type === "file" && node2.file === file.path) {
                    node2.file = here;
                  } else if (node2.type === "text") {
                    node2.text = this.boardLibrary.relinkText(
                      node2.text,
                      isSub(filePath),
                      toLink
                    );
                  }
                }
              };
              const open = this.openCanvas(filePath);
              if (open) {
                const canvasData = open.getData();
                relink(canvasData);
                open.setData(canvasData);
                open.requestSave();
              } else {
                await this.app.vault.process(linkingFile, (content2) => {
                  const canvasData = JSON.parse(content2 || "{}");
                  relink(canvasData);
                  return JSON.stringify(canvasData, null, "	");
                });
              }
            } else {
              await this.app.vault.process(
                linkingFile,
                (content2) => this.boardLibrary.relinkText(content2, isSub(filePath), toLink)
              );
            }
          }
        }
        if (mode !== "copy") await this.app.fileManager.trashFile(file);
        const cardCount = (sub.nodes || []).length, linkCount = links.length, plural = (x) => x > 1 ? "s" : "";
        const what = {
          dissolve: `unpacked ${cardCount} card${plural(cardCount)}, ${file.path} trashed` + (linkCount ? ` (${linkCount} link${plural(linkCount)} now broken)` : ""),
          copy: `unpacked ${cardCount} card${plural(cardCount)}, ${file.path} kept`,
          group: `unpacked ${cardCount} card${plural(cardCount)} into a group, ${linkCount} link${plural(linkCount)} redirected`
        }[mode];
        this.undoNotice(
          canvas,
          what,
          [],
          mode === "copy" ? null : { path: file.path, content }
        );
      }
      linkedCanvas(node) {
        const canvasData = node.getData();
        const target = canvasData.type === "file" ? canvasData.file : ((canvasData.text || "").match(/\[\[([^\]|#]+\.canvas)/) || [])[1];
        if (!target || !target.endsWith(".canvas")) return null;
        return this.app.vault.getAbstractFileByPath(target) || this.app.metadataCache.getFirstLinkpathDest(target.trim(), "");
      }
      cardEditor(node) {
        const child = node.child;
        return child && (child.editMode && child.editMode.editor || child.editor) || null;
      }
      // Context of the note a card links (its `context:` list), so its archive note keeps the same context.
      cardContexts(node, board) {
        const canvasData = node.getData();
        const target = canvasData.type === "file" ? canvasData.file : ((canvasData.text || "").match(/\[\[([^\]|#]+)/) || [])[1];
        const file = target && this.app.metadataCache.getFirstLinkpathDest(target.trim(), board);
        const frontmatter = file && (this.app.metadataCache.getFileCache(file) || {}).frontmatter;
        const contexts = frontmatter && frontmatter.context ? [].concat(frontmatter.context).map(String) : [];
        return contexts.length ? contexts : void 0;
      }
      async restore(note) {
        const source = await this.app.vault.read(note);
        const { board } = this.boardLibrary.restoreOps(
          { nodes: [], edges: [] },
          source
        );
        const file = this.app.vault.getAbstractFileByPath(board) || this.app.metadataCache.getFirstLinkpathDest(board, note.path);
        if (!file) throw new Error(`board ${board} not found`);
        const canvas = this.openCanvas(file.path);
        if (canvas) {
          this.edit(
            canvas,
            this.boardLibrary.restoreOps(canvas.getData(), source).operations
          );
        } else {
          await this.app.vault.process(file, (text) => {
            const canvasData = JSON.parse(text);
            canvasData.nodes = canvasData.nodes || [];
            canvasData.edges = canvasData.edges || [];
            this.boardLibrary.applyOps(
              canvasData,
              this.boardLibrary.restoreOps(canvasData, source).operations
            );
            return JSON.stringify(canvasData, null, "	");
          });
        }
        await this.app.fileManager.trashFile(note);
        new Notice(`Kanvas board: card restored on ${file.path}`);
      }
      openCanvas(board) {
        const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view.file && leaf2.view.file.path === board);
        return leaf ? leaf.view.canvas : null;
      }
      activeCanvas() {
        const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
        return view && view.getViewType() === "canvas" ? view.canvas : null;
      }
      // True if the board, or a plan canvas linked from one of its cards, has a card in `go` (setting "Workflow").
      async hasGoCards(board, goColorSet) {
        const read = async (filePath) => {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (!file) return [];
          try {
            return JSON.parse(await this.app.vault.cachedRead(file)).nodes || [];
          } catch (error) {
            return [];
          }
        };
        const isGo = (node) => goColorSet.has(node.color);
        const open = this.openCanvas(board);
        const nodes = open ? open.getData().nodes : await read(board);
        if (nodes.some(isGo)) return true;
        for (const node of nodes) {
          for (const match of (node.text || "").matchAll(
            /\[\[([^\]|#]+\.canvas)/g
          )) {
            const dest = this.app.metadataCache.getFirstLinkpathDest(
              match[1].trim(),
              board
            );
            if (dest && (await read(dest.path)).some(isGo)) return true;
          }
        }
        return false;
      }
      async runPass() {
        const vault = this.app.vault.adapter.basePath;
        const claude = claudeBin(this.settings.claudePath);
        const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
        const board = view && view.getViewType() === "canvas" && view.file ? view.file.path : this.settings.defaultBoard;
        const goColorSet = parseColors(this.settings.passColors);
        if (!goColorSet.size) {
          new Notice(
            createFragment((fragment) => {
              fragment.appendText(
                "Kanvas board: the agent did not start, no color triggers it. Turn one on in Settings > Workflow. "
              );
              const button = fragment.createEl("button", {
                cls: "canvas-board-notice-undo",
                text: "Open settings"
              });
              button.addEventListener("click", () => {
                this.app.setting.open();
                this.app.setting.openTabById(this.manifest.id);
              });
            }),
            1e4
          );
          return;
        }
        if (!await this.hasGoCards(board, goColorSet)) {
          const names = Object.keys(COLOR_NUM).filter(
            (colorName) => goColorSet.has(COLOR_NUM[colorName])
          );
          new Notice(
            `Kanvas board: nothing to do on ${board} (no ${names.join(" or ")} card)`
          );
          return;
        }
        const vars = { vault, board, claude };
        const template = String(this.settings.terminal || "").trim();
        const launch = template ? (([command, ...commandArguments]) => [command, commandArguments])(
          (template.match(/"[^"]*"|\S+/g) || []).map(
            (argument) => argument.replace(/^"|"$/g, "").replace(
              /\{(vault|board|claude)\}/g,
              (match, name) => vars[name]
            )
          )
        ) : defaultLaunch(vars);
        if (!launch) {
          new Notice(
            'Kanvas board: no terminal found to start the pass. Set "Terminal command" in the plugin settings.',
            1e4
          );
          return;
        }
        const [cmd, cmdArgs] = launch;
        try {
          const child = spawn(cmd, cmdArgs, {
            cwd: vault,
            detached: true,
            stdio: "ignore"
          });
          child.on(
            "error",
            (error) => new Notice(
              `Kanvas board: could not start the pass (${error.message})`
            )
          );
          child.unref();
          new Notice(`Kanvas board: pass started on ${board}`);
        } catch (error) {
          new Notice(`Kanvas board: could not start the pass (${error.message})`);
        }
      }
    };
    module2.exports = CanvasBoardPlugin;
  }
});

// src/plugin/main.js
module.exports = require_CanvasBoardPlugin();
