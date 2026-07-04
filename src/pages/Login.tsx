import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Icon from '@/components/ui/icon'
import { useToast } from '@/hooks/use-toast'

const AUTH_URL = 'https://functions.poehali.dev/83b5aadc-dce8-48ce-aea7-4b61d97078fa'

export default function Login() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${AUTH_URL}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Ошибка входа', description: data.error })
        return
      }
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      toast({ title: 'С возвращением!', description: `Вы вошли как ${data.user.username}` })
      navigate('/')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось подключиться к серверу' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white text-2xl font-bold mb-2">
            <Icon name="Play" className="text-[#FF4D00]" size={28} />
            VideoHub
          </Link>
          <p className="text-neutral-400">Войдите, чтобы смотреть и загружать видео</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-neutral-800 border-neutral-700 text-white"
              placeholder="Ваш пароль"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold"
            size="lg"
          >
            {loading ? 'Входим...' : 'Войти'}
          </Button>
          <p className="text-center text-neutral-400 text-sm">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-[#FF4D00] hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
