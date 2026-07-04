import json
import os
import base64
import uuid
import boto3
import psycopg2


def get_user_from_token(cur, token: str):
    if not token:
        return None
    token_esc = token.replace("'", "''")
    cur.execute(
        "SELECT u.id, u.email, u.username FROM sessions s "
        "JOIN users u ON u.id = s.user_id "
        "WHERE s.token = '%s' AND s.expires_at > NOW()" % token_esc
    )
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'email': row[1], 'username': row[2]}


def upload_to_s3(base64_data: str, folder: str, filename: str, content_type: str) -> str:
    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    data = base64.b64decode(base64_data)
    ext = filename.split('.')[-1] if '.' in filename else 'bin'
    key = f"{folder}/{uuid.uuid4().hex}.{ext}"
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType=content_type)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    '''Загрузка видео пользователями и получение списков видео: своего канала, конкретного пользователя или общей ленты'''
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
        req_headers = event.get('headers', {})
        auth_header = req_headers.get('X-Authorization') or req_headers.get('x-authorization') or ''
        token = auth_header.replace('Bearer ', '').strip()

        if method == 'POST' and action == 'upload':
            user = get_user_from_token(cur, token)
            if not user:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Требуется авторизация'})}

            body_data = json.loads(event.get('body') or '{}')
            title = (body_data.get('title') or '').strip()
            description = (body_data.get('description') or '').strip()
            video_base64 = body_data.get('video_base64')
            video_filename = body_data.get('video_filename') or 'video.mp4'
            video_content_type = body_data.get('video_content_type') or 'video/mp4'
            cover_base64 = body_data.get('cover_base64')
            cover_filename = body_data.get('cover_filename') or 'cover.jpg'
            cover_content_type = body_data.get('cover_content_type') or 'image/jpeg'

            if not title:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите название видео'})}
            if not video_base64:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Видео файл обязателен'})}

            video_url = upload_to_s3(video_base64, 'videos', video_filename, video_content_type)
            cover_url = ''
            if cover_base64:
                cover_url = upload_to_s3(cover_base64, 'covers', cover_filename, cover_content_type)

            title_esc = title.replace("'", "''")
            desc_esc = description.replace("'", "''")
            cur.execute(
                "INSERT INTO videos (user_id, title, description, video_url, cover_url) "
                "VALUES (%s, '%s', '%s', '%s', '%s') RETURNING id, created_at" % (
                    user['id'], title_esc, desc_esc, video_url, cover_url
                )
            )
            video_id, created_at = cur.fetchone()

            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({
                    'video': {
                        'id': video_id,
                        'title': title,
                        'description': description,
                        'video_url': video_url,
                        'cover_url': cover_url,
                        'created_at': created_at.isoformat()
                    }
                })
            }

        if method == 'GET' and action == 'my':
            user = get_user_from_token(cur, token)
            if not user:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Требуется авторизация'})}

            cur.execute(
                "SELECT id, title, description, video_url, cover_url, views, created_at "
                "FROM videos WHERE user_id = %s ORDER BY created_at DESC" % user['id']
            )
            rows = cur.fetchall()
            videos = [{
                'id': r[0], 'title': r[1], 'description': r[2], 'video_url': r[3],
                'cover_url': r[4], 'views': r[5], 'created_at': r[6].isoformat()
            } for r in rows]

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'user': user, 'videos': videos})
            }

        if method == 'GET' and action == 'list':
            cur.execute(
                "SELECT v.id, v.title, v.description, v.video_url, v.cover_url, v.views, v.created_at, "
                "u.id, u.username FROM videos v JOIN users u ON u.id = v.user_id "
                "ORDER BY v.created_at DESC LIMIT 50"
            )
            rows = cur.fetchall()
            videos = [{
                'id': r[0], 'title': r[1], 'description': r[2], 'video_url': r[3],
                'cover_url': r[4], 'views': r[5], 'created_at': r[6].isoformat(),
                'author': {'id': r[7], 'username': r[8]}
            } for r in rows]

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'videos': videos})}

        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        cur.close()
        conn.close()
