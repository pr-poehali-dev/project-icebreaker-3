import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import Navbar from '@/components/landing/Navbar'
import { getAuthToken } from '@/hooks/use-auth'

const VIDEOS_URL = 'https://functions.poehali.dev/7a8fdbb4-fa1b-4fb7-a400-a6526b5ad9c4'

interface Video {
  id: number
  title: string
  cover_url: string
  views: number
  likes_count: number
}

export default function ChannelPublic() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [channel, setChannel] = useState<{ id: number; username: string } | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [subscribersCount, setSubscribersCount] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!id) return
    const token = getAuthToken()
    setLoading(true)
    fetch(`${VIDEOS_URL}?action=channel&id=${id}`, {
      headers: token ? { 'X-Authorization': `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        setChannel(data.channel)
        setVideos(data.videos || [])
        setSubscribersCount(data.subscribers_count)
        setIsSubscribed(data.is_subscribed)
      })
      .catch(() => setChannel(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubscribe = async () => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }
    if (subscribing || !id) return
    setSubscribing(true)
    try {
      const res = await fetch(`${VIDEOS_URL}?action=subscribe&channel_id=${id}`, {
        method: 'POST',
        headers: { 'X-Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setIsSubscribed(data.subscribed)
        setSubscribersCount(data.subscribers_count)
      }
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-neutral-400">Загрузка...</div>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-neutral-400">Канал не найден</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#FF4D00] flex items-center justify-center text-3xl font-bold text-black">
              {channel.username[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{channel.username}</h1>
              <p className="text-neutral-400">{subscribersCount} подписчиков · {videos.length} видео</p>
            </div>
          </div>
          <Button
            onClick={handleSubscribe}
            disabled={subscribing}
            className={isSubscribed
              ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
              : 'bg-white hover:bg-neutral-200 text-black'}
          >
            {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl">
            <Icon name="VideoOff" size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400">На этом канале пока нет видео</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`}>
                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden hover:border-[#FF4D00] transition-colors">
                  <div className="aspect-video bg-neutral-800 relative">
                    {video.cover_url ? (
                      <img src={video.cover_url} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Play" size={32} className="text-neutral-600" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white truncate">{video.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-3">
                      <span className="flex items-center gap-1"><Icon name="Eye" size={14} /> {video.views}</span>
                      <span className="flex items-center gap-1"><Icon name="Heart" size={14} /> {video.likes_count}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
