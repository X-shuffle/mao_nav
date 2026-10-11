export const filterCategories = (categories, query) => {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return categories
  return categories.map(category => ({
    ...category,
    sites: (category.sites || []).filter(site => {
      const text = [site.name, site.description, site.url].join(' ').toLocaleLowerCase()
      return terms.every(term => text.includes(term))
    }),
  })).filter(category => category.sites.length)
}

export const getSiteHost = (value) => {
  try { return new URL(value).hostname.replace(/^www\./, '') }
  catch { return value || '' }
}
