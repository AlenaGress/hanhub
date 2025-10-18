document.addEventListener("DOMContentLoaded", function() {
    // Функция для сброса прогресса
    function resetProgress(cardId) {
      fetch(`/reset_progress/${cardId}`, {
        method: 'POST'
      }).then(response => {
        if (response.ok) {
          alert('Прогресс сброшен!');
          window.location.reload(); // Перезагружаем страницу для обновления данных
        } else {
          alert('Ошибка сброса прогресса');
        }
      });
    }
  
    // Получаем все кнопки сброса прогресса и привязываем обработчики
    const resetButtons = document.querySelectorAll(".progress-table button");
    resetButtons.forEach(button => {
      button.addEventListener("click", function() {
        const cardId = this.getAttribute("data-card-id");
        resetProgress(cardId);
      });
    });
  });
  