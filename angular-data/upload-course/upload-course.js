document.addEventListener('DOMContentLoaded', async () => {
    const stageSelect = document.getElementById('stageSelect');
    const yearSelect = document.getElementById('yearSelect');
    const teacherSchoolName = document.getElementById('teacherSchoolName');
    const dropzone = document.getElementById('dropzone');
    const videoFilesInput = document.getElementById('videoFilesInput');
    const videoQueueList = document.getElementById('videoQueueList');
    const form = document.getElementById('createCourseForm');
    const progressModal = document.getElementById('progressModal');
    const modalPercent = document.getElementById('modalPercent');
    const modalStatus = document.getElementById('modalStatus');
    const modalProgressFill = document.getElementById('modalProgressFill');
    const modalQueueInfo = document.getElementById('modalQueueInfo');

    let availableStages = [];
    let queue = [];

    // 1. Fetch Teacher Stages and Years
    try {
        const res = await apiFetch('/api/Learning/TeacherStages');
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                window.location.href = '../restricted/restricted.html';
                return;
            }
            throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        teacherSchoolName.textContent = data.teacherSchoolName || 'غير محدد';
        availableStages = data.stages || [];

        stageSelect.innerHTML = '<option value="">اختر المرحلة الدراسية</option>';
        availableStages.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id || s.Id;
            opt.textContent = s.name || s.Name;
            stageSelect.appendChild(opt);
        });

    } catch (e) {
        console.error('Error fetching stages:', e);
        teacherSchoolName.textContent = 'تعذر جلب بيانات المدرسة';
    }

    // Dynamic Year dropdown on Stage select
    stageSelect.addEventListener('change', () => {
        const stageId = stageSelect.value;
        yearSelect.innerHTML = '<option value="">اختر السنة الدراسية</option>';

        const selected = availableStages.find(s => (s.id || s.Id) === stageId);
        if (!selected || !selected.years) return;

        selected.years.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.id || y.Id;
            opt.textContent = y.name || y.Name;
            yearSelect.appendChild(opt);
        });
    });

    // 2. Video Files Selection & Dropzone
    dropzone.addEventListener('click', () => videoFilesInput.click());

    videoFilesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        files.forEach(file => {
            if (!queue.some(item => item.file.name === file.name && item.file.size === file.size)) {
                queue.push({
                    file,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    sortOrder: queue.length + 1,
                    description: '',
                    attachments: []
                });
            }
        });
        renderQueue();
    });

    function renderQueue() {
        videoQueueList.innerHTML = '';
        queue.forEach((item, index) => {
            const sizeMB = (item.file.size / (1024 * 1024)).toFixed(1);
            const card = document.createElement('div');
            card.className = 'video-queue-card';
            card.innerHTML = `
                <div class="video-queue-main">
                    <div class="queue-index">${index + 1}</div>
                    <div style="flex: 1;">
                        <input type="text" value="${escapeHtml(item.title)}" class="queue-title-input" data-index="${index}" placeholder="عنوان الدرس" required style="width:100%;" />
                    </div>
                    <div style="width: 100px;">
                        <input type="number" min="1" value="${item.sortOrder}" class="queue-order-input" data-index="${index}" style="width:100%; text-align:center;" />
                    </div>
                    <span style="font-size: 12px; color: var(--text-subtle); width: 70px; text-align: left;">${sizeMB} MB</span>
                    <button type="button" class="btn-remove-video" onclick="removeQueueItem(${index})">✕</button>
                </div>
            `;
            videoQueueList.appendChild(card);
        });

        document.querySelectorAll('.queue-title-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (queue[idx]) queue[idx].title = e.target.value;
            });
        });

        document.querySelectorAll('.queue-order-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (queue[idx]) queue[idx].sortOrder = parseInt(e.target.value) || 1;
            });
        });
    }

    window.removeQueueItem = function(index) {
        queue.splice(index, 1);
        renderQueue();
    };

    // 3. Form Submit -> Create Course -> Sequential Upload
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('courseName').value.trim();
        const price = parseFloat(document.getElementById('coursePrice').value) || 0;
        const stageId = stageSelect.value;
        const yearId = yearSelect.value;

        if (!stageId || !yearId) {
            alert('يرجى اختيار المرحلة والسنة الدراسية.');
            return;
        }

        progressModal.style.display = 'flex';
        updateModalProgress(0, 'جاري إنشاء الكورس على النظام...');

        try {
            // Step A: Create Course
            const createRes = await apiFetch('/api/Learning/CreateCourse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price, stageId, yearId })
            });

            if (!createRes.ok) {
                const err = await createRes.json().catch(() => ({}));
                throw new Error(err.message || 'فشل إنشاء الكورس');
            }

            const createData = await createRes.json();
            const courseId = createData.courseId || createData.id;

            if (!courseId) throw new Error('تعذر معرفة كود الكورس المنشأ.');

            // Step B: Upload Videos
            const total = queue.length;
            if (total === 0) {
                updateModalProgress(100, 'تم إنشاء الكورس بنجاح!');
                setTimeout(() => {
                    window.location.href = `../manage-course-content/manage-course-content.html?courseId=${encodeURIComponent(courseId)}`;
                }, 1000);
                return;
            }

            for (let i = 0; i < total; i++) {
                const item = queue[i];
                modalQueueInfo.textContent = `جاري رفع فيديو ${i + 1} من ${total}: "${item.title}"`;

                await uploadSingle(courseId, item, (percent) => {
                    const overall = Math.round(((i / total) * 100) + (percent / total));
                    updateModalProgress(overall, `جاري رفع "${item.title}" (${percent}%)`);
                });
            }

            updateModalProgress(100, 'اكتمل رفع الكورس وجميع الفيديوهات بنجاح!');
            setTimeout(() => {
                window.location.href = `../manage-course-content/manage-course-content.html?courseId=${encodeURIComponent(courseId)}`;
            }, 1200);

        } catch (err) {
            alert('حدث خطأ: ' + err.message);
            progressModal.style.display = 'none';
        }
    });

    function uploadSingle(courseId, item, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = `${API_CONFIG.BASE_URL}/api/Learning/UploadVideo?courseId=${encodeURIComponent(courseId)}`;
            xhr.open('POST', url, true);
            const token = getAuthToken();
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.withCredentials = true;

            const fd = new FormData();
            fd.append('CourseId', courseId);
            fd.append('Title', item.title);
            fd.append('SortOrder', item.sortOrder);
            fd.append('AvailabilityDays', 1);
            fd.append('VideoFile', item.file);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const p = Math.round((e.loaded / e.total) * 100);
                    onProgress(p);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`خطأ في الرفع (${xhr.status})`));
            };

            xhr.onerror = () => reject(new Error('خطأ في الشبكة'));
            xhr.send(fd);
        });
    }

    function updateModalProgress(percent, text) {
        modalProgressFill.style.width = `${percent}%`;
        modalPercent.textContent = `${percent}%`;
        modalStatus.textContent = text;
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
