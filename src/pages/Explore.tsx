import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import Navbar from '@/components/landing/Navbar'

const VIDEOS_URL = 'https://functions.poehali.dev/7a8fdbb4-fa1b-4fb7-a400-a6526b5ad9c4'

interface Video {
  id: number
  title: string
  description: string
  cover_url: string
  views: number
  likes_count: number
  created_at: string
  author: { id: number; username: string }
}

interface Author {
  id: number
  username: string
  video_count: number
  subscribers_count: number
}

export default function Explore() {
  const [tab, setTab] = useState<'videos' | 'authors'>('videos')
  const [videos, setVideos] = useState<Video[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${VIDEOS_URL}?action=list`).then((r) => r.json()),
      fetch(`${VIDEOS_URL}?action=authors`).then((r) => r.json()),
    ])
      .then(([videosData, authorsData]) => {
        setVideos(videosData.videos || [])
        setAuthors(authorsData.authors || [])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">Все видео и авторы</h1>

        <div className="flex gap-2 mb-8">
          <Button
            variant={tab === 'videos' ? 'default' : 'outline'}
            onClick={() => setTab('videos')}
            className={tab === 'videos' ? 'bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold' : 'border-neutral-700 text-white bg-transparent hover:bg-neutral-800'}
          >
            <Icon name="Video" size={18} className="mr-2" />
            Видео
          </Button>
          <Button
            variant={tab === 'authors' ? 'default' : 'outline'}
            onClick={() => setTab('authors')}
            className={tab === 'authors' ? 'bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold' : 'border-neutral-700 text-white bg-transparent hover:bg-neutral-800'}
          >
            <Icon name="Users" size={18} className="mr-2" />
            Авторы
          </Button>
        </div>

        {loading ? (
          <p className="text-neutral-400">Загрузка...</p>
        ) : tab === 'videos' ? (
          videos.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl">
              <Icon name="VideoOff" size={48} className="mx-auto text-neutral-600 mb-4" />
              <p className="text-neutral-400">Видео пока не загружены</p>
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
                      <p className="text-sm text-neutral-400 mt-1">{video.author.username}</p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-3">
                        <span className="flex items-center gap-1"><Icon name="Eye" size={14} /> {video.views}</span>
                        <span className="flex items-center gap-1"><Icon name="Heart" size={14} /> {video.likes_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )
        ) : authors.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl">
            <Icon name="Users" size={48} className="mx-auto text-neutral-600 mb-4" />
            <p className="text-neutral-400">Авторов пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {authors.map((author) => (
              <Link key={author.id} to={`/channel/${author.id}`}>
                <Card className="bg-neutral-900 border-neutral-800 hover:border-[#FF4D00] transition-colors">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#FF4D00] flex items-center justify-center text-xl font-bold text-black shrink-0">
                      {author.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{author.username}</p>
                      <p className="text-sm text-neutral-400">{author.video_count} видео · {author.subscribers_count} подписчиков</p>
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
