import json
import os
import re
import hashlib
import secrets as secrets_lib
from datetime import datetime, timedelta
import psycopg2


def hash_password(password: str) -> str:
    salt = os.environ.get('PASSWORD_SALT', 'video_platform_salt')
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def is_valid_email(email: str) -> bool:
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email))


def handler(event: dict, context) -> dict:
    '''Регистрация и вход пользователей видео-платформы: создание аккаунта, авторизация по email/паролю, выдача токена сессии'''
    method: str = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    dsn = os.environ['DATABASE_URL']
    conn = psycopg2.connect(dsn)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        params = event.get('queryStringParameters') or {}
        action = params.get('action', '')
        body_data = json.loads(event.get('body') or '{}')

        if method == 'POST' and action == 'register':
            email = (body_data.get('email') or '').strip().lower()
            password = body_data.get('password') or ''
            username = (body_data.get('username') or '').strip()

            if not email or not is_valid_email(email):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный email'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль должен быть не менее 6 символов'})}
            if not username:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите имя пользователя'})}

            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Пользователь с таким email уже существует'})}

            password_hash = hash_password(password)
            cur.execute(
                "INSERT INTO users (email, password_hash, username) VALUES (%s, %s, %s) RETURNING id, email, username",
                (email, password_hash, username)
            )
            user_id, user_email, user_username = cur.fetchone()

            token = secrets_lib.token_hex(32)
            expires_at = datetime.utcnow() + timedelta(days=30)
            cur.execute(
                "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, token, expires_at.isoformat())
            )

            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'token': token,
                    'user': {'id': user_id, 'email': user_email, 'username': user_username}
                })
            }

        if method == 'POST' and action == 'login':
            email = (body_data.get('email') or '').strip().lower()
            password = body_data.get('password') or ''

            if not email or not password:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите email и пароль'})}

            password_hash = hash_password(password)
            cur.execute(
                "SELECT id, email, username FROM users WHERE email = %s AND password_hash = %s",
                (email, password_hash)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный email или пароль'})}

            user_id, user_email, user_username = row
            token = secrets_lib.token_hex(32)
            expires_at = datetime.utcnow() + timedelta(days=30)
            cur.execute(
                "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, token, expires_at.isoformat())
            )

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'token': token,
                    'user': {'id': user_id, 'email': user_email, 'username': user_username}
                })
            }

        if method == 'GET' and action == 'me':
            auth_header = event.get('headers', {}).get('X-Authorization') or event.get('headers', {}).get('x-authorization') or ''
            token = auth_header.replace('Bearer ', '').strip()

            if not token:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Требуется авторизация'})}

            cur.execute(
                "SELECT u.id, u.email, u.username FROM sessions s "
                "JOIN users u ON u.id = s.user_id "
                "WHERE s.token = %s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Сессия недействительна'})}

            user_id, user_email, user_username = row
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'user': {'id': user_id, 'email': user_email, 'username': user_username}})
            }

        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        cur.close()
        conn.close()
