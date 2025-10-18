document.addEventListener('DOMContentLoaded', function () {
  const textTitle = document.getElementById('textTitle');
  const textMeta = document.getElementById('textMeta');
  const textContent = document.getElementById('textContent');
  const textAudioPlayer = document.getElementById('textAudioPlayer');
  const textId = window.location.pathname.split('/').pop();

  async function loadText() {
    try {
      const response = await fetch(`/api/text/${textId}`);
      const data = await response.json();

      textTitle.textContent = data.title;
      textMeta.textContent = `Уровень: ${data.level}`;

      textContent.innerHTML = '';

      data.paragraphs.forEach(block => {
        if (block.type === 'paragraph') {
          const p = document.createElement('p');
          block.content.forEach(word => {
            if (word.word === '，' || word.word === '。' || word.word === '！' || word.word === '？') {
              p.append(word.word);
            } else {
              const span = document.createElement('span');
              span.className = 'tooltip';
              span.dataset.word = word.word || '';
              span.dataset.pinyin = word.pinyin || '';
              span.dataset.translation = word.translation || '';
              span.innerHTML = `
                <div class="tooltip-word">
                  <div class="word">${word.word}</div>
                  <div class="pinyin">${word.pinyin || ''}</div> <!-- Пиньинь будет показываться над иероглифом -->
                </div>
                <div class="tooltip-content">
                  <div class="word-info">
                    <div>${word.pinyin || ''}</div>
                    <div>${word.translation || ''}</div>
                  </div>
                  <div class="tooltip-buttons">
                    <button class="speak-btn" onclick="speakWord('${word.word}')">🔊</button>
                    <button class="add-btn" onclick="openAddWordModal('${word.word}', '${word.pinyin}', '${word.translation}')">➕</button>
                  </div>
                </div>
              `;
              p.appendChild(span);
              p.append(' ');
            }
          });
          textContent.appendChild(p);
        }
      });

      // После загрузки текста — загружаем аудиофайл
      setAudioSource();

    } catch (error) {
      console.error('Ошибка загрузки текста:', error);
      textContent.innerHTML = '<p>Ошибка загрузки текста.</p>';
    }
  }

  loadText();

  // Установить путь к аудиофайлу
  function setAudioSource() {
    if (textAudioPlayer) {
      textAudioPlayer.src = `/static/audio/text_${textId}.mp3`;
    }
  }
});

// Функции для кнопок
function toggleTranslation() {
  document.querySelectorAll('.tooltip').forEach(el => {
    if (el.dataset.translation) {
      el.title = el.dataset.translation;
    }
  });
}

function togglePinyin() {
  document.querySelectorAll('.tooltip').forEach(el => {
    if (el.getAttribute('data-show-pinyin') === 'true') {
      el.classList.remove('show-pinyin'); // Скрыть пиньинь
      el.removeAttribute('data-show-pinyin');
    } else {
      el.classList.add('show-pinyin'); // Показать пиньинь
      el.setAttribute('data-show-pinyin', 'true');
    }
  });
}

function playText() {
  const text = Array.from(document.querySelectorAll('.tooltip'))
    .map(el => el.dataset.word || el.textContent)
    .join('');
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  speechSynthesis.speak(utterance);
}

// ----------------- Новые функции -----------------

// Озвучить отдельное слово
function speakWord(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'zh-CN';
  speechSynthesis.speak(utterance);
}

// Открыть модалку добавления слова
let selectedWordData = {};

function openAddWordModal(word, pinyin, translation) {
  selectedWordData = { word, pinyin, translation };
  document.getElementById('selectedWordDisplay').textContent = `Слово: ${word}`;
  loadSets();
  document.getElementById('addWordModal').classList.add('active');
}

// Закрыть модалку
function closeAddWordModal() {
  document.getElementById('addWordModal').classList.remove('active');
}

// Загрузить доступные наборы
async function loadSets() {
  try {
    const response = await fetch('/sets');
    const sets = await response.json();
    const dropdown = document.getElementById('setsDropdown');
    dropdown.innerHTML = '';

    sets.forEach(set => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = set.name;
      dropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Ошибка загрузки сетов:', error);
  }
}

// Подтвердить добавление слова
async function confirmAddWord() {
  const setId = document.getElementById('setsDropdown').value;

  const payload = {
    set_id: setId,
    character: selectedWordData.word,
    pinyin: selectedWordData.pinyin,
    translation: selectedWordData.translation,
    example: '', // можно дополнить примером
    image_url: '' // можно добавить картинку
  };

  try {
    const response = await fetch('/cards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok) {
      alert('Слово добавлено успешно!');
      closeAddWordModal();
    } else {
      alert('Ошибка при добавлении слова: ' + result.error);
    }

  } catch (error) {
    console.error('Ошибка при добавлении слова:', error);
  }
}
