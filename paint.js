const PALETTE = [
  '#000000','#808080','#800000','#808000','#008000','#008080','#000080','#800080',
  '#ffffff','#c0c0c0','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff',
  '#ff8040','#804000','#80ff00','#004040','#0080ff','#8000ff','#ff0080','#ff8080',
  '#ffcc99','#ffe0b2','#fff9c4','#c8e6c9','#b3e5fc','#e1bee7','#f8bbd0','#d7ccc8'
];



const BRUSH_SIZES = [1, 2, 3, 5, 8, 12];
const TOOLS = [
  { id: 'freeselect', label: 'Free Select', icon: '⬟' },
  { id: 'select', label: 'Select', icon: '⬜' },
  { id: 'eraser', label: 'Eraser', icon: '◻' },
  { id: 'fill', label: 'Fill', icon: '🪣' },
  { id: 'eyedropper', label: 'Pick Color', icon: '💉' },
  { id: 'zoom', label: 'Zoom', icon: '🔍' },
  { id: 'pencil', label: 'Pencil', icon: '✏' },
  { id: 'brush', label: 'Brush', icon: '🖌' },
  { id: 'text', label: 'Text', icon: 'A' },
  { id: 'line', label: 'Line', icon: '/' },
  { id: 'curve', label: 'Curve', icon: '〜' },
  { id: 'rect', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '○' },
  { id: 'roundrect', label: 'Rounded Rect', icon: '▢' },
  { id: 'triangle', label: 'Triangle', icon: '△' },
  { id: 'polygon', label: 'Polygon', icon: '⬡' }
];
const MENU = [
  {
    label: 'File', items: [
      { label: 'New (Ctrl+N)', action: () => newCanvas() },
      { label: 'Save (Ctrl+S)', action: () => saveImage() },
      { label: 'Copy image', action: () => copyCanvas() }
    ]
  },
  {
    label: 'Edit', items: [
      { label: 'Undo (Ctrl+Z)', action: () => undo() },
      { label: 'Redo (Ctrl+Y)', action: () => redo() },
      { label: 'Select All', action: () => {} },
      { label: 'Delete Selection', action: () => deleteSelection() }
    ]
  },
  {
    label: 'View', items: [
      { label: 'Zoom In', action: () => setZoom(Math.min(8, state.zoom + 0.5)) },
      { label: 'Zoom Out', action: () => setZoom(Math.max(0.25, state.zoom - 0.5)) },
      { label: 'Zoom 100%', action: () => setZoom(1) },
      { label: 'Zoom 200%', action: () => setZoom(2) }
    ]
  }
];

const state = {
  tool: 'pencil',
  fgColor: '#000000',
  bgColor: '#ffffff',
  brushSize: 2,
  fillShape: false,
  zoom: 1,
  textInput: null,
  textValue: '',
  fontSize: 16,
  fontFamily: 'Arial',
  boldText: false,
  italicText: false,
  underlineText: false,
  selectionActive: false,
  movingSelection: false,
  polygonPoints: [],
  curvePoints: [],
  curveStage: 0,
  startPos: { x: 0, y: 0 },
  moveStart: { x: 0, y: 0 },
  dragOffset: { x: 0, y: 0 },
  draggingWindow: false,
  canvasSize: { w: 800, h: 500 }
};

const history = [];
let historyIdx = -1;
let snapshotData = null;
let selectionData = null;
const selectionRect = { x: 0, y: 0, w: 0, h: 0 };

const appWindow = document.getElementById('app-window1');
const titleBar = document.getElementById('title-bar');
const menuBar = document.getElementById('menu-bar');
const toolButtons = document.getElementById('tool-buttons');
const brushSizes = document.getElementById('brush-sizes');
const fillToggle = document.getElementById('fill-toggle');
const canvas = document.getElementById('paint-canvas');
const paintOverlay = document.getElementById('overlay-canvas');
const canvasWrapper = document.getElementById('canvas-wrapper');
const textOverlay = document.getElementById('text-overlay');
const textInput = document.getElementById('text-input');
const fgpicker = document.getElementById('fgpicker');
const bgpicker = document.getElementById('bgpicker');
const colorFg = document.querySelector('.color-fg');
const colorBg = document.querySelector('.color-bg');
const paletteContainer = document.getElementById('palette');
const textOptions = document.getElementById('text-options');
const statusCursor = document.getElementById('status-cursor');
const statusSize = document.getElementById('status-size');
const statusZoom = document.getElementById('status-zoom');

