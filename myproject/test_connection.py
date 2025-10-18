import pymysql

conn = pymysql.connect(
    host="localhost",
    user="root",
    password="Alena2017.",
    database="flashcards_db"
)

print("✅ Успешно подключено!")
conn.close()
