// Built from src/ by `npm run build`; edit src/, not this file.
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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
            let path9 = pathData.path;
            let lca = pathData.lca;
            let pathIdx = 0;
            let pathV = path9[pathIdx];
            let ascending = true;
            while (v !== edgeObj.w) {
              node = g.node(v);
              if (ascending) {
                while ((pathV = path9[pathIdx]) !== lca && g.node(pathV).maxRank < node.rank) {
                  pathIdx++;
                }
                if (pathV === lca) {
                  ascending = false;
                }
              }
              if (!ascending) {
                while (pathIdx < path9.length - 1 && g.node(pathV = path9[pathIdx + 1]).minRank <= node.rank) {
                  pathIdx++;
                }
                pathV = path9[pathIdx];
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

// src/plugin/main.js
var main_exports = {};
__export(main_exports, {
  default: () => CanvasBoardPlugin_default
});
module.exports = __toCommonJS(main_exports);

// src/plugin/shared.js
var import_fs2 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);

// src/apm/apm.js
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
function band(pace, { personalBest, lowPercent, isWarmingUp = false }) {
  if (personalBest < MIN_PB) {
    return "calibrating";
  }
  if (pace >= personalBest) {
    return "best";
  }
  const ratio = pace / personalBest * 100;
  if (ratio < lowPercent) {
    return isWarmingUp ? "calibrating" : "low";
  }
  if (ratio < 50) {
    return "orange";
  }
  if (ratio < 75) {
    return "yellow";
  }
  return "green";
}
function cardsOf(json) {
  const map = /* @__PURE__ */ new Map();
  for (const node of JSON.parse(json || "{}").nodes || []) {
    map.set(
      node.id,
      JSON.stringify(CONTENT_KEYS.map((key) => node[key] ?? null))
    );
  }
  return map;
}
function rateName(windowMinutes) {
  return windowMinutes === 1 ? "APM" : `AP${windowMinutes}M`;
}
function touchedCards(before, after) {
  const out = [];
  for (const [id, content] of after) {
    if (before.get(id) !== content) {
      out.push(id);
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) {
      out.push(id);
    }
  }
  return out;
}
function unitOf(windowMinutes) {
  return `cards/${windowMinutes}`;
}
var ApmCounter = class {
  // plugin: the Kanvas board plugin (registerEvent, registerDomEvent,
  // registerInterval, addStatusBarItem, activeCanvas, app); save(): writes the
  // plugin's data.json, with this.settings in it.
  constructor(plugin, settings2, save) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.settings = settings2;
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
    this.listenTo(window);
    plugin.registerEvent(
      this.app.workspace.on(
        "window-open",
        (workspaceWindow) => this.listenTo(workspaceWindow.win)
      )
    );
    plugin.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.refresh())
    );
    this.app.workspace.onLayoutReady(async () => {
      for (const file of this.app.vault.getFiles()) {
        if (file.extension === "canvas") {
          await this.snapshot(file);
        }
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
  // Any key or click in a window counts as activity for the APM rate.
  listenTo(targetWindow) {
    const input = () => {
      this.lastInput = Date.now();
    };
    const options = { capture: true, passive: true };
    this.plugin.registerDomEvent(targetWindow, "keydown", input, options);
    this.plugin.registerDomEvent(targetWindow, "mousedown", input, options);
  }
  async unload() {
    if (this.dirty) {
      await this.save();
    }
  }
  // Returns the file's cards, or null when it can't be read as a canvas right
  // now (a half-written file).
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
    if (file.extension !== "canvas") {
      return;
    }
    const before = this.snapshots.get(file.path);
    const after = await this.snapshot(file);
    if (!before || !after) {
      return;
    }
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
    if (!keys.length) {
      return;
    }
    for (const cardId of keys) {
      this.touched.set(cardId, now);
    }
    if (now - this.lastAction > this.settings.idleMinutes * MINUTE_MS) {
      this.sessionStart = now;
    }
    this.lastAction = now;
    this.refresh(now);
  }
  pace(now = Date.now()) {
    const windowMs = this.settings.windowMinutes * MINUTE_MS;
    for (const [cardId, touchedAt] of this.touched) {
      if (touchedAt <= now - windowMs) {
        this.touched.delete(cardId);
      }
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
    const settings2 = this.settings;
    if (pace > settings2.pb) {
      settings2.pb = pace;
      settings2.pbDate = new Date(now).toISOString().slice(0, 10);
      this.dirty = true;
    }
    if (this.dirty && now - this.lastSave >= SAVE_EVERY_MS) {
      this.dirty = false;
      this.lastSave = now;
      this.save();
    }
    const isShown = !!this.plugin.activeCanvas();
    if (this.isShown !== isShown) {
      this.element.toggle(isShown);
      this.isShown = isShown;
    }
    if (!isShown) {
      return;
    }
    const state = this.isIdle(now) ? "idle" : band(pace, {
      personalBest: settings2.pb,
      lowPercent: settings2.lowPercent,
      isWarmingUp: now - this.sessionStart < settings2.windowMinutes * MINUTE_MS
    });
    if (this.state !== state) {
      if (this.state) {
        this.element.removeClass("apm-" + this.state);
      }
      this.element.addClass("apm-" + state);
      this.state = state;
    }
    const text = `${pace} ${rateName(settings2.windowMinutes)} \xB7 PB ${settings2.pb}`;
    if (this.text !== text) {
      this.element.setText(text);
      this.text = text;
      const what = `Cards touched in the last ${settings2.windowMinutes} min.`;
      this.element.setAttribute(
        "aria-label",
        settings2.pbDate ? `${what} Personal best set ${settings2.pbDate}.` : what
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
function loadSettings(stored, legacy) {
  const settings2 = Object.assign({}, DEFAULTS, stored || legacy || {});
  if (settings2.unit !== unitOf(settings2.windowMinutes)) {
    Object.assign(settings2, {
      pb: 0,
      pbDate: "",
      unit: unitOf(settings2.windowMinutes)
    });
  }
  return settings2;
}

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
  get(name) {
    return this.load().get(name) || null;
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
  add(relativePath, name) {
    const key = name.endsWith(".md") ? name.slice(0, -3) : name;
    if (!this.files.has(key)) {
      this.files.set(key, relativePath);
    }
    this.files.set(relativePath, relativePath);
    this.files.set(relativePath.replace(MARKDOWN_FILE, ""), relativePath);
  }
};
var vaultFileIndex = new VaultFileIndex();
function parseOrNull(json) {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return null;
  }
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
function newId() {
  return [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

// src/board/notes.js
var import_path3 = __toESM(require("path"), 1);

// src/board/refactor.js
var import_path2 = __toESM(require("path"), 1);

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
function withGroupMembers(canvasData, ids) {
  const pick = new Set(ids);
  const groups2 = canvasData.nodes.filter(
    (node) => node.type === "group" && pick.has(node.id)
  );
  function isInside(node, group) {
    return node.x >= group.x && node.y >= group.y && node.x + node.width <= group.x + group.width && node.y + node.height <= group.y + group.height;
  }
  for (const node of canvasData.nodes) {
    if (groups2.some((group) => isInside(node, group))) {
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

// src/board/refactor.js
var EXTRA_BLANK_LINES = /\n{3,}/g;
var HEADING_SEPARATOR = /^h([1-6])$/;
var TOP_LEVEL_BULLET = /^([-*+]|\d+[.)]) /;
var BLANK_LINE = /\n\s*\n/;
var NOTE_OR_CANVAS_FILE = /\.(md|canvas)$/;
var ALIASED_WIKILINK = /!?\[\[([^\]|]+)\|([^\]]+)\]\]/g;
var HEADING_OR_BLOCK_WIKILINK = /!?\[\[([^\]#]*)#\^?([^\]]+)\]\]/g;
var WIKILINK_PARTS = /!?\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
var PLAIN_WIKILINK = /!?\[\[([^\]]+)\]\]/g;
var MARKDOWN_LINK = /!?\[([^\]]*)\]\([^)]*\)/g;
var LINE_MARKUP_PREFIX = /^\s*(#{1,6}\s+|>\s*|[-*+]\s+(\[.\]\s+)?|\d+[.)]\s+)/;
var INLINE_MARKS = /\*\*|__|~~|==|`/g;
var ITALIC = /(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g;
var WHITESPACE_RUN = /\s+/g;
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
function plainLines(text) {
  function name(linkTarget) {
    return linkTarget.replace(NOTE_OR_CANVAS_FILE, "").split("/").pop();
  }
  return String(text || "").split("\n").map(
    (line) => line.replace(ALIASED_WIKILINK, "$2").replace(
      HEADING_OR_BLOCK_WIKILINK,
      (match, linkTarget, heading) => linkTarget ? `${name(linkTarget)} \u203A ${heading}` : heading
    ).replace(PLAIN_WIKILINK, (match, linkTarget) => name(linkTarget)).replace(MARKDOWN_LINK, "$1").replace(LINE_MARKUP_PREFIX, "").replace(INLINE_MARKS, "").replace(ITALIC, "$1$2").replace(WHITESPACE_RUN, " ").trim()
  ).filter(Boolean);
}
function relinkText(text, hits, replace) {
  return (text || "").replace(WIKILINK_PARTS, (link, ...groups2) => {
    const [target, , alias] = groups2;
    if (!hits(target.trim())) {
      return link;
    }
    const name = import_path2.default.posix.basename(target.trim()).replace(CANVAS_FILE, "");
    return replace(alias || name);
  });
}
function templateOps(template, origin) {
  const nodes = template.nodes || [];
  if (!nodes.length) {
    throw new Error("empty template");
  }
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
  for (const edge of template.edges || []) {
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

// src/board/notes.js
var FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
var LINE_MARKUP_PREFIX2 = /^\s*([>#]+\s*|([-*+]|\d+[.)])\s+(\[.\]\s+)?)/;
var WIKILINK_SHOWN_TEXT2 = /\[\[([^\]|]*\|)?([^\]]*)\]\]/g;
var NOTE_NAME_FORBIDDEN = /[#^|[\]*_`>:\\/"?<]/g;
var LEADING_LINE_BREAK = /^\r?\n/;
var WHITESPACE_RUN2 = /\s+/g;
var TRAILING_SLASHES = /[/\\]+$/;
var BACKSLASH = /\\/g;
var ARCHIVED_FROM_FIELD = /^archived-from:/m;
var OUTER_WIKILINK_BRACKETS = /^\[\[|\]\]$/g;
var TRAILING_WHITESPACE = /\s+$/;
var ARCHIVED_EDGE_LINE = /^ {2}- (".*")$/gm;
function noteName(text) {
  return (String(text).split("\n").find((line) => line.trim()) || "Card").replace(LINE_MARKUP_PREFIX2, "").replace(WIKILINK_SHOWN_TEXT2, "$2").replace(NOTE_NAME_FORBIDDEN, "").replace(WHITESPACE_RUN2, " ").trim().slice(0, 60).trim() || "Card";
}
function yamlStr(value) {
  return JSON.stringify(String(value));
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

// src/plugin/unpack.js
var WIKILINK_ALIAS = /\|([^\]]+)\]\]/;
function groupLinkOperations(plugin, canvas, unpacked) {
  const { here, label, isSubcanvas, links, groupId } = unpacked;
  const library = plugin.boardLibrary;
  const [fromSide, toSide] = library.SIDES[plugin.settings.layoutDirection] || library.SIDES.TB;
  const nodes = canvas.getData().nodes;
  const linking = links.filter((link) => link.path === here).map((link) => nodes.find((node) => node.id === link.id)).filter(Boolean);
  return linking.flatMap((node) => [
    {
      op: "set",
      id: node.id,
      text: node.type === "text" ? library.relinkText(node.text, isSubcanvas(here), (text) => text) : label
    },
    {
      op: "edge",
      edge: {
        id: newId(),
        fromNode: node.id,
        fromSide,
        toNode: groupId,
        toSide
      }
    }
  ]);
}
function relinkCanvasData(canvasData, redirect) {
  const { library, subcanvasPath, here, hits, toLink } = redirect;
  for (const node of canvasData.nodes || []) {
    if (node.type === "file" && node.file === subcanvasPath) {
      node.file = here;
    } else if (node.type === "text") {
      node.text = library.relinkText(node.text, hits, toLink);
    }
  }
}
async function redirectOutsideLinks(plugin, unpacked) {
  const { file, here, isSubcanvas, links } = unpacked;
  const library = plugin.boardLibrary;
  function toLink(alias) {
    return `[[${here}|${alias}]]`;
  }
  const paths = new Set(
    links.filter((link) => link.path !== here).map((link) => link.path)
  );
  for (const filePath of paths) {
    const linkingFile = plugin.app.vault.getAbstractFileByPath(filePath);
    if (!linkingFile) {
      continue;
    }
    const hits = isSubcanvas(filePath);
    const redirect = { library, subcanvasPath: file.path, here, hits, toLink };
    const open = filePath.endsWith(".canvas") && plugin.openCanvas(filePath);
    if (open) {
      const canvasData = open.getData();
      relinkCanvasData(canvasData, redirect);
      open.setData(canvasData);
      open.requestSave();
      continue;
    }
    await plugin.app.vault.process(linkingFile, (content) => {
      if (!filePath.endsWith(".canvas")) {
        return library.relinkText(content, hits, toLink);
      }
      const canvasData = JSON.parse(content || "{}");
      relinkCanvasData(canvasData, redirect);
      return JSON.stringify(canvasData, null, "	");
    });
  }
}
function unpackMessage(mode, { cardCount, linkCount, path: path9 }) {
  function plural(count) {
    return count > 1 ? "s" : "";
  }
  const cards = `${cardCount} card${plural(cardCount)}`;
  const links = `${linkCount} link${plural(linkCount)}`;
  const broken = linkCount ? ` (${links} now broken)` : "";
  return {
    dissolve: `unpacked ${cards}, ${path9} trashed${broken}`,
    copy: `unpacked ${cards}, ${path9} kept`,
    group: `unpacked ${cards} into a group, ${links} redirected`
  }[mode];
}
async function unpackSubcanvas(plugin, canvas, request) {
  const { node, file, mode, links = [] } = request;
  const parsed = JSON.parse(await plugin.app.vault.read(file) || "{}");
  const subcanvas = { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  const content = JSON.stringify(subcanvas, null, "	");
  const alias = ((node.getData().text || "").match(WIKILINK_ALIAS) || [])[1];
  const label = (alias || file.basename).trim();
  const operations = plugin.boardLibrary.expandOps(canvas.getData(), {
    id: node.id,
    subcanvas,
    group: mode === "group" ? label : void 0
  });
  const here = plugin.canvasFile(canvas);
  function isSubcanvas(from) {
    return (target) => {
      const destination = plugin.app.metadataCache.getFirstLinkpathDest(
        target,
        from
      );
      return Boolean(destination) && destination.path === file.path;
    };
  }
  const unpacked = { file, here, label, isSubcanvas, links };
  if (mode === "group") {
    const groupId = operations.group;
    operations.push(
      ...groupLinkOperations(plugin, canvas, { ...unpacked, groupId })
    );
  }
  plugin.edit(canvas, operations);
  if (mode === "group") {
    await redirectOutsideLinks(plugin, unpacked);
  }
  if (mode !== "copy") {
    await plugin.app.fileManager.trashFile(file);
  }
  const counts = {
    cardCount: subcanvas.nodes.length,
    linkCount: links.length,
    path: file.path
  };
  plugin.undoNotice(canvas, unpackMessage(mode, counts), {
    restore: mode === "copy" ? null : { path: file.path, content }
  });
}
async function subcanvasLinks(plugin, file, { canvas, skipId }) {
  const { vault, metadataCache } = plugin.app;
  const here = plugin.canvasFile(canvas);
  function hits(from) {
    return (target) => {
      const destination = metadataCache.getFirstLinkpathDest(target, from);
      return Boolean(destination) && destination.path === file.path;
    };
  }
  function isLinking(node, from) {
    return node.type === "file" ? node.file === file.path : node.type === "text" && plugin.boardLibrary.relinkText(
      node.text,
      hits(from),
      () => "\0"
    ) !== node.text;
  }
  const canvases = vault.getFiles().filter((each) => each.extension === "canvas" && each.path !== file.path);
  const found = [];
  for (const canvasFile of canvases) {
    const from = canvasFile.path;
    const open = from === here ? canvas : plugin.openCanvas(from);
    const canvasData = open ? open.getData() : parseOrNull(await vault.cachedRead(canvasFile));
    const nodes = ((canvasData || {}).nodes || []).filter(
      (node) => !(from === here && node.id === skipId) && isLinking(node, from)
    );
    found.push(
      ...nodes.map((node) => ({
        path: from,
        id: node.id,
        label: (node.text || node.file || "").split("\n")[0]
      }))
    );
  }
  const resolved = metadataCache.resolvedLinks;
  const notes = Object.keys(resolved).filter(
    (source) => source !== file.path && !source.endsWith(".canvas") && resolved[source][file.path]
  );
  return [
    ...found,
    ...notes.map((source) => ({ path: source, label: source }))
  ];
}
var SAVE_DELAY_MS = 2500;
async function applyToOpenCanvas(canvas, operations) {
  const canvasData = canvas.getData();
  const retyped = applyOps(canvasData, operations);
  if (retyped.length) {
    const nodes = canvasData.nodes.filter((node) => !retyped.includes(node.id));
    canvas.setData({ ...canvasData, nodes });
  }
  canvas.setData(canvasData);
  canvas.requestSave();
  await new Promise((resolve2) => setTimeout(resolve2, SAVE_DELAY_MS));
  return "obsidian";
}

// src/plugin/shared.js
var COLORS2 = [
  { name: "none", canvasColor: "", commandKey: "0", label: "Inbox" },
  { name: "red", canvasColor: "1", commandKey: "1", label: "Blocked" },
  { name: "orange", canvasColor: "2", commandKey: "2", label: "In Progress" },
  { name: "yellow", canvasColor: "3", commandKey: "3", label: "Review" },
  { name: "green", canvasColor: "4", commandKey: "4", label: "Done" },
  { name: "cyan", canvasColor: "5", commandKey: "5", label: "Do" },
  { name: "purple", canvasColor: "6", commandKey: "6", label: "Clarify" }
];
var DEFAULTS2 = {
  defaultBoard: "Board.canvas",
  // empty: Claude Code; else the agent's command, {prompt} where the prompt
  // goes (else last)
  agentCommand: "",
  layoutDirection: "TB",
  // TB, LR, BT or RL
  colorLabels: {},
  // color name → label, when edited (Settings > Workflow)
  cardWarning: "60",
  // yellow cards whose note is untouched this long get a warning badge (and the
  // rollup's `· Nd`)
  staleDays: "7",
  // a hidden tag also hides the cards below its cards (in the fold direction)
  hideTagBranches: true,
  // fold hides the cards a card points to (out) or the cards pointing to it
  // (in)
  foldDirection: "out",
  terminal: "",
  // cards that start a pass (and that tree --active takes, see workflow.js);
  // empty = never
  passColors: "cyan purple",
  // where the agent keeps the notes it makes for cards (read by workflow.js and
  // the skill)
  notesFolder: "Board notes",
  // board: archive notes in "<board> archive/" next to each board; global: all
  // in archiveFolder
  archiveMode: "board",
  // the one archive folder when archiveMode is global
  archiveFolder: "Board notes/Archive"
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
  { name: "cyan", meaning: "The agent carries the card to done." },
  { name: "purple", meaning: "The agent takes one step, then hands back." },
  { name: "orange", meaning: "A pass is on the card." },
  { name: "yellow", meaning: "A question or a review for you." },
  { name: "red", meaning: "Nothing moves until it is unblocked." },
  {
    name: "green",
    meaning: "Finished. Remove the card when it no longer helps."
  },
  { name: "none", meaning: "No state. The agent never touches it." }
];
var LAYOUT_DIRS = {
  TB: { name: "top to bottom", turn: 0 },
  LR: { name: "left to right", turn: -90 },
  BT: { name: "bottom to top", turn: 180 },
  RL: { name: "right to left", turn: 90 }
};
var LINUX_TERMINALS = [
  // args: (vault, command) => the terminal's arguments
  {
    binary: "gnome-terminal",
    args: (vault, command) => [
      `--working-directory=${vault}`,
      "--",
      ...command
    ]
  },
  {
    binary: "konsole",
    args: (vault, command) => ["--workdir", vault, "-e", ...command]
  },
  {
    binary: "xfce4-terminal",
    args: (vault, command) => ["--working-directory", vault, "-x", ...command]
  },
  {
    binary: "kitty",
    args: (vault, command) => ["--directory", vault, ...command]
  },
  {
    binary: "alacritty",
    args: (vault, command) => ["--working-directory", vault, "-e", ...command]
  },
  {
    binary: "wezterm",
    args: (vault, command) => ["start", "--cwd", vault, "--", ...command]
  },
  {
    binary: "foot",
    args: (vault, command) => [`--working-directory=${vault}`, ...command]
  },
  {
    binary: "x-terminal-emulator",
    args: (vault, command) => ["-e", ...command]
  },
  { binary: "xterm", args: (vault, command) => ["-e", ...command] }
];
var boardLibrary = {
  SIDES,
  TEMPLATE_DIR,
  applyOps,
  archiveDir,
  archiveNote,
  collapseOps,
  expandOps,
  extractOps,
  layoutOps,
  mergeOps,
  plainLines,
  relinkText,
  restoreOps,
  splitOps,
  templateOps
};
function createApi(plugin) {
  return {
    read: (board) => {
      const canvas = plugin.openCanvas(board);
      return canvas ? JSON.stringify(canvas.getData()) : null;
    },
    apply: async (board, operations) => {
      const canvas = plugin.openCanvas(board);
      return canvas ? applyToOpenCanvas(canvas, operations) : null;
    }
  };
}
function isArchiveNote(app, file) {
  if (!file || file.extension !== "md") {
    return false;
  }
  const { frontmatter } = app.metadataCache.getFileCache(file) || {};
  return Boolean(frontmatter && frontmatter["archived-from"]);
}
function templateFiles(plugin) {
  return plugin.app.vault.getFiles().filter(
    (file) => file.extension === "canvas" && file.path.startsWith(TEMPLATE_DIR + "/")
  );
}
function templateName(file) {
  return file.path.slice(TEMPLATE_DIR.length + 1, -".canvas".length);
}
function legacyApmSettings(pluginDir) {
  const file = import_path4.default.join(pluginDir, "..", "apm-counter", "data.json");
  try {
    return JSON.parse(import_fs2.default.readFileSync(file, "utf8"));
  } catch {
    return void 0;
  }
}
function startApmCounter(plugin, pluginDir) {
  const { settings: settings2 } = plugin;
  const legacy = settings2.apm ? void 0 : legacyApmSettings(pluginDir);
  settings2.apm = loadSettings(settings2.apm, legacy);
  const counter = new ApmCounter(
    plugin,
    settings2.apm,
    () => plugin.saveData(settings2)
  );
  counter.load();
  plugin.register(() => counter.unload());
  return counter;
}

// src/plugin/CanvasBoardPlugin.js
var obsidian8 = __toESM(require("obsidian"), 1);

// src/plugin/commands.js
var obsidian3 = __toESM(require("obsidian"), 1);
var import_dagre_min = __toESM(require_dagre_min(), 1);

// src/plugin/prompts.js
var obsidian = __toESM(require("obsidian"), 1);
var NameSuggest = class extends obsidian.AbstractInputSuggest {
  constructor(app, inputEl, { names, onPick }) {
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
    element.createSpan({ cls: "kanvas-board-key", text: "overwrite" });
  }
  selectSuggestion(name) {
    this.onPick(name);
    this.close();
  }
};
var FORBIDDEN = /[\\/:#^|[\]]/g;
var NamePrompt = class extends obsidian.Modal {
  // options: { title, onSubmit, suggestions, overwrite }
  constructor(app, options) {
    super(app);
    this.title = options.title;
    this.onSubmit = options.onSubmit;
    this.options = options;
  }
  onOpen() {
    this.setTitle(this.title);
    this.value = "";
    this.button = null;
    this.suggest = null;
    this.isPicked = false;
    new obsidian.Setting(this.contentEl).addText((text) => this.addNameField(text)).addButton((button) => {
      this.button = button;
      button.setButtonText("Create").setCta().onClick(() => this.submit());
    });
  }
  addNameField(text) {
    text.onChange((typed) => {
      this.value = typed;
      this.refresh();
    });
    const { suggestions } = this.options;
    if (suggestions && suggestions.length) {
      this.suggest = new NameSuggest(this.app, text.inputEl, {
        names: suggestions,
        onPick: (suggestion) => this.pick(text, suggestion)
      });
    }
    text.inputEl.addEventListener("keydown", (event) => {
      const suggestEl = this.suggest && this.suggest.suggestEl;
      const isSuggesting = Boolean(suggestEl && suggestEl.isConnected);
      if (event.key !== "Enter" || this.isPicked || isSuggesting) {
        return;
      }
      event.preventDefault();
      this.submit();
    });
    setTimeout(() => text.inputEl.focus(), 0);
  }
  // The Enter that picked a suggestion does not also submit.
  pick(text, suggestion) {
    text.setValue(suggestion);
    this.value = suggestion;
    this.refresh();
    this.isPicked = true;
    setTimeout(() => {
      this.isPicked = false;
    }, 0);
  }
  // Subfolder names (a/b) are allowed for suggestions only: they name an
  // existing file.
  nameOf(value) {
    const { suggestions } = this.options;
    const typed = value.trim().toLowerCase();
    const isSuggestion = suggestions && suggestions.some((suggestion) => suggestion.toLowerCase() === typed);
    return isSuggestion ? value.trim() : value.trim().replace(FORBIDDEN, "");
  }
  refresh() {
    if (!this.button) {
      return;
    }
    const { overwrite } = this.options;
    const isOverwrite = Boolean(
      overwrite && this.value.trim() && overwrite(this.nameOf(this.value))
    );
    this.button.setButtonText(isOverwrite ? "Overwrite" : "Create");
    this.button.buttonEl.toggleClass("mod-warning", isOverwrite);
    this.button.buttonEl.toggleClass("mod-cta", !isOverwrite);
  }
  submit() {
    const name = this.nameOf(this.value);
    if (!name) {
      return;
    }
    this.close();
    Promise.resolve(this.onSubmit(name)).catch(
      (error) => new obsidian.Notice(`Kanvas board: ${error.message}`)
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var Picker = class extends obsidian.FuzzySuggestModal {
  constructor(app, { placeholder, items, label, onChoose }) {
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
      (error) => new obsidian.Notice(`Kanvas board: ${error.message}`)
    );
  }
};
var UnpackChoice = class extends obsidian.Modal {
  constructor(app, file, { links, onPick }) {
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
    if (count > 8) {
      list.createEl("li", { text: `and ${count - 8} more` });
    }
    const setting = new obsidian.Setting(this.contentEl);
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

// src/plugin/view.js
var obsidian2 = __toESM(require("obsidian"), 1);
var REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
var EVENTS = ["pointerdown", "mousedown", "wheel", "dblclick", "contextmenu"];
function stopCanvasEvents(element) {
  for (const eventName of EVENTS) {
    element.addEventListener(eventName, (event) => event.stopPropagation());
  }
}
function clearFrames(root) {
  for (const frame of root.querySelectorAll(".kanvas-board-find-text")) {
    const parent = frame.parentNode;
    frame.replaceWith(...frame.childNodes);
    parent.normalize();
  }
}
function matchOffsets(text, query) {
  const pattern = new RegExp(query.replace(REGEX_SPECIAL_CHARS, "\\$&"), "gi");
  return Array.from(text.matchAll(pattern), (match) => match.index);
}
function frameText(root, query) {
  const ownerDocument = root.ownerDocument;
  const walker = ownerDocument.createTreeWalker(root, 4);
  const texts = [];
  while (walker.nextNode()) {
    texts.push(walker.currentNode);
  }
  const frames = [];
  for (const node of texts) {
    if (node.parentElement.closest(".cm-editor, input, textarea")) {
      continue;
    }
    const here = [];
    for (const offset of matchOffsets(node.data, query).reverse()) {
      const hit = node.splitText(offset);
      hit.splitText(query.length);
      const frame = ownerDocument.createElement("span");
      frame.className = "kanvas-board-find-text";
      hit.replaceWith(frame);
      frame.append(hit);
      here.unshift(frame);
    }
    frames.push(...here);
  }
  return frames;
}
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
    this.element = canvas.wrapperEl.createDiv({
      cls: "document-search-container kanvas-board-find"
    });
    stopCanvasEvents(this.element);
    this.buildBox();
    this.bindKeys();
    this.element.hide();
  }
  buildBox() {
    const box = this.element.createDiv({ cls: "document-search" });
    const field = this.field = box.createDiv({
      cls: "search-input-container document-search-input"
    });
    this.input = field.createEl("input", {
      type: "search",
      attr: { placeholder: "Find\u2026", spellcheck: "false" }
    });
    this.countEl = field.createDiv({ cls: "document-search-count" });
    const buttons = box.createDiv({ cls: "document-search-buttons" });
    function button(icon, label, onClick) {
      const buttonEl = buttons.createEl("button", {
        cls: "document-search-button clickable-icon",
        attr: { "aria-label": label }
      });
      obsidian2.setIcon(buttonEl, icon);
      buttonEl.addEventListener("click", onClick);
    }
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
    obsidian2.setIcon(close, "x");
    close.addEventListener("click", () => this.close());
  }
  bindKeys() {
    this.scope = new obsidian2.Scope(this.plugin.app.scope);
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
      () => this.plugin.app.keymap.pushScope(this.scope)
    );
    this.input.addEventListener(
      "blur",
      () => this.plugin.app.keymap.popScope(this.scope)
    );
    this.input.addEventListener("input", () => this.search());
  }
  open() {
    this.element.show();
    this.input.focus();
    this.input.select();
    if (this.input.value) {
      this.search();
    }
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
    if (!this.matches.length) {
      return;
    }
    this.index = (this.index + step + this.matches.length) % this.matches.length;
    this.show();
  }
  // Every match selected (so it can be moved, colored...) and in view; Enter
  // goes back to one at a time.
  selectAll() {
    const { canvas, plugin, matches } = this;
    if (!matches.length) {
      return;
    }
    if (matches.some((node) => plugin.isHidden(canvas, node))) {
      plugin.showAll(canvas);
      new obsidian2.Notice(
        "Kanvas board: filter and folds cleared to show the cards"
      );
    }
    for (const node of matches) {
      node.nodeEl.addClass("is-current");
    }
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of matches) {
        canvas.selection.add(node);
      }
    });
    canvas.zoomToSelection();
    this.countEl.setText(`all ${matches.length}`);
    this.input.focus();
  }
  mark(nodes) {
    for (const node of this.canvas.nodes.values()) {
      node.nodeEl.removeClass("kanvas-board-find-match", "is-current");
    }
    for (const node of nodes) {
      node.nodeEl.addClass("kanvas-board-find-match");
    }
    this.frame(nodes);
  }
  // Frames the query in the given cards (default: the same ones again) and
  // watches for cards rendering.
  frame(nodes = this.framed) {
    function root(node) {
      return node.contentEl || node.nodeEl;
    }
    this.observer.disconnect();
    for (const node of this.framed) {
      clearFrames(root(node));
    }
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
  // Scrolls a long card to its first match. By hand: scrollIntoView would also
  // scroll the canvas itself.
  reveal(frame) {
    const box = frame.closest(".markdown-preview-view");
    if (!box) {
      return;
    }
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
    if (!node) {
      return;
    }
    for (const matchNode of this.matches) {
      matchNode.nodeEl.toggleClass("is-current", matchNode === node);
    }
    if (plugin.isHidden(canvas, node)) {
      plugin.showAll(canvas);
      new obsidian2.Notice(
        "Kanvas board: filter and folds cleared to show the card"
      );
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
var FilterPane = class {
  constructor(plugin, canvas) {
    this.plugin = plugin;
    this.canvas = canvas;
    this.isOpen = false;
    this.key = "";
    this.element = canvas.wrapperEl.createDiv({ cls: "kanvas-board-pane" });
    stopCanvasEvents(this.element);
    this.buildHead();
    this.body = this.element.createDiv({ cls: "kanvas-board-pane-body" });
    this.buildSections();
    this.buildFoot();
    this.toggle(false);
  }
  buildHead() {
    const head = this.element.createDiv({ cls: "kanvas-board-pane-head" });
    const button = head.createDiv({
      cls: "clickable-icon",
      attr: {
        "aria-label": this.plugin.keyedLabel("Filter cards", "filter"),
        "data-tooltip-position": "right"
      }
    });
    obsidian2.setIcon(button, "filter");
    button.addEventListener("click", () => this.toggle());
    this.badge = head.createSpan({ cls: "kanvas-board-pane-badge" });
  }
  buildSections() {
    const { plugin, canvas } = this;
    function state() {
      return plugin.viewState(canvas);
    }
    this.colorsEl = this.addSection(
      "Colors",
      () => state().xcolors.clear()
    ).createDiv({ cls: "kanvas-board-chips" });
    this.tagsSection = this.addSection("Tags", () => state().xtags.clear());
    this.tagsEl = this.tagsSection.createDiv({ cls: "kanvas-board-chips" });
    this.foldedSection = this.addSection("Folded", () => {
      const unfolded = [...plugin.folds(canvas).keys()].map((id) => [id, null]);
      plugin.setFolds(canvas, new Map(unfolded));
    });
    this.foldedEl = this.foldedSection.createDiv({
      cls: "kanvas-board-pane-list"
    });
  }
  addSection(title, reset) {
    const sectionEl = this.body.createDiv({ cls: "kanvas-board-pane-section" });
    const headingEl = sectionEl.createDiv({ cls: "kanvas-board-pane-heading" });
    headingEl.createSpan({ text: title });
    const resetEl = headingEl.createSpan({
      cls: "clickable-icon kanvas-board-pane-reset",
      attr: { "aria-label": "Reset" }
    });
    obsidian2.setIcon(resetEl, "rotate-ccw");
    resetEl.addEventListener("click", () => {
      reset();
      this.plugin.refreshView(this.canvas);
    });
    return sectionEl;
  }
  buildFoot() {
    const foot = this.body.createDiv({ cls: "kanvas-board-pane-foot" });
    const all = foot.createDiv({
      cls: "clickable-icon",
      attr: { "aria-label": "Unhide all (clear filter and folds)" }
    });
    obsidian2.setIcon(all, "eye");
    all.addEventListener("click", () => this.plugin.showAll(this.canvas));
  }
  tags() {
    const tags = /* @__PURE__ */ new Set();
    for (const node of this.canvas.nodes.values()) {
      for (const tag of this.plugin.cardTagSet(node)) {
        tags.add(tag);
      }
    }
    return tags;
  }
  toggle(isOpening = !this.isOpen) {
    this.isOpen = isOpening;
    this.element.toggleClass("is-open", isOpening);
    this.key = "";
    this.update();
  }
  colorCounts() {
    const counts = {};
    for (const node of this.canvas.nodes.values()) {
      const data = node.getData();
      if (data.type === "group") {
        continue;
      }
      counts[data.color || ""] = (counts[data.color || ""] || 0) + 1;
    }
    return counts;
  }
  // Redraws the chips and lists only when something changed (called every
  // 2 s), never the text fields.
  update() {
    const { plugin, canvas } = this;
    const counts = this.colorCounts();
    const folds = plugin.folds(canvas);
    const isActive = plugin.filtering(plugin.peekViewState(canvas)) || folds.size > 0;
    this.badge.setText(isActive ? plugin.viewLabel(canvas) : "");
    this.badge.toggle(!this.isOpen && isActive);
    if (!this.isOpen) {
      return;
    }
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
    if (key === this.key) {
      return;
    }
    this.key = key;
    this.renderColors(state, counts);
    this.renderTags(state, tags);
    this.renderFolds(folds);
  }
  toggleIn(set, value) {
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    this.plugin.refreshView(this.canvas);
  }
  selectWhere(keep) {
    const { plugin, canvas } = this;
    if (!plugin.selectMore(canvas, [...canvas.selection], keep)) {
      new obsidian2.Notice("Kanvas board: no visible card to select");
    }
  }
  // Dots only, on one line; the name and card count are in the tooltip.
  renderColors(state, counts) {
    this.colorsEl.empty();
    for (const { name, canvasColor: color } of COLORS2) {
      const isOut = state.xcolors.has(color);
      const label = this.plugin.colorLabel(name);
      const count = counts[color] || 0;
      const action = isOut ? "show" : "hide";
      const chip = this.colorsEl.createDiv({
        cls: "kanvas-board-swatch",
        attr: {
          "aria-label": `${label} \xB7 ${count} cards \xB7 click to ${action} \xB7 shift-click to select`
        }
      });
      chip.toggleClass("is-out", isOut);
      chip.createSpan({
        cls: "kanvas-board-dot",
        attr: {
          style: color ? `background: var(--canvas-color-${color})` : ""
        }
      });
      chip.addEventListener(
        "click",
        (event) => event.shiftKey ? this.selectWhere((node) => (node.getData().color || "") === color) : this.toggleIn(state.xcolors, color)
      );
    }
  }
  renderTags(state, tags) {
    this.tagsEl.empty();
    this.tagsSection.toggle(tags.length > 0);
    for (const tag of tags) {
      const isOut = state.xtags.has(tag);
      const action = isOut ? "show" : "hide";
      const chip = this.tagsEl.createDiv({
        cls: "kanvas-board-chip",
        text: "#" + tag,
        attr: { "aria-label": `click to ${action} \xB7 shift-click to select` }
      });
      chip.toggleClass("is-out", isOut);
      chip.addEventListener(
        "click",
        (event) => event.shiftKey ? this.selectWhere((node) => this.plugin.cardTagSet(node).has(tag)) : this.toggleIn(state.xtags, tag)
      );
    }
  }
  renderFolds(folds) {
    this.foldedEl.empty();
    this.foldedSection.toggle(folds.size > 0);
    for (const [id, direction] of folds) {
      const node = this.canvas.nodes.get(id);
      if (node) {
        this.renderFoldRow(node, direction);
      }
    }
  }
  // Color dot, first line as title, the rest muted below, and how many cards
  // the fold hides.
  renderFoldRow(node, direction) {
    const { plugin, canvas } = this;
    const row = this.foldedEl.createDiv({
      cls: "kanvas-board-pane-row kanvas-board-pane-card",
      attr: {
        "aria-label": "Click to unfold the whole branch \xB7 shift-click to select the card"
      }
    });
    row.createSpan({
      cls: "kanvas-board-dot",
      attr: { style: plugin.dotStyle(node.getData().color) }
    });
    const text = row.createDiv({ cls: "kanvas-board-pane-card-text" });
    const [title, ...rest] = plugin.boardLibrary.plainLines(
      plugin.cardText(node)
    );
    text.createDiv({
      cls: "kanvas-board-pane-card-title",
      text: title || "(empty)"
    });
    if (rest.length) {
      text.createDiv({
        cls: "kanvas-board-pane-card-rest",
        text: rest.join(" \xB7 ")
      });
    }
    const levels = plugin.branchLevels(canvas, node.id, direction);
    row.createSpan({
      cls: "kanvas-board-pane-card-count",
      text: `\xB7 ${levels.flat().length} folded`
    });
    row.addEventListener(
      "click",
      (event) => event.shiftKey ? this.selectWhere((each) => each.id === node.id) : plugin.unfold(canvas, [node.id], Infinity)
    );
  }
  destroy() {
    this.element.remove();
  }
};
function branchLevelsFrom(links, root) {
  const seen = /* @__PURE__ */ new Set([root]);
  function isNew(id) {
    return !seen.has(id) && Boolean(seen.add(id));
  }
  const levels = [];
  let level = [root];
  while (level.length) {
    level = level.flatMap((id) => links.get(id) || []).filter(isNew);
    if (level.length) {
      levels.push(level);
    }
  }
  return levels;
}
function selectedCards(selection) {
  return selection.filter(
    (node) => !node.from && node.getData().type !== "group"
  );
}
function isTextNode(node) {
  return node.getData().type === "text";
}
function emptyViewState() {
  return { xcolors: /* @__PURE__ */ new Set(), xtags: /* @__PURE__ */ new Set(), hidden: /* @__PURE__ */ new Set() };
}

// src/plugin/commands.js
function registerColorCommands(plugin) {
  for (const { name, canvasColor: color, commandKey: key } of COLORS2) {
    plugin.addCommand({
      id: `color-${key}`,
      name: plugin.colorCommandName(name),
      checkCallback: (checking) => {
        const canvas = plugin.activeCanvas();
        if (!canvas || canvas.selection.size === 0) {
          return false;
        }
        if (!checking) {
          for (const node of canvas.selection) {
            node.setColor(color);
          }
          canvas.requestSave();
        }
        return true;
      }
    });
  }
}
function registerTidyCommands(plugin) {
  plugin.addCommand({
    id: "tidy-layout",
    name: "Tidy layout (selected cards)",
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) {
        return false;
      }
      if (!checking) {
        if (canvas.selection.size < 2) {
          new obsidian3.Notice(
            "Tidy layout: select the cards to tidy first (2 or more; Ctrl+A for the whole canvas)."
          );
          return true;
        }
        const ids = [...canvas.selection].map((node) => node.id);
        const canvasData = canvas.getData();
        plugin.edit(
          canvas,
          layoutOps(canvasData, {
            ids,
            direction: plugin.settings.layoutDirection,
            dagre: import_dagre_min.default,
            flow: plugin.settings.foldDirection
          }),
          canvasData
        );
      }
      return true;
    }
  });
  plugin.addCommand({
    id: "tidy-direction-next",
    name: "Tidy layout direction: next",
    callback: () => plugin.cycleLayoutDirection()
  });
  for (const [direction, { name }] of Object.entries(LAYOUT_DIRS)) {
    plugin.addCommand({
      id: `tidy-direction-${direction.toLowerCase()}`,
      name: `Tidy layout direction: ${name}`,
      checkCallback: (checking) => {
        if (plugin.settings.layoutDirection === direction) {
          return false;
        }
        if (!checking) {
          plugin.setLayoutDirection(direction);
        }
        return true;
      }
    });
  }
}
function registerPackCommands(plugin) {
  plugin.addCanvasCommand("collapse", "Pack into subcanvas", {
    menu: { title: "Pack into subcanvas", icon: "package" },
    test: (canvas, selection) => selection.length > 0,
    run: (canvas, selection) => new NamePrompt(plugin.app, {
      title: "Subcanvas name",
      onSubmit: async (name) => {
        const board = plugin.activeFile();
        const folder = board.parent && board.parent.path !== "/" ? board.parent.path + "/" : "";
        const file = plugin.freePath(folder, name, ".canvas");
        const { operations, subcanvas } = plugin.boardLibrary.collapseOps(
          canvas.getData(),
          {
            ids: selection.map((node) => node.id),
            file,
            label: name
          }
        );
        await plugin.app.vault.create(
          file,
          JSON.stringify(subcanvas, null, "	")
        );
        plugin.edit(canvas, operations);
        plugin.undoNotice(
          canvas,
          `packed ${selection.length} card${selection.length > 1 ? "s" : ""} into ${file}`,
          { files: [file] }
        );
      }
    }).open()
  });
}
function registerUnpackCommands(plugin) {
  function linked(canvas, selection) {
    return selection.length === 1 && !!plugin.linkedCanvas(selection[0]);
  }
  plugin.addCanvasCommand("expand", "Unpack subcanvas (dissolve)", {
    menu: { title: "Unpack subcanvas (dissolve)", icon: "package-open" },
    test: linked,
    run: async (canvas, [node]) => {
      const file = plugin.linkedCanvas(node);
      const links = await plugin.subcanvasLinks(file, canvas, node.id);
      if (!links.length) {
        return plugin.unpack(canvas, node, { file, mode: "dissolve" });
      }
      new UnpackChoice(plugin.app, file, {
        links,
        onPick: (mode) => plugin.unpack(canvas, node, { file, mode, links }).catch(
          (error) => new obsidian3.Notice(`Kanvas board: ${error.message}`)
        )
      }).open();
    }
  });
  plugin.addCanvasCommand("unpack-copy", "Unpack subcanvas (copy)", {
    menu: { title: "Unpack subcanvas (copy)", icon: "copy" },
    test: linked,
    run: (canvas, [node]) => plugin.unpack(canvas, node, {
      file: plugin.linkedCanvas(node),
      mode: "copy"
    })
  });
}
function registerMergeSplitCommands(plugin) {
  plugin.addCanvasCommand("merge", "Merge selected cards", {
    menu: { title: "Merge cards", icon: "merge" },
    test: (canvas, selection) => selection.length > 1 && selection.every(isTextNode),
    run: (canvas, selection) => plugin.edit(
      canvas,
      plugin.boardLibrary.mergeOps(
        canvas.getData(),
        selection.map((node) => node.id)
      )
    )
  });
  for (const { separator, label } of [
    { separator: "paragraph", label: "paragraph" },
    { separator: "bullet", label: "top-level bullet" },
    { separator: "h1", label: "heading 1" },
    { separator: "h2", label: "heading 2" },
    { separator: "h3", label: "heading 3" }
  ]) {
    plugin.addCanvasCommand(`split-${separator}`, `Split card by ${label}`, {
      menu: separator === "bullet" ? { title: "Split by top-level bullet", icon: "split" } : null,
      test: (canvas, selection) => selection.length === 1 && isTextNode(selection[0]) && !selection[0].isEditing,
      run: (canvas, [node]) => plugin.edit(
        canvas,
        plugin.boardLibrary.splitOps(canvas.getData(), node.id, separator)
      )
    });
  }
}
function registerExtractCommand(plugin) {
  plugin.addCanvasCommand(
    "extract",
    "Extract current selection to a new card",
    {
      menu: {
        title: "Extract current selection to a new card",
        icon: "text-select"
      },
      test: (canvas, selection) => selection.length === 1 && selection[0].isEditing && !!plugin.cardEditor(selection[0]),
      run: (canvas, [node]) => {
        const editor = plugin.cardEditor(node);
        const part = editor.getSelection();
        if (!part.trim()) {
          throw new Error("select some text in the card first");
        }
        const from = editor.posToOffset(editor.getCursor("from"));
        const before = editor.getValue();
        editor.replaceSelection("");
        node.blur();
        const canvasData = canvas.getData();
        const savedNode = canvasData.nodes.find(
          (savedCard) => savedCard.id === node.id
        );
        if (savedNode) {
          savedNode.text = before;
        }
        plugin.edit(
          canvas,
          plugin.boardLibrary.extractOps(canvasData, {
            id: node.id,
            part,
            from
          }),
          canvasData
        );
      }
    }
  );
}
function registerArchiveCommand(plugin) {
  plugin.addCanvasCommand("archive", "Archive selected cards", {
    menu: { title: "Archive", icon: "archive" },
    test: (canvas, selection) => selection.length > 0,
    run: async (canvas, selection) => {
      const board = plugin.activeFile().path;
      const canvasData = canvas.getData();
      const folder = plugin.boardLibrary.archiveDir(board, plugin.settings);
      if (!plugin.app.vault.getAbstractFileByPath(folder)) {
        await plugin.app.vault.createFolder(folder);
      }
      const notes = [];
      for (const node of selection) {
        const archived = plugin.boardLibrary.archiveNote(canvasData, {
          id: node.id,
          board,
          date: window.moment().format("YYYY-MM-DD"),
          contexts: plugin.cardContexts(node, board) || plugin.settings.archiveContexts
        });
        notes.push(plugin.freePath(folder + "/", archived.name, ".md"));
        await plugin.app.vault.create(
          notes[notes.length - 1],
          archived.content
        );
      }
      plugin.edit(
        canvas,
        selection.map((node) => ({ op: "remove", id: node.id }))
      );
      plugin.undoNotice(
        canvas,
        `archived ${selection.length} card${selection.length > 1 ? "s" : ""}`,
        { files: notes }
      );
    }
  });
}
function registerFoldCommand(plugin) {
  function canFold(canvas, node) {
    return !plugin.foldOf(node) && plugin.branchLinks(canvas, plugin.settings.foldDirection).has(node.id);
  }
  plugin.addCanvasCommand("fold", "Fold branch", {
    menu: { title: "Fold branch", icon: "chevrons-down-up" },
    test: (canvas, selection) => selection.some((node) => canFold(canvas, node)),
    run: (canvas, selection) => plugin.setFolds(
      canvas,
      new Map(
        selection.filter((node) => canFold(canvas, node)).map((node) => [node.id, plugin.settings.foldDirection])
      )
    )
  });
}
function registerUnfoldCommands(plugin) {
  for (const { levels, id, name, menu } of [
    {
      levels: 1,
      id: "unfold",
      name: "Unfold branch 1 level",
      menu: { title: "Unfold 1 level", icon: "chevron-down" }
    },
    { levels: 2, id: "unfold-2", name: "Unfold branch 2 levels", menu: null },
    { levels: 3, id: "unfold-3", name: "Unfold branch 3 levels", menu: null },
    {
      levels: Infinity,
      id: "unfold-all",
      name: "Unfold whole branch",
      menu: { title: "Unfold whole branch", icon: "chevrons-up-down" }
    }
  ]) {
    plugin.addCanvasCommand(id, name, {
      menu,
      test: (canvas, selection) => selection.some((node) => plugin.unfoldTargets(canvas, node.id).length),
      run: (canvas, selection) => plugin.unfold(
        canvas,
        [
          ...new Set(
            selection.flatMap(
              (node) => plugin.unfoldTargets(canvas, node.id)
            )
          )
        ],
        levels
      )
    });
  }
}
function registerFoldDirectionCommands(plugin) {
  for (const { direction, label } of [
    { direction: "out", label: "outgoing (cards it points to)" },
    { direction: "in", label: "incoming (cards pointing to it)" }
  ]) {
    plugin.addCommand({
      id: `fold-direction-${direction}`,
      name: `Fold direction: ${label}`,
      checkCallback: (checking) => {
        if (plugin.settings.foldDirection === direction) {
          return false;
        }
        if (!checking) {
          plugin.settings.foldDirection = direction;
          plugin.saveData(plugin.settings);
          new obsidian3.Notice(`Kanvas board: fold direction ${label}`);
        }
        return true;
      }
    });
  }
}
function registerTemplateSaveCommand(plugin) {
  plugin.addCanvasCommand(
    "template-save",
    "Save selected cards as a template",
    {
      menu: { title: "Save as template", icon: "layout-template" },
      test: (canvas, selection) => selection.length > 0,
      run: (canvas) => {
        const existing = new Map(
          templateFiles(plugin).map((file) => [templateName(file).toLowerCase(), file])
        );
        new NamePrompt(plugin.app, {
          title: "Template name",
          onSubmit: async (name) => {
            const content = JSON.stringify(
              (({ nodes, edges }) => ({ nodes, edges }))(
                canvas.getSelectionData()
              ),
              null,
              "	"
            );
            const old = existing.get(name.toLowerCase());
            if (old) {
              await plugin.app.vault.modify(old, content);
              new obsidian3.Notice(
                `Kanvas board: template ${old.path} overwritten`
              );
              return;
            }
            if (!plugin.app.vault.getAbstractFileByPath(TEMPLATE_DIR)) {
              await plugin.app.vault.createFolder(TEMPLATE_DIR);
            }
            const file = plugin.freePath(
              TEMPLATE_DIR + "/",
              name,
              ".canvas"
            );
            await plugin.app.vault.create(file, content);
            new obsidian3.Notice(`Kanvas board: template saved to ${file}`);
          },
          suggestions: [...existing.values()].map(
            (file) => templateName(file)
          ),
          overwrite: (name) => existing.has(name.toLowerCase())
        }).open();
      }
    }
  );
}
function registerSelectChildrenCommand(plugin) {
  function childIds(canvas, selection) {
    return new Set(
      selectedCards(selection).flatMap(
        (node) => plugin.branchLevels(canvas, node.id, plugin.settings.foldDirection).flat()
      )
    );
  }
  plugin.addCanvasCommand(
    "select-children",
    "Select children (all levels down, in the fold direction)",
    {
      menu: { title: "Select children", icon: "list-tree" },
      test: (canvas, selection) => [...childIds(canvas, selection)].some(
        (id) => canvas.nodes.get(id) && !plugin.isHidden(canvas, canvas.nodes.get(id)) && !canvas.selection.has(canvas.nodes.get(id))
      ),
      run: (canvas, selection) => {
        const ids = childIds(canvas, selection);
        plugin.selectMore(canvas, selection, (node) => ids.has(node.id));
      }
    }
  );
}
function registerSelectSameTagCommand(plugin) {
  function tagsOf(selection) {
    return new Set(
      selectedCards(selection).flatMap((node) => [...plugin.cardTagSet(node)])
    );
  }
  plugin.addCanvasCommand("select-same-tag", "Select cards with the same tag", {
    menu: { title: "Select same tag", icon: "tag" },
    test: (canvas, selection) => tagsOf(selection).size > 0,
    run: (canvas, selection) => {
      const tags = tagsOf(selection);
      plugin.selectMore(
        canvas,
        selection,
        (node) => [...plugin.cardTagSet(node)].some((tag) => tags.has(tag))
      );
    }
  });
}
function registerSelectSameColorCommand(plugin) {
  plugin.addCanvasCommand(
    "select-same-color",
    "Select cards with the same color",
    {
      menu: { title: "Select same color", icon: "palette" },
      test: (canvas, selection) => selectedCards(selection).length > 0,
      run: (canvas, selection) => {
        const colors = new Set(
          selectedCards(selection).map((node) => node.getData().color || "")
        );
        plugin.selectMore(
          canvas,
          selection,
          (node) => colors.has(node.getData().color || "")
        );
      }
    }
  );
}
function registerTemplateInsertCommand(plugin) {
  plugin.addCommand({
    id: "template-insert",
    name: "Insert cards from template",
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) {
        return false;
      }
      if (!checking) {
        const files = templateFiles(plugin);
        if (!files.length) {
          new obsidian3.Notice(
            `Kanvas board: no template in ${TEMPLATE_DIR} (Save selected cards as a template)`
          );
        } else {
          new Picker(plugin.app, {
            placeholder: "Template",
            items: files,
            label: (file) => file.basename,
            onChoose: (file) => plugin.insertTemplate(canvas, file)
          }).open();
        }
      }
      return true;
    }
  });
}
function registerViewCommands(plugin) {
  plugin.addCommand({
    id: "find",
    name: "Search current canvas",
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) {
        return false;
      }
      if (!checking) {
        let findBar = plugin.finds.get(canvas);
        if (!findBar) {
          findBar = new FindBar(plugin, canvas);
          plugin.finds.set(canvas, findBar);
        }
        findBar.open();
      }
      return true;
    }
  });
  plugin.addCommand({
    id: "filter",
    name: "Toggle filter pane",
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas) {
        return false;
      }
      if (!checking) {
        plugin.pane(canvas).toggle();
      }
      return true;
    }
  });
  plugin.addCommand({
    id: "show-all",
    name: "Unhide all",
    checkCallback: (checking) => {
      const canvas = plugin.activeCanvas();
      if (!canvas || !plugin.viewLabel(canvas)) {
        return false;
      }
      if (!checking) {
        plugin.showAll(canvas);
      }
      return true;
    }
  });
}
function registerRestoreCommands(plugin) {
  plugin.addCommand({
    id: "restore",
    name: "Restore archived card (from its archive note)",
    checkCallback: (checking) => {
      const file = plugin.app.workspace.getActiveFile();
      if (!isArchiveNote(plugin.app, file)) {
        return false;
      }
      if (!checking) {
        plugin.restore(file).catch(
          (error) => new obsidian3.Notice(`Kanvas board: ${error.message}`)
        );
      }
      return true;
    }
  });
  plugin.registerEvent(
    plugin.app.workspace.on("file-menu", (menu, file) => {
      if (isArchiveNote(plugin.app, file)) {
        menu.addItem(
          (item) => item.setTitle("Restore archived card").setIcon("archive-restore").setSection("kanvas-board").onClick(
            () => plugin.restore(file).catch(
              (error) => new obsidian3.Notice(`Kanvas board: ${error.message}`)
            )
          )
        );
      }
    })
  );
}
function registerBoardCommands(plugin) {
  plugin.addCommand({
    id: "run-pass",
    name: "Run pass (recheck the board)",
    callback: () => plugin.runPass()
  });
  plugin.addCommand({
    id: "open-board",
    name: "Open the board",
    callback: () => plugin.openBoard()
  });
  plugin.addCommand({
    id: "create-starter-board",
    name: "Create a starter board (color legend and first cards)",
    callback: () => plugin.createStarterBoard()
  });
  plugin.addRibbonIcon(
    "kanban-square",
    "Open the board (Kanvas board)",
    () => plugin.openBoard()
  );
}
function registerContextMenus(plugin) {
  const { workspace } = plugin.app;
  plugin.registerEvent(
    workspace.on(
      "canvas:selection-menu",
      (menu, canvas) => plugin.addActionItems(menu, canvas, [...canvas.selection])
    )
  );
  plugin.registerEvent(
    workspace.on("canvas:node-menu", (menu, node) => {
      const { selection } = node.canvas;
      const targets = selection.has(node) ? [...selection] : [node];
      plugin.addActionItems(menu, node.canvas, targets);
    })
  );
  plugin.registerEvent(
    workspace.on("editor-menu", (menu, editor) => {
      const canvas = plugin.activeCanvas();
      const node = canvas && [...canvas.selection].find(
        (each) => each.isEditing && plugin.cardEditor(each) === editor
      );
      if (node) {
        plugin.addActionItems(menu, canvas, [node]);
      }
    })
  );
}
var groups = [
  registerColorCommands,
  registerTidyCommands,
  registerPackCommands,
  registerUnpackCommands,
  registerMergeSplitCommands,
  registerExtractCommand,
  registerArchiveCommand,
  registerFoldCommand,
  registerUnfoldCommands,
  registerFoldDirectionCommands,
  registerTemplateSaveCommand,
  registerSelectChildrenCommand,
  registerSelectSameTagCommand,
  registerSelectSameColorCommand,
  registerTemplateInsertCommand,
  registerViewCommands,
  registerRestoreCommands,
  registerBoardCommands,
  registerContextMenus
];

// src/plugin/starterBoard.js
var obsidian4 = __toESM(require("obsidian"), 1);
var import_path5 = __toESM(require("path"), 1);
var COLUMN_WIDTH = 400;
var STEPS_X = COLUMN_WIDTH + 160;
var DOT = {
  cyan: "\u{1F535}",
  purple: "\u{1F7E3}",
  orange: "\u{1F7E0}",
  yellow: "\u{1F7E1}",
  red: "\u{1F534}",
  green: "\u{1F7E2}",
  none: "\u26AA"
};
var STEPS = [
  "**1. Write a wish**\nOne card, one thing you want done, in your own words. Uncolored cards are ideas: the agent never touches them.",
  "**2. Color it**\nCyan: the agent carries it to done. Purple: one step (a brief, then a plan), then it hands back. Color hotkeys: Settings > Kanvas board > Hotkeys.",
  '**3. Run a pass**\nCommand "Kanvas board: Run pass". A terminal opens with the agent on this board; it turns the cards it takes orange.',
  "**4. Answer**\nYellow: a question or a review for you, in the card's note. Answer there, color the card cyan or purple again, run the next pass."
];
var TRY_IT = "Try it: color this card cyan, then run a pass.\n\nWrite a short note that explains this board in my own words.";
var STEP_HEIGHT = 160;
function firstStepsCanvas() {
  const group = {
    id: newId(),
    type: "group",
    label: "First steps",
    x: STEPS_X - 40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: STEPS.length * STEP_HEIGHT + 280
  };
  function card(text, row) {
    return {
      id: newId(),
      type: "text",
      text,
      x: STEPS_X,
      y: row * STEP_HEIGHT,
      width: COLUMN_WIDTH,
      height: 130
    };
  }
  const steps = [];
  const edges = [];
  for (const [row, text] of STEPS.entries()) {
    const step = card(text, row);
    const above = steps[steps.length - 1];
    steps.push(step);
    if (!above) {
      continue;
    }
    edges.push({
      id: newId(),
      fromNode: above.id,
      fromSide: "bottom",
      toNode: step.id,
      toSide: "top"
    });
  }
  const tryIt = {
    ...card(TRY_IT, STEPS.length),
    y: STEPS.length * STEP_HEIGHT + 20
  };
  return { nodes: [group, ...steps, tryIt], edges };
}
function legendNodes(colorLabel) {
  const group = {
    id: newId(),
    type: "group",
    label: "How the colors work",
    x: -40,
    y: -80,
    width: COLUMN_WIDTH + 80,
    height: WORKFLOW.length * 100 + 100
  };
  const cards = WORKFLOW.map(({ name, meaning }, index) => {
    const colorName2 = COLOR_NUM[name] ? name : "uncolored";
    return {
      id: newId(),
      type: "text",
      text: `${DOT[name]} **${colorLabel(name)}** (${colorName2})
${meaning}`,
      x: 0,
      y: index * 100,
      width: COLUMN_WIDTH,
      height: 80
    };
  });
  return [group, ...cards];
}
function starterBoardPath(vault, defaultBoard) {
  if (!vault.getAbstractFileByPath(defaultBoard)) {
    return defaultBoard;
  }
  const parent = import_path5.default.posix.dirname(defaultBoard);
  const folder = parent === "." ? "" : `${parent}/`;
  for (let suffix = 1; ; suffix++) {
    const board = `${folder}Starter board${suffix > 1 ? ` ${suffix}` : ""}.canvas`;
    if (!vault.getAbstractFileByPath(board)) {
      return board;
    }
  }
}
async function createStarterBoard(plugin) {
  const { vault } = plugin.app;
  const board = starterBoardPath(vault, plugin.settings.defaultBoard);
  const legend = legendNodes((name) => plugin.colorLabel(name));
  const { nodes, edges } = firstStepsCanvas();
  const content = JSON.stringify(
    { nodes: [...legend, ...nodes], edges },
    null,
    "	"
  );
  try {
    const folder = import_path5.default.posix.dirname(board);
    if (folder !== "." && !vault.getAbstractFileByPath(folder)) {
      await vault.createFolder(folder);
    }
    const file = await vault.create(board, content);
    await plugin.app.workspace.getLeaf(false).openFile(file);
    new obsidian4.Notice(`Kanvas board: starter board created (${board})`);
  } catch (error) {
    new obsidian4.Notice(
      `Kanvas board: could not create the starter board (${error.message})`
    );
  }
}

// src/plugin/pass.js
var obsidian5 = __toESM(require("obsidian"), 1);
var childProcess2 = __toESM(require("child_process"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path6 = __toESM(require("path"), 1);
var COMMAND_WORDS = /"[^"]*"|\S+/g;
var OUTER_QUOTES = /^"|"$/g;
var PROMPT_PLACEHOLDER = /\{prompt\}/g;
var VAULT_OR_BOARD_PLACEHOLDER = /\{(vault|board)\}/g;
var LIST_SEPARATOR = /[\s,]+/;
var CANVAS_COLOR_NUMBER = /^[1-6]$/;
function claudeBin(setting) {
  if (setting) {
    return setting;
  }
  const local = import_path6.default.join(
    import_os.default.homedir(),
    ".local",
    "bin",
    process.platform === "win32" ? "claude.exe" : "claude"
  );
  return import_fs3.default.existsSync(local) ? local : "claude";
}
function agentWords(setting, prompt) {
  const template = String(setting || "").trim();
  if (!template) {
    return [claudeBin(""), prompt];
  }
  const words = (template.match(COMMAND_WORDS) || []).map(
    (word) => word.replace(OUTER_QUOTES, "")
  );
  const hasPrompt = words.some((word) => word.includes("{prompt}"));
  const filled = words.map((word) => word.replace(PROMPT_PLACEHOLDER, prompt));
  return hasPrompt ? filled : [...filled, prompt];
}
function onPath(binary) {
  return String(process.env.PATH || "").split(import_path6.default.delimiter).some(
    (folder) => folder && import_fs3.default.existsSync(import_path6.default.join(folder, binary))
  );
}
var MAC_SCRIPT = [
  "on run argv",
  'set agentLine to ""',
  "repeat with wordIndex from 2 to count of argv",
  'set agentLine to agentLine & " " & quoted form of item wordIndex of argv',
  "end repeat",
  'tell application "Terminal"',
  "activate",
  'do script "cd " & quoted form of item 1 of argv & " &&" & agentLine',
  "end tell",
  "end run"
];
function defaultLaunch({ vault, board, agent }) {
  if (process.platform === "win32") {
    return [
      "wt.exe",
      [
        "-w",
        "kanvas-board",
        "new-tab",
        "-d",
        vault,
        "--title",
        `pass ${board}`,
        ...agent
      ]
    ];
  }
  if (process.platform === "darwin") {
    const script = MAC_SCRIPT.flatMap((line) => ["-e", line]);
    return ["osascript", [...script, vault, ...agent]];
  }
  const found = LINUX_TERMINALS.find(({ binary }) => onPath(binary));
  return found ? [found.binary, found.args(vault, agent)] : null;
}
function terminalLaunch(template, { vault, board, agent }) {
  if (!template) {
    return defaultLaunch({ vault, board, agent });
  }
  const values = { vault, board };
  const words = (template.match(COMMAND_WORDS) || []).flatMap((word) => {
    const bare = word.replace(OUTER_QUOTES, "");
    if (bare === "{agent}" || bare === "{claude}") {
      return agent;
    }
    return [
      bare.replace(VAULT_OR_BOARD_PLACEHOLDER, (match, name) => values[name])
    ];
  });
  const [command, ...commandArguments] = words;
  return [command, commandArguments];
}
function passPrompt(instructionsPath, board) {
  return `Run a Kanvas board pass on ${board}: follow ${instructionsPath}`;
}
function nextTurn(current, target) {
  return current + ((target - current) % 360 + 540) % 360 - 180;
}
function parseColors(value) {
  return new Set(
    String(value || "").split(LIST_SEPARATOR).filter(Boolean).map((color) => COLOR_NUM[color.toLowerCase()] || color).filter((color) => CANVAS_COLOR_NUMBER.test(color))
  );
}
function startPass([command, commandArguments], { vault, board }) {
  function failed(error) {
    return new obsidian5.Notice(
      `Kanvas board: could not start the pass (${error.message})`
    );
  }
  try {
    const child = childProcess2.spawn(command, commandArguments, {
      cwd: vault,
      detached: true,
      stdio: "ignore"
    });
    child.on("error", failed);
    child.unref();
    new obsidian5.Notice(`Kanvas board: pass started on ${board}`);
  } catch (error) {
    failed(error);
  }
}

// src/workflow/config.js
var ROLES = ["working", "blocked", "review", "done", "idle"];
var ROLE_MEANINGS = {
  working: "An agent is on the card (required: exactly one color).",
  blocked: "Waiting on you: nothing moves until it is unblocked.",
  review: 'Waiting on you: a question or a review; ages after "Stale after".',
  done: "Finished: a parent whose cards are all done takes it.",
  idle: "No state of its own."
};
var DEFAULT_WORKFLOW = {
  roles: {
    red: "blocked",
    orange: "working",
    yellow: "review",
    green: "done",
    cyan: "idle",
    purple: "idle"
  },
  markers: {
    question: "?",
    answer: "i",
    decisionsRecord: "## Decisions Record"
  },
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
function folderOf(settings2) {
  return String(settings2.notesFolder || DEFAULT_NOTES_FOLDER).replace(
    TRAILING_SLASHES2,
    ""
  );
}
function templatePaths(settings2, workflow) {
  const folder = `${folderOf(settings2)}/_templates`;
  return {
    cardTemplate: workflow.cardTemplate || `${folder}/Card.md`,
    noteTemplate: workflow.noteTemplate || `${folder}/Plan note.md`
  };
}
function colorsWith(roles, role) {
  return Object.keys(COLORS).filter((name) => roles[name] === role).map((name) => COLORS[name]);
}
function resolve(settings2 = {}) {
  const own = settings2.workflow || {};
  const roles = { ...DEFAULT_WORKFLOW.roles, ...own.roles || {} };
  const markers = { ...DEFAULT_WORKFLOW.markers, ...own.markers || {} };
  const working = colorsWith(roles, "working")[0] || COLORS.orange;
  const blocked = colorsWith(roles, "blocked");
  const review = colorsWith(roles, "review");
  return {
    roles,
    markers,
    working,
    blocked,
    review,
    waiting: /* @__PURE__ */ new Set([...blocked, ...review]),
    done: colorsWith(roles, "done")[0] || "",
    notesFolder: folderOf(settings2),
    ...templatePaths(settings2, { ...DEFAULT_WORKFLOW, ...own })
  };
}
function colorName(number) {
  return Object.keys(COLORS).find((name) => COLORS[name] === number) || "none";
}
function placeholders(workflow) {
  return {
    notesFolder: workflow.notesFolder,
    working: colorName(workflow.working),
    done: workflow.done ? colorName(workflow.done) : "none",
    blocked: workflow.blocked.map(colorName).join(" "),
    review: workflow.review.map(colorName).join(" "),
    cardTemplate: workflow.cardTemplate,
    noteTemplate: workflow.noteTemplate,
    question: `- [${workflow.markers.question}]`,
    answer: `- [${workflow.markers.answer}]`,
    decisionsRecord: workflow.markers.decisionsRecord
  };
}
function fillPlaceholders(text, workflow) {
  const values = placeholders(workflow);
  return String(text).replace(
    PLACEHOLDER,
    (match, name) => name in values ? values[name] : match
  );
}

// src/plugin/CanvasBoardSettings.js
var obsidian6 = __toESM(require("obsidian"), 1);
var import_fs4 = __toESM(require("fs"), 1);

// src/plugin/agentInstructions.js
var LEADING_BLANK_LINES = /^(?:[ \t]*\n)+/;
var LINE_BREAK = /\r?\n/;
function sectionTitle(colorName2) {
  const word = colorName2 === "none" ? "uncolored" : colorName2;
  return `${word[0].toUpperCase()}${word.slice(1)} cards`;
}
function headingColor(line, colorNames) {
  const heading = line.trim();
  return colorNames.find(
    (colorName2) => heading === `## ${sectionTitle(colorName2)}`
  );
}
function trimBlankLines(text) {
  return String(text || "").replace(LEADING_BLANK_LINES, "").trimEnd();
}
function splitInstructions(text, colorNames) {
  const general = [];
  const sections = {};
  let current = general;
  for (const line of String(text || "").split(LINE_BREAK)) {
    const colorName2 = headingColor(line, colorNames);
    if (!colorName2) {
      current.push(line);
      continue;
    }
    sections[colorName2] ||= [];
    current = sections[colorName2];
  }
  const colors = {};
  for (const colorName2 of colorNames) {
    colors[colorName2] = trimBlankLines((sections[colorName2] || []).join("\n"));
  }
  return { general: trimBlankLines(general.join("\n")), colors };
}
function joinInstructions(parts, colorNames) {
  const sections = colorNames.map((colorName2) => [colorName2, trimBlankLines(parts.colors[colorName2])]).filter(([, body]) => body).map(([colorName2, body]) => `## ${sectionTitle(colorName2)}

${body}`);
  const blocks = [trimBlankLines(parts.general), ...sections].filter(Boolean);
  return `${blocks.join("\n\n")}
`;
}

// src/plugin/CanvasBoardSettings.js
var import_path7 = __toESM(require("path"), 1);
function fitToText(field) {
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight + 2}px`;
}
function roleMeaning(name, role, meaning) {
  const isOwnMeaning = !role || role === "idle" && DEFAULT_WORKFLOW.roles[name] === "idle";
  return isOwnMeaning ? meaning : ROLE_MEANINGS[role];
}
var CanvasBoardSettings = class extends obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.skillFields = { general: null, colors: {} };
    this.displayHotkeys();
    this.displayBoard();
    this.displayWorkflow();
    this.displayPass();
    this.displayApm();
    this.displayApmTimes();
    this.displayLayoutAndView();
  }
  addTextSetting(name, description, key) {
    return new obsidian6.Setting(this.containerEl).setName(name).setDesc(description).addText(
      (component) => component.setPlaceholder(DEFAULTS2[key]).setValue(this.plugin.settings[key]).onChange(async (value) => {
        this.plugin.settings[key] = value.trim() || DEFAULTS2[key];
        await this.plugin.saveData(this.plugin.settings);
      })
    );
  }
  addHeading(name) {
    return new obsidian6.Setting(this.containerEl).setName(name).setHeading();
  }
  displayHotkeys() {
    const { containerEl } = this;
    new obsidian6.Setting(containerEl).setName("Hotkeys").setDesc(
      "Every canvas board command can have a key; buttons and menu items show it."
    ).addButton(
      (button) => button.setButtonText("Open hotkeys").onClick(() => {
        this.app.setting.openTabById("hotkeys");
        const tab = this.app.setting.activeTab;
        if (tab && tab.searchComponent) {
          tab.searchComponent.setValue(this.plugin.manifest.name);
          if (tab.setQuery) {
            tab.setQuery(this.plugin.manifest.name);
          }
        }
      })
    );
  }
  displayBoard() {
    const { containerEl } = this;
    this.addHeading("Board");
    new obsidian6.Setting(containerEl).setName("Starter board").setDesc(
      'A board with the color legend and first steps: the default board if it does not exist yet, else "Starter board.canvas".'
    ).addButton(
      (button) => button.setButtonText("Create").onClick(() => this.plugin.createStarterBoard())
    );
    this.addTextSetting(
      "Default board",
      'Board used by "Run pass" when the active tab is not a canvas, and by "Open the board" (ribbon).',
      "defaultBoard"
    );
    this.addTextSetting(
      "Card count warning",
      "The status bar card count turns to the warning color past this many cards (0: never).",
      "cardWarning"
    );
    this.addTextSetting(
      "Stale after (days)",
      'A yellow card whose note is untouched this many days gets a warning badge with its age; the roll-up adds "\xB7 Nd" from the same value (0: never).',
      "staleDays"
    );
    this.addTextSetting(
      "Agent notes folder",
      "Where the agent creates the notes and plan canvases for cards. Changing it does not move anything: rename the folder in Obsidian first, so links follow.",
      "notesFolder"
    );
    this.displayArchive();
  }
  displayArchive() {
    const { containerEl } = this;
    new obsidian6.Setting(containerEl).setName("Archive").setDesc(
      'Where "Archive selected cards" puts the notes: a "<board> archive" folder next to each board, or one folder for all boards. Changing it does not move notes already archived; restore works from any folder.'
    ).addDropdown(
      (dropdown) => dropdown.addOption("board", "Next to each board").addOption("global", "One folder for all boards").setValue(this.plugin.settings.archiveMode).onChange(async (value) => {
        this.plugin.settings.archiveMode = value;
        await this.plugin.saveData(this.plugin.settings);
        this.display();
      })
    );
    if (this.plugin.settings.archiveMode === "global") {
      this.addTextSetting(
        "Archive folder",
        "The folder for all boards' archive notes.",
        "archiveFolder"
      );
    }
  }
  displayWorkflow() {
    const { containerEl } = this;
    this.addHeading("Workflow").setDesc(
      'What each color does and its label, shown in tooltips, the filter pane and the color commands; under each, its part of the agent instructions. Toggle on: the color triggers the agent, so "Run pass" starts if the board has such a card and the agent takes those cards. All off: the agent never starts.'
    );
    this.displayAgentInstructions();
    const instructions = this.readSkillParts();
    this.addGeneralSkillField();
    const goColors = parseColors(this.plugin.settings.passColors);
    const workflow = resolve(this.plugin.settings);
    for (const { name, meaning } of WORKFLOW) {
      const colorNumber = COLOR_NUM[name];
      const row = new obsidian6.Setting(containerEl).setName(colorNumber ? name : "uncolored").setDesc(roleMeaning(name, workflow.roles[name], meaning));
      row.nameEl.prepend(
        createSpan({
          cls: "kanvas-board-dot kanvas-board-workflow-dot",
          attr: { style: this.plugin.dotStyle(colorNumber) }
        })
      );
      row.addText(
        (component) => component.setPlaceholder(
          COLORS2.find((color) => color.name === name).label
        ).setValue((this.plugin.settings.colorLabels || {})[name] || "").onChange((value) => this.plugin.setColorLabel(name, value.trim()))
      );
      if (colorNumber) {
        this.addRoleDropdown(row, name, workflow.roles[name]);
      }
      this.addWorkflowToggle(row, colorNumber, goColors);
      this.skillFields.colors[name] = this.addSkillField(
        instructions.colors[name],
        `Agent instructions: ${sectionTitle(name)}`
      );
    }
    this.watchSkillFields(this.plugin.skillPath());
    this.displayWorkflowRules(workflow);
  }
  // A color's role (config.ROLES): exactly one color is working, so choosing
  // working moves it here, and the working color cannot be left without one.
  addRoleDropdown(row, name, role) {
    row.addDropdown((dropdown) => {
      for (const each of ROLES) {
        dropdown.addOption(each, each);
      }
      dropdown.setValue(role).onChange(async (value) => {
        if (role === "working") {
          new obsidian6.Notice(
            "Kanvas board: one color must mean working. Set another color to working instead."
          );
          dropdown.setValue(role);
          return;
        }
        const roles = resolve(this.plugin.settings).roles;
        if (value === "working") {
          for (const other of Object.keys(roles)) {
            roles[other] = roles[other] === "working" ? "idle" : roles[other];
          }
        }
        roles[name] = value;
        await this.saveWorkflow({ roles });
        this.display();
      });
    });
  }
  async saveWorkflow(change) {
    const settings2 = this.plugin.settings;
    settings2.workflow = { ...settings2.workflow || {}, ...change };
    await this.plugin.saveData(settings2);
  }
  // Markers and templates: what check and the level read in the notes, and
  // the notes that set the shapes of agent-written cards and plan notes.
  displayWorkflowRules(workflow) {
    const { containerEl } = this;
    const markerFields = [
      ["question", "Question marker", "An open question: - [?] by default."],
      ["answer", "Answer marker", "User's answer: - [i] by default."],
      [
        "decisionsRecord",
        "Decisions Record heading",
        "Questions below it are answered and no longer count."
      ]
    ];
    for (const [key, name, description] of markerFields) {
      new obsidian6.Setting(containerEl).setName(name).setDesc(description).addText(
        (component) => component.setPlaceholder(DEFAULT_WORKFLOW.markers[key]).setValue(workflow.markers[key]).onChange(async (value) => {
          const markers = { ...workflow.markers };
          markers[key] = value.trim() || DEFAULT_WORKFLOW.markers[key];
          await this.saveWorkflow({ markers });
        })
      );
    }
    this.addTemplateSetting(workflow, {
      key: "cardTemplate",
      name: "Card template",
      description: "A note listing the shapes of the card text agents write, one per line ({word}: any text). Check holds agent-written cards to it."
    });
    this.addTemplateSetting(workflow, {
      key: "noteTemplate",
      name: "Plan note template",
      description: "A note with the frontmatter keys and headings of the notes agents write. Check holds those notes to it."
    });
    new obsidian6.Setting(containerEl).setName("Reset workflow").setDesc(
      "Roles, markers and template paths back to the defaults. The template notes and the agent instructions are kept."
    ).addButton(
      (button) => button.setButtonText("Reset").setWarning().onClick(async () => {
        delete this.plugin.settings.workflow;
        await this.plugin.saveData(this.plugin.settings);
        this.display();
      })
    );
  }
  addTemplateSetting(workflow, { key, name, description }) {
    new obsidian6.Setting(this.containerEl).setName(name).setDesc(
      `${description} Written from the plugin's default when missing; the agent instructions name it as {` + key + "}."
    ).addText(
      (component) => component.setPlaceholder(workflow[key]).setValue((this.plugin.settings.workflow || {})[key] || "").onChange(async (value) => {
        await this.saveWorkflow({ [key]: value.trim() });
        this.plugin.installTemplates();
      })
    );
  }
  // The general instructions and Reset, at the top of Workflow.
  displayAgentInstructions() {
    const { containerEl } = this;
    new obsidian6.Setting(containerEl).setName("Agent instructions").setDesc(
      `What the agent does on a pass: the general part below, then one part per color, under each color (the agent reads them all; the toggles decide which cards it works). Saved when a field loses focus, to ${this.plugin.skillRelativePath()} (the pass prompt points any agent at it). Written once from the plugin, then yours: plugin updates never overwrite it. Reset brings back the plugin's version.`
    ).addButton(
      (button) => button.setButtonText("Reset").setWarning().onClick(() => {
        this.plugin.resetSkill(
          import_path7.default.join(
            this.app.vault.adapter.basePath,
            this.plugin.manifest.dir
          )
        );
        this.display();
      })
    );
  }
  // On: cards of this color trigger the agent (setting passColors).
  addWorkflowToggle(row, colorNumber, goColors) {
    if (!colorNumber) {
      row.addToggle(
        (component) => (
          // uncolored never triggers the agent: same pill for the layout,
          // locked
          component.setTooltip("Never triggers the agent").setValue(false).setDisabled(true)
        )
      );
    } else {
      row.addToggle(
        (component) => component.setTooltip("Triggers the agent").setValue(goColors.has(colorNumber)).onChange(async (isOn) => {
          if (isOn) {
            goColors.add(colorNumber);
          } else {
            goColors.delete(colorNumber);
          }
          this.plugin.settings.passColors = WORKFLOW.map(
            ({ name: colorName2 }) => colorName2
          ).filter((colorName2) => goColors.has(COLOR_NUM[colorName2])).join(" ");
          await this.plugin.saveData(this.plugin.settings);
        })
      );
    }
  }
  displayPass() {
    const { containerEl } = this;
    this.addHeading("Pass");
    this.addTextSetting(
      "Agent command",
      "The agent CLI that runs the pass, e.g. codex, gemini -i {prompt}, opencode --prompt {prompt}. {prompt} is replaced by the pass prompt, else it goes last. Empty: Claude Code (~/.local/bin/claude if it exists, else claude on PATH).",
      "agentCommand"
    );
    this.addTextSetting(
      "Terminal command",
      "Starts the pass. Empty: Windows Terminal, macOS Terminal, or the first known terminal on Linux (gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, wezterm, foot, xterm). Otherwise {vault} and {board} are replaced and {agent} becomes the agent command with its prompt; quote parts with spaces.",
      "terminal"
    );
  }
  // The skill file split into its general part and one part per color
  // (see agentInstructions.js); read once per display.
  readSkillParts() {
    const colorNames = WORKFLOW.map(({ name: colorName2 }) => colorName2);
    this.skillText = this.readSkill(this.plugin.skillPath());
    this.skillParts = splitInstructions(
      this.skillText,
      colorNames
    );
    return this.skillParts;
  }
  // The general field, at the top of Workflow before the color rows.
  addGeneralSkillField() {
    const general = this.addSkillField(
      this.skillParts.general,
      "Agent instructions"
    );
    if (this.skillText === null) {
      general.placeholder = "No instructions file yet: Reset writes the plugin's version.";
    }
    this.skillFields.general = general;
  }
  // Any instructions field (general or a color's) saves the whole file.
  watchSkillFields(skillFile) {
    const colorNames = WORKFLOW.map(({ name: colorName2 }) => colorName2);
    const general = this.skillFields.general;
    const colorFields = this.skillFields.colors;
    const fields = [general, ...Object.values(colorFields)];
    for (const field of fields) {
      field.addEventListener("change", () => {
        const colors = {};
        for (const colorName2 of colorNames) {
          colors[colorName2] = colorFields[colorName2].value;
        }
        const joined = joinInstructions(
          { general: general.value, colors },
          colorNames
        );
        this.saveSkill(skillFile, joined);
      });
    }
  }
  readSkill(skillFile) {
    try {
      return import_fs4.default.readFileSync(skillFile, "utf8");
    } catch (error) {
      return null;
    }
  }
  // A textarea as tall as its text: it grows and shrinks while typing.
  addSkillField(value, label) {
    const field = this.containerEl.createEl("textarea", {
      cls: "kanvas-board-skill-editor",
      attr: { spellcheck: "false", rows: "1", "aria-label": label }
    });
    field.value = value;
    field.addEventListener("input", () => fitToText(field));
    window.setTimeout(() => fitToText(field), 0);
    return field;
  }
  saveSkill(skillFile, text) {
    try {
      import_fs4.default.mkdirSync(import_path7.default.dirname(skillFile), { recursive: true });
      import_fs4.default.writeFileSync(skillFile, text);
      new obsidian6.Notice("Kanvas board: agent instructions saved");
    } catch (error) {
      new obsidian6.Notice(
        `Kanvas board: could not save the agent instructions (${error.message})`
      );
    }
  }
  displayApm() {
    const { containerEl } = this;
    this.addHeading("APM counter").setDesc(
      "Canvas cards touched in a rolling window, in the status bar while a canvas is the active tab."
    );
    const apm = this.plugin.apm;
    const apmSettings = apm.settings;
    new obsidian6.Setting(containerEl).setName("Personal best").setDesc(
      apmSettings.pb ? `${apmSettings.pb} cards in ${apmSettings.windowMinutes} min${apmSettings.pbDate ? `, set ${apmSettings.pbDate}` : ""}.` : "None yet."
    ).addButton(
      (button) => button.setButtonText("Reset").setWarning().onClick(async () => {
        await apm.resetPb();
        this.display();
      })
    );
    new obsidian6.Setting(containerEl).setName("Window (minutes)").setDesc(
      "Cards are counted over this rolling window. Changing it resets the personal best: the numbers are not comparable."
    ).addText((component) => {
      component.setValue(String(apmSettings.windowMinutes));
      component.inputEl.addEventListener("change", async () => {
        const minutes = Number(component.getValue());
        if (!(minutes > 0) || minutes === apmSettings.windowMinutes) {
          return;
        }
        await apm.setWindow(minutes);
        this.display();
      });
    });
  }
  displayApmTimes() {
    const { containerEl } = this;
    const apm = this.plugin.apm;
    const apmSettings = apm.settings;
    new obsidian6.Setting(containerEl).setName("Alert below").setDesc(
      "Percent of the personal best under which the counter turns red and pulses. Not in the first window of a session."
    ).addSlider(
      (slider) => slider.setLimits(5, 50, 5).setValue(apmSettings.lowPercent).setDynamicTooltip().onChange(async (value) => {
        apmSettings.lowPercent = value;
        await this.plugin.saveData(this.plugin.settings);
        apm.refresh();
      })
    );
    new obsidian6.Setting(containerEl).setName("Idle after (minutes)").setDesc(
      "Without an action for this long, the alert stops and the counter dims. It also dims while Obsidian is not focused."
    ).addText(
      (component) => component.setValue(String(apmSettings.idleMinutes)).onChange(async (value) => {
        const minutes = Number(value);
        if (!(minutes > 0)) {
          return;
        }
        apmSettings.idleMinutes = minutes;
        await this.plugin.saveData(this.plugin.settings);
        apm.refresh();
      })
    );
  }
  displayLayoutAndView() {
    const { containerEl } = this;
    this.addHeading("Layout");
    new obsidian6.Setting(containerEl).setName("Layout direction").setDesc(
      'Tidy layout and agent-made plan canvases: the card a branch starts from comes first, following arrows in the fold direction ("depends on" prerequisites too). Shift-click the Tidy layout button, or commands "Tidy layout direction: \u2026", switch it on the fly.'
    ).addDropdown(
      (dropdown) => dropdown.addOptions({
        TB: "Top to bottom",
        LR: "Left to right",
        BT: "Bottom to top",
        RL: "Right to left"
      }).setValue(this.plugin.settings.layoutDirection).onChange((value) => this.plugin.setLayoutDirection(value))
    );
    this.addHeading("View");
    new obsidian6.Setting(containerEl).setName("Fold direction").setDesc(
      'Fold branch hides the cards the card points to (outgoing) or the cards pointing to it (incoming), and so on down the branch. Tidy layout reads branches the same way. Commands "Fold direction: \u2026" switch it on the fly.'
    ).addDropdown(
      (dropdown) => dropdown.addOptions({ out: "Outgoing", in: "Incoming" }).setValue(this.plugin.settings.foldDirection).onChange(async (value) => {
        this.plugin.settings.foldDirection = value;
        await this.plugin.saveData(this.plugin.settings);
      })
    );
    new obsidian6.Setting(containerEl).setName("Hide cards under hidden tags").setDesc(
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
var CanvasBoardSettings_default = CanvasBoardSettings;

// src/plugin/CanvasBoardPlugin.js
var import_fs5 = __toESM(require("fs"), 1);
var import_path8 = __toESM(require("path"), 1);

// src/plugin/boardView.js
var obsidian7 = __toESM(require("obsidian"), 1);
var INLINE_TAG = /(?:^|\s)#([^\s#.,;:!?()[\]{}"'`]+)/g;
var DIGITS_ONLY = /^\d+$/;
var FIRST_WIKILINK_TARGET = /\[\[([^\]|#]+)/;
var BoardView = class {
  // The view state if the canvas has one yet, else an empty one (not kept).
  peekViewState(canvas) {
    return this.views.get(canvas) || emptyViewState();
  }
  // Filter state of an open canvas, made on first use.
  viewState(canvas) {
    const existing = this.views.get(canvas);
    if (existing) {
      return existing;
    }
    const state = emptyViewState();
    this.views.set(canvas, state);
    const plugin = this;
    const original = canvas.updateSelection;
    canvas.updateSelection = function(callback) {
      const result = original.call(this, () => {
        callback();
        for (const selected of [...this.selection]) {
          if (state.hidden.has(selected.id) || selected.from && (state.hidden.has(selected.from.node.id) || state.hidden.has(selected.to.node.id))) {
            this.selection.delete(selected);
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
    return this.peekViewState(canvas).hidden.has(node.id);
  }
  // Clears the filter and unfolds every card (one undo step for the folds).
  showAll(canvas) {
    const state = this.peekViewState(canvas);
    state.xcolors.clear();
    state.xtags.clear();
    const folds = this.folds(canvas);
    if (folds.size) {
      this.setFolds(canvas, new Map([...folds.keys()].map((id) => [id, null])));
    } else {
      this.refreshView(canvas);
    }
  }
  // A fold is stored on the card as "canvasBoard": {"folded": "in" | "out"}
  // (the fold direction). JSON Canvas 1.0 has no such field; other readers
  // ignore it and show every card. Obsidian keeps it (node.unknownData).
  foldOf(node) {
    const boardData = node.getData().canvasBoard;
    return boardData && boardData.folded || null;
  }
  folds(canvas) {
    const folds = /* @__PURE__ */ new Map();
    for (const node of canvas.nodes.values()) {
      const direction = this.foldOf(node);
      if (direction) {
        folds.set(node.id, direction);
      }
    }
    return folds;
  }
  // `changes`: card id → direction to fold, or null to unfold. One canvas edit,
  // one undo step.
  setFolds(canvas, changes) {
    if (!changes.size) {
      return;
    }
    const canvasData = canvas.getData();
    for (const node of canvasData.nodes) {
      if (!changes.has(node.id)) {
        continue;
      }
      const boardData = { ...node.canvasBoard || {} };
      const direction = changes.get(node.id);
      if (direction) {
        boardData.folded = direction;
      } else {
        delete boardData.folded;
      }
      if (Object.keys(boardData).length) {
        node.canvasBoard = boardData;
      } else {
        delete node.canvasBoard;
      }
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
  // Card id → ids one edge away, following edges out (from → to) or in (to →
  // from).
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
    return branchLevelsFrom(this.branchLinks(canvas, direction), root);
  }
  // The cards an unfold on `id` applies to: the card itself if folded, else the
  // nearest folded cards of its open branch (in the fold direction, not past
  // another fold), so pressing unfold again opens the next level.
  unfoldTargets(canvas, id) {
    const node = canvas.nodes.get(id);
    if (!node) {
      return [];
    }
    if (this.foldOf(node)) {
      return [id];
    }
    const links = this.branchLinks(canvas, this.settings.foldDirection);
    const isFolded = (each) => {
      const eachNode = canvas.nodes.get(each);
      return Boolean(eachNode && this.foldOf(eachNode));
    };
    const seen = /* @__PURE__ */ new Set([id]);
    function isNew(each) {
      return !seen.has(each) && Boolean(seen.add(each));
    }
    const found = [];
    let level = [id];
    while (level.length) {
      const next = level.flatMap((each) => links.get(each) || []).filter(isNew);
      found.push(...next.filter(isFolded));
      level = next.filter((each) => !isFolded(each));
    }
    return found;
  }
  // Shows `levels` levels of each folded branch; the cards at the last shown
  // level that lead further get folded.
  unfold(canvas, ids, levels) {
    const changes = /* @__PURE__ */ new Map();
    for (const id of ids) {
      const node = canvas.nodes.get(id);
      const direction = node && this.foldOf(node);
      if (!direction) {
        continue;
      }
      changes.set(id, null);
      const below = this.branchLevels(canvas, id, direction);
      const links = this.branchLinks(canvas, direction);
      const lastShown = levels < below.length ? below[levels - 1] : [];
      const leadingFurther = lastShown.filter(
        (each) => (links.get(each) || []).length
      );
      for (const each of leadingFurther) {
        changes.set(each, direction);
      }
    }
    this.setFolds(canvas, changes);
  }
  // Tags of a card (no #): the `#tags` in its own text, never those of the
  // notes it links. Exact match only: #tag1 is not #tag10.
  cardTagSet(node) {
    const tags = /* @__PURE__ */ new Set();
    for (const match of (node.getData().text || "").matchAll(INLINE_TAG)) {
      if (!DIGITS_ONLY.test(match[1])) {
        tags.add(match[1]);
      }
    }
    return tags;
  }
  // Every color and tag shows by default; a hidden color, or any hidden tag,
  // hides the card.
  matches(node, state) {
    if (state.xcolors.has(node.getData().color || "")) {
      return false;
    }
    if (!state.xtags.size) {
      return true;
    }
    const tags = this.cardTagSet(node);
    return ![...state.xtags].some((tag) => tags.has(tag));
  }
  filtering(state) {
    return !!(state.xcolors.size || state.xtags.size);
  }
  // Hidden = not matching the filter (groups always show), or below a folded
  // card. With the setting "Hide cards under hidden tags", a card hidden by a
  // tag also hides its branch, as a fold in the fold direction would.
  refreshView(canvas) {
    const state = this.viewState(canvas);
    const hidden = /* @__PURE__ */ new Set([
      ...this.hiddenByFilter(canvas, state),
      ...this.hiddenByTagBranches(canvas, state)
    ]);
    const folded = /* @__PURE__ */ new Map();
    for (const [root, direction] of this.folds(canvas)) {
      const below = this.branchLevels(canvas, root, direction).flat();
      folded.set(root, below.length);
      for (const id of below) {
        hidden.add(id);
      }
    }
    state.hidden = hidden;
    this.paint(canvas, hidden, folded);
    if ([...canvas.selection].some((selected) => hidden.has(selected.id))) {
      canvas.updateSelection(() => {
      });
    }
    if (canvas === this.activeCanvas()) {
      this.updateViewLabel(canvas);
    }
    const pane = this.panes.get(canvas);
    if (pane) {
      pane.update();
    }
  }
  hiddenByFilter(canvas, state) {
    if (!this.filtering(state)) {
      return [];
    }
    return [...canvas.nodes.values()].filter((node) => node.getData().type !== "group").filter((node) => !this.matches(node, state)).map((node) => node.id);
  }
  hiddenByTagBranches(canvas, state) {
    if (!state.xtags.size || !this.settings.hideTagBranches) {
      return [];
    }
    function isCard(id) {
      return canvas.nodes.get(id) && canvas.nodes.get(id).getData().type !== "group";
    }
    const tagged = [...canvas.nodes.values()].filter((node) => {
      const tags = this.cardTagSet(node);
      return [...state.xtags].some((tag) => tags.has(tag));
    });
    return tagged.flatMap(
      (node) => this.branchLevels(canvas, node.id, this.settings.foldDirection).flat().filter(isCard)
    );
  }
  // Hides the `hidden` cards and their edges; `folded` (id → count) gets the "·
  // N folded" badge, a click on it unfolds one level.
  paint(canvas, hidden, folded) {
    for (const node of canvas.nodes.values()) {
      node.nodeEl.toggleClass("kanvas-board-hidden", hidden.has(node.id));
      this.paintFoldBadge(canvas, node, folded.get(node.id));
    }
    this.paintStale(canvas);
    for (const edge of canvas.edges.values()) {
      const isOff = hidden.has(edge.from.node.id) || hidden.has(edge.to.node.id);
      const elements = [
        edge.lineGroupEl,
        edge.lineEndGroupEl,
        edge.labelElement && edge.labelElement.wrapperEl
      ].filter(Boolean);
      for (const element of elements) {
        element.classList.toggle("kanvas-board-hidden", isOff);
      }
    }
  }
  // count: cards folded under the node, undefined when it is not folded.
  paintFoldBadge(canvas, node, count) {
    let badge = node.nodeEl.querySelector(":scope > .kanvas-board-folded");
    if (count === void 0) {
      if (badge) {
        badge.remove();
      }
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: "kanvas-board-folded",
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
    badge.setText(`\xB7 ${count} folded`);
    badge.setAttr("aria-label", this.keyedLabel("Unfold 1 level", "unfold"));
  }
  // Review cards (yellow by default, Settings > Workflow roles) whose note was
  // not touched for "Stale after" days:
  // a warning badge (the icon of `- [!]`) with the time since the note last
  // changed. Cards without a note have no date: no badge.
  paintStale(canvas) {
    const days = Number(this.settings.staleDays) || 0;
    const { review } = resolve(this.settings);
    const board = canvas.view && canvas.view.file ? canvas.view.file.path : "";
    for (const node of canvas.nodes.values()) {
      const nodeData = node.getData();
      const isWaiting = days > 0 && review.includes(nodeData.color);
      const age = isWaiting ? this.noteAgeDays(nodeData, board) : -1;
      this.paintStaleBadge(node, { age, days });
    }
  }
  // Days since the card's note (its file, or its first link) last changed;
  // -1 without a note.
  noteAgeDays(nodeData, board) {
    const match = nodeData.type === "text" && FIRST_WIKILINK_TARGET.exec(nodeData.text || "");
    const file = nodeData.type === "file" ? this.app.vault.getAbstractFileByPath(nodeData.file) : match && this.app.metadataCache.getFirstLinkpathDest(match[1].trim(), board);
    if (!file || !file.stat) {
      return -1;
    }
    return Math.floor((Date.now() - file.stat.mtime) / 864e5);
  }
  paintStaleBadge(node, { age, days }) {
    let badge = node.nodeEl.querySelector(":scope > .kanvas-board-stale");
    if (age < days || age < 0) {
      if (badge) {
        badge.remove();
      }
      return;
    }
    if (!badge) {
      badge = node.nodeEl.createDiv({
        cls: "kanvas-board-stale",
        attr: { "data-tooltip-position": "top" }
      });
      obsidian7.setIcon(
        badge.createSpan({ cls: "kanvas-board-stale-icon" }),
        "triangle-alert"
      );
      badge.createSpan({ cls: "kanvas-board-stale-text" });
    }
    const label = age < 1 ? "today" : `${age}d`;
    if (badge.dataset.age === label) {
      return;
    }
    badge.dataset.age = label;
    badge.querySelector(".kanvas-board-stale-text").setText(label);
    const unit = `day${age === 1 ? "" : "s"}`;
    badge.setAttr(
      "aria-label",
      `Waiting on you \xB7 note untouched for ${age} ${unit} (stale after ${days})`
    );
  }
  // Status bar and closed pane: only how many cards are hidden (filter and
  // folds); the pane says by what.
  viewLabel(canvas) {
    const hiddenCount = this.peekViewState(canvas).hidden.size;
    return hiddenCount ? `${hiddenCount} card${hiddenCount > 1 ? "s" : ""} hidden` : "";
  }
  updateViewLabel(canvas) {
    const label = canvas ? this.viewLabel(canvas) : "";
    this.viewEl.setText(label);
    this.viewEl.toggle(!!label);
  }
  cardText(node) {
    const nodeData = node.getData();
    return String(
      (nodeData.type === "text" ? nodeData.text : nodeData.type === "file" ? nodeData.file : nodeData.type === "link" ? nodeData.url : nodeData.label) || ""
    );
  }
  // Background of a color dot: a preset canvas color ('1'…'6'), a custom hex,
  // or none.
  dotStyle(color) {
    return !color ? "" : `background: ${color.startsWith("#") ? color : `var(--canvas-color-${color})`}`;
  }
};
function mixBoardView(targetClass) {
  for (const name of Object.getOwnPropertyNames(BoardView.prototype)) {
    if (name === "constructor") {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(
      BoardView.prototype,
      name
    );
    Object.defineProperty(targetClass.prototype, name, descriptor);
  }
}

// src/plugin/CanvasBoardPlugin.js
var CANVAS_COLOR_CLASS = /mod-canvas-color-(\d)/;
var CANVAS_WIKILINKS = /\[\[([^\]|#]+\.canvas)/g;
var CANVAS_WIKILINK = /\[\[([^\]|#]+\.canvas)/;
var FIRST_WIKILINK_TARGET2 = /\[\[([^\]|#]+)/;
var CONTROL_BUTTONS = [
  { id: "find", label: "Search current canvas", icon: "search" },
  { id: "filter", label: "Filter cards", icon: "filter" },
  { id: "tidy-layout", label: "Tidy layout", icon: "network" }
];
var CanvasBoardPlugin = class extends obsidian8.Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS2, await this.loadData());
    this.migrateClaudePath();
    this.addSettingTab(new CanvasBoardSettings_default(this.app, this));
    const pluginDir = import_path8.default.join(
      this.app.vault.adapter.basePath,
      this.manifest.dir
    );
    this.boardLibrary = boardLibrary;
    this.apm = startApmCounter(this, pluginDir);
    this.api = createApi(this);
    this.installSkill(pluginDir);
    this.installTemplates();
    this.addCommand({
      id: "reset-skill",
      name: "Reset agent skill to the plugin's version (overwrites your edits)",
      callback: () => this.resetSkill(pluginDir)
    });
    this.views = /* @__PURE__ */ new WeakMap();
    this.panes = /* @__PURE__ */ new Map();
    this.finds = /* @__PURE__ */ new Map();
    this.actions = [];
    for (const register of groups) {
      register(this);
    }
    this.startStatusBar();
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.tick())
    );
    this.registerInterval(window.setInterval(() => this.tick(), 2e3));
    this.tick();
    this.register(() => this.clearScreens());
  }
  // Command pattern: each action is { id, menu, test, run }, run from the
  // palette, a hotkey, a right-click item or a toolbar button.
  // Refactor and archive commands: one undo step each (Ctrl+Z), same code as
  // canvas.js for agents. Each is also a right-click item on the cards it
  // applies to: `menu` is { title, icon } (Lucide), or null for none.
  addCanvasCommand(id, name, { menu, test, run }) {
    this.actions.push({ id, menu, test, run });
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        const canvas = this.activeCanvas();
        if (!canvas || !test(canvas, [...canvas.selection])) {
          return false;
        }
        if (!checking) {
          this.runAction(run, canvas, [...canvas.selection]);
        }
        return true;
      }
    });
  }
  runAction(run, canvas, selection) {
    return Promise.resolve(run(canvas, selection)).catch(
      (error) => new obsidian8.Notice(`Kanvas board: ${error.message}`)
    );
  }
  addActionItems(menu, canvas, selection) {
    const shown = this.actions.filter(
      (action) => action.menu && action.test(canvas, selection)
    );
    for (const action of shown) {
      menu.addItem(
        (item) => item.setTitle(this.keyedTitle(action.menu.title, action.id)).setIcon(action.menu.icon).setSection("kanvas-board").onClick(() => this.runAction(action.run, canvas, selection))
      );
    }
  }
  // The selection grows to the visible cards that `keep` accepts (hidden
  // cards never stay selected); the selected cards stay selected.
  selectMore(canvas, selection, keep) {
    const added = [...canvas.nodes.values()].filter(
      (node) => node.getData().type !== "group" && !this.isHidden(canvas, node) && keep(node)
    );
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of [...selection, ...added]) {
        canvas.selection.add(node);
      }
    });
    return added.length;
  }
  // Card count of the active canvas in the status bar: boards get hard to
  // manage past a threshold. Next to it, the active filter and folds; click
  // to change them.
  startStatusBar() {
    this.countEl = this.addStatusBarItem();
    this.viewEl = this.addStatusBarItem();
    this.viewEl.addClass("mod-clickable");
    this.viewEl.onClickEvent(() => {
      const canvas = this.activeCanvas();
      if (canvas) {
        this.pane(canvas).toggle(true);
      }
    });
  }
  // Cards that come into view or are added get the classes again. Every open
  // canvas has its filter pane; closed canvases lose theirs.
  tick() {
    this.updateCount();
    const open = /* @__PURE__ */ new Set();
    for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
      const canvas = leaf.view.canvas;
      if (!canvas || !canvas.wrapperEl) {
        continue;
      }
      open.add(canvas);
      this.decorate(leaf.view);
      this.refreshView(canvas);
      this.pane(canvas).update();
    }
    for (const widgets of [this.panes, this.finds]) {
      const closed = [...widgets].filter(([canvas]) => !open.has(canvas));
      for (const [canvas, widget] of closed) {
        widget.destroy();
        widgets.delete(canvas);
      }
    }
  }
  // On unload: folds stay in the file, only the screen is cleared.
  clearScreens() {
    for (const widget of [...this.panes.values(), ...this.finds.values()]) {
      widget.destroy();
    }
    this.panes.clear();
    this.finds.clear();
    for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
      const canvas = leaf.view.canvas;
      this.undecorate(leaf.view);
      if (!this.views.has(canvas)) {
        continue;
      }
      delete canvas.updateSelection;
      delete canvas.applyHistory;
      this.paint(canvas, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Map());
    }
  }
  // Control bar and selection toolbar are undocumented canvas DOM
  // (.canvas-controls, canvas.menu.render), like folds and the filter pane: an
  // Obsidian update may drop those buttons, the commands stay. Header action
  // and ribbon icon are documented API. See "Obsidian internals" in README.md.
  // Label of a color: the one edited in Settings > Workflow, else the default.
  colorLabel(name) {
    return (this.settings.colorLabels || {})[name] || COLORS2.find((colorRow) => colorRow.name === name).label;
  }
  colorCommandName(name) {
    return `Color selected cards: ${name} (${this.colorLabel(name)})`;
  }
  // An edited label also renames its command in the palette and the hotkey
  // list. The id, and so the key, stays.
  async setColorLabel(name, label) {
    const labels = this.settings.colorLabels = {
      ...this.settings.colorLabels
    };
    if (label) {
      labels[name] = label;
    } else {
      delete labels[name];
    }
    await this.saveData(this.settings);
    const row = COLORS2.find((colorRow) => colorRow.name === name);
    const colorCommand = this.app.commands && this.app.commands.commands[`${this.manifest.id}:color-${row.commandKey}`];
    const commandName = this.colorCommandName(name);
    if (colorCommand) {
      colorCommand.name = `${this.manifest.name}: ${commandName}`;
    }
    for (const canvas of this.panes.keys()) {
      this.refreshView(canvas);
    }
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
  // Tooltip with its key, the way the canvas's own buttons show it ("Zoom to
  // selection\n(Shift + 2)").
  keyedLabel(label, id) {
    const hotkey = this.hotkey(id);
    return hotkey ? `${label}
(${hotkey})` : label;
  }
  // Menu item title with its key, muted, after the label.
  keyedTitle(label, id) {
    const hotkey = this.hotkey(id);
    if (!hotkey) {
      return label;
    }
    return createFragment((fragment) => {
      fragment.appendText(label);
      fragment.createSpan({ cls: "kanvas-board-key", text: hotkey });
    });
  }
  // A notice with an Undo button: one canvas undo step and the files the action
  // made go to the trash. Only while the board has not changed since (else the
  // undo would take back something else). `restore` ({ path, content }) brings
  // a trashed file back on undo (unpack). Redirected links are not undone.
  undoNotice(canvas, message, { files = [], restore = null } = {}) {
    const history = canvas.history;
    const historyIndex = history ? history.current : null;
    const noticeContent = createFragment((fragment) => {
      fragment.appendText(`Kanvas board: ${message} `);
      const button = fragment.createEl("button", {
        cls: "kanvas-board-notice-undo",
        text: "Undo"
      });
      button.addEventListener("click", async () => {
        if (!history || history.current !== historyIndex) {
          new obsidian8.Notice(
            "Kanvas board: the board changed since, use Ctrl+Z"
          );
          return;
        }
        canvas.undo();
        for (const filePath of files) {
          const file = this.app.vault.getAbstractFileByPath(filePath);
          if (file) {
            await this.app.fileManager.trashFile(file);
          }
        }
        if (restore && !this.app.vault.getAbstractFileByPath(restore.path)) {
          await this.app.vault.create(restore.path, restore.content);
        }
      });
    });
    new obsidian8.Notice(noticeContent, 8e3);
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
      new obsidian8.Notice(
        createFragment((fragment) => {
          fragment.appendText(
            `Kanvas board: ${board} not found (setting "Default board"). `
          );
          const button = fragment.createEl("button", {
            cls: "kanvas-board-notice-undo",
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
  createStarterBoard() {
    return createStarterBoard(this);
  }
  async setLayoutDirection(direction) {
    this.settings.layoutDirection = direction;
    await this.saveData(this.settings);
    for (const leaf of this.app.workspace.getLeavesOfType("canvas")) {
      this.decorate(leaf.view);
    }
    new obsidian8.Notice(
      `Kanvas board: tidy layout ${LAYOUT_DIRS[direction].name}`
    );
  }
  cycleLayoutDirection() {
    const dirs = Object.keys(LAYOUT_DIRS);
    return this.setLayoutDirection(
      dirs[(dirs.indexOf(this.settings.layoutDirection) + 1) % dirs.length]
    );
  }
  // Runs a plugin command on this canvas view (made active first: a click on
  // its buttons may not focus it).
  runOn(view, id) {
    const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view === view);
    if (leaf && this.app.workspace.activeLeaf !== leaf) {
      this.app.workspace.setActiveLeaf(leaf, { focus: true });
    }
    this.app.commands.executeCommandById(`${this.manifest.id}:${id}`);
  }
  // Buttons on a canvas view, added once (tick runs every 2 s and adds back
  // what the canvas redrew away).
  decorate(view) {
    this.decorateHeader(view);
    const controls = view.canvas.wrapperEl && view.canvas.wrapperEl.querySelector(".canvas-controls");
    if (controls) {
      this.decorateControls(view, controls);
    }
    this.decorateSelectionToolbar(view.canvas);
  }
  // View header: Run pass, a command about the whole board.
  decorateHeader(view) {
    if (!view.canvasBoardAction && view.addAction) {
      view.canvasBoardAction = view.addAction(
        "play",
        "Run pass",
        () => this.runPass()
      );
    }
    if (!view.canvasBoardAction) {
      return;
    }
    view.canvasBoardAction.setAttr(
      "aria-label",
      this.keyedLabel("Run pass", "run-pass")
    );
  }
  // Control bar (top right): Search, Filter, Tidy layout, above Canvas help.
  decorateControls(view, controls) {
    const group = controls.querySelector(".kanvas-board-controls") || this.addControlGroup(view, controls);
    for (const button of group.children) {
      button.setAttr(
        "aria-label",
        this.keyedLabel(button.dataset.label, button.dataset.command)
      );
    }
    const tidy = group.querySelector('[data-command="tidy-layout"]');
    if (tidy) {
      this.decorateTidyButton(tidy);
    }
  }
  addControlGroup(view, controls) {
    const group = createDiv({
      cls: "canvas-control-group mod-raised kanvas-board-controls"
    });
    controls.insertBefore(group, controls.lastElementChild);
    for (const { id, label, icon } of CONTROL_BUTTONS) {
      const button = group.createDiv({
        cls: "canvas-control-item",
        attr: {
          "data-command": id,
          "data-label": label,
          "data-tooltip-position": "left"
        }
      });
      obsidian8.setIcon(button, icon);
      button.addEventListener("click", (event) => {
        const isNextDirection = id === "tidy-layout" && event.shiftKey;
        if (isNextDirection) {
          this.cycleLayoutDirection();
        } else {
          this.runOn(view, id);
        }
      });
    }
    return group;
  }
  // The tidy icon points the way the layout flows; its tooltip says so and
  // how to change it.
  decorateTidyButton(tidy) {
    const direction = LAYOUT_DIRS[this.settings.layoutDirection] || LAYOUT_DIRS.TB;
    this.tidyTurn = nextTurn(
      this.tidyTurn ?? direction.turn,
      direction.turn
    );
    tidy.style.setProperty("--kanvas-board-tidy-turn", `${this.tidyTurn}deg`);
    tidy.setAttr(
      "aria-label",
      this.keyedLabel(
        `Tidy layout: ${direction.name}
Shift-click: next direction`,
        "tidy-layout"
      )
    );
  }
  // Decorator: the canvas's menu.render is wrapped, not replaced.
  // Selection toolbar: Fold, Unfold, Archive after the canvas's own buttons,
  // when they apply.
  decorateSelectionToolbar(canvas) {
    const menu = canvas.menu;
    if (!menu || !menu.render || menu.canvasBoardRender) {
      return;
    }
    const original = menu.canvasBoardRender = menu.render;
    const plugin = this;
    menu.render = function(...values) {
      const result = original.apply(this, values);
      try {
        plugin.menuButtons(canvas);
      } catch (error) {
        console.error("kanvas-board: selection toolbar", error);
      }
      return result;
    };
    menu.canvasBoardObserver = new MutationObserver(
      () => this.labelColorSwatches(menu.menuEl)
    );
    menu.canvasBoardObserver.observe(menu.menuEl, {
      childList: true,
      subtree: true
    });
  }
  labelColorSwatches(menuEl) {
    const swatches = menuEl.querySelectorAll(
      ".canvas-color-picker-item:not(.canvas-color-picker-custom)"
    );
    for (const item of swatches) {
      const color = (item.className.match(CANVAS_COLOR_CLASS) || [])[1] || "";
      const row = COLORS2.find(
        (colorRow) => colorRow.canvasColor === color
      );
      if (!row) {
        continue;
      }
      item.setAttrs({
        "aria-label": this.keyedLabel(
          this.colorLabel(row.name),
          `color-${row.commandKey}`
        ),
        "data-tooltip-position": "top"
      });
    }
  }
  menuButtons(canvas) {
    const element = canvas.menu.menuEl;
    const selection = [...canvas.selection];
    if (!selection.length || !element.childElementCount || element.querySelector(".kanvas-board-menu-btn")) {
      return;
    }
    for (const id of ["fold", "unfold", "archive"]) {
      const action = this.actions.find((candidate) => candidate.id === id);
      if (!action || !action.test(canvas, selection)) {
        continue;
      }
      const button = element.createEl("button", {
        cls: "clickable-icon kanvas-board-menu-btn",
        attr: {
          "aria-label": this.keyedLabel(action.menu.title, id),
          "data-tooltip-position": "top"
        }
      });
      obsidian8.setIcon(button, action.menu.icon);
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
        ".kanvas-board-controls, .kanvas-board-menu-btn"
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
  // Template cards are centered on the visible canvas, whatever is selected;
  // they end up selected.
  async insertTemplate(canvas, file) {
    const template = JSON.parse(await this.app.vault.read(file));
    const nodes = template.nodes || [];
    const viewport = canvas.getViewportBBox();
    const width = nodes.length ? Math.max(...nodes.map((node) => node.x + node.width)) - Math.min(...nodes.map((node) => node.x)) : 0;
    const height = nodes.length ? Math.max(...nodes.map((node) => node.y + node.height)) - Math.min(...nodes.map((node) => node.y)) : 0;
    const origin = {
      x: Math.round((viewport.minX + viewport.maxX - width) / 2),
      y: Math.round((viewport.minY + viewport.maxY - height) / 2)
    };
    const operations = this.boardLibrary.templateOps(template, origin);
    this.edit(canvas, operations);
    const added = operations.filter((operation) => operation.op === "add").map((operation) => canvas.nodes.get(operation.node.id)).filter(Boolean);
    canvas.updateSelection(() => {
      canvas.selection.clear();
      for (const node of added) {
        canvas.selection.add(node);
      }
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
      const colorName2 = names[node.color || ""] || "custom";
      byColor[colorName2] = (byColor[colorName2] || 0) + 1;
    }
    const max = Number(this.settings.cardWarning) || 0;
    const isOverLimit = max > 0 && cards.length > max;
    const selectedCount = [...canvas.selection].filter(
      (item) => !item.from
    ).length;
    this.countEl.empty();
    this.countEl.createSpan({
      text: `${cards.length} cards`,
      cls: isOverLimit ? "kanvas-board-over" : ""
    });
    if (selectedCount) {
      this.countEl.appendText(` \xB7 ${selectedCount} selected`);
    }
    this.countEl.setAttr(
      "aria-label",
      (isOverLimit ? `over ${max} \xB7 ` : "") + Object.entries(byColor).map(([colorName2, count]) => `${colorName2} ${count}`).join(" \xB7 ")
    );
    this.countEl.setAttr("data-tooltip-position", "top");
    this.countEl.show();
  }
  // Before "Agent command", the setting only held the Claude Code binary.
  migrateClaudePath() {
    if (!("claudePath" in this.settings)) {
      return;
    }
    if (this.settings.claudePath && !this.settings.agentCommand) {
      this.settings.agentCommand = `"${this.settings.claudePath}"`;
    }
    delete this.settings.claudePath;
  }
  // The plugin folder holds the skill's default (skill/SKILL.md) and the user's
  // copy (agent-instructions.md, git-ignored: a pull never overwrites it),
  // written only when missing or on "Reset agent skill".
  skillRelativePath() {
    return `${this.manifest.dir}/agent-instructions.md`;
  }
  skillPath() {
    return import_path8.default.join(this.app.vault.adapter.basePath, this.skillRelativePath());
  }
  // Older versions kept the user's copy in .claude/skills/<id>/SKILL.md.
  legacySkillPath() {
    const vaultRoot = this.app.vault.adapter.basePath;
    const skills = import_path8.default.join(vaultRoot, ".claude", "skills");
    return ["kanvas-board", "canvas-board"].map((name) => import_path8.default.join(skills, name, "SKILL.md")).find((candidate) => import_fs5.default.existsSync(candidate));
  }
  installSkill(pluginDir) {
    try {
      if (import_fs5.default.existsSync(this.skillPath())) {
        return;
      }
      const legacy = this.legacySkillPath();
      if (legacy) {
        return import_fs5.default.copyFileSync(legacy, this.skillPath());
      }
      this.copySkill(pluginDir);
    } catch (error) {
      console.error("kanvas-board: skill sync failed", error);
    }
  }
  resetSkill(pluginDir) {
    try {
      this.copySkill(pluginDir);
      new obsidian8.Notice(
        "Kanvas board: agent skill reset to the plugin's version"
      );
    } catch (error) {
      console.error("kanvas-board: skill sync failed", error);
      new obsidian8.Notice(
        `Kanvas board: skill reset failed (${error.message})`
      );
    }
  }
  // The card and plan-note templates (Settings > Workflow) are vault notes:
  // written from the plugin's defaults when missing, then the user's.
  installTemplates() {
    const workflow = resolve(this.settings);
    const templates = [
      [workflow.cardTemplate, CARD_TEMPLATE],
      [workflow.noteTemplate, NOTE_TEMPLATE]
    ];
    const missing = templates.map(([relativePath, text]) => [
      import_path8.default.join(this.app.vault.adapter.basePath, relativePath),
      text
    ]).filter(([file]) => !import_fs5.default.existsSync(file));
    for (const [file, text] of missing) {
      try {
        import_fs5.default.mkdirSync(import_path8.default.dirname(file), { recursive: true });
        import_fs5.default.writeFileSync(file, text);
      } catch (error) {
        console.error("kanvas-board: template install failed", error);
      }
    }
  }
  // What a pass reads: the agent instructions with their {placeholders}
  // filled in from the workflow settings, written next to them when the pass
  // starts (pass-instructions.md, git-ignored). Without instructions the pass
  // points at the missing file, as before.
  writePassInstructions() {
    const relativePath = `${this.manifest.dir}/pass-instructions.md`;
    try {
      const text = import_fs5.default.readFileSync(this.skillPath(), "utf8");
      const filled = fillPlaceholders(
        text,
        resolve(this.settings)
      );
      import_fs5.default.writeFileSync(
        import_path8.default.join(this.app.vault.adapter.basePath, relativePath),
        filled
      );
      return relativePath;
    } catch (error) {
      console.error("kanvas-board: pass instructions not written", error);
      return this.skillRelativePath();
    }
  }
  copySkill(pluginDir) {
    const skillTarget = this.skillPath();
    import_fs5.default.mkdirSync(import_path8.default.dirname(skillTarget), { recursive: true });
    import_fs5.default.copyFileSync(
      import_path8.default.join(pluginDir, "skill", "SKILL.md"),
      skillTarget
    );
  }
  // One undo step: the state before is pushed (unless the history already ends
  // with it), then the edited data is set, which pushes it, so Ctrl+Z and
  // Ctrl+Y each take one step. `canvasData` is passed when the caller already
  // changed it (extract).
  edit(canvas, operations, canvasData = canvas.getData()) {
    const before = canvas.getData();
    const retyped = this.boardLibrary.applyOps(canvasData, operations);
    const history = canvas.history;
    const last = history && history.data && history.data[history.current];
    function same(data) {
      return JSON.stringify(
        data,
        (key, value) => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort()) : value
      );
    }
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
  freePath(folder, name, extension) {
    for (let attempt = 1; ; attempt++) {
      const suffix = attempt > 1 ? ` ${attempt}` : "";
      const candidate = `${folder}${name}${suffix}${extension}`;
      if (!this.app.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }
  }
  subcanvasLinks(file, canvas, skipId) {
    return subcanvasLinks(this, file, { canvas, skipId });
  }
  canvasFile(canvas) {
    const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view.canvas === canvas);
    return leaf && leaf.view.file ? leaf.view.file.path : null;
  }
  // mode: dissolve (file to trash, other links break), copy (file kept), group
  // (cards in a group named after the file, other links redirected: cards on
  // this board get an edge to the group, other cards and notes link this
  // board).
  unpack(canvas, node, { file, mode, links }) {
    return unpackSubcanvas(this, canvas, { node, file, mode, links });
  }
  linkedCanvas(node) {
    const nodeData = node.getData();
    const target = nodeData.type === "file" ? nodeData.file : ((nodeData.text || "").match(CANVAS_WIKILINK) || [])[1];
    if (!target || !target.endsWith(".canvas")) {
      return null;
    }
    return this.app.vault.getAbstractFileByPath(target) || this.app.metadataCache.getFirstLinkpathDest(target.trim(), "");
  }
  cardEditor(node) {
    const child = node.child;
    return child && (child.editMode && child.editMode.editor || child.editor) || null;
  }
  // Context of the note a card links (its `context:` list), so its archive note
  // keeps the same context.
  cardContexts(node, board) {
    const nodeData = node.getData();
    const target = nodeData.type === "file" ? nodeData.file : ((nodeData.text || "").match(FIRST_WIKILINK_TARGET2) || [])[1];
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
    if (!file) {
      throw new Error(`board ${board} not found`);
    }
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
    new obsidian8.Notice(`Kanvas board: card restored on ${file.path}`);
  }
  openCanvas(board) {
    const leaf = this.app.workspace.getLeavesOfType("canvas").find((leaf2) => leaf2.view.file && leaf2.view.file.path === board);
    return leaf ? leaf.view.canvas : null;
  }
  activeCanvas() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.getViewType() === "canvas" ? view.canvas : null;
  }
  // True if the board, or a plan canvas linked from one of its cards, has a
  // card in `goColorSet` (setting "Workflow").
  async hasGoCards(board, goColorSet) {
    const read = async (filePath) => {
      const file = this.app.vault.getAbstractFileByPath(filePath);
      const canvasData = file && parseOrNull(await this.app.vault.cachedRead(file));
      return canvasData && canvasData.nodes || [];
    };
    function isGo(node) {
      return goColorSet.has(node.color);
    }
    const open = this.openCanvas(board);
    const nodes = open ? open.getData().nodes : await read(board);
    if (nodes.some(isGo)) {
      return true;
    }
    const linkedCanvases = nodes.flatMap((node) => [
      ...(node.text || "").matchAll(CANVAS_WIKILINKS)
    ]);
    for (const match of linkedCanvases) {
      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        match[1].trim(),
        board
      );
      if (linkedFile && (await read(linkedFile.path)).some(isGo)) {
        return true;
      }
    }
    return false;
  }
  async runPass() {
    const vault = this.app.vault.adapter.basePath;
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    const board = view && view.getViewType() === "canvas" && view.file ? view.file.path : this.settings.defaultBoard;
    const goColorSet = parseColors(this.settings.passColors);
    if (!goColorSet.size) {
      return this.noticeNoGoColor();
    }
    if (!await this.hasGoCards(board, goColorSet)) {
      const names = Object.keys(COLOR_NUM).filter(
        (colorName2) => goColorSet.has(COLOR_NUM[colorName2])
      );
      new obsidian8.Notice(
        `Kanvas board: nothing to do on ${board} (no ${names.join(" or ")} card)`
      );
      return;
    }
    const template = String(this.settings.terminal || "").trim();
    const prompt = passPrompt(this.writePassInstructions(), board);
    const agent = agentWords(this.settings.agentCommand, prompt);
    const launch = terminalLaunch(template, { vault, board, agent });
    if (!launch) {
      new obsidian8.Notice(
        'Kanvas board: no terminal found to start the pass. Set "Terminal command" in the plugin settings.',
        1e4
      );
      return;
    }
    startPass(launch, { vault, board });
  }
  noticeNoGoColor() {
    new obsidian8.Notice(
      createFragment((fragment) => {
        fragment.appendText(
          "Kanvas board: the agent did not start, no color triggers it. Turn one on in Settings > Workflow. "
        );
        const button = fragment.createEl("button", {
          cls: "kanvas-board-notice-undo",
          text: "Open settings"
        });
        button.addEventListener("click", () => {
          this.app.setting.open();
          this.app.setting.openTabById(this.manifest.id);
        });
      }),
      1e4
    );
  }
};
mixBoardView(CanvasBoardPlugin);
var CanvasBoardPlugin_default = CanvasBoardPlugin;
