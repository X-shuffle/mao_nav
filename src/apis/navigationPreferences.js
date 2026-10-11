export const PREFERENCES_KEY = 'navigation-preferences-v1'

export const readPreferences = (storage) => {
  try {
    const value = JSON.parse(storage.getItem(PREFERENCES_KEY))
    return {
      favoriteUrls: [...new Set(Array.isArray(value?.favoriteUrls) ? value.favoriteUrls.filter(url => typeof url === 'string' && /^https?:\/\//.test(url)) : [])],
      viewMode: value?.viewMode === 'list' ? 'list' : 'cards',
    }
  } catch {
    return { favoriteUrls: [], viewMode: 'cards' }
  }
}

export const savePreferences = (storage, preferences) => {
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    return true
  } catch { return false }
}
