document.addEventListener("DOMContentLoaded", () => {
  const setList = document.getElementById("set-list");
  const newSetInput = document.getElementById("new-set-name");
  const addSetBtn = document.getElementById("add-set-btn");

  const addCardBtn = document.getElementById("add-card-btn");
  const characterInput = document.getElementById("card-character");
  const pinyinInput = document.getElementById("card-pinyin");
  const translationInput = document.getElementById("card-translation");
  const exampleInput = document.getElementById("card-example");
  const imageUrlInput = document.getElementById("card-image-url");

  function loadSets() {
    fetch('/sets')
      .then(res => res.json())
      .then(sets => {
        setList.innerHTML = '';

        sets.forEach((set) => {
          const li = document.createElement("li");
          li.classList.add("set-item");
          li.setAttribute("data-set-id", set.id);
          li.innerHTML = `
            <span class="label">${set.name}</span>
            <span class="actions">
              <button class="view">Просмотр</button>
              <button class="edit-set">✏️</button>
              <button class="delete-set">🗑️</button>
            </span>
          `;

          li.querySelector(".view").addEventListener("click", () => {
            fetch(`/cards/${set.id}`)
              .then(res => res.json())
              .then(cards => showCardsInTable(cards, set.id));
          });

          li.querySelector(".edit-set").addEventListener("click", () => {
            const newName = prompt("Введите новое имя набора:", set.name);
            if (!newName) return;
            fetch(`/sets/${set.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName })
            }).then(() => loadSets());
          });

          li.querySelector(".delete-set").addEventListener("click", () => {
            if (!confirm(`Удалить набор "${set.name}"?`)) return;
            fetch(`/sets/${set.id}`, { method: "DELETE" }).then(() => loadSets());
          });

          setList.appendChild(li);
        });
      });
  }

  addSetBtn.addEventListener("click", () => {
    const setName = newSetInput.value.trim();
    if (!setName) return;

    fetch('/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: setName })
    }).then(res => res.json()).then(() => {
      loadSets();
      newSetInput.value = "";
    });
  });

  addCardBtn.addEventListener("click", () => {
    const setId = document.getElementById("table-view").getAttribute("data-set-id");
    const character = characterInput.value.trim();
    const pinyin = pinyinInput.value.trim();
    const translation = translationInput.value.trim();
    const example = exampleInput.value.trim();
    const image_url = imageUrlInput.value.trim();

    if (!setId || !character) {
      alert("Откройте набор и введите иероглиф.");
      return;
    }

    fetch('/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set_id: setId, character, pinyin, translation, example, image_url })
    }).then(res => res.json()).then(() => {
      fetch(`/cards/${setId}`).then(res => res.json()).then(cards => showCardsInTable(cards, setId));
      characterInput.value = "";
      pinyinInput.value = "";
      translationInput.value = "";
      exampleInput.value = "";
      imageUrlInput.value = "";
    });
  });

  document.querySelector(".hide-table").addEventListener("click", () => {
    document.getElementById("table-view").style.display = "none";
  });

  document.querySelector(".import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const setId = document.getElementById("table-view").getAttribute("data-set-id");
    if (!file || !setId) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(worksheet);

      for (const card of json) {
        card.set_id = setId;
        await fetch('/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(card)
        });
      }

      fetch(`/cards/${setId}`).then(res => res.json()).then(cards => showCardsInTable(cards, setId));

      document.getElementById("import-file").value = "";
    };

    reader.readAsArrayBuffer(file);
  });

  loadSets();
});

function showCardsInTable(cards, setId) {
  const tableView = document.getElementById("table-view");
  const tbody = document.getElementById("word-table-body");
  tbody.innerHTML = "";

  if (cards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Нет карточек в этом наборе.</td></tr>`;
  } else {
    cards.forEach(card => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${card.character}</td>
        <td>${card.pinyin || ''}</td>
        <td>${card.translation || ''}</td>
        <td>${card.example || ''}</td>
        <td>${card.image_url ? `<img src="${card.image_url}" width="50">` : ''}</td>
        <td>
          <button class="edit-card-btn">✏️</button>
          <button class="delete-card-btn">🗑️</button>
        </td>
      `;

      const editBtn = row.querySelector('.edit-card-btn');
      let isEditing = false;
      editBtn.addEventListener('click', async () => {
        const cells = row.querySelectorAll('td');
        if (!isEditing) {
          cells.forEach((cell, idx) => {
            if (idx < 5) {
              cell.contentEditable = true;
              cell.style.backgroundColor = '#f0f8ff';
            }
          });
          editBtn.textContent = '💾';
        } else {
          const updatedCard = {
            character: cells[0].innerText.trim(),
            pinyin: cells[1].innerText.trim(),
            translation: cells[2].innerText.trim(),
            example: cells[3].innerText.trim(),
            image_url: cells[4].querySelector('img') ? cells[4].querySelector('img').src : '',
            set_id: setId
          };

          await fetch('/cards/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCard)
          });

          cells.forEach((cell, idx) => {
            if (idx < 5) {
              cell.contentEditable = false;
              cell.style.backgroundColor = '';
            }
          });
          editBtn.textContent = '✏️';
          alert('✅ Изменения сохранены!');
        }
        isEditing = !isEditing;
      });

      row.querySelector('.delete-card-btn').addEventListener('click', async () => {
        if (confirm('Удалить эту карточку?')) {
          await fetch('/cards/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ set_id: setId, character: card.character })
          });
          row.classList.add('fade-out');
          setTimeout(() => {
            row.remove();
          }, 300);
          alert('✅ Карточка удалена!');
        }
      });

      tbody.appendChild(row);
    });
  }

  tableView.style.display = "block";
  tableView.setAttribute("data-set-id", setId);
}

document.getElementById("start-learning-btn").addEventListener("click", () => {
  window.location.href = "/studycards";
});
