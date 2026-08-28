(function () {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const masonry = document.getElementById('masonry');

  function publicUrl(path) {
    return client.storage.from(BUCKET_NAME).getPublicUrl(path).data.publicUrl;
  }

  function cardHtml(row) {
    const name = row.guest_name ? escapeHtml(row.guest_name) : 'Un ospite';
    const msg = row.message ? `<span class="msg">"${escapeHtml(row.message)}"</span>` : '';
    const url = publicUrl(row.file_path);

    let mediaHtml = '';
    if (row.type === 'photo') {
      mediaHtml = `<div class="media"><img src="${url}" alt="Ricordo di ${name}" loading="lazy"></div>`;
    } else if (row.type === 'video') {
      mediaHtml = `<div class="media"><video src="${url}" controls playsinline></video></div>`;
    } else if (row.type === 'audio') {
      mediaHtml = `
        <div class="audio-card">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V22h2v-2.06A9 9 0 0 0 21 11h-2z"/></svg>
          <div>Messaggio vocale</div>
          <audio src="${url}" controls></audio>
        </div>`;
    }

    return `
      <article class="memory-card">
        ${mediaHtml}
        <div class="meta">
          <span class="name">${name}</span>
          ${msg}
        </div>
      </article>`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadMemories() {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      masonry.innerHTML = '<p class="gallery-empty">Non riesco a caricare i ricordi al momento.</p>';
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      masonry.innerHTML = '<p class="gallery-empty">Ancora nessun ricordo... sii il primo a condividerne uno!</p>';
      return;
    }

    masonry.innerHTML = data.map(cardHtml).join('');
  }

  function prependMemory(row) {
    const empty = masonry.querySelector('.gallery-empty');
    if (empty) masonry.innerHTML = '';
    masonry.insertAdjacentHTML('afterbegin', cardHtml(row));
  }

  loadMemories();

  // Aggiornamento in tempo reale: nuovi ricordi appaiono senza ricaricare la pagina
  client
    .channel('public:memories')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE_NAME }, (payload) => {
      if (payload.new.approved) prependMemory(payload.new);
    })
    .subscribe();
})();
