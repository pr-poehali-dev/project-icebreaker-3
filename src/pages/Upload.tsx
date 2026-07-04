import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Icon from '@/components/ui/icon'
import { useToast } from '@/hooks/use-toast'
import { getAuthToken } from '@/hooks/use-auth'

const VIDEOS_URL = 'https://functions.poehali.dev/7a8fdbb4-fa1b-4fb7-a400-a6526b5ad9c4'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Upload() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = getAuthToken()
    if (!token) {
      navigate('/login')
      return
    }
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Укажите название видео' })
      return
    }
    if (!videoFile) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Выберите видео файл' })
      return
    }

    setLoading(true)
    try {
      const video_base64 = await fileToBase64(videoFile)
      const payload: Record<string, string> = {
        title,
        description,
        video_base64,
        video_filename: videoFile.name,
        video_content_type: videoFile.type,
      }

      if (coverFile) {
        payload.cover_base64 = await fileToBase64(coverFile)
        payload.cover_filename = coverFile.name
        payload.cover_content_type = coverFile.type
      }

      const res = await fetch(`${VIDEOS_URL}?action=upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Ошибка загрузки', description: data.error })
        return
      }

      toast({ title: 'Готово!', description: 'Видео успешно загружено на канал' })
      navigate('/channel')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось загрузить видео' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/channel" className="flex items-center gap-2 text-xl font-bold">
            <Icon name="ArrowLeft" size={20} />
            Назад к каналу
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Загрузка видео</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-white mb-2 block">Обложка видео</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
            <div
              onClick={() => coverInputRef.current?.click()}
              className="aspect-video w-full max-w-md rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900 flex items-center justify-center cursor-pointer hover:border-[#FF4D00] transition-colors overflow-hidden"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Обложка" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-neutral-500">
                  <Icon name="Image" size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Выбрать обложку</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-white mb-2 block">Видео файл</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoChange}
            />
            <div
              onClick={() => videoInputRef.current?.click()}
              className="rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900 flex items-center gap-3 p-4 cursor-pointer hover:border-[#FF4D00] transition-colors"
            >
              <Icon name="FileVideo" size={24} className="text-neutral-500" />
              <span className="text-sm text-neutral-400">
                {videoFile ? videoFile.name : 'Выбрать видео файл'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Название</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-neutral-900 border-neutral-700 text-white"
              placeholder="Название вашего видео"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-neutral-900 border-neutral-700 text-white min-h-[120px]"
              placeholder="Расскажите о своём видео"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold"
          >
            {loading ? 'Загружаем...' : 'Опубликовать видео'}
          </Button>
        </form>
      </main>
    </div>
  )
}
