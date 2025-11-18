const form = document.getElementById("item-form");
const canvas = document.getElementById("canvas");

const groupColors = ["#ef4444", "#22c55e", "#f97316", "#3b82f6", "#a855f7", "#14b8a6"];

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));
  const stripeCount = Number(formData.get("stripeCount"));
  const chessPerStripe = Number(formData.get("chessPerStripe"));

  buildShopFloorItem({
    width,
    height,
    stripeCount,
    chessPerStripe,
  });
});

function buildShopFloorItem({ width, height, stripeCount, chessPerStripe }) {
  canvas.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "item-wrapper";

  const itemArea = document.createElement("div");
  itemArea.className = "item-area";
  itemArea.style.width = `${width}px`;
  itemArea.style.height = `${height}px`;
  itemArea.dataset.dimensions = `${width}cm × ${height}cm`;

  wrapper.appendChild(itemArea);
  canvas.appendChild(wrapper);

  const stripes = [];
  const chessMarkers = [];

  for (let i = 0; i < stripeCount; i += 1) {
    const stripe = document.createElement("div");
    stripe.className = "stripe-marker";
    const markerId = `stripe-${i}`;
    stripe.dataset.markerId = markerId;
    stripe.dataset.groupColor = groupColors[i % groupColors.length];

    const label = document.createElement("div");
    label.className = "marker-label";
    stripe.appendChild(label);

    stripe.style.left = `${Math.min(20 + i * 70, Math.max(0, width - 40))}px`;
    stripe.style.top = "20px";

    itemArea.appendChild(stripe);

    makeDraggable(stripe, itemArea, () => {
      updateStripeLabel(stripe, itemArea);
      updateDependentChessMarkers(stripe, chessMarkers, itemArea);
    });

    updateStripeLabel(stripe, itemArea);

    stripes.push(stripe);
  }

  stripes.forEach((stripe, stripeIndex) => {
    for (let j = 0; j < chessPerStripe; j += 1) {
      const chess = document.createElement("div");
      chess.className = "chessboard-marker";
      chess.dataset.parentStripe = stripe.dataset.markerId;

      const badge = document.createElement("span");
      badge.className = "marker-badge";
      badge.style.backgroundColor = groupColors[stripeIndex % groupColors.length];
      chess.appendChild(badge);

      const label = document.createElement("div");
      label.className = "marker-label";
      chess.appendChild(label);

      itemArea.appendChild(chess);

      const offsetX = stripe.offsetLeft + 10 + j * 20;
      const offsetY = stripe.offsetTop + stripe.offsetHeight + 20 + (Math.floor(j / 2) * 70);

      chess.style.left = `${clamp(offsetX, 0, width - chess.offsetWidth)}px`;
      chess.style.top = `${clamp(offsetY, 0, height - chess.offsetHeight)}px`;

      makeDraggable(chess, itemArea, () => {
        updateChessLabel(chess, stripe);
      });

      updateChessLabel(chess, stripe);

      chessMarkers.push(chess);
    }
  });
}

function updateStripeLabel(stripe, itemArea) {
  const label = stripe.querySelector(".marker-label");
  const fromLeft = Math.round(stripe.offsetLeft);
  const fromBottom = Math.round(itemArea.clientHeight - (stripe.offsetTop + stripe.offsetHeight));
  label.textContent = `${fromLeft} x ${fromBottom} cm`;
}

function updateChessLabel(chess, stripe) {
  if (!stripe) return;
  const label = chess.querySelector(".marker-label");
  const deltaLeft = Math.round(chess.offsetLeft - stripe.offsetLeft);
  const deltaBottom = Math.round((stripe.offsetTop + stripe.offsetHeight) - (chess.offsetTop + chess.offsetHeight));
  label.textContent = `${deltaLeft} x ${deltaBottom} cm`;
}

function updateDependentChessMarkers(stripe, chessMarkers) {
  chessMarkers.forEach((marker) => {
    if (marker.dataset.parentStripe === stripe.dataset.markerId) {
      updateChessLabel(marker, stripe);
    }
  });
}

function makeDraggable(element, boundary, onMove) {
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let activePointer = null;

  const onPointerDown = (event) => {
    event.preventDefault();
    activePointer = event.pointerId;
    element.setPointerCapture(activePointer);
    startX = event.clientX;
    startY = event.clientY;
    initialLeft = element.offsetLeft;
    initialTop = element.offsetTop;

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== activePointer) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    const maxLeft = boundary.clientWidth - element.offsetWidth;
    const maxTop = boundary.clientHeight - element.offsetHeight;

    const nextLeft = clamp(initialLeft + dx, 0, maxLeft);
    const nextTop = clamp(initialTop + dy, 0, maxTop);

    element.style.left = `${nextLeft}px`;
    element.style.top = `${nextTop}px`;

    onMove?.();
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== activePointer) return;
    element.releasePointerCapture(activePointer);
    activePointer = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  element.addEventListener("pointerdown", onPointerDown);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
