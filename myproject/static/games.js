document.addEventListener("DOMContentLoaded", () => {
    const setSelect = document.getElementById("set-select");
    const gameButtons = document.querySelectorAll(".game-button");
  
    // Загружаем наборы пользователя
    fetch("/api/sets")
      .then(response => {
        if (!response.ok) throw new Error("Ошибка загрузки наборов");
        return response.json();
      })
      .then(data => {
        setSelect.innerHTML = '<option value="">-- Выберите набор --</option>';
        if (data.length === 0) {
          const opt = document.createElement("option");
          opt.textContent = "Нет доступных наборов";
          opt.disabled = true;
          setSelect.appendChild(opt);
          return;
        }
        data.forEach(set => {
          const option = document.createElement("option");
          option.value = set.id;
          option.textContent = set.name;
          setSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error("Ошибка при загрузке наборов:", error);
        setSelect.innerHTML = '<option disabled>Не удалось загрузить</option>';
      });
  
    // Обработка нажатия кнопки игры
    gameButtons.forEach(button => {
      button.addEventListener("click", () => {
        const selectedSetId = setSelect.value;
        const gameType = button.dataset.game;
  
        if (!selectedSetId) {
          alert("Пожалуйста, выберите набор карточек.");
          return;
        }
  
        window.location.href = `/game/${gameType}?set_id=${selectedSetId}`;
      });
    });
  });
  