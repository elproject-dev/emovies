// Server actions aren't supported in static export, so this runs on client

export async function checkServerAvailability(tmdbId: string, contentType: string) {
  try {
    const baseUrl = 'https://vidsrc.win/embed/';
    const checkUrl = contentType === 'tv' 
      ? `${baseUrl}tv?tmdb=${tmdbId}&season=1&episode=1`
      : `${baseUrl}movie?tmdb=${tmdbId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 detik timeout

    try {
      const response = await fetch(checkUrl, { 
        signal: controller.signal,
        headers: { 'Referer': 'https://vidsrc.win/' }
      });
      
      clearTimeout(timeoutId);
      
      return { ok: response.ok, status: response.status };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { error: "Server streaming terlalu lambat merespon (Timeout)." };
      }
      return { error: err.message };
    }
  } catch (error: any) {
    return { error: error.message || "Terjadi kesalahan saat menghubungi server." };
  }
}
