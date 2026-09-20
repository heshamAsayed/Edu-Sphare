document.addEventListener('DOMContentLoaded', async () => {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const courseCards = document.getElementById('courseCards');
    const teacherMeta = document.getElementById('teacherMeta');
    const schoolInfo = document.getElementById('schoolInfo');
    const stagesInfo = document.getElementById('stagesInfo');

    try {
        const response = await apiFetch('/api/Learning/ManageCourses');

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '../restricted/restricted.html';
                return;
            }
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        loadingState.style.display = 'none';

        // Render teacher school and stages
        if (data.teacherSchoolName) {
            schoolInfo.innerHTML = `المدرسة: <strong>${escapeHtml(data.teacherSchoolName)}</strong>`;
            if (data.stages && data.stages.length > 0) {
                const stageNames = data.stages.map(s => s.name || s.Name).join('، ');
                stagesInfo.innerHTML = `| المراحل: <strong>${escapeHtml(stageNames)}</strong>`;
            } else {
                stagesInfo.style.display = 'none';
            }
            teacherMeta.style.display = 'inline-flex';
        }

        // Render courses
        const courses = data.courses || [];
        if (courses.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        courseCards.innerHTML = '';
        courses.forEach(course => {
            const card = document.createElement('a');
            card.className = 'course-card';
            card.href = `../manage-course-content/manage-course-content.html?courseId=${encodeURIComponent(course.id || course.Id)}`;
            
            const videosCount = course.videosCount ?? course.VideosCount ?? 0;
            const price = Number(course.price ?? course.Price ?? 0).toFixed(2);
            const createdDate = (course.createdAt || course.CreatedAt || '').split('T')[0] || '';

            card.innerHTML = `
                <div>
                    <h2>${escapeHtml(course.name || course.Name || 'كورس بدون عنوان')}</h2>
                    <p>اضغط لمراجعة وإدارة محتوى الدروس والفيديوهات</p>
                </div>
                <div class="course-card-meta">
                    <span>🎥 ${videosCount} فيديو</span>
                    <span>💰 ${price} ج.م</span>
                    <span>📅 ${createdDate}</span>
                </div>
            `;
            courseCards.appendChild(card);
        });

    } catch (err) {
        console.error('Error loading courses:', err);
        loadingState.innerHTML = `
            <p style="color: var(--danger);">حدث خطأ أثناء تحميل الكورسات: ${escapeHtml(err.message)}</p>
            <button class="btn-outline" onclick="location.reload()" style="margin-top: 12px;">إعادة المحاولة</button>
        `;
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
