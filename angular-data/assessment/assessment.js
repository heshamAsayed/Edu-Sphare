document.addEventListener('DOMContentLoaded', () => {
    const questions = [
        {
            title: "ما هو نوع البيانات المستخدم عادةً لتخزين النصوص مثل اسم الطالب؟",
            options: ["Integer (عدد صحيح)", "String (نص)", "Boolean (قيمة منطقية)", "Array (مصفوفة)"],
            correctIndex: 1
        },
        {
            title: "ما هي الكلمة المفتاحية المستخدمة لتعريف ثابت في معظم اللغات الحديثة؟",
            options: ["var", "let", "const", "static"],
            correctIndex: 2
        },
        {
            title: "أي من التالي يمثل بنية تكرارية (Loop)؟",
            options: ["if / else", "switch", "for", "try / catch"],
            correctIndex: 2
        }
    ];

    let currentIndex = 0;
    let userAnswers = {};

    const questionNumber = document.getElementById('questionNumber');
    const questionTitle = document.getElementById('questionTitle');
    const answersGroup = document.getElementById('answersGroup');
    const btnPrev = document.getElementById('btnPrevQuestion');
    const btnNext = document.getElementById('btnNextQuestion');
    const questionCard = document.getElementById('questionCard');
    const quizResultCard = document.getElementById('quizResultCard');
    const scoreText = document.getElementById('scoreText');
    const quizProgressBar = document.getElementById('quizProgressBar');
    const quizProgressText = document.getElementById('quizProgressText');

    function renderQuestion(index) {
        const q = questions[index];
        questionNumber.textContent = `سؤال ${index + 1} من ${questions.length}`;
        questionTitle.textContent = q.title;

        answersGroup.innerHTML = '';
        q.options.forEach((opt, optIndex) => {
            const label = document.createElement('label');
            label.className = 'answer-option';
            const isChecked = userAnswers[index] === optIndex;
            label.innerHTML = `
                <input type="radio" name="quizAnswer" value="${optIndex}" ${isChecked ? 'checked' : ''}>
                <span>${opt}</span>
            `;

            label.querySelector('input').addEventListener('change', () => {
                userAnswers[index] = optIndex;
            });

            answersGroup.appendChild(label);
        });

        btnPrev.disabled = index === 0;
        btnNext.textContent = index === questions.length - 1 ? 'إنهاء الاختبار ✓' : 'السؤال التالي →';

        const progress = Math.round(((index + 1) / questions.length) * 100);
        quizProgressBar.style.width = `${progress}%`;
        quizProgressText.textContent = `${progress}%`;
    }

    btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion(currentIndex);
        }
    });

    btnNext.addEventListener('click', () => {
        if (userAnswers[currentIndex] === undefined) {
            alert('من فضلك اختر إجابة أولاً.');
            return;
        }

        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion(currentIndex);
        } else {
            // Finish Quiz
            let score = 0;
            questions.forEach((q, i) => {
                if (userAnswers[i] === q.correctIndex) score++;
            });

            questionCard.style.display = 'none';
            quizResultCard.style.display = 'block';
            scoreText.textContent = `لقد أحرزت ${score} من ${questions.length} إجابات صحيحة (${Math.round((score / questions.length) * 100)}%)`;
        }
    });

    renderQuestion(0);
});
