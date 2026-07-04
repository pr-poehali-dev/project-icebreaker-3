import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/icon'
import Navbar from '@/components/landing/Navbar'
import { useToast } from '@/hooks/use-toast'
import { getAuthToken, getAuthUser, logout } from '@/hooks/use-auth'

const VIDEOS_URL = 'https://functions.poehali.dev/7a8fdbb4-fa1b-4fb7-a400-a6526b5ad9c4'

interface Video {
  id: number
  title: string
  description: string
  video_url: string
  cover_url: string
  views: number
  likes_count: number
  created_at: string
}

export default function Channel() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
  const [subscribersCount, setSubscribersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const user = getAuthUser()

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }

    fetch(`${VIDEOS_URL}?action=my`, {
      headers: { 'X-Authorization': `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) {
            logout()
            navigate('/login')
            return
          }
          throw new Error('Ошибка загрузки')
        }
        const data = await res.json()
        setVideos(data.videos || [])
        setSubscribersCount(data.subscribers_count || 0)
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить видео' })
      })
      .finally(() => setLoading(false))
  }, [navigate, toast])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-20 h-20 rounded-full bg-[#FF4D00] flex items-center justify-center text-3xl font-bold text-black">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-neutral-400">{subscribersCount} подписчиков · {videos.length} видео на канале</p>
          </div>
        </div>

        {loading ? (
          <p className="text-neutral-400">Загрузка...</p>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl">
            <Icon name="VideoOff" size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400 mb-4">На вашем канале пока нет видео</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link key={video.id} to={`/watch/${video.id}`}>
                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden hover:border-[#FF4D00] transition-colors h-full">
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
                    <p className="text-sm text-neutral-400 line-clamp-2 mt-1">{video.description}</p>
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
