// Shared by both modes: runs in Node on the parsed file, or inside Obsidian (plugin) on canvas.getData().
function applyOps(d, ops) {
  const retyped = [];
  for (const o of ops) {
    if (o.op === 'set') {
      const n = d.nodes.find((n) => n.id === o.id);
      if (!n) throw new Error('no node ' + o.id);
      if (o.color !== undefined) {
        if (o.color) n.color = o.color;
        else delete n.color;
      }
      if (o.file !== undefined) {
        if (n.type !== 'file') retyped.push(n.id);
        n.type = 'file';
        n.file = o.file;
        delete n.text;
      }
      if (o.text !== undefined) {
        if (n.type !== 'text') retyped.push(n.id);
        n.type = 'text';
        n.text = o.text;
        delete n.file;
      }
      for (const k of ['x', 'y', 'width', 'height']) {if (o[k] !== undefined) n[k] = o[k];}
    } else if (o.op === 'sides') {
      const e = d.edges.find((e) => e.id === o.id);
      if (e) {
        e.fromSide = o.fromSide;
        e.toSide = o.toSide;
      }
    } else if (o.op === 'add') d.nodes.push(o.node);
    else if (o.op === 'remove') {
      d.nodes = d.nodes.filter((n) => n.id !== o.id);
      d.edges = d.edges.filter((e) => e.fromNode !== o.id && e.toNode !== o.id);
    } else if (o.op === 'edge') d.edges.push(o.edge);
    else if (o.op === 'retarget') {
      const e = d.edges.find((e) => e.id === o.id);
      if (e) {
        e.fromNode = o.fromNode;
        e.toNode = o.toNode;
      }
    } else if (o.op === 'ends') {
      const e = d.edges.find((e) => e.id === o.id);
      if (e) {
        e.fromEnd = o.fromEnd;
        e.toEnd = o.toEnd;
      }
    } else if (o.op === 'unedge') {d.edges = d.edges.filter((e) => e.id !== o.id);}
  }
  return retyped;
}

module.exports = applyOps;