const ctx = canvas.getContext('2d');
const octx = paintOverlay.getContext('2d');
let drawing = false;
let draggingSelection = false;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function roundPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const right = x + w;
  const bottom = y + h;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(right - r, y);
  ctx.quadraticCurveTo(right, y, right, y + r);
  ctx.lineTo(right, bottom - r);
  ctx.quadraticCurveTo(right, bottom, right - r, bottom);
  ctx.lineTo(x + r, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function floodFill(ctx, startX, startY, fillColor) {
  const canvasEl = ctx.canvas;
  const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
  const data = imageData.data;
  const idx = (startY * canvasEl.width + startX) * 4;
  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];
  const { r: fillR, g: fillG, b: fillB } = hexToRgb(fillColor);
  if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === 255) return;

  const stack = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= canvasEl.width || y < 0 || y >= canvasEl.height) continue;
    const i = (y * canvasEl.width + x) * 4;
    if (data[i] !== targetR || data[i + 1] !== targetG || data[i + 2] !== targetB || data[i + 3] !== targetA) continue;
    data[i] = fillR;
    data[i + 1] = fillG;
    data[i + 2] = fillB;
    data[i + 3] = 255;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  ctx.putImageData(imageData, 0, 0);
}

function getCursorPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round((event.clientX - rect.left) / state.zoom),
    y: Math.round((event.clientY - rect.top) / state.zoom)
  };
}

function saveHistory() {
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  history.splice(historyIdx + 1);
  history.push(snapshot);
  if (history.length > 50) history.shift();
  historyIdx = history.length - 1;
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx -= 1;
  ctx.putImageData(history[historyIdx], 0, 0);
}

function redo() {
  if (historyIdx >= history.length - 1) return;
  historyIdx += 1;
  ctx.putImageData(history[historyIdx], 0, 0);
}

function applyStrokeStyle(targetCtx, secondary = false) {
  targetCtx.strokeStyle = secondary ? state.bgColor : state.fgColor;
  targetCtx.fillStyle = secondary ? state.bgColor : state.fgColor;
  targetCtx.lineWidth = state.brushSize;
  targetCtx.lineJoin = 'round';
  targetCtx.lineCap = 'round';
}

