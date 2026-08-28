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

  // ---------- FOTO / VIDEO ----------
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewList = document.getElementById('previewList');
  let selectedFiles = [];

  function renderPreviews() {
    previewList.innerHTML = '';
    selectedFiles.forEach((file, i) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('video')) {
        item.innerHTML = `<video src="${url}" muted></video>`;
      } else {
        item.innerHTML = `<img src="${url}" alt="">`;
      }
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

  fileInput.addEventListener('change', (e) => {
    selectedFiles = selectedFiles.concat(Array.from(e.target.files));
    renderPreviews();
  });

  ['dragover', 'dragenter'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('drag-over'); })
  );
  dropzone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    selectedFiles = selectedFiles.concat(files);
    renderPreviews();
  });

  // ---------- REGISTRAZIONE AUDIO ----------
  const recBtn = document.getElementById('recBtn');
  const recTimer = document.getElementById('recTimer');
  const recHint = document.getElementById('recHint');
  const recPreview = document.getElementById('recPreview');
  const recAudio = document.getElementById('recAudio');
  const recRedo = document.getElementById('recRedo');

  let mediaRecorder, audioChunks = [], recordedBlob = null, timerInterval, seconds = 0;

  recBtn.addEventListener('click', async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        clearInterval(timerInterval);
        recBtn.classList.remove('recording');
        recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
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
      recHint.textContent = 'Impossibile accedere al microfono. Controlla i permessi del browser.';
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
        ? 'Scegli almeno una foto o un video prima di inviare.'
        : 'Registra un messaggio prima di inviare.';
      statusMsg.classList.add('error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';

    try {
      if (hasMedia) {
        for (const file of selectedFiles) {
          const type = file.type.startsWith('video') ? 'video' : 'photo';
          const path = await uploadFile(file, type);
          await insertRecord(type, path);
        }
      } else if (hasAudio) {
        const audioFile = new File([recordedBlob], 'messaggio.webm', { type: 'audio/webm' });
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
  });
})();
