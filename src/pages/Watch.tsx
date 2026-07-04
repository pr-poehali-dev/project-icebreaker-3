import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import Navbar from '@/components/landing/Navbar'
import { useToast } from '@/hooks/use-toast'
import { getAuthToken } from '@/hooks/use-auth'

const VIDEOS_URL = 'https://functions.poehali.dev/7a8fdbb4-fa1b-4fb7-a400-a6526b5ad9c4'

interface VideoDetails {
  id: number
  title: string
  description: string
  video_url: string
  cover_url: string
  views: number
  created_at: string
  likes_count: number
  is_liked: boolean
  is_subscribed: boolean
  author: {
    id: number
    username: string
    subscribers_count: number
  }
}

export default function Watch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [video, setVideo] = useState<VideoDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const viewCounted = useRef(false)

  useEffect(() => {
    if (!id) return
    const token = getAuthToken()
    setLoading(true)
    viewCounted.current = false

    fetch(`${VIDEOS_URL}?action=get&id=${id}`, {
      headers: token ? { 'X-Authorization': `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        setVideo(data.video)
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Видео не найдено' })
      })
      .finally(() => setLoading(false))

    if (!viewCounted.current) {
      viewCounted.current = true
      fetch(`${VIDEOS_URL}?action=view&id=${id}`, { method: 'POST' }).catch(() => {})
    }
  }, [id])

  const handleLike = async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }
    if (!video || liking) return
    setLiking(true)
    try {
      const res = await fetch(`${VIDEOS_URL}?action=like&id=${video.id}`, {
        method: 'POST',
        headers: { 'X-Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setVideo({ ...video, is_liked: data.liked, likes_count: data.likes_count })
      }
    } finally {
      setLiking(false)
    }
  }

  const handleSubscribe = async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }
    if (!video || subscribing) return
    setSubscribing(true)
    try {
      const res = await fetch(`${VIDEOS_URL}?action=subscribe&channel_id=${video.author.id}`, {
        method: 'POST',
        headers: { 'X-Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setVideo({
          ...video,
          is_subscribed: data.subscribed,
          author: { ...video.author, subscribers_count: data.subscribers_count },
        })
      }
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-neutral-400">Загрузка...</div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-neutral-400 mb-4">Видео не найдено</p>
          <Link to="/explore">
            <Button className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold">К списку видео</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden mb-6">
          <video
            src={video.video_url}
            poster={video.cover_url}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
          />
        </div>

        <h1 className="text-2xl font-bold mb-4">{video.title}</h1>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <Link to={`/channel/${video.author.id}`} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FF4D00] flex items-center justify-center text-lg font-bold text-black">
              {video.author.username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{video.author.username}</p>
              <p className="text-sm text-neutral-400">{video.author.subscribers_count} подписчиков</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              className={video.is_subscribed
                ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                : 'bg-white hover:bg-neutral-200 text-black'}
            >
              {video.is_subscribed ? 'Вы подписаны' : 'Подписаться'}
            </Button>
            <Button
              onClick={handleLike}
              disabled={liking}
              variant="outline"
              className={video.is_liked
                ? 'border-[#FF4D00] text-[#FF4D00] bg-[#FF4D00]/10'
                : 'border-neutral-700 text-white bg-transparent hover:bg-neutral-800'}
            >
              <Icon name="Heart" size={18} className="mr-2" fill={video.is_liked ? '#FF4D00' : 'none'} />
              {video.likes_count}
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-neutral-900 rounded-xl p-4">
          <div className="flex items-center gap-4 text-sm text-neutral-400 mb-3">
            <span className="flex items-center gap-1"><Icon name="Eye" size={16} /> {video.views} просмотров</span>
            <span>{new Date(video.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
          <p className="text-neutral-300 whitespace-pre-wrap">{video.description || 'Без описания'}</p>
        </div>
      </main>
    </div>
  )
}