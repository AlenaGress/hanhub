let words = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch(`/api/game/dictation?set_id=${setId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.getElementById("game-area").innerHTML = `<p>${data.error}</p>`;
        return;
      }
      words = data;
      displayQuestion();
    });

  document.getElementById("submit-btn").addEventListener("click", () => {
    const userInput = document.getElementById("answer-input").value.trim();
    const correct = words[currentIndex].character;
    const feedback = document.getElementById("feedback");

    if (userInput === correct) {
      feedback.textContent = "✅ Верно!";
      feedback.className = "feedback correct";
    } else {
      feedback.textContent = `❌ Неверно. Правильный ответ: ${correct}`;
      feedback.className = "feedback wrong";
    }

    currentIndex++;
    document.getElementById("answer-input").value = "";

    if (currentIndex < words.length) {
      setTimeout(() => {
        feedback.textContent = "";
        displayQuestion();
      }, 1500);
    } else {
      document.getElementById("game-area").innerHTML = "<p>Игра окончена! 🎉</p>";
    }
  });
});

function displayQuestion() {
  const currentWord = words[currentIndex];
  document.getElementById("translation").textContent = currentWord.translation;
}
