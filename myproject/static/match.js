let draggedCard = null;
let pairs = [];

document.addEventListener("DOMContentLoaded", () => {
  fetch(`/api/game/match_pairs?set_id=${setId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.querySelector(".container").innerHTML = `<p>${data.error}</p>`;
        return;
      }
      pairs = data;
      renderColumns(data);
    });
});

function renderColumns(data) {
  const left = document.getElementById("characters");
  const right = document.getElementById("translations");

  // Перемешиваем правую колонку
  const shuffled = [...data].sort(() => Math.random() - 0.5);

  data.forEach(pair => {
    const charCard = document.createElement("div");
    charCard.className = "card";
    charCard.draggable = true;
    charCard.textContent = pair.character;
    charCard.dataset.value = pair.character;
    charCard.addEventListener("dragstart", handleDragStart);
    charCard.addEventListener("dragend", handleDragEnd);
    left.appendChild(charCard);
  });

  shuffled.forEach(pair => {
    const transCard = document.createElement("div");
    transCard.className = "card";
    transCard.dataset.value = pair.character;
    transCard.textContent = pair.pair;
    transCard.addEventListener("dragover", handleDragOver);
    transCard.addEventListener("drop", handleDrop);
    right.appendChild(transCard);
  });
}

function handleDragStart(e) {
  draggedCard = e.target;
  e.target.classList.add("dragging");
}

function handleDragEnd(e) {
  e.target.classList.remove("dragging");
  draggedCard = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.target.classList.add("droppable");
}

function handleDrop(e) {
  e.preventDefault();
  const target = e.target;
  target.classList.remove("droppable");

  if (!draggedCard || target.classList.contains("correct")) return;

  const correctValue = target.dataset.value;
  const draggedValue = draggedCard.dataset.value;

  if (correctValue === draggedValue) {
    // Успешно
    draggedCard.classList.add("correct");
    target.classList.add("correct");
    draggedCard.draggable = false;
    target.textContent = `${draggedCard.textContent} → ${target.textContent}`;
    checkWin();
  } else {
    target.classList.add("wrong");
    setTimeout(() => {
      target.classList.remove("wrong");
    }, 500);
  }
}

function checkWin() {
  const matched = document.querySelectorAll(".card.correct").length;
  if (matched === pairs.length * 2) {
    document.getElementById("status").textContent = "🎉 Победа! Все пары сопоставлены.";
  }
}
