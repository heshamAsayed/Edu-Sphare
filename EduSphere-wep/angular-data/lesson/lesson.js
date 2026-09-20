document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId') || params.get('id');

    if (!courseId) {
        alert('لم يتم تحديد كود الكورس.');
        window.location.href = '../manage-course/manage-course.html';
        return;
    }

    const headerCourseTitle = document.getElementById('headerCourseTitle');
    const bunnyPlayerFrame = document.getElementById('bunnyPlayerFrame');
    const videoErrorOverlay = document.getElementById('videoErrorOverlay');
    const videoErrorText = document.getElementById('videoErrorText');
    const activeVideoTitle = document.getElementById('activeVideoTitle');
    const activeVideoMeta = document.getElementById('activeVideoMeta');
    const videoDescription = document.getElementById('videoDescription');
    const transcriptionContent = document.getElementById('transcriptionContent');
    const attachmentsList = document.getElementById('attachmentsList');
    const playlistItems = document.getElementById('playlistItems');
    const courseProgressBar = document.getElementById('courseProgressBar');
    const progressPercentageText = document.getElementById('progressPercentageText');
    const btnMarkWatched = document.getElementById('btnMarkWatched');

    // Attention modal elements
    const attentionModalOverlay = document.getElementById('attentionModalOverlay');
    const attentionQuestionText = document.getElementById('attentionQuestionText');
    const attentionChoices = document.getElementById('attentionChoices');
    const attentionTimer = document.getElementById('attentionTimer');

    let courseData = null;
    let videos = [];
    let activeVideo = null;
    let bunnyLibraryId = "728031";
    let isTeacher = false;

    // Attention tracking variables
    let attentionCountdown = null;

    // 1. Fetch Lesson Data
    try {
        const res = await apiFetch(`/api/Learning/Lesson/${encodeURIComponent(courseId)}`);
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = `../restricted/restricted.html?courseId=${encodeURIComponent(courseId)}`;
                return;
            }
            throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        courseData = data.course || {};
        videos = data.videos || [];
        activeVideo = data.activeVideo || videos[0] || null;
        isTeacher = data.isTeacher || false;

        headerCourseTitle.textContent = courseData.name || courseData.Name || 'محتوى الكورس';

        if (videos.length === 0) {
            showVideoError('لا توجد فيديوهات مضافة لهذا الكورس بعد.');
            return;
        }

        renderPlaylist();
        selectVideo(activeVideo || videos[0]);

    } catch (err) {
        console.error('Failed to load lesson:', err);
        headerCourseTitle.textContent = 'تعذر تحميل الدرس';
        showVideoError(err.message || 'حدث خطأ في تحميل الكورس.');
    }

    function renderPlaylist() {
        playlistItems.innerHTML = '';
        let watchedCount = 0;

        videos.forEach((vid, idx) => {
            const isWatched = Boolean(vid.isWatched || vid.IsWatched);
            if (isWatched) watchedCount++;

            const li = document.createElement('li');
            li.className = `playlist-item ${isWatched ? 'done' : ''} ${activeVideo && (activeVideo.id || activeVideo.Id) === (vid.id || vid.Id) ? 'current' : ''}`;
            li.id = `playlist-item-${vid.id || vid.Id}`;

            li.innerHTML = `
                <div>
                    <strong>${idx + 1}. ${escapeHtml(vid.title || vid.Title || 'درس')}</strong>
                    <small>المدة: ${vid.duration ? Math.round(vid.duration / 60) + ' دقيقة' : 'درس فيديو'}</small>
                </div>
                <div>
                    ${isWatched ? '<span class="check-icon">✓</span>' : ''}
                </div>
            `;

            li.addEventListener('click', () => selectVideo(vid));
            playlistItems.appendChild(li);
        });

        // Update progress
        const percent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;
        courseProgressBar.style.width = `${percent}%`;
        progressPercentageText.textContent = `${percent}%`;
    }

    function selectVideo(video) {
        if (!video) return;
        activeVideo = video;

        const vidId = video.id || video.Id;
        const bunnyId = video.bunnyVideoId || video.BunnyVideoId;
        const title = video.title || video.Title || 'درس بدون عنوان';
        const desc = video.description || video.Description || 'لا يوجد وصف إضافي.';

        activeVideoTitle.textContent = title;
        activeVideoMeta.textContent = `درس ${(video.sortOrder ?? video.SortOrder ?? 0) + 1}`;
        videoDescription.textContent = desc;

        // Update playlist active highlight
        document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('current'));
        const activeLi = document.getElementById(`playlist-item-${vidId}`);
        if (activeLi) activeLi.classList.add('current');

        // Render attachments
        const attachments = video.attachments || video.Attachments || [];
        if (attachments.length > 0) {
            attachmentsList.innerHTML = '';
            attachments.forEach(att => {
                const a = document.createElement('a');
                a.className = 'attachment-item';
                a.href = att.url || att.Url;
                a.target = '_blank';
                a.innerHTML = `📎 ${escapeHtml(att.originalFileName || att.name || 'ملف مرفق')}`;
                attachmentsList.appendChild(a);
            });
        } else {
            attachmentsList.innerHTML = `<p class="muted">لا توجد ملفات مرفقة مع هذا الدرس.</p>`;
        }

        // Load Video Player
        if (bunnyId) {
            videoErrorOverlay.style.display = 'none';
            bunnyPlayerFrame.style.display = 'block';
            bunnyPlayerFrame.src = `https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyId}?autoplay=true&preload=true`;
        } else {
            showVideoError('ملف الفيديو لهذا الدرس غير جاهز أو قيد المعالجة.');
        }

        // Fetch Transcription
        loadTranscription(vidId);
    }

    function showVideoError(msg) {
        bunnyPlayerFrame.style.display = 'none';
        videoErrorOverlay.style.display = 'flex';
        videoErrorText.textContent = msg;
    }

    async function loadTranscription(videoId) {
        transcriptionContent.innerHTML = `<p class="muted">جاري تحميل تفريغ النص للدرس...</p>`;
        try {
            const res = await apiFetch(`/api/Transcription/${encodeURIComponent(videoId)}`);
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim().length > 0) {
                    transcriptionContent.innerHTML = `<p>${escapeHtml(text)}</p>`;
                    return;
                }
            }
            transcriptionContent.innerHTML = `<p class="muted">لم يتم تفريغ النص لهذا الدرس بعد أو قيد المعالجة.</p>`;
        } catch (e) {
            transcriptionContent.innerHTML = `<p class="muted">لا يتوفر نص مفرغ حالياً.</p>`;
        }
    }

    // 2. Mark as Watched
    btnMarkWatched.addEventListener('click', async () => {
        if (!activeVideo) return;
        const vidId = activeVideo.id || activeVideo.Id;

        try {
            const res = await apiFetch('/api/Learning/MarkVideoWatched', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId, videoId: vidId })
            });

            if (res.ok) {
                activeVideo.isWatched = true;
                renderPlaylist();
                btnMarkWatched.textContent = '✓ مكتمل';
                btnMarkWatched.style.borderColor = 'var(--primary)';
                btnMarkWatched.style.color = 'var(--primary)';
            }
        } catch (e) {
            console.error('Failed to mark watched:', e);
        }
    });

    // 3. Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const pane = document.getElementById(targetId);
            if (pane) pane.classList.add('active');
        });
    });

    // 4. Interactive Attention Modal Demo
    function showAttentionQuestion(qText, choices) {
        attentionQuestionText.textContent = qText;
        attentionChoices.innerHTML = '';

        choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.className = 'attention-choice-btn';
            btn.textContent = `${idx + 1}. ${choice}`;
            btn.addEventListener('click', () => {
                clearInterval(attentionCountdown);
                attentionModalOverlay.classList.remove('active');
                alert('شكراً لتأكيد انتباهك ومتابعتك للدرس!');
            });
            attentionChoices.appendChild(btn);
        });

        let secondsLeft = 30;
        attentionTimer.textContent = `المتبقي: ${secondsLeft} ثانية`;
        attentionModalOverlay.classList.add('active');

        clearInterval(attentionCountdown);
        attentionCountdown = setInterval(() => {
            secondsLeft--;
            attentionTimer.textContent = `المتبقي: ${secondsLeft} ثانية`;
            if (secondsLeft <= 0) {
                clearInterval(attentionCountdown);
                attentionModalOverlay.classList.remove('active');
            }
        }, 1000);
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
