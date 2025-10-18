document.addEventListener('DOMContentLoaded', function () {
  const textGrid = document.getElementById('textGrid');
  const searchInput = document.getElementById('searchInput');
  const levelSelect = document.getElementById('levelSelect');

  let texts = [];

  // Загрузить все тексты с сервера
  async function loadTexts() {
    try {
      const response = await fetch('/api/texts');
      const data = await response.json();
      texts = data;
      renderTexts();
    } catch (error) {
      console.error('Ошибка загрузки текстов:', error);
    }
  }

  // Отобразить тексты
  function renderTexts() {
    const searchValue = searchInput.value.toLowerCase();
    const selectedLevel = levelSelect.value;
    
    textGrid.innerHTML = '';

    texts
      .filter(text => 
        (!selectedLevel || text.level === selectedLevel) &&
        text.title.toLowerCase().includes(searchValue)
      )
      .forEach(text => {
        const card = document.createElement('a');
        card.className = 'text-card';
        card.href = `/read_text/${text.id}`; // например, переход к чтению по id
        card.dataset.title = text.title;
        card.dataset.level = text.level;

        card.innerHTML = `
          <h3>${text.title}</h3>
          <p>Уровень: ${text.level} · ${text.description || ''}</p>
        `;

        textGrid.appendChild(card);
      });
  }

  // Слушатели фильтров
  searchInput.addEventListener('input', renderTexts);
  levelSelect.addEventListener('change', renderTexts);

  loadTexts();
});
