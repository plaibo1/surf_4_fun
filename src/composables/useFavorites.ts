import { ref, onMounted } from 'vue'

const FAVORITES_KEY = 'surf4fun_favorites'

export function useFavorites() {
  const favorites = ref<string[]>([])

  const loadFavorites = () => {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (saved) {
      try {
        favorites.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to parse favorites', e)
        favorites.value = []
      }
    }
  }

  const saveFavorites = () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites.value))
  }

  const toggleFavorite = (roomId: string) => {
    const index = favorites.value.indexOf(roomId)
    if (index === -1) {
      favorites.value.push(roomId)
    } else {
      favorites.value.splice(index, 1)
    }
    saveFavorites()
  }

  const isFavorite = (roomId: string) => {
    return favorites.value.includes(roomId)
  }

  onMounted(() => {
    loadFavorites()
  })

  return {
    favorites,
    toggleFavorite,
    isFavorite
  }
}