function clearOverlay() {
  octx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawShapeOnCtx(targetCtx, tool, x1, y1, x2, y2, secondary = false) {
  applyStrokeStyle(targetCtx, secondary);
  targetCtx.beginPath();
  if (tool === 'line') {
    targetCtx.moveTo(x1, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.stroke();
    return;
  }

  if (tool === 'rect') {
    if (state.fillShape) targetCtx.fillRect(x1, y1, x2 - x1, y2 - y1);
    targetCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    return;
  }

  if (tool === 'ellipse') {
    const rx = Math.abs(x2 - x1) / 2;
    const ry = Math.abs(y2 - y1) / 2;
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    targetCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (state.fillShape) targetCtx.fill();
    targetCtx.stroke();
    return;
  }

  if (tool === 'roundrect') {
    const r = Math.min(12, Math.abs(x2 - x1) / 4, Math.abs(y2 - y1) / 4);
    roundPath(targetCtx, x1, y1, x2 - x1, y2 - y1, r);
    if (state.fillShape) targetCtx.fill();
    targetCtx.stroke();
    return;
  }

  if (tool === 'triangle') {
    const mx = (x1 + x2) / 2;
    targetCtx.moveTo(mx, y1);
    targetCtx.lineTo(x2, y2);
    targetCtx.lineTo(x1, y2);
    targetCtx.closePath();
    if (state.fillShape) targetCtx.fill();
    targetCtx.stroke();
    return;
  }
}

function pointInSelection(pos) {
  return pos.x >= selectionRect.x && pos.x <= selectionRect.x + selectionRect.w && pos.y >= selectionRect.y && pos.y <= selectionRect.y + selectionRect.h;
}

function renderSelectionBorder(dx = 0, dy = 0) {
  if (!state.selectionActive || !selectionData) return;
  clearOverlay();
  octx.setLineDash([4 / state.zoom, 4 / state.zoom]);
  octx.strokeStyle = '#0078d4';
  octx.lineWidth = 1 / state.zoom;
  octx.strokeRect(selectionRect.x + dx, selectionRect.y + dy, selectionRect.w, selectionRect.h);
}

function updateTextStyle() {
  textInput.style.font = `${state.italicText ? 'italic ' : ''}${state.boldText ? 'bold ' : ''}${state.fontSize}px ${state.fontFamily}`;
  textInput.style.textDecoration = state.underlineText ? 'underline' : 'none';
  textInput.style.color = state.fgColor;
}

function showTextOverlay() {
  if (!state.textInput) return;
  textOverlay.classList.remove('hidden');
  textOverlay.style.left = `${state.textInput.x * state.zoom}px`;
  textOverlay.style.top = `${state.textInput.y * state.zoom}px`;
  textInput.value = state.textValue;
  updateTextStyle();
  textInput.focus();
  textInput.select();
}

function hideTextOverlay() {
  state.textInput = null;
  textOverlay.classList.add('hidden');
}

function commitText() {
  if (!state.textInput) {
    hideTextOverlay();
    return;
  }
  const text = state.textValue.trim();
  if (!text) {
    hideTextOverlay();
    return;
  }
  saveHistory();
  ctx.font = `${state.italicText ? 'italic ' : ''}${state.boldText ? 'bold ' : ''}${state.fontSize}px ${state.fontFamily}`;
  ctx.fillStyle = state.fgColor;
  ctx.fillText(text, state.textInput.x, state.textInput.y + state.fontSize);
  if (state.underlineText) {
    const width = ctx.measureText(text).width;
    ctx.fillRect(state.textInput.x, state.textInput.y + state.fontSize + 2, width, 1);
  }
  hideTextOverlay();
}

function setZoom(value) {
  state.zoom = value;
  canvasWrapper.style.transform = `scale(${state.zoom})`;
  updateStatus();
  renderSelectionBorder();
}

function updateStatus(cursor = null) {
  statusCursor.textContent = cursor ? `${cursor.x}, ${cursor.y}px` : statusCursor.textContent;
  statusSize.textContent = `${state.canvasSize.w} x ${state.canvasSize.h}px`;
  statusZoom.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
}

function updateUI(openMenu = false) {
  document.querySelectorAll('.tool-button').forEach(button => {
    button.classList.toggle('active', button.dataset.tool === state.tool);
  });
  document.querySelectorAll('.brush-button').forEach(button => {
    button.classList.toggle('active', Number(button.dataset.size) === state.brushSize);
  });
  fillToggle.classList.toggle('active', state.fillShape);
  fillToggle.textContent = state.fillShape ? 'Filled' : 'Outline';
  colorFg.style.background = state.fgColor;
  colorBg.style.background = state.bgColor;
  colorFg.onclick = () => fgpicker.click();
  textOptions.classList.toggle('hidden', state.tool !== 'text');
  if (state.tool === 'text') {
    updateTextStyle();
  }
  const cursor = getCursor();
  canvas.style.cursor = cursor;
  if (!openMenu) {
    document.querySelectorAll('.menu-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.menu-dropdown').forEach(dropdown => dropdown.remove());
  }
}

function getCursor() {
  switch (state.tool) {
    case 'eyedropper': return 'crosshair';
    case 'fill': return 'cell';
    case 'eraser': return 'cell';
    case 'zoom': return 'zoom-in';
    case 'text': return 'text';
    case 'select':
    case 'freeselect': return 'crosshair';
    default: return 'crosshair';
  }
}

function makeMenu() {
  MENU.forEach(menu => {
    const wrapper = document.createElement('div');
    wrapper.className = 'menu-item';
    const button = document.createElement('button');
    button.className = 'menu-button';
    button.textContent = menu.label;
    button.addEventListener('click', event => {
      event.stopPropagation();
      const active = button.classList.contains('active');
      document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.menu-dropdown').forEach(drop => drop.remove());
      if (!active) {
        button.classList.add('active');
        const dropdown = document.createElement('div');
        dropdown.className = 'menu-dropdown';
        menu.items.forEach(item => {
          const itemButton = document.createElement('button');
          itemButton.textContent = item.label;
          itemButton.addEventListener('click', () => {
            item.action();
            dropdown.remove();
            button.classList.remove('active');
          });
          dropdown.appendChild(itemButton);
        });
        wrapper.appendChild(dropdown);
      }
    });
    wrapper.appendChild(button);
    menuBar.appendChild(wrapper);
  });
}

function makeTools() {
  TOOLS.forEach(tool => {
    const button = document.createElement('button');
    button.className = 'tool-button';
    button.dataset.tool = tool.id;
    button.title = tool.label;
    button.innerText = tool.icon;
    button.addEventListener('click', () => {
      state.tool = tool.id;
      state.textInput = null;
      hideTextOverlay();
      updateUI();
      clearOverlay();
    });
    toolButtons.appendChild(button);
  });
}

function makeBrushSizes() {
  BRUSH_SIZES.forEach(size => {
    const button = document.createElement('button');
    button.className = 'brush-button';
    button.dataset.size = String(size);
    button.title = `Size ${size}`;
    button.style.width = `${Math.min(size * 4 + 4, 40)}px`;
    button.style.height = `${Math.min(size * 4 + 4, 40)}px`;
    button.addEventListener('click', () => {
      state.brushSize = size;
      updateUI();
    });
    brushSizes.appendChild(button);
  });
}

function makePalette() {
  PALETTE.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      state.fgColor = color;
      updateUI();
    });
    swatch.addEventListener('contextmenu', event => {
      event.preventDefault();
      state.bgColor = color;
      updateUI();
    });
    paletteContainer.appendChild(swatch);
  });
}

