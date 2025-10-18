let quizData = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetch(`/api/game/guess?set_id=${setId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.getElementById("game-area").innerHTML = `<p>${data.error}</p>`;
        return;
      }
      quizData = data;
      showQuestion();
    });

  document.getElementById("next-btn").addEventListener("click", () => {
    currentIndex++;
    if (currentIndex < quizData.length) {
      showQuestion();
    } else {
      document.getElementById("game-area").innerHTML = `<p>Игра окончена! 🎉</p>`;
    }
  });
});

function showQuestion() {
  const q = quizData[currentIndex];
  document.querySelector(".question-text").textContent =
    `Какой иероглиф соответствует: ${q.question.pinyin} (${q.question.translation})?`;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";
  document.getElementById("result").textContent = "";
  document.getElementById("next-btn").style.display = "none";

  q.options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.classList.add("option-btn");
    btn.addEventListener("click", () => {
      if (option === q.answer) {
        document.getElementById("result").textContent = "✅ Верно!";
        btn.classList.add("correct");
      } else {
        document.getElementById("result").textContent = `❌ Неверно. Правильный ответ: ${q.answer}`;
        btn.classList.add("wrong");
      }
      document.getElementById("next-btn").style.display = "block";
      document.querySelectorAll(".option-btn").forEach(b => b.disabled = true);
    });
    optionsDiv.appendChild(btn);
  });
}
