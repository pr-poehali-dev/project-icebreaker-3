import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import Icon from '@/components/ui/icon'
import { getAuthToken, logout } from '@/hooks/use-auth'

interface NavbarProps {
  showUploadButton?: boolean
}

export default function Navbar({ showUploadButton = true }: NavbarProps) {
  const navigate = useNavigate()
  const isAuthenticated = !!getAuthToken()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="border-b border-neutral-800 sticky top-0 bg-black/80 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white shrink-0">
          <Icon name="Play" className="text-[#FF4D00]" size={24} />
          PLAYER TUBE
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-neutral-400 text-sm font-medium">
          <Link to="/explore" className="hover:text-white transition-colors">Все видео</Link>
          {isAuthenticated && (
            <Link to="/channel" className="hover:text-white transition-colors">Мой канал</Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {showUploadButton && (
                <Button onClick={() => navigate('/upload')} className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold">
                  <Icon name="Upload" size={18} className="mr-2" />
                  <span className="hidden sm:inline">Загрузить видео</span>
                </Button>
              )}
              <Button variant="ghost" onClick={handleLogout} className="text-neutral-400 hover:text-white">
                <Icon name="LogOut" size={18} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/login')} className="text-neutral-400 hover:text-white">
                Войти
              </Button>
              <Button onClick={() => navigate('/register')} className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-black font-semibold">
                Регистрация
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
