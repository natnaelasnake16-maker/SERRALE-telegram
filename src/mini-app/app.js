const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#eef3fb');
    tg.setBackgroundColor('#eef3fb');
}

const query = new URLSearchParams(window.location.search);
const state = {
    bootstrap: null,
    currentView: query.get('view') || 'job',
    uploadedFile: null,
    toastTimer: null,
};

const screens = {
    loading: document.getElementById('loading-screen'),
    job: document.getElementById('job-screen'),
    apply: document.getElementById('apply-screen'),
    status: document.getElementById('status-screen'),
};

const els = {
    toast: document.getElementById('toast'),
    jobTitle: document.getElementById('job-title'),
    jobCategory: document.getElementById('job-category'),
    jobPosted: document.getElementById('job-posted'),
    jobClientChip: document.getElementById('job-client-chip'),
    jobLocation: document.getElementById('job-location'),
    jobBudget: document.getElementById('job-budget'),
    jobType: document.getElementById('job-type'),
    jobExperience: document.getElementById('job-experience'),
    jobDeadline: document.getElementById('job-deadline'),
    jobEligibility: document.getElementById('job-eligibility'),
    jobSkills: document.getElementById('job-skills'),
    jobDescription: document.getElementById('job-description'),
    saveButton: document.getElementById('save-button'),
    openWebButton: document.getElementById('open-web-button'),
    shareButton: document.getElementById('share-button'),
    applyOpenButton: document.getElementById('apply-open-button'),
    applyFullName: document.getElementById('apply-full-name'),
    applyPhone: document.getElementById('apply-phone'),
    applyEmail: document.getElementById('apply-email'),
    applyNote: document.getElementById('apply-note'),
    applyConsent: document.getElementById('apply-consent'),
    applyForm: document.getElementById('apply-form'),
    uploadState: document.getElementById('upload-state'),
    cvFileInput: document.getElementById('cv-file-input'),
    statusLinked: document.getElementById('status-linked'),
    statusRole: document.getElementById('status-role'),
    statusVerification: document.getElementById('status-verification'),
    statusSaved: document.getElementById('status-saved'),
    statusApplications: document.getElementById('status-applications'),
    statusNextStep: document.getElementById('status-next-step'),
    statusLinkButton: document.getElementById('status-link-button'),
    statusOpenSerraleButton: document.getElementById('status-open-serrale-button'),
};

function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('is-visible');
    if (state.toastTimer) clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
        els.toast.classList.remove('is-visible');
    }, 2500);
}

function formatBudget(job) {
    if (typeof job.budget === 'number' && job.budget > 0) {
        return `ETB ${job.budget.toLocaleString()}`;
    }
    if (typeof job.budget_min === 'number' || typeof job.budget_max === 'number') {
        const min = typeof job.budget_min === 'number' ? `ETB ${job.budget_min.toLocaleString()}` : 'Open';
        const max = typeof job.budget_max === 'number' ? `ETB ${job.budget_max.toLocaleString()}` : 'Open';
        return `${min} - ${max}`;
    }
    return 'Budget not disclosed';
}

function relativeTime(timestamp) {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function activeScreen(view) {
    Object.values(screens).forEach((screen) => screen.classList.remove('is-active'));
    const next = screens[view] || screens.loading;
    next.classList.add('is-active');
    state.currentView = view;
}

function currentHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (tg && tg.initData) {
        headers['x-telegram-init-data'] = tg.initData;
    }

    return headers;
}

function buildUrl(path, extraParams) {
    const url = new URL(path, window.location.origin);
    if (!tg || !tg.initData) {
        const devUserId = query.get('telegramUserId');
        if (devUserId) {
            url.searchParams.set('telegramUserId', devUserId);
        }
    }

    if (extraParams) {
        Object.entries(extraParams).forEach(([key, value]) => {
            if (value != null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }

    return url.toString();
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || 'Request failed');
    }
    return payload;
}

function renderSkills(skills) {
    els.jobSkills.innerHTML = '';
    (skills || []).slice(0, 10).forEach((skill) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = skill;
        els.jobSkills.appendChild(chip);
    });
}

function renderStatus() {
    const status = state.bootstrap.status;
    els.statusLinked.textContent = status.linked ? 'Linked' : 'Not linked';
    els.statusRole.textContent = status.role ? status.role.replace(/_/g, ' ') : 'Unknown';
    els.statusVerification.textContent = status.trust_level ? status.trust_level.replace('level_', 'Level ') : 'Pending';
    els.statusSaved.textContent = String(status.saved_jobs_count || 0);
    els.statusApplications.textContent = String(status.application_count || 0);
    els.statusNextStep.textContent = status.linked
        ? 'Your Telegram flow is connected. Complete more of your Serrale profile on the web if you want stronger matching and verification.'
        : 'Link your Serrale account on the website to save jobs and keep your Telegram activity synced.';
}

function renderJob() {
    const job = state.bootstrap.job;
    if (!job) {
        activeScreen('status');
        return;
    }

    els.jobTitle.textContent = job.title || 'Untitled job';
    els.jobCategory.textContent = [job.category, job.sub_category].filter(Boolean).join(' · ');
    els.jobPosted.textContent = relativeTime(job.created_at);
    els.jobClientChip.textContent = job.client_verified ? 'Verified client' : 'Client';
    els.jobLocation.textContent = job.city || job.location_type || 'Remote/Open';
    els.jobBudget.textContent = formatBudget(job);
    els.jobType.textContent = job.job_type || 'Project';
    els.jobExperience.textContent = job.experience_level || 'Open';
    els.jobDeadline.textContent = job.deadline || 'Open';
    els.jobEligibility.textContent = [job.gender || null, job.education_level || null].filter(Boolean).join(' / ') || 'Open';
    els.jobDescription.textContent = (job.description || 'Open on Serrale for the full project brief.').slice(0, 520);
    els.saveButton.textContent = job.saved ? 'Unsave' : state.bootstrap.status.linked ? 'Save' : 'Link to save';
    renderSkills(job.skills || []);
}

