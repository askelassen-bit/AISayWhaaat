const form = document.getElementById("item-form");
const canvas = document.getElementById("canvas");
const statusMessage = document.getElementById("status-message");

const STRIPE_SIZE = { width: 40, height: 80 };
const CHESS_SIZE = { width: 40, height: 40 };
const STRIPE_COLORS = [
  "#ff5e7e",
  "#69ff8f",
  "#8cf1ff",
  "#ffd369",
  "#ff9de1",
  "#5e9bff",
  "#a8ff5e",
  "#ffb35e",
];

let designerState = {
  itemElement: null,
  itemWidth: 0,
  itemHeight: 0,
  stripeMarkers: [],
  chessMarkers: [],
};

let dragSession = null;

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const width = Number(form.itemWidth.value);
  const height = Number(form.itemHeight.value);
  const stripeCount = Number(form.stripeCount.value);
  const chessPerStripe = Number(form.chessPerStripe.value);

  if ([width, height, stripeCount, chessPerStripe].some((val) => !Number.isFinite(val) || val <= 0)) {
    statusMessage.textContent = "Please provide positive values for all fields.";
    return;
  }

  createShopFloorItem({
    width,
    height,
    stripeCount,
    chessPerStripe,
  });
});

function createShopFloorItem({ width, height, stripeCount, chessPerStripe }) {
  resetCanvas();

  const item = document.createElement("div");
  item.className = "item-container";
  item.style.width = `${width}px`;
  item.style.height = `${height}px`;
  item.dataset.size = `${width} cm × ${height} cm`;

  canvas.innerHTML = "";
  canvas.appendChild(item);

  designerState = {
    itemElement: item,
    itemWidth: width,
    itemHeight: height,
    stripeMarkers: [],
    chessMarkers: [],
  };

  createStripeMarkers(stripeCount);
  createChessMarkers(chessPerStripe);

  statusMessage.textContent = `Item created with ${stripeCount} stripe markers and ${
    stripeCount * chessPerStripe
  } chessboard markers.`;
}

function resetCanvas() {
  designerState = {
    itemElement: null,
    itemWidth: 0,
    itemHeight: 0,
    stripeMarkers: [],
    chessMarkers: [],
  };
}

function createStripeMarkers(count) {
  if (!designerState.itemElement) return;
  const spacing = 20;
  const columns = Math.max(
    1,
    Math.floor(
      (designerState.itemWidth + spacing) / (STRIPE_SIZE.width + spacing)
    )
  );

  for (let i = 0; i < count; i += 1) {
    const left = Math.min(
      designerState.itemWidth - STRIPE_SIZE.width,
      (i % columns) * (STRIPE_SIZE.width + spacing)
    );
    const top = Math.min(
      designerState.itemHeight - STRIPE_SIZE.height,
      Math.floor(i / columns) * (STRIPE_SIZE.height + spacing)
    );

    const stripe = document.createElement("div");
    stripe.className = "marker stripe-marker";
    stripe.dataset.markerType = "stripe";
    stripe.dataset.id = `stripe-${i}`;

    const positionField = createPositionField();
    stripe.appendChild(positionField);

    setMarkerPosition(stripe, left, top);
    designerState.itemElement.appendChild(stripe);
    designerState.stripeMarkers.push(stripe);
    enableDragging(stripe);
    updateStripeLabel(stripe);
  }
}

function createChessMarkers(perStripe) {
  if (!designerState.itemElement) return;
  const allStripes = designerState.stripeMarkers;
  allStripes.forEach((stripe, index) => {
    for (let c = 0; c < perStripe; c += 1) {
      const chess = document.createElement("div");
      chess.className = "marker chess-marker";
      chess.dataset.markerType = "chess";
      chess.dataset.stripeId = stripe.dataset.id;
      chess.style.setProperty(
        "--corner-color",
        STRIPE_COLORS[index % STRIPE_COLORS.length]
      );

      const label = createPositionField();
      chess.appendChild(label);

      const baseLeft = parseFloat(stripe.dataset.left) || 0;
      const baseTop = parseFloat(stripe.dataset.top) || 0;
      const row = Math.floor(c / 2);
      const col = c % 2;
      const offsetX = col * (CHESS_SIZE.width + 12);
      const offsetY = STRIPE_SIZE.height + 20 + row * (CHESS_SIZE.height + 12);

      const left = clamp(
        baseLeft + offsetX,
        0,
        designerState.itemWidth - CHESS_SIZE.width
      );
      const top = clamp(
        baseTop + offsetY,
        0,
        designerState.itemHeight - CHESS_SIZE.height
      );

      setMarkerPosition(chess, left, top);
      designerState.itemElement.appendChild(chess);
      designerState.chessMarkers.push(chess);
      enableDragging(chess);
      updateChessLabel(chess);
    }
  });
}