fillToggle.addEventListener('click', () => {
  state.fillShape = !state.fillShape;
  updateUI();
});

fgpicker.addEventListener('input', event => {
  state.fgColor = event.target.value;
  updateUI();
});
bgpicker.addEventListener('input', event => {
  state.bgColor = event.target.value;
  updateUI();
});

colorBg.addEventListener('click', () => bgpicker.click());
colorFg.addEventListener('click', () => fgpicker.click());

textOptions.innerHTML = `
  <select id="font-family"></select>
  <select id="font-size"></select>
  <button id="bold-button">B</button>
  <button id="italic-button">I</button>
  <button id="underline-button">U</button>
`;

function makeTextOptions() {
  const family = document.getElementById('font-family');
  const size = document.getElementById('font-size');
  const boldButton = document.getElementById('bold-button');
  const italicButton = document.getElementById('italic-button');
  const underlineButton = document.getElementById('underline-button');

  ['Arial', 'Times New Roman', 'Courier New', 'Comic Sans MS', 'Impact', 'Verdana'].forEach(font => {
    const option = document.createElement('option');
    option.value = font;
    option.textContent = font;
    family.appendChild(option);
  });
  [8, 10, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72].forEach(sizeValue => {
    const option = document.createElement('option');
    option.value = String(sizeValue);
    option.textContent = String(sizeValue);
    size.appendChild(option);
  });

  family.value = state.fontFamily;
  size.value = state.fontSize;

  family.addEventListener('change', event => {
    state.fontFamily = event.target.value;
    updateTextStyle();
  });
  size.addEventListener('change', event => {
    state.fontSize = Number(event.target.value);
    updateTextStyle();
  });
  boldButton.addEventListener('click', () => {
    state.boldText = !state.boldText;
    boldButton.classList.toggle('active', state.boldText);
    updateTextStyle();
  });
  italicButton.addEventListener('click', () => {
    state.italicText = !state.italicText;
    italicButton.classList.toggle('active', state.italicText);
    updateTextStyle();
  });
  underlineButton.addEventListener('click', () => {
    state.underlineText = !state.underlineText;
    underlineButton.classList.toggle('active', state.underlineText);
    updateTextStyle();
  });
}

function startWindowDrag(event) {
  state.draggingWindow = true;
  const rect = appWindow.getBoundingClientRect();
  state.dragOffset.x = event.clientX - rect.left;
  state.dragOffset.y = event.clientY - rect.top;
}

function stopWindowDrag() {
  state.draggingWindow = false;
}

function moveWindow(event) {
  if (!state.draggingWindow) return;
  const left = Math.max(0, event.clientX - state.dragOffset.x);
  const top = Math.max(0, event.clientY - state.dragOffset.y);
  appWindow.style.left = `${left}px`;
  appWindow.style.top = `${top}px`;
}

titleBar.addEventListener('mousedown', event => {
  if (event.target.closest('.title-button')) return;
  startWindowDrag(event);
});
window.addEventListener('mousemove', moveWindow);
window.addEventListener('mouseup', stopWindowDrag);

