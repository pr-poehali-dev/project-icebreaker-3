import { Badge } from "@/components/ui/badge"

export const sections = [
  {
    id: 'hero',
    subtitle: <Badge variant="outline" className="text-white border-white">Бета-доступ открыт</Badge>,
    title: "Смотри и делись видео.",
    showButton: true,
    buttonText: 'Начать бесплатно',
    buttonLink: '/register'
  },
  {
    id: 'about',
    title: 'Твоё видео — твоя сцена',
    content: 'Загружай ролики за пару кликов и смотри контент со всего мира в потоковом качестве без задержек.'
  },
  {
    id: 'features',
    title: 'Всё для авторов',
    content: 'Быстрая загрузка, HD-плеер, лента рекомендаций и удобная студия для управления каналом — всё в одном месте.'
  },
  {
    id: 'testimonials',
    title: 'Миллионы просмотров',
    content: 'Авторы уже находят свою аудиторию: тысячи роликов, живые комментарии и растущие сообщества вокруг любимого контента.'
  },
  {
    id: 'join',
    title: 'Загрузи первое видео',
    content: 'Готов показать себя миру? Создай канал, загрузи ролик и начни собирать просмотры уже сегодня.',
    showButton: true,
    buttonText: 'Загрузить видео',
    buttonLink: '/register'
  },
]