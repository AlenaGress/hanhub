document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('addTextForm');
    const messageDiv = document.getElementById('message');

    // Обработка отправки формы для добавления текста
    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const level = document.getElementById('level').value;
        const contentJson = document.getElementById('contentJson').value.trim();

        // Проверка на корректность формата JSON
        let parsedContent;
        try {
            parsedContent = JSON.parse(contentJson);

            if (!Array.isArray(parsedContent)) {
                throw new Error('JSON должен быть массивом []');
            }
        } catch (error) {
            messageDiv.textContent = 'Ошибка в формате JSON: ' + error.message;
            messageDiv.style.color = 'red';
            console.error('Неверный JSON:', error);
            return;
        }

        // Если JSON валидный — отправляем данные
        const formData = {
            title: title,
            description: description,
            level: level,
            content_json: JSON.stringify(parsedContent)
        };

        try {
            const response = await fetch('/api/add_text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                messageDiv.textContent = 'Текст успешно добавлен!';
                messageDiv.style.color = '#4CAF50';
                form.reset();
                loadTexts(); // Перезагружаем список текстов
            } else {
                messageDiv.textContent = result.error || 'Произошла ошибка при добавлении текста.';
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Ошибка при отправке:', error);
            messageDiv.textContent = 'Не удалось отправить данные. Проверьте соединение с сервером.';
            messageDiv.style.color = 'red';
        }
    });

    // Функция для загрузки всех текстов
    async function loadTexts() {
        const response = await fetch('/api/texts');
        const texts = await response.json();
        const textsList = document.getElementById('textsList');
        textsList.innerHTML = ''; // Очищаем текущий список
        
        texts.forEach(text => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${text.title}</td>
                <td>${text.description}</td>
                <td>${text.level}</td>
                <td><button class="delete-btn" data-id="${text.id}">Удалить</button></td>
            `;
            textsList.appendChild(row);
        });

        // Добавляем обработчик для кнопок удаления
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async function () {
                const textId = button.getAttribute('data-id');
                try {
                    const response = await fetch(`/api/text/${textId}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();
                    if (response.ok) {
                        alert('Текст успешно удален!');
                        loadTexts(); // Перезагружаем список текстов
                    } else {
                        alert('Ошибка при удалении текста.');
                    }
                } catch (error) {
                    console.error('Ошибка при удалении:', error);
                }
            });
        });
    }

    loadTexts(); // Загружаем тексты при загрузке страницы
});
