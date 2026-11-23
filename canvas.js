// Built from src/ by `npm run build`; edit src/, not this file.
// Read and edit Obsidian canvas boards safely, for the kanvas-board skill. Ships with the kanvas-board plugin.
// If the board is open in Obsidian, edits go through the plugin's API (`app.plugins.plugins['kanvas-board'].api`,
// called with the Obsidian CLI `obsidian eval`) so Obsidian does not save its in-memory copy over them;
// otherwise the .canvas file is edited directly. Built from src/ (npm run build); the plugin bundles the same board code.
//
// Usage (paths relative to the vault root; CANVAS = node .obsidian/plugins/kanvas-board/canvas.js):
//   CANVAS read <board>                       nodes and edges as JSON
//   CANVAS tree [<board>] [--active]          board + linked notes (level, parts) + nested canvases, as JSON
//                                             --active: go cards (cyan/purple) and working cards (orange), cards edged to them, waiting count (red/yellow)
//   CANVAS set <board> <id> [--color c] [--text t] [--file path]
//                                             c: red orange yellow green cyan purple none (or 1-6)
//                                             --file turns the card into a file card, --text into a text card
//   CANVAS add <board> --near <id> --text t [--color c] [--width w] [--height h]
//                                             new text card next to <id> (right, else below); prints its id
//   CANVAS remove <board> <id>
//   CANVAS edge <board> <fromId> <toId> [--label l]
//   CANVAS layout <board> [--ids a,b,c] [--dir TB|LR|BT|RL] [--fit]
//                                             dagre layered layout of the given cards (default: all), the others
//                                             stay put; --fit sizes text cards to their text. For canvases an agent
//                                             made, or cards it just added
//   CANVAS pack <board> --ids a,b --name N    the cards (and cards inside selected groups) move to `N.canvas`
//                                             next to the board; one card `[[N.canvas|N]]` takes their place (alias: collapse)
//   CANVAS unpack <board> <id> [--keep]       the reverse; the subcanvas file goes to .trash, unless --keep or other
//                                             cards / notes still link it (then it stays, they are listed) (alias: expand)
//   CANVAS merge <board> --ids a,b            text cards into the first in reading order (most urgent color)
//   CANVAS split <board> <id> [--by b]        b: paragraph (default), bullet, h1..h6; pieces stack under it
//   CANVAS extract <board> <id> --text t      the text t leaves the card for a new card right of it, overlaps allowed
//   CANVAS archive <board> <id>[,id]          cards become notes in "<board> archive/" next to the board (setting "Archive":
//                                             or one folder for all boards, default Board notes/Archive/)
//   CANVAS restore <note>                     puts an archived card back on its board, note to .trash
//   CANVAS rollup [<board>]                  recolor parents from nested boards, update `· N inside` / `· Nd`
//   CANVAS check [<board>] [--ids a,b]        read-only: broken links, card text and plan notes off the user's templates, stale working cards, as JSON. --ids: only
//                                             the cards a pass wrote; without it, an audit of every colored card
//   CANVAS workflow                           the user's workflow as JSON: each role's color (working, blocked, review, done),
//                                             template paths and the values of the {placeholders} in the agent instructions
//   CANVAS instructions                       the agent instructions with their {placeholders} filled in
// tree, rollup, check and workflow are the agent workflow: they live in src/workflow/ (plugin settings "Workflow").
// Default board: the plugin setting "Default board" (data.json), else Board.canvas. Default direction: the plugin setting "Layout direction" (data.json), else TB.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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
              removeNode2(g, buckets, zeroIdx, entry);
            }
            while (entry = sources.dequeue()) {
              removeNode2(g, buckets, zeroIdx, entry);
            }
            if (g.nodeCount()) {
              for (let i = buckets.length - 2; i > 0; --i) {
                entry = buckets[i].dequeue();
                if (entry) {
                  results = results.concat(removeNode2(g, buckets, zeroIdx, entry, true));
                  break;
                }
              }
            }
          }
          return results;
        }
        function removeNode2(g, buckets, zeroIdx, entry, collectPredecessors) {
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
          let name2 = e.name;
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
            g.setEdge(v, dummy, { weight: edgeLabel.weight }, name2);
            if (i === 0) {
              g.graph().dummyChains.push(dummy);
            }
            v = dummy;
          }
          g.setEdge(v, w, { weight: edgeLabel.weight }, name2);
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
          let tree3 = new Array(treeSize).fill(0);
          let cc = 0;
          southEntries.forEach((entry) => {
            let index = entry.pos + firstIndex;
            tree3[index] += entry.weight;
            let weightSum = 0;
            while (index > 0) {
              if (index % 2) {
                weightSum += tree3[index + 1];
              }
              index = index - 1 >> 1;
              tree3[index] += entry.weight;
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
            let path6 = pathData.path;
            let lca = pathData.lca;
            let pathIdx = 0;
            let pathV = path6[pathIdx];
            let ascending = true;
            while (v !== edgeObj.w) {
              node = g.node(v);
              if (ascending) {
                while ((pathV = path6[pathIdx]) !== lca && g.node(pathV).maxRank < node.rank) {
                  pathIdx++;
                }
                if (pathV === lca) {
                  ascending = false;
                }
              }
              if (!ascending) {
                while (pathIdx < path6.length - 1 && g.node(pathV = path6[pathIdx + 1]).minRank <= node.rank) {
                  pathIdx++;
                }
                pathV = path6[pathIdx];
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
        function initLowLimValues(tree3, root) {
          if (arguments.length < 2) {
            root = tree3.nodes()[0];
          }
          dfsAssignLowLim(tree3, {}, 1, root);
        }
        function dfsAssignLowLim(tree3, visited, nextLim, v, parent) {
          var low = nextLim;
          var label = tree3.node(v);
          visited[v] = true;
          tree3.neighbors(v).forEach((w) => {
            if (!Object.hasOwn(visited, w)) {
              nextLim = dfsAssignLowLim(tree3, visited, nextLim, w, v);
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
        function leaveEdge(tree3) {
          return tree3.edges().find((e) => tree3.edge(e).cutvalue < 0);
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
        function isTreeEdge(tree3, u, v) {
          return tree3.hasEdge(u, v);
        }
        function isDescendant(tree3, vLabel, rootLabel) {
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
        function addDummyNode(g, type, attrs, name2) {
          let v;
          do {
            v = uniqueId(name2);
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
        function time(name2, fn) {
          let start = Date.now();
          try {
            return fn();
          } finally {
            console.log(name2 + " time: " + (Date.now() - start) + "ms");
          }
        }
        function notime(name2, fn) {
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
            var v, w, name2, value;
            var valueSpecified = false;
            var arg0 = arguments[0];
            if (typeof arg0 === "object" && arg0 !== null && "v" in arg0) {
              v = arg0.v;
              w = arg0.w;
              name2 = arg0.name;
              if (arguments.length === 2) {
                value = arguments[1];
                valueSpecified = true;
              }
            } else {
              v = arg0;
              w = arguments[1];
              name2 = arguments[3];
              if (arguments.length > 2) {
                value = arguments[2];
                valueSpecified = true;
              }
            }
            v = "" + v;
            w = "" + w;
            if (name2 !== void 0) {
              name2 = "" + name2;
            }
            var e = edgeArgsToId(this._isDirected, v, w, name2);
            if (Object.hasOwn(this._edgeLabels, e)) {
              if (valueSpecified) {
                this._edgeLabels[e] = value;
              }
              return this;
            }
            if (name2 !== void 0 && !this._isMultigraph) {
              throw new Error("Cannot set a named edge when isMultigraph = false");
            }
            this.setNode(v);
            this.setNode(w);
            this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name2);
            var edgeObj = edgeArgsToObj(this._isDirected, v, w, name2);
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
          edge(v, w, name2) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name2);
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
          hasEdge(v, w, name2) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name2);
            return Object.hasOwn(this._edgeLabels, e);
          }
          /**
             * Removes the specified edge from the graph. No subgraphs are considered.
             * Complexity: O(1).
             */
          removeEdge(v, w, name2) {
            var e = arguments.length === 1 ? edgeObjToId(this._isDirected, arguments[0]) : edgeArgsToId(this._isDirected, v, w, name2);
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
        function edgeArgsToId(isDirected, v_, w_, name2) {
          var v = "" + v_;
          var w = "" + w_;
          if (!isDirected && v > w) {
            var tmp = v;
            v = w;
            w = tmp;
          }
          return v + EDGE_KEY_DELIM + w + EDGE_KEY_DELIM + (name2 === void 0 ? DEFAULT_EDGE_NAME : name2);
        }
        function edgeArgsToObj(isDirected, v_, w_, name2) {
          var v = "" + v_;
          var w = "" + w_;
          if (!isDirected && v > w) {
            var tmp = v;
            v = w;
            w = tmp;
          }
          var edgeObj = { v, w };
          if (name2) {
            edgeObj.name = name2;
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

// src/board/store.js
var childProcess = __toESM(require("child_process"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var url = __toESM(require("url"), 1);
var import_meta = {};
var MARKDOWN_FILE = /\.md$/;
var EVAL_RESULT = /=>\s?([\s\S]*)$/;
var PLUGIN_DIR = typeof __dirname === "string" ? __dirname : import_path.default.resolve(url.fileURLToPath(import_meta.url), "..", "..", "..");
var ROOT = import_path.default.resolve(PLUGIN_DIR, "..", "..", "..");
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
function mostUrgent(colors) {
  return URGENCY.find((color) => colors.includes(color)) || "";
}
function settings() {
  try {
    return JSON.parse(
      import_fs.default.readFileSync(import_path.default.join(PLUGIN_DIR, "data.json"), "utf8")
    );
  } catch (error) {
    return {};
  }
}
function vaultPath(relativePath) {
  return import_path.default.join(ROOT, relativePath);
}
var VaultFileIndex = class {
  constructor() {
    this.files = null;
  }
  get(name2) {
    return this.load().get(name2) || null;
  }
  paths() {
    return new Set(this.load().values());
  }
  load() {
    if (!this.files) {
      this.files = /* @__PURE__ */ new Map();
      this.skipped = /* @__PURE__ */ new Set([...SKIP_DIRS, ...settings().skipFolders || []]);
      this.walk("");
    }
    return this.files;
  }
  walk(folder) {
    const entries = import_fs.default.readdirSync(vaultPath(folder), {
      withFileTypes: true
    });
    for (const entry of entries) {
      const relativePath = import_path.default.posix.join(folder, entry.name);
      if (!entry.isDirectory()) {
        this.add(relativePath, entry.name);
      } else if (!this.skipped.has(entry.name)) {
        this.walk(relativePath);
      }
    }
  }
  // The first file found keeps a name shared by several.
  add(relativePath, name2) {
    const key = name2.endsWith(".md") ? name2.slice(0, -3) : name2;
    if (!this.files.has(key)) {
      this.files.set(key, relativePath);
    }
    this.files.set(relativePath, relativePath);
    this.files.set(relativePath.replace(MARKDOWN_FILE, ""), relativePath);
  }
};
var vaultFileIndex = new VaultFileIndex();
function findFile(name2) {
  return vaultFileIndex.get(name2);
}
function readOrNull(relativePath) {
  try {
    return import_fs.default.readFileSync(vaultPath(relativePath), "utf8");
  } catch {
    return null;
  }
}
function parseOrNull(json) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return null;
  }
}
function readFileBoard(board) {
  const canvasData = JSON.parse(
    import_fs.default.readFileSync(vaultPath(board), "utf8") || "{}"
  );
  canvasData.nodes ||= [];
  canvasData.edges ||= [];
  return canvasData;
}
var NOT_INSTALLED = "ENOENT";
function tryEval(binary, code) {
  try {
    const out = childProcess.execFileSync(binary, ["eval", `code=${code}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const match = out.match(EVAL_RESULT);
    if (!match) {
      throw new Error(out.trim());
    }
    return match[1].trim();
  } catch (error) {
    return error.code === "ENOENT" ? NOT_INSTALLED : null;
  }
}
tryEval.NOT_INSTALLED = NOT_INSTALLED;
function obsidianEval(code) {
  for (const binary of OBSIDIAN) {
    const result = tryEval(binary, code);
    if (result !== NOT_INSTALLED) {
      return result;
    }
  }
  return null;
}
var PLUGIN = "app.plugins.plugins['kanvas-board']";
function api(method, ...values) {
  const json = values.map((value) => JSON.stringify(value)).join(",");
  const call = `p.api.${method}(${json})`;
  return obsidianEval(
    `(async()=>{const p=${PLUGIN};if(!p||!p.api)return 'no plugin';const r=await ${call};return r===null?'closed':r})()`
  );
}
function readBoard(board) {
  const out = api("read", board);
  if (out && out.startsWith("{")) {
    const canvasData = JSON.parse(out);
    return { nodes: canvasData.nodes || [], edges: canvasData.edges || [] };
  }
  return readFileBoard(board);
}
function serialize(canvasData) {
  function lines(items) {
    return items.map((item) => "		" + JSON.stringify(item)).join(",\n");
  }
  return `{
	"nodes":[
${lines(canvasData.nodes)}
	],
	"edges":[
${lines(canvasData.edges)}
	]
}
`;
}
function removeNode(canvasData, operation) {
  canvasData.nodes = canvasData.nodes.filter(
    (node) => node.id !== operation.id
  );
  canvasData.edges = canvasData.edges.filter(
    (edge) => edge.fromNode !== operation.id && edge.toNode !== operation.id
  );
}
var OTHER_TYPE = { file: "text", text: "file" };
function retype(node, type, value) {
  const isRetyped = node.type !== type;
  node.type = type;
  node[type] = value;
  delete node[OTHER_TYPE[type]];
  return isRetyped;
}
function setColor(node, color) {
  if (color) {
    node.color = color;
  } else {
    delete node.color;
  }
}
var GEOMETRY = ["x", "y", "width", "height"];
function setNode(canvasData, operation) {
  const node = canvasData.nodes.find((node2) => node2.id === operation.id);
  if (!node) {
    throw new Error("no node " + operation.id);
  }
  if (operation.color !== void 0) {
    setColor(node, operation.color);
  }
  const retyped = [];
  if (operation.file !== void 0 && retype(node, "file", operation.file)) {
    retyped.push(node.id);
  }
  if (operation.text !== void 0 && retype(node, "text", operation.text)) {
    retyped.push(node.id);
  }
  for (const field of GEOMETRY) {
    if (operation[field] !== void 0) {
      node[field] = operation[field];
    }
  }
  return retyped;
}
function updateEdge(canvasData, operation, fields) {
  const edge = canvasData.edges.find((edge2) => edge2.id === operation.id);
  if (!edge) {
    return;
  }
  for (const field of fields) {
    edge[field] = operation[field];
  }
}
var handlers = {
  set: setNode,
  add: (canvasData, operation) => {
    canvasData.nodes.push(operation.node);
  },
  remove: removeNode,
  edge: (canvasData, operation) => {
    canvasData.edges.push(operation.edge);
  },
  unedge: (canvasData, operation) => {
    canvasData.edges = canvasData.edges.filter(
      (edge) => edge.id !== operation.id
    );
  },
  sides: (canvasData, operation) => updateEdge(canvasData, operation, ["fromSide", "toSide"]),
  retarget: (canvasData, operation) => updateEdge(canvasData, operation, ["fromNode", "toNode"]),
  ends: (canvasData, operation) => updateEdge(canvasData, operation, ["fromEnd", "toEnd"])
};
var OPERATION_HANDLERS = handlers;
function applyOps(canvasData, operations) {
  const retyped = [];
  for (const operation of operations) {
    const handler = OPERATION_HANDLERS[operation.op];
    const retypedIds = handler ? handler(canvasData, operation) : null;
    if (retypedIds) {
      retyped.push(...retypedIds);
    }
  }
  return retyped;
}
function writeOps(board, operations) {
  const out = api("apply", board, operations);
  if (out === "obsidian") {
    return "obsidian";
  }
  if (out !== null && out !== "closed") {
    throw new Error(`Obsidian edit failed: ${out}`);
  }
  const canvasData = readFileBoard(board);
  applyOps(canvasData, operations);
  import_fs.default.writeFileSync(vaultPath(board), serialize(canvasData));
  return "file";
}
function toTrash(relativePath) {
  const destination = vaultPath(
    import_path.default.posix.join(".trash", import_path.default.posix.basename(relativePath))
  );
  import_fs.default.mkdirSync(import_path.default.dirname(destination), { recursive: true });
  import_fs.default.renameSync(vaultPath(relativePath), destination);
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function newId() {
  return [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function freePath(folder, name2, extension) {
  for (let attempt = 1; ; attempt++) {
    const candidate = import_path.default.posix.join(
      folder,
      `${name2}${attempt > 1 ? " " + attempt : ""}${extension}`
    );
    if (!import_fs.default.existsSync(vaultPath(candidate))) {
      return candidate;
    }
  }
}

// src/cli/commands.js
var import_fs4 = __toESM(require("fs"), 1);
var import_dagre_min = __toESM(require_dagre_min(), 1);
var import_path5 = __toESM(require("path"), 1);

// src/board/geometry.js
var WIKILINK_SHOWN_TEXT = /\[\[([^\]|]*\|)?([^\]]*)\]\]/g;
var DEPENDS_ON_LABEL = /depends on/i;
function bounds(nodes) {
  const left = Math.min(...nodes.map((node) => node.x)), top = Math.min(...nodes.map((node) => node.y));
  return {
    x: left,
    y: top,
    width: Math.max(...nodes.map((node) => node.x + node.width)) - left,
    height: Math.max(...nodes.map((node) => node.y + node.height)) - top
  };
}
function byReading(first, second) {
  return first.y - second.y || first.x - second.x;
}
function centerDistance(first, second) {
  function center(node) {
    return [node.x + node.width / 2, node.y + node.height / 2];
  }
  const [firstX, firstY] = center(first);
  const [secondX, secondY] = center(second);
  return Math.hypot(firstX - secondX, firstY - secondY);
}
var GAP = 40;
function overlapsAny(moving, others, offset) {
  function isNear(card, other) {
    return card.x + offset.x < other.x + other.width + GAP && card.x + offset.x + card.width + GAP > other.x && card.y + offset.y < other.y + other.height + GAP && card.y + offset.y + card.height + GAP > other.y;
  }
  return moving.some((card) => others.some((other) => isNear(card, other)));
}
var STEP = 40;
var CENTERED_MAX_STEPS = 200;
function centeredFreeOffset(nodes, card, others) {
  const box = bounds(nodes);
  const offset = {
    x: Math.round(card.x + (card.width - box.width) / 2) - box.x,
    y: Math.round(card.y + (card.height - box.height) / 2) - box.y
  };
  for (let step = 0; step < CENTERED_MAX_STEPS; step++) {
    if (!overlapsAny(nodes, others, offset)) {
      break;
    }
    offset.x += STEP;
  }
  return offset;
}
function firstInReading(nodes) {
  return nodes.filter((node) => node.type !== "group").sort(byReading)[0] || nodes[0];
}
function fitHeight(text, width) {
  const perLine = Math.max(10, Math.floor((width - 40) / 8));
  const lines = String(text || "").split("\n").reduce(
    (lines2, line) => lines2 + Math.max(
      1,
      Math.ceil(line.replace(WIKILINK_SHOWN_TEXT, "$2").length / perLine)
    ),
    0
  );
  return Math.max(60, lines * 26 + 34);
}
var PADDING = 30;
function groupAround(nodes, label) {
  const left = Math.min(...nodes.map((node) => node.x)) - PADDING;
  const top = Math.min(...nodes.map((node) => node.y)) - PADDING;
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return {
    id: newId(),
    type: "group",
    label,
    x: left,
    y: top,
    width: right + PADDING - left,
    height: bottom + PADDING - top
  };
}
function isBackEdge(edge, flow) {
  return flow === "in" || DEPENDS_ON_LABEL.test(edge.label || "");
}
function isTwoWay(edge) {
  return edge.fromEnd === "arrow" && edge.toEnd !== "none";
}
var MAX_STEPS = 400;
var ACROSS_ROWS = /* @__PURE__ */ new Set(["LR", "RL"]);
function nearestFreeOffset(placed, { moving, fixed, direction }) {
  const before = bounds(moving);
  const after = bounds(placed);
  const center = {
    x: Math.round(
      (2 * before.x + before.width - 2 * after.x - after.width) / 2
    ),
    y: Math.round(
      (2 * before.y + before.height - 2 * after.y - after.height) / 2
    )
  };
  const axis = ACROSS_ROWS.has(direction) ? "y" : "x";
  const offset = { ...center };
  for (let attempt = 1; attempt <= MAX_STEPS; attempt++) {
    if (!overlapsAny(placed, fixed, offset)) {
      break;
    }
    const side = attempt % 2 ? 1 : -1;
    offset[axis] = center[axis] + side * Math.ceil(attempt / 2) * STEP;
  }
  return offset;
}
function place(canvasData, { near, width, height }) {
  const nearNode = canvasData.nodes.find((node) => node.id === near);
  if (!nearNode) {
    throw new Error("no node " + near);
  }
  function overlaps(left, top) {
    return canvasData.nodes.some(
      (node) => left < node.x + node.width + 20 && left + width + 20 > node.x && top < node.y + node.height + 20 && top + height + 20 > node.y
    );
  }
  for (let step = 0; step < 20; step++) {
    const right = {
      x: nearNode.x + nearNode.width + 40,
      y: nearNode.y + step * (height + 40)
    };
    if (!overlaps(right.x, right.y)) {
      return right;
    }
    const below = {
      x: nearNode.x + step * (width + 40),
      y: nearNode.y + nearNode.height + 40
    };
    if (!overlaps(below.x, below.y)) {
      return below;
    }
  }
  return { x: nearNode.x + nearNode.width + 40, y: nearNode.y };
}
function withGroupMembers(canvasData, ids) {
  const pick = new Set(ids);
  const groups = canvasData.nodes.filter(
    (node) => node.type === "group" && pick.has(node.id)
  );
  function isInside(node, group) {
    return node.x >= group.x && node.y >= group.y && node.x + node.width <= group.x + group.width && node.y + node.height <= group.y + group.height;
  }
  for (const node of canvasData.nodes) {
    if (groups.some((group) => isInside(node, group))) {
      pick.add(node.id);
    }
  }
  return pick;
}
var GRAPH = { nodesep: 40, ranksep: 80, marginx: 0, marginy: 0 };
function dagrePlacement(moving, inner, layout) {
  const { dagre: dagre2, direction, flow, isFitToText } = layout;
  const graph = new dagre2.graphlib.Graph();
  graph.setGraph({ ...GRAPH, rankdir: direction });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const node of moving) {
    const isFitted = isFitToText && node.type === "text";
    const height = isFitted ? fitHeight(node.text, node.width) : node.height;
    graph.setNode(node.id, { width: node.width, height });
  }
  for (const edge of inner) {
    const [source, target] = isBackEdge(edge, flow) ? [edge.toNode, edge.fromNode] : [edge.fromNode, edge.toNode];
    graph.setEdge(source, target);
  }
  dagre2.layout(graph);
  return moving.map((node) => {
    const position = graph.node(node.id);
    return {
      id: node.id,
      x: Math.round(position.x - position.width / 2),
      y: Math.round(position.y - position.height / 2),
      width: position.width,
      height: position.height
    };
  });
}
function layoutOps(canvasData, options) {
  const { ids, direction = "TB", flow = "out" } = options;
  const cards = canvasData.nodes.filter((node) => node.type !== "group");
  const pick = new Set(ids && ids.length ? ids : cards.map((node) => node.id));
  const moving = cards.filter((node) => pick.has(node.id));
  const fixed = cards.filter((node) => !pick.has(node.id));
  if (!moving.length) {
    return [];
  }
  const inner = canvasData.edges.filter(
    (edge) => pick.has(edge.fromNode) && pick.has(edge.toNode)
  );
  const layout = { ...options, direction, flow };
  const placed = dagrePlacement(moving, inner, layout);
  const offset = nearestFreeOffset(placed, { moving, fixed, direction });
  const [fromSide, toSide] = SIDES[direction];
  function sides(edge) {
    return isBackEdge(edge, flow) ? { fromSide: toSide, toSide: fromSide } : { fromSide, toSide };
  }
  return [
    ...placed.map((card) => ({
      op: "set",
      id: card.id,
      x: card.x + offset.x,
      y: card.y + offset.y,
      width: card.width,
      height: card.height
    })),
    ...inner.map((edge) => ({ op: "sides", id: edge.id, ...sides(edge) }))
  ];
}
function defaultDir() {
  return SIDES[settings().layoutDirection] ? settings().layoutDirection : "TB";
}

// src/board/notes.js
var import_path3 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// src/board/refactor.js
var import_path2 = __toESM(require("path"), 1);
var EXTRA_BLANK_LINES = /\n{3,}/g;
var HEADING_SEPARATOR = /^h([1-6])$/;
var TOP_LEVEL_BULLET = /^([-*+]|\d+[.)]) /;
var BLANK_LINE = /\n\s*\n/;
var WIKILINK_PARTS = /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
var CANVAS_FILE = /\.canvas$/;
function collapseOps(canvasData, { ids, file, label }) {
  const pick = withGroupMembers(canvasData, ids);
  const moving = canvasData.nodes.filter((node) => pick.has(node.id));
  if (!moving.length) {
    throw new Error("nothing to collapse");
  }
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
    id: newId(),
    type: "text",
    text: `[[${file}|${label}]]`,
    x: Math.round(box.x + (box.width - cardWidth) / 2),
    y: Math.round(box.y + (box.height - cardHeight) / 2),
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
  for (const node of moving) {
    operations.push({ op: "remove", id: node.id });
  }
  return { operations, subcanvas, id: card.id };
}
function retargetOps(edges, fromId, toId) {
  return edges.filter((edge) => edge.fromNode === fromId || edge.toNode === fromId).map((edge) => ({
    op: "retarget",
    id: edge.id,
    fromNode: edge.fromNode === fromId ? toId : edge.fromNode,
    toNode: edge.toNode === fromId ? toId : edge.toNode
  }));
}
function expandOps(canvasData, { id, subcanvas, group }) {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card) {
    throw new Error("no node " + id);
  }
  if (!subcanvas.nodes.length) {
    throw new Error("empty subcanvas");
  }
  const taken = new Set(
    [...canvasData.nodes, ...canvasData.edges].map((item) => item.id)
  );
  function freeId(itemId) {
    return taken.has(itemId) ? newId() : itemId;
  }
  const ids = new Map(
    subcanvas.nodes.map((node) => [node.id, freeId(node.id)])
  );
  const others = canvasData.nodes.filter((node) => node.id !== id);
  const offset = centeredFreeOffset(subcanvas.nodes, card, others);
  const nodes = subcanvas.nodes.map((node) => ({
    ...node,
    id: ids.get(node.id),
    x: node.x + offset.x,
    y: node.y + offset.y
  }));
  const frame = group ? groupAround(nodes, group) : null;
  const target = frame || firstInReading(nodes);
  const edges = subcanvas.edges.map((edge) => ({
    ...edge,
    id: freeId(edge.id),
    fromNode: ids.get(edge.fromNode),
    toNode: ids.get(edge.toNode)
  }));
  const operations = [
    ...frame ? [{ op: "add", node: frame }] : [],
    ...nodes.map((node) => ({ op: "add", node })),
    ...edges.map((edge) => ({ op: "edge", edge })),
    ...retargetOps(canvasData.edges, id, target.id),
    { op: "remove", id }
  ];
  return frame ? Object.assign(operations, { group: frame.id }) : operations;
}
function extractOps(canvasData, { id, part, from }) {
  const card = canvasData.nodes.find((node2) => node2.id === id);
  if (!card || card.type !== "text") {
    throw new Error("extract takes one text card");
  }
  const offset = from !== void 0 && card.text.slice(from, from + part.length) === part ? from : card.text.indexOf(part);
  if (!part.trim() || offset < 0) {
    throw new Error("text not found in the card");
  }
  const left = (card.text.slice(0, offset) + card.text.slice(offset + part.length)).replace(EXTRA_BLANK_LINES, "\n\n").trim();
  const text = part.trim();
  const height = fitHeight(text, card.width);
  let top = card.y;
  while (canvasData.nodes.some(
    (node2) => node2.x === card.x + card.width + 40 && node2.y === top
  )) {
    top += 40;
  }
  const node = {
    id: newId(),
    type: "text",
    text,
    x: card.x + card.width + 40,
    y: top,
    width: card.width,
    height
  };
  if (card.color) {
    node.color = card.color;
  }
  return [
    { op: "set", id, text: left, height: fitHeight(left, card.width) },
    { op: "add", node }
  ];
}
function keptEdgeOps(links, { keep, gone }) {
  const sorted = [...links].sort(
    (first, second) => first.length - second.length
  );
  const best = sorted.find((link) => isTwoWay(link.edge)) || sorted[0];
  const hasBothWays = links.some((link) => link.isOutgoing) && links.some((link) => !link.isOutgoing);
  const operations = sorted.filter((link) => link !== best).map((link) => ({ op: "unedge", id: link.edge.id }));
  const { edge } = best;
  if (gone.has(edge.fromNode) || gone.has(edge.toNode)) {
    operations.push({
      op: "retarget",
      id: edge.id,
      fromNode: gone.has(edge.fromNode) ? keep.id : edge.fromNode,
      toNode: gone.has(edge.toNode) ? keep.id : edge.toNode
    });
  }
  if (hasBothWays && !isTwoWay(edge)) {
    operations.push({
      op: "ends",
      id: edge.id,
      fromEnd: "arrow",
      toEnd: "arrow"
    });
  }
  return operations;
}
function mergeEdgeOps(canvasData, { keep, gone }) {
  const merged = /* @__PURE__ */ new Set([keep.id, ...gone]);
  function nodeById(id) {
    return canvasData.nodes.find((node) => node.id === id);
  }
  const operations = [];
  const linksByOther = /* @__PURE__ */ new Map();
  for (const edge of canvasData.edges) {
    const isOutgoing = merged.has(edge.fromNode);
    const isIncoming = merged.has(edge.toNode);
    const isInside = isOutgoing && isIncoming;
    const touchesGone = gone.has(edge.fromNode) || gone.has(edge.toNode);
    if (isInside && touchesGone) {
      operations.push({ op: "unedge", id: edge.id });
    }
    if (isInside || !isOutgoing && !isIncoming) {
      continue;
    }
    const [mine, other] = isOutgoing ? [edge.fromNode, edge.toNode] : [edge.toNode, edge.fromNode];
    const length = centerDistance(
      nodeById(mine),
      nodeById(other) || keep
    );
    if (!linksByOther.has(other)) {
      linksByOther.set(other, []);
    }
    linksByOther.get(other).push({ edge, isOutgoing, length });
  }
  for (const links of linksByOther.values()) {
    operations.push(...keptEdgeOps(links, { keep, gone }));
  }
  return operations;
}
function mergeOps(canvasData, ids) {
  const cards = canvasData.nodes.filter((node) => ids.includes(node.id)).sort(byReading);
  if (cards.length < 2) {
    throw new Error("merge needs 2+ cards");
  }
  if (cards.some((node) => node.type !== "text")) {
    throw new Error("merge takes text cards only");
  }
  const [keep, ...rest] = cards;
  const gone = new Set(rest.map((node) => node.id));
  const text = cards.map((node) => node.text.trim()).join("\n\n");
  const width = Math.max(...cards.map((node) => node.width));
  const color = mostUrgent(cards.map((node) => node.color || ""));
  const height = fitHeight(text, width);
  return [
    { op: "set", id: keep.id, text, color, width, height },
    ...mergeEdgeOps(canvasData, { keep, gone }),
    ...rest.map((node) => ({ op: "remove", id: node.id }))
  ];
}
function pieceStart(separator) {
  const headingMatch = HEADING_SEPARATOR.exec(separator);
  if (headingMatch) {
    const headingOfLevel = new RegExp(`^#{${headingMatch[1]}} `);
    return headingOfLevel;
  }
  return separator === "bullet" ? TOP_LEVEL_BULLET : null;
}
function splitText(text, separator) {
  const starts = pieceStart(separator);
  const pieces = starts ? text.split("\n").reduce((pieces2, line) => {
    if (starts.test(line) || !pieces2.length) {
      pieces2.push([]);
    }
    pieces2[pieces2.length - 1].push(line);
    return pieces2;
  }, []).map((pieceLines) => pieceLines.join("\n")) : text.split(BLANK_LINE);
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}
function splitOps(canvasData, id, separator = "paragraph") {
  const card = canvasData.nodes.find((node) => node.id === id);
  if (!card || card.type !== "text") {
    throw new Error("split takes one text card");
  }
  const pieces = splitText(card.text || "", separator);
  if (pieces.length < 2) {
    throw new Error(`nothing to split by ${separator}`);
  }
  let top = card.y;
  return pieces.map((text, index) => {
    const height = fitHeight(text, card.width);
    const node = {
      ...card,
      id: index ? newId() : card.id,
      text,
      y: top,
      height
    };
    top += height + 20;
    return index ? { op: "add", node } : { op: "set", id, text, height };
  });
}
function relinkText(text, hits, replace) {
  return (text || "").replace(WIKILINK_PARTS, (link, ...groups) => {
    const [target, , alias] = groups;
    if (!hits(target.trim())) {
      return link;
    }
    const name2 = import_path2.default.posix.basename(target.trim()).replace(CANVAS_FILE, "");
    return replace(alias || name2);
  });
}

// src/board/notes.js
var WIKILINK_TARGET = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
var QUOTED_VALUE = /^(["'])(.*)\1$/;
var CONTEXT_FIELD = /^context:[ \t]*(.*)((?:\r?\n[ \t]+-.*)*)/m;
var OUTER_BRACKETS = /^\[|\]$/g;
var FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
var FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
var LINE_MARKUP_PREFIX = /^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/;
var WIKILINK_SHOWN_TEXT2 = /\[\[([^\]|]*\|)?([^\]]*)\]\]/g;
var NOTE_NAME_FORBIDDEN = /[#^|[\]*_`>:\\/"?<]/g;
var LEADING_LINE_BREAK = /^\r?\n/;
var LINE_BREAK = /\r?\n/;
var LIST_ITEM_DASH = /^\s+-\s*/;
var WHITESPACE_RUN = /\s+/g;
var TRAILING_SLASHES = /[/\\]+$/;
var BACKSLASH = /\\/g;
var ARCHIVED_FROM_FIELD = /^archived-from:/m;
var OUTER_WIKILINK_BRACKETS = /^\[\[|\]\]$/g;
var TRAILING_WHITESPACE = /\s+$/;
var ARCHIVED_EDGE_LINE = /^ {2}- (".*")$/gm;
function cardLinks(node) {
  const targets = node.type === "file" ? [node.file] : [...(node.text || "").matchAll(WIKILINK_TARGET)].map(
    (match) => findFile(match[1].trim())
  );
  const found = targets.filter(Boolean);
  return {
    note: found.find((file) => file.endsWith(".md")) || null,
    canvas: found.find((file) => file.endsWith(".canvas")) || null
  };
}
var LINKABLE = /\.(md|canvas)$/;
function linksTo(relativePath, board, skipId) {
  function hits(target) {
    return findFile(target) === relativePath;
  }
  function isLinking(text) {
    return relinkText(text, hits, () => "\0") !== (text || "");
  }
  function isLinkingCard(node) {
    return node.type === "file" ? node.file === relativePath : isLinking(node.text);
  }
  function linksIn(file, source) {
    if (file.endsWith(".md")) {
      return isLinking(source) ? [file] : [];
    }
    const nodes = (parseOrNull(source) || {}).nodes || [];
    return nodes.filter((node) => !(file === board && node.id === skipId)).filter(isLinkingCard).map((node) => `${file} (${node.id})`);
  }
  const name2 = import_path3.default.posix.basename(relativePath);
  const found = [];
  for (const file of vaultFileIndex.paths()) {
    if (file === relativePath || !LINKABLE.test(file)) {
      continue;
    }
    const source = readOrNull(file);
    if (source && source.includes(name2)) {
      found.push(...linksIn(file, source));
    }
  }
  return found;
}
function noteContexts(frontmatter) {
  if (!frontmatter) {
    return [];
  }
  function unquote(value) {
    return value.trim().replace(QUOTED_VALUE, "$2");
  }
  const match = CONTEXT_FIELD.exec(frontmatter);
  if (!match) {
    return [];
  }
  return (match[1].trim() ? match[1].replace(OUTER_BRACKETS, "").split(",") : match[2].split(LINE_BREAK).filter((line) => line.trim()).map((line) => line.replace(LIST_ITEM_DASH, ""))).map(unquote).filter(Boolean);
}
function cardContexts(node) {
  const { note } = cardLinks(node);
  const frontmatter = note && (import_fs2.default.readFileSync(vaultPath(note), "utf8").match(FRONTMATTER) || [])[1];
  const contexts = noteContexts(frontmatter);
  return contexts.length ? contexts : void 0;
}
function noteName(text) {
  return (String(text).split("\n").find((line) => line.trim()) || "Card").replace(LINE_MARKUP_PREFIX, "").replace(WIKILINK_SHOWN_TEXT2, "$2").replace(NOTE_NAME_FORBIDDEN, "").replace(WHITESPACE_RUN, " ").trim().slice(0, 60).trim() || "Card";
}
function yamlStr(value) {
  return JSON.stringify(String(value));
}
function tree(board, { noteInfo, depth = 0, seen = /* @__PURE__ */ new Set() } = {}) {
  seen.add(board);
  const canvasData = readBoard(board);
  return {
    board,
    cards: canvasData.nodes.filter((node) => node.type !== "group").map((node) => {
      const { note, canvas } = cardLinks(node);
      const card = {
        id: node.id,
        color: node.color || null,
        text: node.type === "text" ? node.text : void 0,
        file: node.file
      };
      if (note) {
        const ageDays = Math.floor(
          (Date.now() - import_fs2.default.statSync(vaultPath(note)).mtimeMs) / 864e5
        );
        card.note = {
          path: note,
          ageDays,
          ...noteInfo ? noteInfo(note) : {}
        };
      }
      if (canvas && !seen.has(canvas) && depth < 2) {
        card.inside = tree(canvas, { noteInfo, depth: depth + 1, seen });
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
function colorArg(color) {
  return color === void 0 ? void 0 : color === "none" ? "" : COLORS[color] || color;
}
function archiveDir(board, options = {}) {
  if (options.archiveMode === "global") {
    return String(options.archiveFolder || ARCHIVE_DIR).trim().replace(TRAILING_SLASHES, "") || ARCHIVE_DIR;
  }
  const boardPath = String(board).replace(BACKSLASH, "/"), folder = import_path3.default.posix.dirname(boardPath);
  return (folder === "." ? "" : folder + "/") + import_path3.default.posix.basename(boardPath, ".canvas") + " archive";
}
function archiveNote(canvasData, { id, board, date, contexts = [] }) {
  const node = canvasData.nodes.find((node2) => node2.id === id);
  if (!node) {
    throw new Error("no node " + id);
  }
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
    ...contexts.length ? ["context:"] : [],
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
function restoreOps(canvasData, source) {
  const frontmatter = (source.match(FRONTMATTER_BLOCK) || [])[1];
  if (!frontmatter || !ARCHIVED_FROM_FIELD.test(frontmatter)) {
    throw new Error("not an archived card note");
  }
  function get(field) {
    const fieldLine = new RegExp(`^${field}: (.*)$`, "m");
    const match = fieldLine.exec(frontmatter);
    if (!match) {
      return void 0;
    }
    const value = match[1].trim();
    return value.startsWith('"') ? JSON.parse(value) : value;
  }
  const board = get("archived-from").replace(OUTER_WIKILINK_BRACKETS, "");
  const body = source.slice(source.indexOf("---", 3) + 3).replace(LEADING_LINE_BREAK, "").replace(TRAILING_WHITESPACE, "");
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
  if (type === "text") {
    node.text = body;
  }
  if (type === "file") {
    node.file = get("card-file");
  }
  if (type === "link") {
    node.url = get("card-url");
  }
  if (get("color")) {
    node.color = get("color");
  }
  const edges = restoredEdgeOps(canvasData, frontmatter, {
    archivedId: get("card-id"),
    restoredId: id
  });
  return { board, operations: [{ op: "add", node }, ...edges] };
}
function restoredEdgeOps(canvasData, frontmatter, { archivedId, restoredId }) {
  const ids = new Set(canvasData.nodes.map((node) => node.id));
  const edgeIds = new Set(canvasData.edges.map((edge) => edge.id));
  const operations = [];
  for (const edgeLine of frontmatter.matchAll(ARCHIVED_EDGE_LINE)) {
    const [edgeId, from, fromSide, toId, toSide, label] = JSON.parse(
      edgeLine[1]
    ).split(" | ");
    const fromNode = from === archivedId ? restoredId : from;
    const toNode = toId === archivedId ? restoredId : toId;
    const isEndMissing = [fromNode, toNode].some(
      (end) => end !== restoredId && !ids.has(end)
    );
    if (edgeIds.has(edgeId) || isEndMissing) {
      continue;
    }
    const edge = Object.fromEntries(
      Object.entries({
        id: edgeId,
        fromNode,
        toNode,
        fromSide,
        toSide,
        label
      }).filter(([, value]) => value)
    );
    operations.push({ op: "edge", edge });
  }
  return operations;
}

// src/workflow/config.js
var ROLES = [
  {
    role: "do",
    color: "cyan",
    label: "Do",
    meaning: "The agent carries the card to done."
  },
  {
    role: "plan",
    color: "purple",
    label: "Plan",
    meaning: "The agent takes one step, then hands back."
  },
  {
    role: "inProgress",
    color: "orange",
    label: "In Progress",
    meaning: "A pass is on the card."
  },
  {
    role: "review",
    color: "yellow",
    label: "Review",
    meaning: "A question or a review for you."
  },
  {
    role: "blocked",
    color: "red",
    label: "Blocked",
    meaning: "Nothing moves until it is unblocked."
  },
  {
    role: "done",
    color: "green",
    label: "Done",
    meaning: "Finished. Remove the card when it no longer helps."
  }
];
var DEFAULT_WORKFLOW = {
  // role → color name, when the user picked another color
  colors: Object.fromEntries(ROLES.map(({ role, color }) => [role, color])),
  // vault paths; empty: <notes folder>/_templates/Card.md, Plan note.md
  cardTemplate: "",
  noteTemplate: ""
};
var DEFAULT_NOTES_FOLDER = "Board notes";
var TRAILING_SLASHES2 = /[/]+$/;
var PLACEHOLDER = /\{(\w+)\}/g;
var CARD_COMMENT = "%% Card template: the shapes of the card text an agent writes, one per line. A {word} stands for any text. A card without a [[link]] is a wish (free text) and always passes. Comments like this one are ignored. %%";
var NOTE_COMMENT = '%% Plan note template: the frontmatter keys and headings of a note an agent writes for a card. Every heading is required, except one followed by an "optional" comment line, or a "when done" one (required once the card has the done color). Comments are for this template only: leave them out of the notes. %%';
var CARD_TEMPLATE = `${CARD_COMMENT}
[[{note}]]
[[{note}]] \xB7 {reason}
{recap} \xB7 done \xB7 [[{output}]]
`;
var NOTE_TEMPLATE = `---
context:
  -
---
${NOTE_COMMENT}
> [!info] Since last time

## Aim

### Done when

## Output
%% when done %%

## Design

## Open questions
%% optional %%

## Decisions Record
%% optional %%
`;
function folderOf(settings3) {
  return String(settings3.notesFolder || DEFAULT_NOTES_FOLDER).replace(
    TRAILING_SLASHES2,
    ""
  );
}
function templatePaths(settings3, workflow) {
  const folder = `${folderOf(settings3)}/_templates`;
  return {
    cardTemplate: workflow.cardTemplate || `${folder}/Card.md`,
    noteTemplate: workflow.noteTemplate || `${folder}/Plan note.md`
  };
}
function roleColors(own = {}) {
  const colors = { ...DEFAULT_WORKFLOW.colors, ...own };
  const picked = Object.values(colors);
  const isValid = picked.every((name2) => COLORS[name2]) && new Set(picked).size === picked.length;
  return isValid ? colors : { ...DEFAULT_WORKFLOW.colors };
}
function resolve(settings3 = {}) {
  const own = settings3.workflow || {};
  const colors = roleColors(own.colors);
  function number(role) {
    return COLORS[colors[role]];
  }
  const blocked = [number("blocked")];
  const review = [number("review")];
  return {
    colors,
    roleOf: Object.fromEntries(
      Object.entries(colors).map(([role, name2]) => [name2, role])
    ),
    working: number("inProgress"),
    blocked,
    review,
    waiting: /* @__PURE__ */ new Set([...blocked, ...review]),
    done: number("done"),
    notesFolder: folderOf(settings3),
    ...templatePaths(settings3, { ...DEFAULT_WORKFLOW, ...own })
  };
}
function templateText(kind, workflow) {
  const relativePath = kind === "card" ? workflow.cardTemplate : workflow.noteTemplate;
  const builtIn = kind === "card" ? CARD_TEMPLATE : NOTE_TEMPLATE;
  return readOrNull(relativePath) || builtIn;
}
function colorName(number) {
  return Object.keys(COLORS).find((name2) => COLORS[name2] === number) || "none";
}
function placeholders(workflow) {
  return {
    notesFolder: workflow.notesFolder,
    working: colorName(workflow.working),
    done: colorName(workflow.done),
    blocked: workflow.blocked.map(colorName).join(" "),
    review: workflow.review.map(colorName).join(" "),
    cardTemplate: workflow.cardTemplate,
    noteTemplate: workflow.noteTemplate
  };
}
function fillPlaceholders(text, workflow) {
  const values = placeholders(workflow);
  return String(text).replace(
    PLACEHOLDER,
    (match, name2) => name2 in values ? values[name2] : match
  );
}

// src/workflow/workflow.js
var import_fs3 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);

// src/workflow/templateRules.js
var LINE_ENDINGS = /\r\n?/g;
var COMMENT = /%%[\s\S]*?%%/g;
var MARKER = /^%%\s*(optional|when done)\s*%%$/;
var HEADING = /^(#{1,6}) +(.+?)\s*$/;
var FRONTMATTER2 = /^---\n([\s\S]*?)\n---\n?/;
var FRONTMATTER_KEY = /^(\w[\w-]*):/gm;
var CARD_PLACEHOLDER = /(\[\[)?\{\w+\}/g;
var REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
function escapeRegex(text) {
  return text.replace(REGEX_SPECIAL, "\\$&");
}
function shapePattern(line) {
  let pattern = "";
  let last = 0;
  for (const match of line.matchAll(CARD_PLACEHOLDER)) {
    pattern += escapeRegex(line.slice(last, match.index));
    pattern += match[1] ? "\\[\\[[^\\]\\n]+" : "[^\\n]+";
    last = match.index + match[0].length;
  }
  pattern += escapeRegex(line.slice(last));
  const shape = new RegExp(`^${pattern}$`);
  return shape;
}
function cardShapes(templateSource) {
  const lines = String(templateSource).replace(LINE_ENDINGS, "\n").replace(COMMENT, "").split("\n").map((line) => line.trim()).filter(Boolean);
  return { lines, patterns: lines.map(shapePattern) };
}
function templateHeadings(body) {
  const lines = body.split("\n");
  const headings = [];
  lines.forEach((line, index) => {
    const match = HEADING.exec(line);
    if (!match) {
      return;
    }
    const level = match[1].length;
    const next = lines.slice(index + 1).find((each) => each.trim());
    const marker = next && MARKER.exec(next.trim());
    const parent = [...headings].reverse().find((each) => each.level < level);
    headings.push({
      level,
      line: `${match[1]} ${match[2]}`,
      title: match[2],
      parent: parent ? parent.title : null,
      when: marker ? marker[1] : "always"
    });
  });
  return headings;
}
function byLevel(first, second) {
  return first.level - second.level;
}
function noteShape(templateSource) {
  const source = String(templateSource).replace(LINE_ENDINGS, "\n").replace(COMMENT, (comment) => MARKER.test(comment) ? comment : "");
  const frontmatter = (source.match(FRONTMATTER2) || [])[1] || "";
  const keys = [...frontmatter.matchAll(FRONTMATTER_KEY)].map(
    (match) => match[1]
  );
  const headings = templateHeadings(source.replace(FRONTMATTER2, ""));
  return {
    keys,
    required: headings.filter((each) => each.when === "always").sort(byLevel),
    whenDone: headings.filter((each) => each.when === "when done")
  };
}

// src/workflow/workflow.js
var LIST_SEPARATOR = /[\s,]+/;
var CANVAS_COLOR_NUMBER = /^[1-6]$/;
var ROLLUP_SUFFIXES = / · \d+ inside| · \d+d$/g;
var STALE_SUFFIX = / · \d+d$/;
var INSIDE_SUFFIX = / · \d+ inside/;
var FRONTMATTER3 = /^---\n([\s\S]*?)\n---/;
var FRONTMATTER_KEY2 = /^(\w[\w-]*):/gm;
var PART_CHECKBOX = /^\s*- \[([ xX])\] /gm;
var REGEX_SPECIAL2 = /[.*+?^${}()|[\]\\]/g;
var DECISIONS_RECORD = /^## Decisions Record/m;
var OPEN_QUESTION = /^\s*- \[\?\] /gm;
var ORANGE_STALE_MS = 36e5;
var DEFAULT_PASS_COLORS = "cyan purple";
function escapeRegex2(text) {
  return text.replace(REGEX_SPECIAL2, "\\$&");
}
function activeNode(boardTree, total, colors) {
  const { active, waiting } = colors;
  const ids = new Set(
    boardTree.cards.filter((card) => active.has(card.color)).map((card) => card.id)
  );
  const near = /* @__PURE__ */ new Set();
  for (const edge of boardTree.edges) {
    if (ids.has(edge.from) && !ids.has(edge.to)) {
      near.add(edge.to);
    }
    if (ids.has(edge.to) && !ids.has(edge.from)) {
      near.add(edge.from);
    }
  }
  const cards = [], context = [];
  for (const card of boardTree.cards) {
    if (waiting.has(card.color)) {
      total.waiting++;
    }
    const inside = card.inside && activeNode(card.inside, total, colors);
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
function parseColors(value) {
  return new Set(
    String(value || "").split(LIST_SEPARATOR).filter(Boolean).map((color) => COLORS[color.toLowerCase()] || color).filter((color) => CANVAS_COLOR_NUMBER.test(color))
  );
}
function settings2() {
  try {
    return JSON.parse(
      import_fs3.default.readFileSync(import_path4.default.join(PLUGIN_DIR, "data.json"), "utf8")
    );
  } catch (error) {
    return {};
  }
}
function workflowNow() {
  return resolve(settings2());
}
function goColors() {
  const value = settings2().passColors;
  return parseColors(value === void 0 ? DEFAULT_PASS_COLORS : value);
}
function activeTree(boardTree) {
  const workflow = workflowNow();
  const active = /* @__PURE__ */ new Set([...goColors(), workflow.working]);
  const total = { waiting: 0 };
  const filtered = activeNode(boardTree, total, {
    active,
    waiting: workflow.waiting
  });
  return {
    board: filtered.board,
    waiting: total.waiting,
    cards: filtered.cards,
    context: filtered.context,
    edges: filtered.edges
  };
}
function ageSuffixOperation(card, days, review = workflowNow().review) {
  const isAging = review.includes(card.color) && card.note && card.text !== void 0 && !card.inside;
  if (!isAging) {
    return null;
  }
  const base = card.text.replace(STALE_SUFFIX, "");
  const isStale = days > 0 && card.note.ageDays >= days;
  const text = isStale ? `${base} \xB7 ${card.note.ageDays}d` : base;
  return text === card.text ? null : { op: "set", id: card.id, text };
}
var WIKILINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
function cardLinkTargets(node) {
  if (node.type === "file") {
    return [node.file];
  }
  return [...(node.text || "").matchAll(WIKILINK)].map(
    (match) => match[1].trim()
  );
}
function cardTextOk(raw, shapes = defaultCardShapes()) {
  const text = raw.trim();
  if (!text.includes("[[")) {
    return true;
  }
  return shapes.patterns.some((pattern) => pattern.test(text));
}
function defaultCardShapes() {
  return cardShapes(templateText("card", workflowNow()));
}
function textShapesIssue(shapes) {
  const listed = shapes.lines.map((line) => `\`${line}\``).join(", ");
  return `card text is neither a wish (no link) nor a card template shape (${listed})`;
}
function cardIssues(node, depth, shapes = defaultCardShapes()) {
  const issues = cardLinkTargets(node).filter((link) => !findFile(link)).map((link) => `broken link [[${link}]]`);
  const isTopText = node.type === "text" && depth === 0;
  if (isTopText && !cardTextOk(node.text || "", shapes)) {
    issues.push(textShapesIssue(shapes));
  }
  return issues;
}
function isStaleOrange(node, note, working = workflowNow().working) {
  if (node.color !== working) {
    return false;
  }
  const age = Date.now() - import_fs3.default.statSync(vaultPath(note)).mtimeMs;
  return age > ORANGE_STALE_MS;
}
function defaultNoteRules() {
  const workflow = workflowNow();
  return {
    shape: noteShape(templateText("note", workflow)),
    done: workflow.done
  };
}
function noteIssues(source, color, rules = defaultNoteRules()) {
  const { shape, done } = rules;
  const frontmatter = (source.match(FRONTMATTER3) || [])[1];
  const keys = frontmatter ? [...frontmatter.matchAll(FRONTMATTER_KEY2)].map((match) => match[1]) : [];
  function hasHeading(heading) {
    const headingLine = new RegExp(`^${heading}\\s*$`, "m");
    return headingLine.test(source);
  }
  const issues = [];
  const expected = shape.keys.join(", ");
  if (keys.join(", ") !== expected) {
    const listed = keys.join(", ") || "none";
    issues.push(`note frontmatter is not \`${expected}\` only (${listed})`);
  }
  const isOneContext = shape.keys.includes("context");
  if (isOneContext && noteContexts(frontmatter).length !== 1) {
    issues.push("note does not have exactly one context");
  }
  for (const heading of shape.required) {
    if (!hasHeading(escapeRegex2(heading.line))) {
      const where = heading.parent ? ` (under ${heading.parent})` : "";
      issues.push(`note has no ${heading.line}${where}`);
    }
  }
  const isDone = Boolean(done) && color === done;
  for (const heading of isDone ? shape.whenDone : []) {
    if (!hasHeading(escapeRegex2(heading.line))) {
      issues.push(
        `${colorName(done)} card, note has no ${heading.line}`
      );
    }
  }
  return issues;
}
var MAX_DEPTH = 2;
function staleIssue(working) {
  const name2 = colorName(working);
  return `${name2} card, note untouched for 1h+ (interrupted pass?)`;
}
function check(board, ids) {
  const workflow = workflowNow();
  const folder = `${workflow.notesFolder}/`;
  const shapes = cardShapes(
    templateText("card", workflow)
  );
  const noteRules = {
    shape: noteShape(templateText("note", workflow)),
    done: workflow.done
  };
  const issues = [];
  const seen = /* @__PURE__ */ new Set();
  function walk(current, depth) {
    seen.add(current);
    const colored = readBoard(current).nodes.filter((node) => node.type !== "group" && node.color);
    for (const node of colored) {
      const isScoped = !ids || ids.has(node.id);
      const { note, canvas } = cardLinks(node);
      const isPlanNote = Boolean(note && note.startsWith(folder));
      const isStale = isPlanNote && isStaleOrange(node, note, workflow.working);
      const found = [
        ...isScoped ? cardIssues(node, depth, shapes) : [],
        ...isScoped && isPlanNote ? noteIssues(readOrNull(note) || "", node.color, noteRules) : [],
        ...isStale ? [staleIssue(workflow.working)] : []
      ];
      const text = (node.text || node.file || "").split("\n")[0];
      issues.push(
        ...found.map((issue) => ({ board: current, id: node.id, text, issue }))
      );
      if (canvas && !seen.has(canvas) && depth < MAX_DEPTH) {
        walk(canvas, depth + 1);
      }
    }
  }
  walk(board, 0);
  return { issues };
}
function colorCounts(colors, workflow = workflowNow()) {
  function count(color) {
    return colors.filter((each) => each === color).length;
  }
  const urgency = [...workflow.blocked, ...workflow.review];
  return {
    waiting: urgency.map((color) => [color, count(color)]),
    total: urgency.reduce((sum, color) => sum + count(color), 0),
    allDone: Boolean(workflow.done) && colors.length > 0 && count(workflow.done) === colors.length
  };
}
function desiredColor(card, inner, rules) {
  const { goColors: goColors2, workflow } = rules;
  if (goColors2.has(card.color)) {
    return card.color;
  }
  const rolled = card.text !== void 0 && INSIDE_SUFFIX.test(card.text);
  const own = rolled ? null : card.color;
  const climbing = inner.waiting.find(
    ([color, count]) => count || own === color
  );
  if (climbing) {
    return climbing[0];
  }
  if (rolled && workflow.waiting.has(card.color)) {
    return inner.allDone ? workflow.done : null;
  }
  return card.color || null;
}
function nestedCardUpdate(card, inner, rules) {
  const color = desiredColor(card, inner, rules);
  const waiting = inner.total;
  const text = card.text === void 0 ? void 0 : card.text.replace(ROLLUP_SUFFIXES, "") + (waiting ? ` \xB7 ${waiting} inside` : "");
  const isTextChanged = text !== card.text;
  if (color === card.color && !isTextChanged) {
    return { color: card.color, operation: null };
  }
  const operation = {
    op: "set",
    id: card.id,
    color: color === null ? "" : color
  };
  if (isTextChanged) {
    operation.text = text;
  }
  return { color, operation };
}
function noteState(relativePath) {
  const text = import_fs3.default.readFileSync(vaultPath(relativePath), "utf8");
  const parts = [...text.matchAll(PART_CHECKBOX)];
  const done = parts.filter((match) => match[1] !== " ").length;
  const open = text.split(DECISIONS_RECORD)[0];
  const questions = [...open.matchAll(OPEN_QUESTION)].length;
  return {
    level: parts.length ? "plan" : "brief",
    parts: { done, total: parts.length },
    questions
  };
}
function staleDays() {
  const days = Number(settings2().staleDays);
  return Number.isFinite(days) && settings2().staleDays !== void 0 ? days : 7;
}
function tree2(board) {
  return tree(board, { noteInfo: noteState });
}
function rollup(board) {
  const workflow = workflowNow();
  const goColorSet = goColors();
  const days = staleDays();
  const changes = [];
  function walk(node) {
    const operations = [];
    const colors = node.cards.map((card) => {
      if (!card.inside) {
        return card.color;
      }
      const inner = walk(card.inside);
      const update = nestedCardUpdate(card, inner, {
        goColors: goColorSet,
        workflow
      });
      if (update.operation) {
        operations.push(update.operation);
      }
      return update.color;
    });
    const ages = node.cards.map(
      (card) => ageSuffixOperation(card, days, workflow.review)
    );
    operations.push(...ages.filter(Boolean));
    if (operations.length) {
      const via = writeOps(node.board, operations);
      changes.push({ board: node.board, via, operations });
    }
    return colorCounts(colors, workflow);
  }
  walk(tree2(board));
  return changes;
}

// src/cli/commands.js
var DEPENDS_ON_LABEL2 = /depends on/i;
var DEFAULT_WIDTH = 320;
function addCommand(cli2) {
  const text = cli2.option("--text") || "";
  const width = Number(cli2.option("--width") || DEFAULT_WIDTH);
  const height = Number(
    cli2.option("--height") || fitHeight(cli2.option("--text"), width)
  );
  const near = cli2.option("--near");
  const { x: left, y: top } = place(readBoard(cli2.board), {
    near,
    width,
    height
  });
  const node = {
    id: newId(),
    type: "text",
    text,
    x: left,
    y: top,
    width,
    height
  };
  const color = colorArg(cli2.option("--color"));
  if (color) {
    node.color = color;
  }
  writeOps(cli2.board, [{ op: "add", node }]);
  console.log(node.id);
}
function archiveCommand(cli2) {
  const { board } = cli2;
  const canvasData = readBoard(board);
  const ids = cli2.rest[0].split(",");
  for (const id of ids) {
    const node = canvasData.nodes.find((each) => each.id === id);
    const contexts = node && cardContexts(node) || settings().archiveContexts;
    const date = today();
    const archived = archiveNote(canvasData, {
      id,
      board,
      date,
      contexts
    });
    const folder = archiveDir(board, settings());
    const file = freePath(folder, archived.name, ".md");
    import_fs4.default.mkdirSync(vaultPath(folder), { recursive: true });
    import_fs4.default.writeFileSync(vaultPath(file), archived.content);
    console.log(file);
  }
  writeOps(
    board,
    ids.map((id) => ({ op: "remove", id }))
  );
}
function checkCommand(cli2) {
  const ids = cli2.option("--ids") ? new Set(cli2.list("--ids")) : void 0;
  cli2.print(check(cli2.board, ids));
}
function edgeCommand(cli2) {
  const label = cli2.option("--label");
  const [flowFrom, flowTo] = SIDES[defaultDir()];
  const isAgainstFlow = DEPENDS_ON_LABEL2.test(label || "");
  const [fromSide, toSide] = isAgainstFlow ? [flowTo, flowFrom] : [flowFrom, flowTo];
  const [fromNode, toNode] = cli2.rest;
  const edge = { id: newId(), fromNode, fromSide, toNode, toSide };
  if (label) {
    edge.label = label;
  }
  console.log(writeOps(cli2.board, [{ op: "edge", edge }]));
}
function extractCommand(cli2) {
  const operations = extractOps(readBoard(cli2.board), {
    id: cli2.rest[0],
    part: cli2.option("--text") || ""
  });
  console.log(writeOps(cli2.board, operations));
}
function readCommand(cli2) {
  cli2.print(readBoard(cli2.board));
}
function treeCommand(cli2) {
  const boardTree = tree2(cli2.board);
  cli2.print(
    cli2.hasFlag("--active") ? activeTree(boardTree) : boardTree
  );
}
function setCommand(cli2) {
  const operation = {
    op: "set",
    id: cli2.rest[0],
    color: colorArg(cli2.option("--color"))
  };
  if (cli2.option("--text") !== void 0) {
    operation.text = cli2.option("--text");
  }
  if (cli2.option("--file") !== void 0) {
    operation.file = cli2.option("--file");
  }
  console.log(writeOps(cli2.board, [operation]));
}
function removeCommand(cli2) {
  console.log(writeOps(cli2.board, [{ op: "remove", id: cli2.rest[0] }]));
}
function layoutCommand(cli2) {
  const direction = (cli2.option("--dir") || defaultDir()).toUpperCase();
  if (!SIDES[direction]) {
    console.error(`layout: --dir must be TB, LR, BT or RL, not ${direction}`);
    process.exit(1);
  }
  const operations = layoutOps(readBoard(cli2.board), {
    ids: cli2.list("--ids"),
    direction,
    isFitToText: cli2.hasFlag("--fit"),
    dagre: import_dagre_min.default,
    flow: settings().foldDirection
  });
  const moved = operations.filter((operation) => operation.op === "set");
  console.log(writeOps(cli2.board, operations), moved.length, "cards");
}
function packCommand(cli2) {
  const name2 = cli2.option("--name");
  if (!name2) {
    throw new Error("collapse needs --name");
  }
  const file = freePath(import_path5.default.posix.dirname(cli2.board), name2, ".canvas");
  const { operations, subcanvas, id } = collapseOps(
    readBoard(cli2.board),
    {
      ids: cli2.list("--ids"),
      file,
      label: name2
    }
  );
  import_fs4.default.writeFileSync(vaultPath(file), serialize(subcanvas));
  writeOps(cli2.board, operations);
  console.log(file, id);
}
function unpackCommand(cli2) {
  const [id] = cli2.rest;
  const card = readBoard(cli2.board).nodes.find((node) => node.id === id);
  const subcanvas = card && cardLinks(card).canvas;
  if (!subcanvas) {
    throw new Error("card links no canvas");
  }
  const isKept = cli2.hasFlag("--keep");
  const others = isKept ? [] : linksTo(subcanvas, cli2.board, id);
  const operations = expandOps(readBoard(cli2.board), {
    id,
    subcanvas: readBoard(subcanvas)
  });
  writeOps(cli2.board, operations);
  if (isKept) {
    return console.log("unpacked (copy), kept", subcanvas);
  }
  if (others.length) {
    const linking = others.join(", ");
    console.log("unpacked, kept", subcanvas, "- still linked from:", linking);
    return;
  }
  toTrash(subcanvas);
  console.log("unpacked (dissolve), trashed", subcanvas);
}
function mergeCommand(cli2) {
  const operations = mergeOps(
    readBoard(cli2.board),
    cli2.list("--ids")
  );
  console.log(writeOps(cli2.board, operations));
}
function splitCommand(cli2) {
  const separator = cli2.option("--by") || "paragraph";
  const operations = splitOps(
    readBoard(cli2.board),
    cli2.rest[0],
    separator
  );
  console.log(writeOps(cli2.board, operations));
}
function restoreCommand(cli2) {
  const note = cli2.boardArg;
  const source = import_fs4.default.readFileSync(vaultPath(note), "utf8");
  const target = restoreOps({ nodes: [], edges: [] }, source).board;
  const { operations } = restoreOps(readBoard(target), source);
  console.log(
    writeOps(target, operations),
    target,
    operations[0].node.id
  );
  toTrash(note);
}
function rollupCommand(cli2) {
  cli2.print(rollup(cli2.board));
}
function workflowCommand(cli2) {
  const resolved = workflowNow();
  cli2.print({
    ...resolved,
    waiting: [...resolved.waiting],
    placeholders: placeholders(resolved)
  });
}
function instructionsCommand() {
  const file = import_path5.default.join(PLUGIN_DIR, "agent-instructions.md");
  const text = import_fs4.default.readFileSync(file, "utf8");
  process.stdout.write(fillPlaceholders(text, workflowNow()));
}
var byName = {
  read: readCommand,
  tree: treeCommand,
  set: setCommand,
  add: addCommand,
  remove: removeCommand,
  edge: edgeCommand,
  layout: layoutCommand,
  pack: packCommand,
  unpack: unpackCommand,
  merge: mergeCommand,
  split: splitCommand,
  extract: extractCommand,
  archive: archiveCommand,
  restore: restoreCommand,
  rollup: rollupCommand,
  check: checkCommand,
  workflow: workflowCommand,
  instructions: instructionsCommand,
  collapse: packCommand,
  expand: unpackCommand
};

// src/cli/canvas.js
function parseArguments(args) {
  function isValue(index) {
    return index > 0 && args[index - 1].startsWith("--");
  }
  const positional = args.filter(
    (argument, index) => !argument.startsWith("--") && !isValue(index)
  );
  const [commandName, boardArg, ...rest] = positional;
  function option(name2) {
    const index = args.indexOf(name2);
    return index >= 0 ? args[index + 1] : void 0;
  }
  const defaultBoard = String(settings().defaultBoard || "").trim();
  return {
    commandName,
    board: boardArg || defaultBoard || DEFAULT_BOARD,
    boardArg,
    rest,
    option,
    list: (name2) => (option(name2) || "").split(",").filter(Boolean),
    hasFlag: (name2) => args.includes(name2),
    print: (value) => console.log(JSON.stringify(value, null, 2))
  };
}
var USAGE = "Usage: node .obsidian/plugins/kanvas-board/canvas.js read|tree|set|add|remove|edge|layout|pack|unpack|merge|split|extract|archive|restore|rollup|check|workflow|instructions <board> ... (see header)";
var cli = parseArguments(process.argv.slice(2));
var name = cli.commandName || "";
var command = Object.hasOwn(byName, name) ? byName[name] : null;
if (!command) {
  console.error(USAGE);
  process.exit(1);
}
command(cli);