function prefillApplyForm() {
    const status = state.bootstrap.status;
    els.applyFullName.value = status.full_name || '';
    els.applyPhone.value = status.phone || '';
    els.applyEmail.value = status.email || '';
}

function openExternal(url) {
    if (!url) return;
    if (tg && tg.openLink) {
        tg.openLink(url);
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

async function toggleSave() {
    const job = state.bootstrap.job;
    if (!job) return;

    if (!state.bootstrap.status.linked) {
        showToast('Link your Serrale account to save jobs.');
        activeScreen('status');
        return;
    }

    await fetchJson(buildUrl(`/mini-app/jobs/${job.id}/save`), {
        method: 'POST',
        headers: currentHeaders(),
        body: JSON.stringify({ save: !job.saved }),
    });

    job.saved = !job.saved;
    renderJob();
    renderStatus();
    showToast(job.saved ? 'Job saved.' : 'Job removed from saved list.');
}

async function uploadCv(file) {
    const formData = new FormData();
    formData.append('file', file);

    const headers = {};
    if (tg && tg.initData) {
        headers['x-telegram-init-data'] = tg.initData;
    }

    const response = await fetch(buildUrl('/mini-app/upload-cv'), {
        method: 'POST',
        headers,
        body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.message || 'Could not upload CV');
    }

    return payload.file;
}

async function submitApplication(event) {
    event.preventDefault();

    const job = state.bootstrap.job;
    if (!job) return;

    const payload = {
        full_name: els.applyFullName.value.trim(),
        phone: els.applyPhone.value.trim(),
        email: els.applyEmail.value.trim(),
        cv_file_url: state.uploadedFile ? state.uploadedFile.publicUrl : '',
        cv_file_name: state.uploadedFile ? state.uploadedFile.originalName : '',
        note: els.applyNote.value.trim(),
        consent: Boolean(els.applyConsent.checked),
    };

    const result = await fetchJson(buildUrl(`/mini-app/jobs/${job.id}/apply`), {
        method: 'POST',
        headers: currentHeaders(),
        body: JSON.stringify(payload),
    });

    showToast('Application submitted.');
    state.bootstrap.status.application_count += 1;
    state.bootstrap.status.last_application_at = result.application.submitted_at;
    renderStatus();
    activeScreen('status');
}

async function bootstrap() {
    try {
        const payload = await fetchJson(
            buildUrl('/mini-app/bootstrap', {
                jobId: query.get('jobId') || '',
            }),
            {
                headers: tg && tg.initData ? { 'x-telegram-init-data': tg.initData } : {},
            }
        );

        state.bootstrap = payload;
        renderJob();
        renderStatus();
        prefillApplyForm();

        if (state.currentView === 'apply' && payload.job) {
            activeScreen('apply');
        } else if (state.currentView === 'status' || !payload.job) {
            activeScreen('status');
        } else {
            activeScreen('job');
        }
    } catch (error) {
        showToast(error.message || 'Failed to load Serrale.');
        activeScreen('status');
    }
}

document.getElementById('job-back-button').addEventListener('click', () => {
    if (tg && tg.close) {
        tg.close();
    } else {
        window.history.back();
    }
});
document.getElementById('job-status-button').addEventListener('click', () => activeScreen('status'));
document.getElementById('apply-back-button').addEventListener('click', () => activeScreen('job'));
document.getElementById('status-back-button').addEventListener('click', () => activeScreen(state.bootstrap && state.bootstrap.job ? 'job' : 'loading'));
els.applyOpenButton.addEventListener('click', () => activeScreen('apply'));
els.openWebButton.addEventListener('click', () => openExternal(state.bootstrap.web_job_url));
els.statusOpenSerraleButton.addEventListener('click', () => openExternal(state.bootstrap.web_job_url || 'https://serrale.com'));
els.statusLinkButton.addEventListener('click', () => openExternal('https://serrale.com'));
els.shareButton.addEventListener('click', async () => {
    const url = state.bootstrap.web_job_url;
    if (navigator.share && url) {
        try {
            await navigator.share({ title: state.bootstrap.job.title, url });
            return;
        } catch (_error) {
            // ignore and fall back below
        }
    }
    if (url) {
        await navigator.clipboard.writeText(url).catch(() => {});
        showToast('Job link copied.');
    }
});
els.saveButton.addEventListener('click', () => {
    toggleSave().catch((error) => showToast(error.message || 'Could not update saved job.'));
});
els.applyForm.addEventListener('submit', (event) => {
    submitApplication(event).catch((error) => showToast(error.message || 'Could not submit application.'));
});
els.cvFileInput.addEventListener('change', async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    els.uploadState.textContent = 'Uploading...';
    try {
        state.uploadedFile = await uploadCv(file);
        els.uploadState.textContent = `${state.uploadedFile.originalName} uploaded successfully.`;
        showToast('CV uploaded.');
    } catch (error) {
        els.uploadState.textContent = 'Upload failed. Try again.';
        showToast(error.message || 'Could not upload CV.');
    }
});

bootstrap();
