const EVENTS = ['pointerdown', 'mousedown', 'wheel', 'dblclick', 'contextmenu'];

// Clicks and scrolls stay in the element: no canvas pan, no deselect.
function stopCanvasEvents(element) {
  for (const eventName of EVENTS) {
    element.addEventListener(eventName, (event) => event.stopPropagation());
  }
}

module.exports = stopCanvasEvents;
