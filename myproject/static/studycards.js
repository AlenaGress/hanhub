document.addEventListener("DOMContentLoaded", () => {
  const setsList = document.getElementById("sets-list");
  const startStudyBtn = document.getElementById("start-study-btn");
  const selectionArea = document.getElementById("selection-area");
  const studyArea = document.getElementById("study-area");
  const card = document.getElementById("card");
  const cardFrontContent = document.querySelector("#card-front .card-content");
  const cardBackContent = document.querySelector("#card-back .card-content");
  const knowBtn = document.getElementById("know-btn");
  const repeatBtn = document.getElementById("repeat-btn");
  const speakButton = document.getElementById("speak-btn");

  let fullDeck = [];
  let currentChunk = [];
  let repeatQueue = [];
  let currentIndex = 0;

  // Загрузка наборов
  fetch('/sets')
    .then(res => res.json())
    .then(sets => {
      sets.forEach(set => {
        const li = document.createElement("li");
        li.innerHTML = `<label><input type="checkbox" value="${set.id}"> ${set.name}</label>`;
        setsList.appendChild(li);
      });
    });

  // Старт изучения
  startStudyBtn.addEventListener("click", async () => {
    const selectedIds = Array.from(document.querySelectorAll("#sets-list input:checked")).map(input => input.value);
    if (selectedIds.length === 0) {
      alert("Выберите хотя бы один набор!");
      return;
    }

    let cards = [];
    for (const id of selectedIds) {
      const res = await fetch(`/cards/${id}`);
      const setCards = await res.json();
      cards = cards.concat(setCards);
    }

    if (cards.length === 0) {
      alert("Нет карточек для изучения.");
      return;
    }

    fullDeck = shuffle(cards);
    selectionArea.style.display = "none";
    studyArea.style.display = "flex";
    loadNextChunk();
  });

  function loadNextChunk() {
    currentChunk = fullDeck.splice(0, 5);
    repeatQueue = [];
    currentIndex = 0;

    if (currentChunk.length === 0) {
      alert("🎉 Поздравляем! Вы изучили все карточки!");
      location.reload();
      return;
    }

    showCurrentCard();
  }

  function showCurrentCard() {
    const cardData = currentChunk[currentIndex];
    cardFrontContent.textContent = cardData.character || "-";
    cardBackContent.innerHTML = `
      <div class="card-back-content">
        <div class="back-field"><strong>Перевод:</strong> ${cardData.translation || '-'}</div>
        <div class="back-field"><strong>Пиньинь:</strong> ${cardData.pinyin || '-'}</div>
        <div class="back-field"><strong>Пример:</strong> ${cardData.example || '-'}</div>
      </div>
    `;
    card.classList.remove("flipped");
  }

  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
  });

  knowBtn.addEventListener("click", () => {
    const card = currentChunk[currentIndex];
    sendProgress(card.id, 4);
    nextCard();
  });

  repeatBtn.addEventListener("click", () => {
    const card = currentChunk[currentIndex];
    if (!repeatQueue.includes(card)) {
      repeatQueue.push(card);
    }
    sendProgress(card.id, 2);
    nextCard();
  });

  speakButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(cardFrontContent.textContent);
    utterance.lang = "zh-CN";
    speechSynthesis.speak(utterance);
  });

  function nextCard() {
    currentIndex++;
    if (currentIndex >= currentChunk.length) {
      if (repeatQueue.length > 0) {
        currentChunk = [...repeatQueue];
        repeatQueue = [];
        currentIndex = 0;
        alert("Повторим сложные карточки.");
        showCurrentCard();
      } else {
        loadNextChunk();
      }
    } else {
      showCurrentCard();
    }
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function sendProgress(cardId, quality) {
    fetch('/api/update_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cardId, quality: quality })
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("Прогресс отправлен:", data);
    })
    .catch(error => {
      console.error("Ошибка при отправке прогресса:", error);
    });
  }
});