function createPositionField() {
  const field = document.createElement("input");
  field.type = "text";
  field.className = "position-field";
  field.readOnly = true;
  field.value = "0 cm, 0 cm";
  return field;
}

function enableDragging(element) {
  element.addEventListener("pointerdown", startDrag);
}

function startDrag(event) {
  const target = event.currentTarget;
  if (!designerState.itemElement) return;

  target.setPointerCapture(event.pointerId);
  const rect = target.getBoundingClientRect();

  dragSession = {
    pointerId: event.pointerId,
    element: target,
    markerType: target.dataset.markerType,
    stripeId: target.dataset.stripeId || null,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  event.preventDefault();
}

function handlePointerMove(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) return;
  if (!designerState.itemElement) return;

  const containerRect = designerState.itemElement.getBoundingClientRect();
  const { offsetX, offsetY, element } = dragSession;

  let newLeft = event.clientX - containerRect.left - offsetX;
  let newTop = event.clientY - containerRect.top - offsetY;

  const maxLeft = designerState.itemWidth - element.offsetWidth;
  const maxTop = designerState.itemHeight - element.offsetHeight;

  newLeft = clamp(newLeft, 0, Math.max(maxLeft, 0));
  newTop = clamp(newTop, 0, Math.max(maxTop, 0));

  setMarkerPosition(element, newLeft, newTop);

  if (dragSession.markerType === "stripe") {
    updateStripeLabel(element);
    updateChessLabelsForStripe(element.dataset.id);
  } else if (dragSession.markerType === "chess") {
    updateChessLabel(element);
  }
}

function handlePointerEnd(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) return;
  dragSession.element.releasePointerCapture(event.pointerId);
  dragSession = null;
}

function setMarkerPosition(element, left, top) {
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.dataset.left = left;
  element.dataset.top = top;
}

function updateStripeLabel(stripe) {
  const label = stripe.querySelector(".position-field");
  if (!label) return;
  const left = Number(stripe.dataset.left) || 0;
  const top = Number(stripe.dataset.top) || 0;
  const yFromBottom = designerState.itemHeight - (top + STRIPE_SIZE.height);
  label.value = `${Math.round(left)} cm, ${Math.round(yFromBottom)} cm`;
}

function updateChessLabel(chess) {
  const label = chess.querySelector(".position-field");
  if (!label) return;
  const stripe = designerState.stripeMarkers.find(
    (s) => s.dataset.id === chess.dataset.stripeId
  );
  if (!stripe) return;

  const stripeLeft = Number(stripe.dataset.left) || 0;
  const stripeTop = Number(stripe.dataset.top) || 0;
  const chessLeft = Number(chess.dataset.left) || 0;
  const chessTop = Number(chess.dataset.top) || 0;

  const deltaX = chessLeft - stripeLeft;
  const stripeBottom = stripeTop + STRIPE_SIZE.height;
  const chessBottom = chessTop + CHESS_SIZE.height;
  const deltaY = stripeBottom - chessBottom;

  label.value = `Δ ${Math.round(deltaX)} cm, ${Math.round(deltaY)} cm`;
}

function updateChessLabelsForStripe(stripeId) {
  designerState.chessMarkers
    .filter((marker) => marker.dataset.stripeId === stripeId)
    .forEach((marker) => updateChessLabel(marker));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

document.addEventListener("pointermove", handlePointerMove);
document.addEventListener("pointerup", handlePointerEnd);
document.addEventListener("pointercancel", handlePointerEnd);
