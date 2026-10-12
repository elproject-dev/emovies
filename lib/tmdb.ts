const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

export async function fetchTmdbData(tmdbId: string, contentType: 'movie' | 'tv') {
  if (!tmdbId) return {};
  
  const token = process.env.NEXT_PUBLIC_TMDB_BEARER_TOKEN;
  if (!token) {
    console.error('No TMDB token found in environment variables.');
    return {};
  }

  try {
    const fetchWithToken = async (path: string) => {
      return fetch(`${TMDB_BASE}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    };
    
    // Try primary endpoint first
    const primaryEndpoint = contentType === 'tv' ? `/tv/${tmdbId}` : `/movie/${tmdbId}`;
    const fallbackEndpoint = contentType === 'tv' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
    
    let res = await fetchWithToken(primaryEndpoint);
    if (!res.ok && res.status === 404) {
      res = await fetchWithToken(fallbackEndpoint);
    }
    
    if (!res.ok) return {};
    
    const data = await res.json();
    const result: any = {};
    
    if (data.backdrop_path) result.backdrop_url = `${TMDB_IMG}/w1280${data.backdrop_path}`;
    if (data.poster_path) result.poster_url = `${TMDB_IMG}/w300_and_h450_face${data.poster_path}`;
    if (data.overview) result.description = data.overview;
    if (data.title || data.name) result.title = data.title || data.name;
    if (data.genres?.length) result.genre = data.genres.map((g: any) => g.name).join(', ');
    if (data.release_date || data.first_air_date) result.year = parseInt((data.release_date || data.first_air_date).split('-')[0]);
    if (data.runtime) result.duration = `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`;
    if (data.vote_average !== undefined) result.score = Math.round(data.vote_average * 10) / 10;
    
    return result;
  } catch (err) {
    console.error('Error fetching TMDB data:', err);
    return {};
  }
}
