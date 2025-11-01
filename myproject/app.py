from flask import (
    Flask, render_template, jsonify, request, redirect,
    url_for, flash, session
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import os
import secrets
import json

from config import Config
from models import db, Set, Card, Text, TextWord, User, UserProgress
from sqlalchemy.orm import joinedload




app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# ------------------------- Старые маршруты -------------------------

@app.route('/sets', methods=['GET'])
def get_sets():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401  # Проверяем, что пользователь вошел в систему

    user_id = session['user_id']
    sets = Set.query.filter_by(user_id=user_id).all()  # Фильтруем наборы по пользователю
    return jsonify([{'id': s.id, 'name': s.name} for s in sets])


@app.route('/sets', methods=['POST'])
def create_set():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401  # Проверяем, что пользователь вошел в систему

    user_id = session['user_id']
    data = request.get_json()
    new_set = Set(name=data['name'], user_id=user_id)  # Привязываем набор к пользователю
    db.session.add(new_set)
    db.session.commit()
    return jsonify({'message': 'Set created successfully', 'id': new_set.id, 'name': new_set.name}), 201


@app.route('/cards/<int:set_id>', methods=['GET'])
def get_cards(set_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = session['user_id']
    set_obj = Set.query.filter_by(id=set_id, user_id=user_id).first()
    if not set_obj:
        return jsonify({'error': 'Set not found or unauthorized'}), 404

    cards = Card.query.filter_by(set_id=set_id).all()
    return jsonify([
        {
            'id': card.id,  
            'character': card.character,
            'pinyin': card.pinyin,
            'translation': card.translation,
            'example': card.example,
            'image_url': card.image_url
        } for card in cards
    ])



@app.route('/cards', methods=['POST'])
def create_card():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401  # Проверяем, что пользователь вошел в систему

    user_id = session['user_id']
    data = request.get_json()

    # Проверяем, что набор принадлежит пользователю
    set_obj = Set.query.filter_by(id=data['set_id'], user_id=user_id).first()
    if not set_obj:
        return jsonify({'error': 'Unauthorized to add card to this set'}), 403

    new_card = Card(
        set_id=data['set_id'],
        character=data['character'],
        pinyin=data.get('pinyin'),
        translation=data.get('translation'),
        example=data.get('example'),
        image_url=data.get('image_url')
    )
    db.session.add(new_card)
    db.session.commit()
    return jsonify({'message': 'Card created successfully'}), 201


@app.route('/cards/update', methods=['POST'])
def update_card():
    data = request.get_json()
    card = Card.query.filter_by(set_id=data['set_id'], character=data['character']).first()
    if card:
        card.pinyin = data.get('pinyin')
        card.translation = data.get('translation')
        card.example = data.get('example')
        card.image_url = data.get('image_url')
        db.session.commit()
        return jsonify({'message': 'Card updated successfully'})
    return jsonify({'error': 'Card not found'}), 404

@app.route('/sets/<int:set_id>', methods=['PUT'])
def update_set(set_id):
    data = request.get_json()
    set_obj = Set.query.get(set_id)
    if not set_obj:
        return jsonify({'error': 'Set not found'}), 404
    set_obj.name = data.get('name', set_obj.name)
    db.session.commit()
    return jsonify({'message': 'Set updated successfully'})

@app.route('/sets/<int:set_id>', methods=['DELETE'])
def delete_set(set_id):
    set_obj = Set.query.get(set_id)
    if not set_obj:
        return jsonify({'error': 'Set not found'}), 404

    Card.query.filter_by(set_id=set_id).delete()
    db.session.delete(set_obj)
    db.session.commit()
    return jsonify({'message': 'Set deleted successfully'})

@app.route('/cards/delete', methods=['POST'])
def delete_card():
    data = request.get_json()
    card = Card.query.filter_by(set_id=data['set_id'], character=data['character']).first()
    if card:
        db.session.delete(card)
        db.session.commit()
        return jsonify({'message': 'Card deleted successfully'})
    return jsonify({'error': 'Card not found'}), 404

@app.route('/studycards')
def studycards():
    return render_template('studycards.html')
@app.route('/flashcards')
def flashcards():
    return render_template('flashcards.html')


@app.route('/')
def index():
    return render_template('index.html')

# ------------------------- Новые маршруты для ТЕКСТОВ -------------------------

@app.route('/add_text')
def add_text_page():
    return render_template('add_text.html')

@app.route('/api/add_text', methods=['POST'])
def add_text():
    try:
        data = request.get_json()

        title = data.get('title')
        description = data.get('description')
        level = data.get('level')
        content_json = data.get('content_json')

        if not all([title, level, content_json]):
            return jsonify({'error': 'Заполните все обязательные поля.'}), 400

        try:
            paragraphs = json.loads(content_json)
        except json.JSONDecodeError:
            return jsonify({'error': 'Неверный формат JSON в содержимом текста.'}), 400

        new_text = Text(title=title, description=description, level=level, created_at=datetime.now(), updated_at=datetime.now())
        db.session.add(new_text)
        db.session.commit()

        order_counter = 0
        for paragraph_index, paragraph in enumerate(paragraphs):
            if paragraph.get('type') == 'paragraph':
                for word_info in paragraph.get('content', []):
                    word = word_info.get('word')
                    pinyin = word_info.get('pinyin')
                    translation = word_info.get('translation')

                    if word:
                        new_word = TextWord(
                            text_id=new_text.id,
                            word=word,
                            pinyin=pinyin,
                            translation=translation,
                            order_num=order_counter,
                            paragraph_index=paragraph_index
                        )
                        db.session.add(new_word)
                        order_counter += 1

        db.session.commit()

        return jsonify({'message': 'Текст успешно добавлен!'}), 200

    except Exception as e:
        print(f"Ошибка сервера: {e}")
        return jsonify({'error': 'Произошла ошибка на сервере.'}), 500

@app.route('/texts')
def texts_page():
    return render_template('ltext.html')

@app.route('/api/texts', methods=['GET'])
def get_texts():
    texts = Text.query.all()
    return jsonify([
        {
            'id': text.id,
            'title': text.title,
            'description': text.description,
            'level': text.level,
            'created_at': text.created_at.strftime('%Y-%m-%d %H:%M:%S') if text.created_at else None
        }
        for text in texts
    ])

@app.route('/read_text/<int:text_id>')
def read_text_page(text_id):
    return render_template('read_text.html')

@app.route('/api/text/<int:text_id>', methods=['GET'])
def get_text_by_id(text_id):
    text = Text.query.get(text_id)
    if not text:
        return jsonify({'error': 'Текст не найден'}), 404

    words = TextWord.query.filter_by(text_id=text_id).order_by(TextWord.paragraph_index, TextWord.order_num).all()

    paragraphs = []
    current_paragraph = []
    last_paragraph_index = None

    for w in words:
        if last_paragraph_index is None:
            last_paragraph_index = w.paragraph_index

        if w.paragraph_index != last_paragraph_index:
            paragraphs.append({
                'type': 'paragraph',
                'content': current_paragraph
            })
            current_paragraph = []
            last_paragraph_index = w.paragraph_index

        current_paragraph.append({
            'word': w.word,
            'pinyin': w.pinyin,
            'translation': w.translation
        })

    if current_paragraph:
        paragraphs.append({
            'type': 'paragraph',
            'content': current_paragraph
        })

    return jsonify({
        'id': text.id,
        'title': text.title,
        'level': text.level,
        'paragraphs': paragraphs
    })
@app.route('/api/text/<int:text_id>', methods=['DELETE'])
def delete_text(text_id):
    try:
        text = Text.query.get(text_id)
        if not text:
            return jsonify({'error': 'Текст не найден'}), 404

        db.session.delete(text)
        db.session.commit()
        return jsonify({'message': 'Текст успешно удален!'}), 200
    except Exception as e:
        print(f"Ошибка сервера: {e}")
        return jsonify({'error': 'Произошла ошибка на сервере.'}), 500
@app.route('/submit_registration', methods=['POST'])
def submit_registration():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    confirm_password = request.form.get('confirm_password')

    if password != confirm_password:
        flash("Пароли не совпадают!", "error")
        return redirect(url_for('register'))

    # Проверка, существует ли уже пользователь с таким email
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        flash("Пользователь с таким email уже существует", "error")
        return redirect(url_for('register'))

    # Хешируем пароль
    hashed_password = generate_password_hash(password)

    # Создаем нового пользователя и сохраняем в базе данных
    new_user = User(username=username, email=email, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    flash("Регистрация прошла успешно", "success")
    return redirect(url_for('login'))  # Перенаправляем на страницу входа после успешной регистрации
@app.route('/register')
def register():
    return render_template('register.html')
@app.route('/login')
def login():
    return render_template('login.html')

app.config['SECRET_KEY'] = secrets.token_hex(16)
@app.route('/submit_login', methods=['POST'])
def submit_login():
    email = request.form.get('email')
    password = request.form.get('password')

    # Проверка наличия пользователя по email
    user = User.query.filter_by(email=email).first()
    
    if user and check_password_hash(user.password, password):  # Используйте функцию проверки пароля
        session['user_id'] = user.id  # Сохраняем ID пользователя в сессии
        session['username'] = user.username  # Сохраняем имя пользователя в сессии
        flash("Вы успешно вошли!", "success")
        return redirect(url_for('index'))  # Перенаправление на главную страницу
    else:
        flash("Неверный email или пароль.", "error")
        return redirect(url_for('login'))  # Перенаправление на страницу входа

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        flash("Пожалуйста, войдите в систему", "warning")
        return redirect(url_for('login'))

    user = User.query.get(session['user_id'])
    user_cards = db.session.query(Card).options(
        joinedload(Card.set)
    ).join(UserProgress).filter(UserProgress.user_id == user.id).all()

    # Дополнительная обработка прогресса, если нужно
    for card in user_cards:
        progress = card.progress[0] if card.progress else None
        if progress:
            progress.status = "Начальный" if progress.repetitions == 0 else ("Средний" if progress.repetitions == 1 else "Продвинутый")
            # Преобразование даты в более удобный формат
            progress.next_review_date_formatted = progress.next_review_date.strftime('%d.%m.%Y') if progress.next_review_date else "Не установлено"

    return render_template('profile.html', user=user, user_cards=user_cards)

@app.route('/reset_progress/<int:card_id>', methods=['POST'])
def reset_progress(card_id):
    user_progress = UserProgress.query.filter_by(card_id=card_id, user_id=session['user_id']).first()
    if user_progress:
        db.session.delete(user_progress)  # Удаление записи прогресса
        db.session.commit()
    return redirect(url_for('profile'))  # Перенаправление обратно на профиль

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    flash("Вы успешно вышли", "success")
    return redirect(url_for('index'))  # Перенаправляем на главную страницу
app.config['UPLOAD_FOLDER'] = 'static/img/avatars'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/upload_avatar', methods=['POST'])
def upload_avatar():
    if 'file' not in request.files:
        flash("Нет файла", "error")
        return redirect(url_for('profile'))

    file = request.files['file']
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            # Сохраняем файл
            file.save(file_path)

            # Обновляем аватар пользователя
            user = User.query.get(session['user_id'])  # Изменяем 'users' на 'user'
            user.avatar = filename  # Обновляем путь к аватару в базе данных
            db.session.commit()

            flash("Аватар обновлен", "success")
        except Exception as e:
            flash(f"Ошибка при загрузке аватара: {str(e)}", "error")
            db.session.rollback()  # В случае ошибки откатываем изменения

        return redirect(url_for('profile'))
    else:
        flash("Неверный формат файла", "error")
        return redirect(url_for('profile'))
@app.route('/api/update_progress', methods=['POST'])
def update_progress():
    try:
        # Проверка авторизации
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Получение данных из запроса
        data = request.get_json()
        card_id = data.get('card_id')
        quality = data.get('quality')

        if card_id is None or quality is None:
            return jsonify({'error': 'Invalid request data'}), 400

        # Получение или создание записи прогресса
        progress = UserProgress.query.filter_by(user_id=user_id, card_id=card_id).first()

        if not progress:
            progress = UserProgress(
                user_id=user_id,
                card_id=card_id,
                repetitions=0,
                interval=1,
                ease_factor=2.5,
                next_review_date=datetime.utcnow()
            )
            db.session.add(progress)

        # Алгоритм SM2 (Spaced Repetition)
        if quality < 3:
            progress.repetitions = 0
            progress.interval = 1
        else:
            progress.repetitions += 1
            if progress.repetitions == 1:
                progress.interval = 1
            elif progress.repetitions == 2:
                progress.interval = 6
            else:
                progress.interval = round(progress.interval * float(progress.ease_factor))

        # Обновление ease_factor
        ef = float(progress.ease_factor)
        ef += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        progress.ease_factor = max(1.3, ef)

        # Назначение новой даты повторения
        progress.next_review_date = datetime.utcnow() + timedelta(days=progress.interval)

        db.session.commit()

        return jsonify({'message': 'Progress updated successfully'})

    except Exception as e:
        print(f"Error in /api/update_progress: {e}")
        return jsonify({'error': 'Failed to update progress'}), 500


@app.route('/api/study_cards', methods=['GET'])
def study_cards():
    user_id = session.get('user_id')
    set_id = request.args.get('set_id')

    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    now = datetime.now()

    # Выбираем карточки, у которых нет прогресса или пора повторять
    cards = db.session.query(Card).outerjoin(UserProgress, (UserProgress.user_id == user_id) & (UserProgress.card_id == Card.id))\
        .filter(Card.set_id == set_id)\
        .filter((UserProgress.next_review_date == None) | (UserProgress.next_review_date <= now))\
        .all()

    return jsonify([
        {
            'id': c.id,
            'character': c.character,
            'pinyin': c.pinyin,
            'translation': c.translation,
            'example': c.example,
            'image_url': c.image_url
        }
        for c in cards
    ])
@app.route("/game-select")
def game_select():
    return render_template("games.html")
@app.route('/api/sets', methods=['GET'])
def api_get_user_sets():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user_id = session['user_id']
    sets = Set.query.filter_by(user_id=user_id).all()
    return jsonify([{'id': s.id, 'name': s.name} for s in sets])
@app.route('/game/guess')
def game_guess():
    if 'user_id' not in session:
        flash("Пожалуйста, войдите в систему", "warning")
        return redirect(url_for('login'))

    return render_template('game_guess.html')
@app.route('/api/game/guess', methods=['GET'])
def get_guess_game_cards():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    set_id = request.args.get('set_id')
    if not set_id:
        return jsonify({'error': 'Missing set_id'}), 400

    user_id = session['user_id']
    cards = Card.query.join(Set).filter(Set.user_id == user_id, Card.set_id == set_id).all()

    if len(cards) < 4:
        return jsonify({'error': 'Недостаточно карточек (нужно минимум 4)'}), 400

    # Перемешиваем и формируем задания
    import random
    random.shuffle(cards)
    quiz_data = []

    for i in range(min(10, len(cards))):
        correct = cards[i]
        others = [c for c in cards if c != correct]
        options = random.sample(others, 3) + [correct]
        random.shuffle(options)
        quiz_data.append({
            'question': {
                'pinyin': correct.pinyin,
                'translation': correct.translation
            },
            'options': [opt.character for opt in options],
            'answer': correct.character
        })

    return jsonify(quiz_data)

@app.route('/api/game/match_pairs', methods=['GET'])
def get_match_pairs():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    set_id = request.args.get('set_id')
    if not set_id:
        return jsonify({'error': 'Missing set_id'}), 400

    user_id = session['user_id']
    cards = Card.query.join(Set).filter(Set.user_id == user_id, Card.set_id == set_id).all()

    if len(cards) < 4:
        return jsonify({'error': 'Недостаточно карточек (нужно минимум 4)'}), 400

    import random
    selected = cards[:10]
    random.shuffle(selected)

    return jsonify([
        {
            'character': c.character,
            'pair': f"{c.pinyin} ({c.translation})"
        } for c in selected
    ])
@app.route('/game/match')
def game_match():
    if 'user_id' not in session:
        flash("Пожалуйста, войдите в систему", "warning")
        return redirect(url_for('login'))
    return render_template('game_match.html')
@app.route('/api/game/dictation', methods=['GET'])
def get_dictation_words():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    set_id = request.args.get('set_id')
    if not set_id:
        return jsonify({'error': 'Missing set_id'}), 400

    user_id = session['user_id']
    cards = Card.query.join(Set).filter(Set.user_id == user_id, Card.set_id == set_id).all()

    if len(cards) < 1:
        return jsonify({'error': 'Недостаточно карточек'}), 400

    import random
    random.shuffle(cards)

    return jsonify([
        {'character': c.character, 'translation': c.translation} for c in cards[:20]
    ])
@app.route('/game/dictation')
def game_dictation():
    # Проверка на авторизацию
    if 'user_id' not in session:
        flash("Пожалуйста, войдите в систему", "warning")
        return redirect(url_for('login'))  # Перенаправление на страницу входа

    return render_template('game_dictation.html')  # Рендеринг страницы игры

if __name__ == '__main__':

    app.run(debug=True)
