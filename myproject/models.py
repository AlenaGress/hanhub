from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# --- Наборы карточек ---

class Set(db.Model):
    __tablename__ = 'sets'  # Имя таблицы

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Привязка к пользователю
    user = db.relationship('User', backref='sets', lazy=True)  # Обратная связь
    cards = db.relationship('Card', backref='set_of_cards', lazy=True, cascade="all, delete-orphan")  # Переименовано на 'set_of_cards'


class Card(db.Model):
    __tablename__ = 'cards'

    id = db.Column(db.Integer, primary_key=True)
    set_id = db.Column(db.Integer, db.ForeignKey('sets.id'), nullable=False)
    set = db.relationship('Set', backref='set_of_cards')
    character = db.Column(db.String(50), nullable=False)
    pinyin = db.Column(db.String(50))
    translation = db.Column(db.Text)
    example = db.Column(db.Text)
    image_url = db.Column(db.String(255))

    # ✅ ДОБАВЬ ЭТУ СТРОКУ:
    progress = db.relationship("UserProgress", back_populates="card", cascade="all, delete-orphan")


# --- Прогресс пользователя ---

class UserProgress(db.Model):
    __tablename__ = 'user_progress'

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)  # Внешний ключ для пользователя
    card_id = db.Column(db.Integer, db.ForeignKey('cards.id'), primary_key=True)  # Внешний ключ для карточки
    next_review_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    interval = db.Column(db.Integer, default=1)
    ease_factor = db.Column(db.Numeric(3, 2), default=2.5)
    repetitions = db.Column(db.Integer, default=0)

    # связи
    user = db.relationship("User", back_populates="progress")
    card = db.relationship("Card", back_populates="progress")

# --- Тексты для чтения ---

class Text(db.Model):
    __tablename__ = 'texts'  # Имя таблицы

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    level = db.Column(db.String(20))
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)
    words = db.relationship('TextWord', backref='text', lazy=True, cascade="all, delete-orphan")


class TextWord(db.Model):
    __tablename__ = 'text_words'

    id = db.Column(db.Integer, primary_key=True)
    text_id = db.Column(db.Integer, db.ForeignKey('texts.id'), nullable=False)
    word = db.Column(db.String(255), nullable=False)
    pinyin = db.Column(db.String(255))
    translation = db.Column(db.Text)
    order_num = db.Column(db.Integer)
    paragraph_index = db.Column(db.Integer, nullable=False, default=0)  # Новое поле


# --- Пользователи ---

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    avatar = db.Column(db.String(200), default='default_avatar.png')  # Путь по умолчанию

    # Связь с прогрессом
    progress = db.relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.username}>'
