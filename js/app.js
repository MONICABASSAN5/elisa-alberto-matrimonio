(function () {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = { media: document.getElementById('panel-media'), audio: document.getElementById('panel-audio') };
  let activeTab = 'media';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(panels).forEach(p => p.classList.remove('active'));
      activeTab = btn.dataset.tab;
      panels[activeTab].classList.add('active');
    });
  });

  // ---------- RULLINO FOTOGRAFICO (limite 20 scatti a invitato) ----------
  const ROLL_LIMIT = 20;
  const ROLL_KEY = 'ea_rullino_count';
  const rollCounter = document.getElementById('rollCounter');
  const rollText = document.getElementById('rollText');

  function getRollUsed() {
    return parseInt(localStorage.getItem(ROLL_KEY) || '0', 10);
  }
  function getRollRemaining() {
    return Math.max(0, ROLL_LIMIT - getRollUsed());
  }
  function addToRoll(count) {
    const next = Math.min(ROLL_LIMIT, getRollUsed() + count);
    localStorage.setItem(ROLL_KEY, String(next));
    renderRollCounter();
  }
  function renderRollCounter() {
    const remaining = getRollRemaining();
    if (remaining <= 0) {
      rollText.textContent = 'Il tuo rullino è esaurito: grazie per gli scatti che ci hai regalato!';
      rollCounter.classList.add('empty');
      dropzone.classList.add('drag-over');
      dropzone.style.pointerEvents = 'none';
      dropzone.style.opacity = '.5';
      fileInput.disabled = true;
    } else {
      rollText.textContent = remaining === 1
        ? 'Il tuo rullino: 1 scatto rimasto'
        : `Il tuo rullino: ${remaining} scatti rimasti`;
      rollCounter.classList.remove('empty');
      dropzone.classList.remove('drag-over');
      dropzone.style.pointerEvents = '';
      dropzone.style.opacity = '';
      fileInput.disabled = false;
    }
  }

  // ---------- FOTO / VIDEO ----------
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewList = document.getElementById('previewList');
  let selectedFiles = [];

  renderRollCounter();

  function renderPreviews() {
    previewList.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const url = URL.createObjectURL(file);
      item.innerHTML = `<img src="${url}" alt="">`;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => {
        selectedFiles.splice(i, 1);
        renderPreviews();
      });
      item.appendChild(removeBtn);
      previewList.appendChild(item);
    });
  }

  function addFilesRespectingRoll(files) {
    const remaining = getRollRemaining() - selectedFiles.length;
    if (remaining <= 0) {
      statusMsg.textContent = 'Hai già raggiunto i 20 scatti del tuo rullino per questo matrimonio!';
      statusMsg.classList.add('error');
      return;
    }
    const accepted = files.slice(0, remaining);
    if (files.length > accepted.length) {
      statusMsg.textContent = `Ne ho aggiunti solo ${accepted.length}: il tuo rullino da 20 scatti si esaurirebbe altrimenti.`;
      statusMsg.classList.add('error');
    }
    selectedFiles = selectedFiles.concat(accepted);
    renderPreviews();
  }

  fileInput.addEventListener('change', (e) => {
    addFilesRespectingRoll(Array.from(e.target.files));
  });

  ['dragover', 'dragenter'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); if (getRollRemaining() > 0) dropzone.classList.add('drag-over'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); if (getRollRemaining() > 0) dropzone.classList.remove('drag-over'); })
  );
  dropzone.addEventListener('drop', (e) => {
    if (getRollRemaining() <= 0) return;
    addFilesRespectingRoll(Array.from(e.dataTransfer.files || []));
  });

  // ---------- REGISTRAZIONE AUDIO ----------
  const recBtn = document.getElementById('recBtn');
  const recTimer = document.getElementById('recTimer');
  const recHint = document.getElementById('recHint');
  const recPreview = document.getElementById('recPreview');
  const recAudio = document.getElementById('recAudio');
  const recRedo = document.getElementById('recRedo');

  let mediaRecorder, audioChunks = [], recordedBlob = null, recordedMimeType = '', timerInterval, seconds = 0;

  function pickSupportedMimeType() {
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac', 'audio/ogg'];
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || '';
  }

  recBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      recHint.textContent = 'Il tuo browser non supporta la registrazione audio. Prova ad aggiornarlo o usa Safari/Chrome aggiornati.';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const mimeType = pickSupportedMimeType();
      try {
        mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }
      recordedMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        clearInterval(timerInterval);
        recBtn.classList.remove('recording');
        recordedBlob = new Blob(audioChunks, { type: recordedMimeType });
        recAudio.src = URL.createObjectURL(recordedBlob);
        recPreview.style.display = 'block';
        recHint.textContent = 'Ascolta l\'anteprima qui sotto';
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorder.start();
      recBtn.classList.add('recording');
      recHint.textContent = 'Registrazione in corso... tocca per fermare';
      seconds = 0;
      recTimer.textContent = '00:00';
      timerInterval = setInterval(() => {
        seconds++;
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        recTimer.textContent = `${m}:${s}`;
      }, 1000);
    } catch (err) {
      recHint.textContent = 'Impossibile accedere al microfono. Controlla di aver dato il permesso al browser.';
      console.error(err);
    }
  });

  recRedo.addEventListener('click', () => {
    recordedBlob = null;
    recPreview.style.display = 'none';
    recTimer.textContent = '00:00';
    recHint.textContent = 'Tocca per iniziare a registrare';
  });

  // ---------- INVIO ----------
  const submitBtn = document.getElementById('submitBtn');
  const statusMsg = document.getElementById('statusMsg');
  const guestName = document.getElementById('guestName');
  const guestMessage = document.getElementById('guestMessage');
  const card = document.querySelector('.card');
  const confirmation = document.getElementById('confirmation');
  const uploadAnother = document.getElementById('uploadAnother');

  function sanitizeName(name) {
    return name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
  }

  async function uploadFile(file, typeHint) {
    const ext = file.name ? file.name.split('.').pop() : (typeHint === 'audio' ? 'webm' : 'dat');
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${sanitizeName(ext)}`;
    const { error: uploadError } = await client.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    return path;
  }

  async function insertRecord(type, filePath) {
    const { error } = await client.from(TABLE_NAME).insert({
      guest_name: guestName.value.trim() || null,
      message: guestMessage.value.trim() || null,
      type: type,
      file_path: filePath,
    });
    if (error) throw error;
  }

  submitBtn.addEventListener('click', async () => {
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';

    const hasMedia = activeTab === 'media' && selectedFiles.length > 0;
    const hasAudio = activeTab === 'audio' && recordedBlob;

    if (!hasMedia && !hasAudio) {
      statusMsg.textContent = activeTab === 'media'
        ? 'Scegli almeno una foto prima di inviare.'
        : 'Registra un messaggio prima di inviare.';
      statusMsg.classList.add('error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';

    try {
      if (hasMedia) {
        for (const file of selectedFiles) {
          const path = await uploadFile(file, 'photo');
          await insertRecord('photo', path);
        }
        addToRoll(selectedFiles.length);
      } else if (hasAudio) {
        const ext = recordedMimeType.includes('mp4') ? 'm4a'
          : recordedMimeType.includes('ogg') ? 'ogg'
          : recordedMimeType.includes('aac') ? 'aac'
          : 'webm';
        const audioFile = new File([recordedBlob], `messaggio.${ext}`, { type: recordedMimeType });
        const path = await uploadFile(audioFile, 'audio');
        await insertRecord('audio', path);
      }

      card.querySelectorAll('.tabs, .panel, .field, .submit-btn, .status-msg').forEach(el => el.style.display = 'none');
      confirmation.style.display = 'block';
    } catch (err) {
      statusMsg.textContent = 'Qualcosa è andato storto. Riprova tra poco.';
      statusMsg.classList.add('error');
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Invia con amore';
    }
  });

  uploadAnother.addEventListener('click', () => {
    selectedFiles = [];
    recordedBlob = null;
    fileInput.value = '';
    previewList.innerHTML = '';
    recPreview.style.display = 'none';
    recTimer.textContent = '00:00';
    recHint.textContent = 'Tocca per iniziare a registrare';
    guestName.value = '';
    guestMessage.value = '';
    statusMsg.textContent = '';
    confirmation.style.display = 'none';
    card.querySelectorAll('.tabs, .panel, .field, .submit-btn, .status-msg').forEach(el => el.style.display = '');
    panels.media.classList.add('active');
    panels.audio.classList.remove('active');
    tabBtns.forEach(b => b.classList.remove('active'));
    tabBtns[0].classList.add('active');
    activeTab = 'media';
    renderRollCounter();
  });
})();
