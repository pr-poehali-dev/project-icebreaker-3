import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Icon from '@/components/ui/icon'
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
  created_at: string
}

export default function Channel() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [videos, setVideos] = useState<Video[]>([])
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
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить видео' })
      })
      .finally(() => setLoading(false))
  }, [navigate, toast])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800 sticky top-0 bg-black/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold">
            <Icon name="Play" className="text-[#FF4D00]" size={24} />
            VideoHub
          </Link>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/upload')} className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold">
              <Icon name="Upload" size={18} className="mr-2" />
              Загрузить видео
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="text-neutral-400 hover:text-white">
              <Icon name="LogOut" size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-20 h-20 rounded-full bg-[#FF4D00] flex items-center justify-center text-3xl font-bold text-black">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-neutral-400">{videos.length} {videos.length === 1 ? 'видео' : 'видео'} на канале</p>
          </div>
        </div>

        {loading ? (
          <p className="text-neutral-400">Загрузка...</p>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl">
            <Icon name="VideoOff" size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400 mb-4">На вашем канале пока нет видео</p>
            <Button onClick={() => navigate('/upload')} className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold">
              Загрузить первое видео
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="bg-neutral-900 border-neutral-800 overflow-hidden">
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
                  <div className="flex items-center gap-1 text-xs text-neutral-500 mt-3">
                    <Icon name="Eye" size={14} />
                    {video.views} просмотров
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
