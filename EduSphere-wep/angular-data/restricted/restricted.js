document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');
    const msg = document.getElementById('restrictedMessage');

    if (courseId) {
        msg.textContent = `هذا الكورس (كود: ${courseId}) مخصص فقط للطلاب المسجلين أو للمدرس صاحب الكورس. يرجى التأكد من تسجيل الدخول والاشتراك في الكورس أولاً.`;
    }
});
