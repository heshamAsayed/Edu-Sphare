document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');

    if (!courseId) {
        alert('لم يتم تحديد كود الكورس.');
        window.location.href = '../manage-course/manage-course.html';
        return;
    }

    const courseTitle = document.getElementById('courseTitle');
    const videosCount = document.getElementById('videosCount');
    const coursePrice = document.getElementById('coursePrice');
    const courseIdBadge = document.getElementById('courseIdBadge');
    const videosList = document.getElementById('videosList');
    const uploadForm = document.getElementById('uploadVideoForm');
    const btnUploadVideo = document.getElementById('btnUploadVideo');
    const videoOrderInput = document.getElementById('videoOrder');
    const progressBox = document.getElementById('progressBox');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressBytes = document.getElementById('progressBytes');
    const progressStatus = document.getElementById('progressStatus');
    const uploadStatusMsg = document.getElementById('uploadStatusMsg');

    // 1. Load Course Content
    async function loadCourseData() {
        try {
            const response = await apiFetch(`/api/Learning/CourseContent/${encodeURIComponent(courseId)}`);
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '../restricted/restricted.html';
                    return;
                }
                throw new Error(`Server status ${response.status}`);
            }

            const data = await response.json();
            const course = data.course || {};
            const videos = data.videos || [];

            courseTitle.textContent = course.name || course.Name || 'كورس بدون عنوان';
            videosCount.textContent = `${videos.length} فيديو`;
            coursePrice.textContent = `${Number(course.price || course.Price || 0).toFixed(2)} ج.م`;
            courseIdBadge.textContent = `كود الكورس: ${course.id || course.Id || courseId}`;
            videoOrderInput.value = videos.length;

            renderVideosList(videos);

        } catch (err) {
            console.error('Error fetching course data:', err);
            courseTitle.textContent = 'تعذر تحميل بيانات الكورس';
            videosList.innerHTML = `<p style="color: var(--danger); text-align: center;">حدث خطأ: ${escapeHtml(err.message)}</p>`;
        }
    }

    function renderVideosList(videos) {
        if (!videos || videos.length === 0) {
            videosList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">لا توجد دروس مرفوعة بعد في هذا الكورس.</p>`;
            return;
        }

        videosList.innerHTML = '';
        videos.forEach(v => {
            const vidId = v.id || v.Id;
            const title = v.title || v.Title || 'درس بدون اسم';
            const sortOrder = v.sortOrder ?? v.SortOrder ?? 0;
            const days = v.availabilityDays ?? v.AvailabilityDays ?? 1;
            const desc = v.description || v.Description || '';
            const bunnyId = v.bunnyVideoId || v.BunnyVideoId || '';

            const row = document.createElement('div');
            row.className = 'video-row';
            row.innerHTML = `
                <div class="video-info">
                    <strong>${escapeHtml(title)}</strong>
                    <small>
                        الترتيب: ${sortOrder + 1} | الإتاحة: ${days} يوم
                        ${desc ? ` · ${escapeHtml(desc)}` : ''}
                        ${bunnyId ? ` · Bunny: ${escapeHtml(bunnyId)}` : ''}
                    </small>
                    <div id="badge-${vidId}" class="transcription-badge">جاري فحص حالة النص (Deepgram)...</div>
                </div>
                <div class="reorder-actions">
                    <label style="font-size: 12px; color: var(--text-muted);">الترتيب:</label>
                    <input type="number" min="0" value="${sortOrder}" class="reorder-input" id="order-input-${vidId}">
                    <button class="btn-outline" style="padding: 5px 12px; font-size: 12px;" onclick="saveReorder('${vidId}')">حفظ</button>
                </div>
            `;
            videosList.appendChild(row);

            // Check transcription status
            checkTranscription(vidId);
        });
    }

    window.saveReorder = async function(videoId) {
        const input = document.getElementById(`order-input-${videoId}`);
        const newOrder = parseInt(input.value, 10);
        if (isNaN(newOrder)) return;

        try {
            const res = await apiFetch('/api/Learning/ReorderVideo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, sortOrder: newOrder })
            });

            if (res.ok) {
                alert('تم تعديل الترتيب بنجاح.');
                loadCourseData();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`فشل تعديل الترتيب: ${err.message || 'حدث خطأ'}`);
            }
        } catch (e) {
            alert('حدث خطأ في الاتصال بالسيرفر.');
        }
    };

    async function checkTranscription(videoId) {
        const badge = document.getElementById(`badge-${videoId}`);
        if (!badge) return;

        try {
            const res = await apiFetch(`/api/Learning/GetTranscriptionStatus?videoId=${encodeURIComponent(videoId)}`);
            if (res.ok) {
                const data = await res.json();
                const status = (data.status || '').toLowerCase();
                if (status === 'completed') {
                    badge.textContent = '✓ تم تفريغ النص (Deepgram)';
                    badge.className = 'transcription-badge completed';
                } else if (status === 'failed') {
                    badge.textContent = '✕ فشل التفريغ';
                    badge.className = 'transcription-badge failed';
                } else {
                    badge.textContent = `⏳ حالة التفريغ: ${status || 'قيد المعالجة'}`;
                }
            }
        } catch (e) {
            badge.style.display = 'none';
        }
    }

    // 2. Upload Video with Progress
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('videoTitle').value.trim();
        const description = document.getElementById('videoDescription').value.trim();
        const sortOrder = document.getElementById('videoOrder').value;
        const availabilityDays = document.getElementById('availabilityDays').value;
        const videoFileInput = document.getElementById('videoFile');
        const attachmentsInput = document.getElementById('videoAttachments');

        if (!videoFileInput.files || videoFileInput.files.length === 0) {
            alert('من فضلك اختر ملف الفيديو أولاً.');
            return;
        }

        const formData = new FormData();
        formData.append('CourseId', courseId);
        formData.append('Title', title);
        formData.append('Description', description);
        formData.append('SortOrder', sortOrder);
        formData.append('AvailabilityDays', availabilityDays);
        formData.append('VideoFile', videoFileInput.files[0]);

        if (attachmentsInput.files) {
            for (let i = 0; i < attachmentsInput.files.length; i++) {
                formData.append('Attachments', attachmentsInput.files[i]);
            }
        }

        // Show Progress
        btnUploadVideo.disabled = true;
        progressBox.style.display = 'block';
        uploadStatusMsg.style.display = 'none';
        updateProgress(0, 'جاري رفع الفيديو إلى السيرفر و Bunny...');

        const uploadId = 'up_' + Date.now();
        const token = getAuthToken();

        const xhr = new XMLHttpRequest();
        const targetUrl = `${API_CONFIG.BASE_URL}/api/Learning/UploadVideo?courseId=${encodeURIComponent(courseId)}&uploadId=${uploadId}`;
        
        xhr.open('POST', targetUrl, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
                const percent = Math.round((evt.loaded / evt.total) * 100);
                const loadedMB = (evt.loaded / (1024 * 1024)).toFixed(1);
                const totalMB = (evt.total / (1024 * 1024)).toFixed(1);
                updateProgress(percent, `جاري الرفع...`, `${loadedMB} MB / ${totalMB} MB`);
            }
        };

        xhr.onload = () => {
            btnUploadVideo.disabled = false;
            if (xhr.status >= 200 && xhr.status < 300) {
                updateProgress(100, 'تم الرفع بنجاح!');
                uploadStatusMsg.className = 'upload-status-msg success';
                uploadStatusMsg.textContent = 'تم رفع الدرس بنجاح وبدء معالجته على Bunny.';
                uploadStatusMsg.style.display = 'block';
                uploadForm.reset();
                loadCourseData();
            } else {
                uploadStatusMsg.className = 'upload-status-msg error';
                uploadStatusMsg.textContent = `فشل الرفع: كود الخطأ ${xhr.status}`;
                uploadStatusMsg.style.display = 'block';
            }
        };

        xhr.onerror = () => {
            btnUploadVideo.disabled = false;
            uploadStatusMsg.className = 'upload-status-msg error';
            uploadStatusMsg.textContent = 'حدث خطأ في اتصال الشبكة أثناء الرفع.';
            uploadStatusMsg.style.display = 'block';
        };

        xhr.send(formData);
    });

    function updateProgress(percent, statusText, bytesText) {
        progressBarFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressStatus.textContent = statusText;
        if (bytesText) progressBytes.textContent = bytesText;
    }

    // Initial load
    loadCourseData();
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
