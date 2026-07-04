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


def video_row_to_dict(r):
    return {
        'id': r[0], 'title': r[1], 'description': r[2], 'video_url': r[3],
        'cover_url': r[4], 'views': r[5], 'created_at': r[6].isoformat(),
        'author': {'id': r[7], 'username': r[8]},
        'likes_count': r[9]
    }


def handler(event: dict, context) -> dict:
    '''Видео-платформа PLAYER TUBE: загрузка видео, лента, детали видео, лайки, подписки на авторов, просмотры'''
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
                "SELECT v.id, v.title, v.description, v.video_url, v.cover_url, v.views, v.created_at, "
                "u.id, u.username, "
                "(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) "
                "FROM videos v JOIN users u ON u.id = v.user_id "
                "WHERE v.user_id = %s ORDER BY v.created_at DESC" % user['id']
            )
            rows = cur.fetchall()
            videos = [video_row_to_dict(r) for r in rows]

            cur.execute("SELECT COUNT(*) FROM subscriptions WHERE channel_id = %s" % user['id'])
            subscribers_count = cur.fetchone()[0]

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'user': user, 'videos': videos, 'subscribers_count': subscribers_count})
            }

        if method == 'GET' and action == 'list':
            cur.execute(
                "SELECT v.id, v.title, v.description, v.video_url, v.cover_url, v.views, v.created_at, "
                "u.id, u.username, "
                "(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) "
                "FROM videos v JOIN users u ON u.id = v.user_id "
                "ORDER BY v.created_at DESC LIMIT 100"
            )
            rows = cur.fetchall()
            videos = [video_row_to_dict(r) for r in rows]

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'videos': videos})}

        if method == 'GET' and action == 'get':
            video_id = params.get('id', '')
            if not video_id.isdigit():
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id видео'})}

            cur.execute(
                "SELECT v.id, v.title, v.description, v.video_url, v.cover_url, v.views, v.created_at, "
                "u.id, u.username, "
                "(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) "
                "FROM videos v JOIN users u ON u.id = v.user_id WHERE v.id = %s" % video_id
            )
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Видео не найдено'})}

            video = video_row_to_dict(row)
            author_id = row[7]

            cur.execute("SELECT COUNT(*) FROM subscriptions WHERE channel_id = %s" % author_id)
            video['author']['subscribers_count'] = cur.fetchone()[0]

            user = get_user_from_token(cur, token)
            video['is_liked'] = False
            video['is_subscribed'] = False
            if user:
                cur.execute(
                    "SELECT 1 FROM likes WHERE user_id = %s AND video_id = %s" % (user['id'], video_id)
                )
                video['is_liked'] = cur.fetchone() is not None
                cur.execute(
                    "SELECT 1 FROM subscriptions WHERE subscriber_id = %s AND channel_id = %s" % (user['id'], author_id)
                )
                video['is_subscribed'] = cur.fetchone() is not None

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'video': video})}

        if method == 'GET' and action == 'authors':
            cur.execute(
                "SELECT u.id, u.username, "
                "(SELECT COUNT(*) FROM videos v WHERE v.user_id = u.id) as video_count, "
                "(SELECT COUNT(*) FROM subscriptions s WHERE s.channel_id = u.id) as subscribers_count "
                "FROM users u ORDER BY video_count DESC"
            )
            rows = cur.fetchall()
            authors = [{
                'id': r[0], 'username': r[1], 'video_count': r[2], 'subscribers_count': r[3]
            } for r in rows]

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'authors': authors})}

        if method == 'GET' and action == 'channel':
            channel_id = params.get('id', '')
            if not channel_id.isdigit():
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id канала'})}

            cur.execute("SELECT id, username FROM users WHERE id = %s" % channel_id)
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Канал не найден'})}
            channel_user = {'id': row[0], 'username': row[1]}

            cur.execute(
                "SELECT v.id, v.title, v.description, v.video_url, v.cover_url, v.views, v.created_at, "
                "u.id, u.username, "
                "(SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) "
                "FROM videos v JOIN users u ON u.id = v.user_id "
                "WHERE v.user_id = %s ORDER BY v.created_at DESC" % channel_id
            )
            videos = [video_row_to_dict(r) for r in cur.fetchall()]

            cur.execute("SELECT COUNT(*) FROM subscriptions WHERE channel_id = %s" % channel_id)
            subscribers_count = cur.fetchone()[0]

            is_subscribed = False
            user = get_user_from_token(cur, token)
            if user:
                cur.execute(
                    "SELECT 1 FROM subscriptions WHERE subscriber_id = %s AND channel_id = %s" % (user['id'], channel_id)
                )
                is_subscribed = cur.fetchone() is not None

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'channel': channel_user,
                    'videos': videos,
                    'subscribers_count': subscribers_count,
                    'is_subscribed': is_subscribed
                })
            }

        if method == 'POST' and action == 'view':
            video_id = params.get('id', '')
            if not video_id.isdigit():
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id видео'})}

            cur.execute("UPDATE videos SET views = views + 1 WHERE id = %s RETURNING views" % video_id)
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Видео не найдено'})}

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'views': row[0]})}

        if method == 'POST' and action == 'like':
            user = get_user_from_token(cur, token)
            if not user:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Требуется авторизация'})}

            video_id = params.get('id', '')
            if not video_id.isdigit():
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id видео'})}

            cur.execute("SELECT 1 FROM likes WHERE user_id = %s AND video_id = %s" % (user['id'], video_id))
            already_liked = cur.fetchone() is not None

            if already_liked:
                cur.execute("DELETE FROM likes WHERE user_id = %s AND video_id = %s" % (user['id'], video_id))
                liked = False
            else:
                cur.execute("INSERT INTO likes (user_id, video_id) VALUES (%s, %s)" % (user['id'], video_id))
                liked = True

            cur.execute("SELECT COUNT(*) FROM likes WHERE video_id = %s" % video_id)
            likes_count = cur.fetchone()[0]

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'liked': liked, 'likes_count': likes_count})}

        if method == 'POST' and action == 'subscribe':
            user = get_user_from_token(cur, token)
            if not user:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Требуется авторизация'})}

            channel_id = params.get('channel_id', '')
            if not channel_id.isdigit():
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id канала'})}

            if str(user['id']) == channel_id:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя подписаться на себя'})}

            cur.execute(
                "SELECT 1 FROM subscriptions WHERE subscriber_id = %s AND channel_id = %s" % (user['id'], channel_id)
            )
            already_subscribed = cur.fetchone() is not None

            if already_subscribed:
                cur.execute(
                    "DELETE FROM subscriptions WHERE subscriber_id = %s AND channel_id = %s" % (user['id'], channel_id)
                )
                subscribed = False
            else:
                cur.execute(
                    "INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (%s, %s)" % (user['id'], channel_id)
                )
                subscribed = True

            cur.execute("SELECT COUNT(*) FROM subscriptions WHERE channel_id = %s" % channel_id)
            subscribers_count = cur.fetchone()[0]

            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'subscribed': subscribed, 'subscribers_count': subscribers_count})
            }

        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестное действие'})}

    finally:
        cur.close()
        conn.close()