function onCanvasMouseDown(event) {
  const pos = getCursorPos(event);
  const secondary = event.button === 2;
  if (state.tool === 'text') {
    state.textInput = { x: pos.x, y: pos.y };
    state.textValue = '';
    showTextOverlay();
    return;
  }
  if (state.tool === 'eyedropper') {
    const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
    const hex = `#${[pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    if (secondary) state.bgColor = hex; else state.fgColor = hex;
    updateUI();
    return;
  }
  if (state.tool === 'fill') {
    saveHistory();
    floodFill(ctx, pos.x, pos.y, secondary ? state.bgColor : state.fgColor);
    return;
  }
  if (state.tool === 'zoom') {
    setZoom(secondary ? Math.max(0.5, state.zoom - 0.5) : Math.min(8, state.zoom + 1));
    return;
  }
  if (state.tool === 'select' || state.tool === 'freeselect') {
    if (state.selectionActive && selectionData && pointInSelection(pos)) {
      state.movingSelection = true;
      state.moveStart = pos;
      return;
    }
    state.selectionActive = false;
    selectionData = null;
    clearOverlay();
  }
  if (state.tool === 'polygon') {
    if (state.polygonPoints.length === 0) snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    state.polygonPoints.push(pos);
    return;
  }
  if (state.tool === 'curve') {
    if (state.curveStage === 0) {
      snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      state.curvePoints = [pos, pos, pos, pos];
      state.curveStage = 1;
    } else if (state.curveStage === 1) {
      state.curvePoints[2] = pos;
      state.curveStage = 2;
    } else if (state.curveStage === 2) {
      state.curvePoints[3] = pos;
      saveHistory();
      applyStrokeStyle(ctx, secondary);
      ctx.beginPath();
      const [p0, p1, p2, p3] = state.curvePoints;
      ctx.moveTo(p0.x, p0.y);
      ctx.bezierCurveTo(p2.x, p2.y, p3.x, p3.y, p1.x, p1.y);
      ctx.stroke();
      state.curveStage = 0;
      state.curvePoints = [];
    }
    return;
  }

  drawing = true;
  state.startPos = pos;
  snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyStrokeStyle(ctx, secondary);
  if (state.tool === 'pencil' || state.tool === 'brush') {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }
  if (state.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, state.brushSize * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function onCanvasMouseMove(event) {
  const pos = getCursorPos(event);
  updateStatus(pos);
  const secondary = event.buttons === 2;
  if (state.movingSelection && selectionData) {
    ctx.putImageData(snapshotData, 0, 0);
    const dx = pos.x - state.moveStart.x;
    const dy = pos.y - state.moveStart.y;
    ctx.putImageData(selectionData, selectionRect.x + dx, selectionRect.y + dy);
    renderSelectionBorder(dx, dy);
    return;
  }
  if (state.polygonPoints.length > 0) {
    clearOverlay();
    applyStrokeStyle(octx, secondary);
    octx.beginPath();
    octx.moveTo(state.polygonPoints[0].x, state.polygonPoints[0].y);
    for (let i = 1; i < state.polygonPoints.length; i += 1) {
      octx.lineTo(state.polygonPoints[i].x, state.polygonPoints[i].y);
    }
    octx.lineTo(pos.x, pos.y);
    octx.stroke();
    return;
  }
  if (state.curveStage > 0) {
    clearOverlay();
    applyStrokeStyle(octx, secondary);
    const [p0, p1, p2] = state.curvePoints;
    if (state.curveStage === 1) {
      state.curvePoints[1] = pos;
      octx.beginPath();
      octx.moveTo(p0.x, p0.y);
      octx.lineTo(pos.x, pos.y);
      octx.stroke();
    } else {
      octx.beginPath();
      octx.moveTo(p0.x, p0.y);
      octx.bezierCurveTo(p2.x, p2.y, pos.x, pos.y, p1.x, p1.y);
      octx.stroke();
    }
    return;
  }
  if (!drawing) return;

  if (state.tool === 'pencil') {
    applyStrokeStyle(ctx, secondary);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else if (state.tool === 'brush') {
    applyStrokeStyle(ctx, secondary);
    ctx.lineWidth = state.brushSize * 3;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else if (state.tool === 'eraser') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, state.brushSize * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (state.tool === 'select') {
    clearOverlay();
    octx.setLineDash([4 / state.zoom, 4 / state.zoom]);
    octx.strokeStyle = '#0078d4';
    octx.lineWidth = 1 / state.zoom;
    const x = Math.min(state.startPos.x, pos.x);
    const y = Math.min(state.startPos.y, pos.y);
    const w = Math.abs(pos.x - state.startPos.x);
    const h = Math.abs(pos.y - state.startPos.y);
    octx.strokeRect(x, y, w, h);
  } else if (['line', 'rect', 'ellipse', 'roundrect', 'triangle'].includes(state.tool)) {
    clearOverlay();
    drawShapeOnCtx(octx, state.tool, state.startPos.x, state.startPos.y, pos.x, pos.y, secondary);
  }
}

function onCanvasMouseUp(event) {
  const pos = getCursorPos(event);
  const secondary = event.button === 2;
  if (state.movingSelection && selectionData) {
    const dx = pos.x - state.moveStart.x;
    const dy = pos.y - state.moveStart.y;
    ctx.putImageData(snapshotData, 0, 0);
    ctx.putImageData(selectionData, selectionRect.x + dx, selectionRect.y + dy);
    selectionRect.x += dx;
    selectionRect.y += dy;
    state.movingSelection = false;
    saveHistory();
    renderSelectionBorder();
    return;
  }
  if (state.tool === 'select') {
    const x = Math.min(state.startPos.x, pos.x);
    const y = Math.min(state.startPos.y, pos.y);
    const w = Math.abs(pos.x - state.startPos.x);
    const h = Math.abs(pos.y - state.startPos.y);
    if (w > 2 && h > 2) {
      snapshotData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      selectionRect.x = x;
      selectionRect.y = y;
      selectionRect.w = w;
      selectionRect.h = h;
      selectionData = ctx.getImageData(x, y, w, h);
      state.selectionActive = true;
      renderSelectionBorder();
    }
    drawing = false;
    return;
  }
  if (state.tool === 'freeselect') {
    drawing = false;
    return;
  }
  if (!drawing) return;
  drawing = false;
  if (['line', 'rect', 'ellipse', 'roundrect', 'triangle'].includes(state.tool)) {
    clearOverlay();
    saveHistory();
    drawShapeOnCtx(ctx, state.tool, state.startPos.x, state.startPos.y, pos.x, pos.y, secondary);
  } else if (state.tool === 'pencil' || state.tool === 'brush') {
    ctx.closePath();
    saveHistory();
  } else if (state.tool === 'eraser') {
    saveHistory();
  }
}

function onCanvasDblClick() {
  if (state.tool === 'polygon' && state.polygonPoints.length >= 2) {
    saveHistory();
    clearOverlay();
    applyStrokeStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(state.polygonPoints[0].x, state.polygonPoints[0].y);
    for (let i = 1; i < state.polygonPoints.length; i += 1) {
      ctx.lineTo(state.polygonPoints[i].x, state.polygonPoints[i].y);
    }
    ctx.closePath();
    if (state.fillShape) ctx.fill();
    ctx.stroke();
    state.polygonPoints = [];
  }
}

function newCanvas() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
  state.textInput = null;
  state.selectionActive = false;
  selectionData = null;
  clearOverlay();
}

function saveImage() {
  const link = document.createElement('a');
  link.download = 'painting.png';
  link.href = canvas.toDataURL();
  link.click();
}

function copyCanvas() {
  canvas.toBlob(blob => {
    if (!blob || !navigator.clipboard) return;
    const item = new ClipboardItem({ 'image/png': blob });
    navigator.clipboard.write([item]).catch(() => {});
  });
}

function deleteSelection() {
  if (!state.selectionActive) return;
  saveHistory();
  ctx.fillStyle = state.bgColor;
  ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
  state.selectionActive = false;
  selectionData = null;
  clearOverlay();
}

function onKeyDown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    undo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault();
    redo();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    saveImage();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
    event.preventDefault();
    newCanvas();
  }
  if (event.key === 'Delete') {
    deleteSelection();
  }
  if (event.key === 'Escape') {
    hideTextOverlay();
    state.selectionActive = false;
    clearOverlay();
    state.polygonPoints = [];
    state.curveStage = 0;
  }
}

canvas.addEventListener('mousedown', onCanvasMouseDown);
canvas.addEventListener('mousemove', onCanvasMouseMove);
canvas.addEventListener('mouseup', onCanvasMouseUp);
canvas.addEventListener('dblclick', onCanvasDblClick);
canvas.addEventListener('contextmenu', event => event.preventDefault());

textInput.addEventListener('input', event => {
  state.textValue = event.target.value;
});
textInput.addEventListener('blur', commitText);
textInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') commitText();
  if (event.key === 'Escape') hideTextOverlay();
});

window.addEventListener('keydown', onKeyDown);
document.body.addEventListener('click', () => {
  document.querySelectorAll('.menu-dropdown').forEach(dropdown => dropdown.remove());
  document.querySelectorAll('.menu-button').forEach(button => button.classList.remove('active'));
});

function initialize() {
  makeMenu();
  makeTools();
  makeBrushSizes();
  makePalette();
  makeTextOptions();
  updateUI();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveHistory();
  setZoom(state.zoom);
  updateStatus();
}

initialize();
