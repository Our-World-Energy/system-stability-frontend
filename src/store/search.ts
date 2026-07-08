import { create } from 'zustand'

interface SearchState {
  /** Free-text query from the navbar search box, used to filter dashboard cards. */
  query: string
  setQuery: (q: string) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}))
