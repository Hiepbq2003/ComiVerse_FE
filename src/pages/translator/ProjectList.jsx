import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Search, Filter, BookOpen, Users, Calendar, User, AlertCircle, ClipboardList, Hourglass } from 'lucide-react';
import { toast } from 'react-toastify';
import '../../assets/style/translator/project-list.css';
import { getAllProjectTeamsApi, getMyProjectTeamsApi } from '../../services/api/ProjectTeamApi';
import { createTeamRequestApi, cancelTeamRequestApi, getMyApplicationStatusApi } from '../../services/api/TeamWorkspaceApi';
import { uploadFileApi } from '../../services/api/UploadApi';
import { getMyTranslatorProfileApi } from '../../services/api/TranslatorApi';
import { getAuth } from '../../utils/Auth';
import { useNotification } from '../../context/NotificationContext';
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages';

const MAX_ACTIVE_PROJECTS = 5;
const MAX_ACTIVE_TASKS = 5;

function isCooldownActive(until, now = Date.now()) {
  return Boolean(until) && new Date(until).getTime() > now;
}

function cooldownLabel(type) {
  const t = String(type || '').toUpperCase();
  if (t === 'CANCEL') return 'Cancel';
  if (t === 'REJECT') return 'Rejected';
  if (t === 'LEAVE') return 'Leave';
  return type || 'Cooldown';
}

function formatCooldownRemaining(until, now = Date.now()) {
  const ms = new Date(until).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

function normalizeId(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    return String(value.id || value.uuid || value.projectTeamId || '').toLowerCase().replace(/-/g, '');
  }
  return String(value).toLowerCase().replace(/-/g, '');
}

function sameId(a, b) {
  const left = normalizeId(a);
  const right = normalizeId(b);
  return Boolean(left) && left === right;
}

function normalizeForSearch(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u00a0\u3000]+/g, ' ')
    .trim();
}

function textMatchesSearch(haystack, needle) {
  const n = normalizeForSearch(needle);
  if (!n) return true;
  const h = normalizeForSearch(haystack);
  if (h.includes(n)) return true;
  const compactH = h.replace(/\s+/g, '');
  const compactN = n.replace(/\s+/g, '');
  return Boolean(compactN) && compactH.includes(compactN);
}

function unwrapStatus(payload) {
  if (!payload || typeof payload !== 'object') return {};
  if (Array.isArray(payload.cooldowns) || Array.isArray(payload.applications)) return payload;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

function hoursForCooldownType(type) {
  const t = String(type || '').toUpperCase();
  if (t === 'CANCEL') return 12;
  return 24;
}

function deriveCooldownsFromApplications(applications, now = Date.now()) {
  const result = [];
  for (const app of applications || []) {
    const status = String(app?.status || '').trim().toUpperCase();
    const teamId = app?.projectTeamId;
    if (!teamId) continue;

    let type = app?.cooldownType || null;
    let until = app?.cooldownUntil || null;
    if (!until) {
      if (status === 'CANCELLED' || status === 'CANCELED') {
        type = 'CANCEL';
        if (app?.cancelledAt) {
          until = new Date(new Date(app.cancelledAt).getTime() + hoursForCooldownType(type) * 3600 * 1000).toISOString();
        }
      } else if (status === 'REJECTED') {
        type = 'REJECT';
        if (app?.decidedAt) {
          until = new Date(new Date(app.decidedAt).getTime() + hoursForCooldownType(type) * 3600 * 1000).toISOString();
        }
      }
    }
    if (!isCooldownActive(until, now)) continue;
    result.push({
      projectTeamId: String(teamId),
      cooldownType: type || 'CANCEL',
      cooldownUntil: until,
      global: false,
    });
  }
  return result;
}

function mergeProjectCooldowns(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const cd of list || []) {
      if (!cd?.projectTeamId || !isCooldownActive(cd.cooldownUntil)) continue;
      const key = normalizeId(cd.projectTeamId);
      if (!key) continue;
      const prev = map.get(key);
      if (!prev || new Date(cd.cooldownUntil) > new Date(prev.cooldownUntil)) {
        map.set(key, {
          ...cd,
          projectTeamId: String(cd.projectTeamId),
          global: false,
        });
      }
    }
  }
  return [...map.values()];
}

function cooldownForProject(appStatus, projectId, now = Date.now()) {
  if (projectId == null) return null;
  const status = unwrapStatus(appStatus);
  const stored = mergeProjectCooldowns(
    status?.cooldowns,
    deriveCooldownsFromApplications(status?.applications, now)
  );
  return stored.find((cd) => {
    if (!cd?.projectTeamId) return false;
    if (!isCooldownActive(cd?.cooldownUntil, now)) return false;
    return sameId(cd.projectTeamId, projectId);
  }) || null;
}

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTargetLang, setSelectedTargetLang] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const [appliedIds, setAppliedIds] = useState([]);
  const [appliedRequestMap, setAppliedRequestMap] = useState({}); // teamId -> requestId
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [translatorProfile, setTranslatorProfile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState(null); // teamId being cancelled
  const fileInputRef = useRef(null);
  const optimisticCooldownsRef = useRef([]);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [myProjectTeams, setMyProjectTeams] = useState([]);

  // Application status (slot counter + cooldown)
  const [appStatus, setAppStatus] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // Load auth details
  const auth = getAuth();
  const authUser = auth?.user;
  const userFullName = authUser?.fullName || authUser?.username || 'Translator';
  const isUserProjectLeader = (authUser?.role || '').toUpperCase() === 'PROJECT_LEADER' || (authUser?.role || '').toUpperCase().includes('LEADER');
  const { notifications } = useNotification();
  const location = useLocation();

  const applyPendingFromStatus = useCallback((statusData) => {
    const status = unwrapStatus(statusData);
    const applications = Array.isArray(status?.applications) ? status.applications : [];
    const pendingFromApplications = applications.filter(item => {
      const itemStatus = String(item?.status || 'PENDING').trim().toUpperCase();
      return itemStatus === 'PENDING';
    });
    const details = pendingFromApplications.length > 0 || applications.length > 0
      ? pendingFromApplications
      : (Array.isArray(status?.pendingDetails) ? status.pendingDetails : []);

    const appIds = [];
    const reqMap = {};

    details.forEach(item => {
      const itemStatus = String(item?.status || 'PENDING').trim().toUpperCase();
      if (itemStatus !== 'PENDING') return;
      const teamId = item?.projectTeamId != null ? String(item.projectTeamId) : '';
      if (!teamId) return;
      appIds.push(teamId);
      if (item.requestId) reqMap[teamId] = item.requestId;
    });

    const mergedCooldowns = mergeProjectCooldowns(
      status?.cooldowns,
      deriveCooldownsFromApplications(applications),
      optimisticCooldownsRef.current
    );
    optimisticCooldownsRef.current = mergedCooldowns;

    setAppliedIds(appIds);
    setAppliedRequestMap(reqMap);
    if (statusData) setAppStatus({ ...status, cooldowns: mergedCooldowns });
  }, []);

  const refreshApplicationStatus = useCallback(async () => {
    try {
      const statusData = await getMyApplicationStatusApi();
      if (statusData) applyPendingFromStatus(statusData);
    } catch (e) {}
  }, [applyPendingFromStatus]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [projectsData, statusData, myProjects] = await Promise.all([
          getAllProjectTeamsApi(),
          getMyApplicationStatusApi().catch(() => null),
          getMyProjectTeamsApi().catch(() => []),
        ]);
        if (cancelled) return;

        const projList = Array.isArray(projectsData) ? projectsData : [];
        const myTeams = Array.isArray(myProjects) ? myProjects : [];

        setProjects(projList);
        applyPendingFromStatus(statusData);
        setMyProjectTeams(myTeams);
        setActiveProjectsCount(
          myTeams.filter(p => p.status && p.status.toUpperCase() !== 'COMPLETED').length
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    getMyTranslatorProfileApi()
      .then(profile => {
        if (!cancelled && profile) setTranslatorProfile(profile);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userFullName, applyPendingFromStatus, location.pathname, location.key]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshApplicationStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const intervalId = window.setInterval(refreshApplicationStatus, 4000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(intervalId);
    };
  }, [refreshApplicationStatus]);

  useEffect(() => {
    const latest = notifications?.[0];
    if (!latest) return;
    const text = `${latest.title || ''} ${latest.message || ''}`.toLowerCase();
    if (!text.includes('team request') && !text.includes('application') && !text.includes('rejected')) return;
    refreshApplicationStatus();
  }, [notifications, refreshApplicationStatus]);

  // Optimized query filtering with useMemo
  const filteredProjects = useMemo(() => {
    const currentUserName = (userFullName || '').toLowerCase().trim();
    const currentUsername = (authUser?.username || '').toLowerCase().trim();

    return projects.filter((p) => {
      // 1. Check LocalStorage recruitment status override first
      const localStatusKey = `comiverse_is_recruiting_${p.id}`;
      const manualStatus = localStorage.getItem(localStatusKey);

      let isRecruiting = true;
      if (manualStatus !== null) {
        isRecruiting = manualStatus === 'true';
      } else if (typeof p.isRecruiting === 'boolean') {
        isRecruiting = p.isRecruiting;
      }

      if (!isRecruiting) return false;
      if (p.status && p.status.toUpperCase() !== 'ACTIVE') return false;

      // 2. Target Language Filter
      if (selectedTargetLang !== 'ALL') {
        const pLang = (p.targetLanguage || p.language || '').toLowerCase().trim();
        const selLang = selectedTargetLang.toLowerCase().trim();
        if (!pLang.includes(selLang)) return false;
      }

      // 3. Priority / Urgency Filter
      if (selectedPriority !== 'ALL') {
        const pPriority = (p.priority || 'medium').toLowerCase().trim();
        const selPriority = selectedPriority.toLowerCase().trim();
        if (pPriority !== selPriority) return false;
      }

      // 4. Search Filter
      if (searchTerm.trim()) {
        const matched = [p.comicName, p.title, p.leaderName]
          .some((field) => textMatchesSearch(field, searchTerm));
        if (!matched) return false;
      }

      // 5. Exclude projects led by current user (Project Leaders manage their team, they do not apply to it)
      const isLeader = (p.leaderId && authUser?.id && String(p.leaderId) === String(authUser.id)) ||
        (p.leaderName && (p.leaderName.toLowerCase().trim() === currentUserName || p.leaderName.toLowerCase().trim() === currentUsername));
      if (isLeader) return false;

      // Exclude projects where current user is already an approved member or leader in backend list
      const isAlreadyInMyTeams = myProjectTeams.some(mp => mp.id === p.id);
      if (isAlreadyInMyTeams) return false;

      // 6. Exclude projects where current user is in members list
      if (Array.isArray(p.members) && p.members.some(m => {
        const mId = m.userId || m.user?.id || m.id;
        const mName = (m.name || m.user?.fullName || m.user?.username || '').toLowerCase().trim();
        return (mId && authUser?.id && String(mId) === String(authUser.id)) || mName === currentUserName || mName === currentUsername;
      })) {
        return false;
      }

      const localApprovedKey = `comiverse_approved_members_${p.id}`;
      let savedMems = [];
      try {
        savedMems = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
      } catch (e) {}

      const isAlreadyMember = savedMems.some(m => {
        const mn = (m.name || '').toLowerCase().trim();
        return mn === currentUserName || mn === currentUsername;
      });

      return !isAlreadyMember;
    });
  }, [projects, selectedTargetLang, selectedPriority, searchTerm, userFullName, authUser, myProjectTeams]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTargetLang, selectedPriority]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1;

  const paginatedProjects = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProjects.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  const pendingCount = Math.max(
    appliedIds.length,
    Number(appStatus?.pendingApplications || 0)
  );
  const joinedCount = Math.max(
    activeProjectsCount,
    Number(appStatus?.joinedTeams || 0)
  );
  const atProjectLimit = (joinedCount + pendingCount) >= MAX_ACTIVE_PROJECTS;

  const handleApplyClick = (project) => {
    // 0. Check if user is a Project Leader
    if (isUserProjectLeader) {
      toast.error('Project Leaders manage project teams and cannot apply to join translation teams.');
      return;
    }

    if (atProjectLimit) {
      toast.error('You have reached the maximum number of concurrent projects.');
      return;
    }

    const projectCooldown = cooldownForProject(appStatus, project?.id, nowMs);
    if (projectCooldown) {
      toast.error(`You cannot re-apply to this project until ${new Date(projectCooldown.cooldownUntil).toLocaleString()}. Other projects are still available.`);
      return;
    }

    // 1. Check if user is the leader of this project
    const isLeader = (project.leaderId && authUser?.id && String(project.leaderId) === String(authUser.id)) ||
      (project.leaderName && (project.leaderName.toLowerCase().trim() === (userFullName || '').toLowerCase().trim() || project.leaderName.toLowerCase().trim() === (authUser?.username || '').toLowerCase().trim()));
    if (isLeader) {
      toast.error('You are the leader of this project team and cannot apply to join your own team.');
      return;
    }

    // 2. Check if user is already a member of this project
    if (myProjectTeams.some(mp => mp.id === project.id)) {
      toast.error('You are already an approved member of this project team.');
      return;
    }

    setSelectedProject(project);

    // Auto-populate message from bio or default professional intro
    if (translatorProfile?.bio && translatorProfile.bio.trim()) {
      setJoinMessage(translatorProfile.bio.trim());
    } else {
      const specs = Array.isArray(translatorProfile?.specializations) && translatorProfile.specializations.length > 0
        ? ` specializing in ${translatorProfile.specializations.join(', ')}`
        : '';
      const exp = translatorProfile?.experienceYears ? ` with ${translatorProfile.experienceYears} years of experience` : '';
      setJoinMessage(`Hi! I would love to join your translation team for "${project.comicName || project.title}"${specs}${exp}. Ready to contribute!`);
    }

    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowJoinModal(true);
  };

  const handleCvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.warn('🚫 Invalid file format! Only PDF documents (.pdf) are accepted for CV uploads.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warn('File size must be under 5MB.');
      e.target.value = '';
      return;
    }
    setCvFile(file);
  };

  const handleSendJoinRequest = async () => {
    if (!selectedProject) return;
    if (uploading) return;

    try {
      setUploading(true);
      const initials = userFullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      // Upload CV file if a new file was chosen, otherwise fallback to attached Profile CV
      let cvUrl = translatorProfile?.cvUrl || null;
      let cvFileName = translatorProfile?.cvUrl ? 'Profile_Verified_CV.pdf' : null;

      if (cvFile) {
        try {
          const uploadResult = await uploadFileApi(cvFile);
          cvUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult?.url || uploadResult?.fileUrl || null;
          cvFileName = cvFile.name;
        } catch (uploadErr) {
          console.error('CV upload failed:', uploadErr);
          toast.error('Failed to upload CV file. Please try again.');
          return;
        }
      }

      const result = await createTeamRequestApi(selectedProject.id, {
        name: userFullName,
        time: new Date().toISOString(),
        text: joinMessage.trim(),
        roles: 'Member',
        avatar: initials,
        cvUrl: cvUrl,
        cvFileName: cvFileName,
      });

      toast.success(`Application sent successfully for "${selectedProject.comicName || selectedProject.title}"!`);
      const teamId = String(selectedProject.id);
      setAppliedIds((prev) => prev.includes(teamId) ? prev : [...prev, teamId]);
      if (result?.id) {
        setAppliedRequestMap(prev => ({ ...prev, [teamId]: result.id }));
      }
      setShowJoinModal(false);
      setSelectedProject(null);
      setCvFile(null);

      getMyApplicationStatusApi().then(s => { if (s) applyPendingFromStatus(s); }).catch(() => {});
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to send application.';
      toast.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelApplication = async (projectId) => {
    const requestId = appliedRequestMap[String(projectId)];
    if (!requestId) {
      toast.error('Could not find your pending application to cancel.');
      return;
    }
    try {
      setCancelling(projectId);
      const result = await cancelTeamRequestApi(requestId);
      toast.success('Application cancelled. You can re-apply to this project after 12 hours. Other projects are unaffected.');
      const teamId = String(result?.projectTeamId || projectId);
      const localCooldown = {
        projectTeamId: teamId,
        cooldownType: result?.cooldownType || 'CANCEL',
        cooldownUntil: result?.cooldownUntil || new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        global: false,
      };
      optimisticCooldownsRef.current = mergeProjectCooldowns(
        optimisticCooldownsRef.current,
        [localCooldown]
      );
      setAppStatus(prev => {
        const status = unwrapStatus(prev);
        return {
          ...status,
          cooldowns: mergeProjectCooldowns(status?.cooldowns, [localCooldown], optimisticCooldownsRef.current),
        };
      });
      setAppliedIds(prev => prev.filter(id => String(id) !== String(projectId) && String(id) !== teamId));
      setAppliedRequestMap(prev => {
        const copy = { ...prev };
        delete copy[teamId];
        delete copy[String(projectId)];
        return copy;
      });
      getMyApplicationStatusApi().then(s => { if (s) applyPendingFromStatus(s); }).catch(() => {});
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to cancel application.';
      toast.error(errMsg);
    } finally {
      setCancelling(null);
    }
  };

  if (isUserProjectLeader) {
    return <Navigate to="/translator/project-teams" replace />;
  }

  if (loading) {
    return (
      <div className="translator-project-list-container container-fluid py-4" style={{ padding: '24px' }}>
        <div className="mb-4">
          <h1 className="fw-bold" style={{ color: 'var(--trans-text-primary)', margin: '0 0 8px 0' }}>Available Projects</h1>
          <p style={{ color: 'var(--trans-text-secondary)', margin: 0 }}>
            Browse open translation projects and apply to join a team.
          </p>
        </div>
        <div className="available-projects-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="available-project-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '24px', margin: 0 }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '80px', height: '24px', margin: 0, borderRadius: '12px' }}></div>
              </div>
              <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '16px', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '90%', height: '18px', margin: 0 }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '18px', margin: 0 }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '85%', height: '18px', margin: 0 }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '18px', margin: 0 }}></div>
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
                <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '40px', margin: 0, borderRadius: '8px' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="translator-project-list-container container-fluid py-4" style={{ padding: '24px' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: 'var(--trans-text-primary)', margin: '0 0 8px 0' }}>Available Projects</h1>
        <p style={{ color: 'var(--trans-text-secondary)', margin: 0 }}>
          Browse open translation projects and apply to join a team.
        </p>
      </div>

      {/* Capacity: projects joined + tasks assigned */}
      {!isUserProjectLeader && appStatus ? (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
            marginBottom: 0
          }}>
            {(() => {
              const joined = Number(appStatus.joinedTeams || 0);
              const pending = Number(appStatus.pendingApplications || 0);
              const maxProjects = MAX_ACTIVE_PROJECTS;
              const usedProjects = joined + pending;
              const tasks = Number(appStatus.activeTasks ?? 0);
              const maxTasks = MAX_ACTIVE_TASKS;
              const projectAtLimit = usedProjects >= maxProjects;
              const projectNearLimit = !projectAtLimit && usedProjects >= maxProjects - 2;
              const taskAtLimit = tasks >= maxTasks;
              const taskNearLimit = !taskAtLimit && tasks >= maxTasks - 2;

              const tone = (atLimit, nearLimit) => ({
                background: atLimit
                  ? 'rgba(239, 68, 68, 0.08)'
                  : nearLimit
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(16, 185, 129, 0.06)',
                border: `1px solid ${atLimit ? 'rgba(239, 68, 68, 0.22)' : nearLimit ? 'rgba(245, 158, 11, 0.22)' : 'rgba(16, 185, 129, 0.18)'}`,
                value: atLimit ? '#ef4444' : nearLimit ? '#f59e0b' : '#10b981',
                iconBg: atLimit ? 'rgba(239, 68, 68, 0.15)' : nearLimit ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'
              });

              const projectTone = tone(projectAtLimit, projectNearLimit);
              const taskTone = tone(taskAtLimit, taskNearLimit);

              return (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: projectTone.background,
                    border: projectTone.border
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: projectTone.iconBg, color: projectTone.value
                    }}>
                      <Users size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--trans-text-muted)', marginBottom: '4px' }}>
                        Concurrent projects
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1, color: 'var(--trans-text-primary)' }}>
                        <span style={{ color: projectTone.value }}>{usedProjects}</span>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--trans-text-secondary)' }}> / {maxProjects}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--trans-text-secondary)', marginTop: '4px' }}>
                        {projectAtLimit
                          ? 'Maximum concurrent projects reached'
                          : `${joined} approved · ${pending} pending · ${Math.max(0, maxProjects - usedProjects)} slot${maxProjects - usedProjects !== 1 ? 's' : ''} left`}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: taskTone.background,
                    border: taskTone.border
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: taskTone.iconBg, color: taskTone.value
                    }}>
                      <ClipboardList size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--trans-text-muted)', marginBottom: '4px' }}>
                        Tasks assigned
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1, color: 'var(--trans-text-primary)' }}>
                        <span style={{ color: taskTone.value }}>{tasks}</span>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--trans-text-secondary)' }}> / {maxTasks}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--trans-text-secondary)', marginTop: '4px' }}>
                        {taskAtLimit
                          ? 'At the incomplete-task limit. Finish a task before taking more work.'
                          : `${tasks} assigned · ${Math.max(0, maxTasks - tasks)} slot${maxTasks - tasks !== 1 ? 's' : ''} left`}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : (!isUserProjectLeader && atProjectLimit) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '20px',
        }}>
          <AlertCircle size={20} style={{ color: '#eab308', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#fde047' }}>
              You have reached the maximum of {MAX_ACTIVE_PROJECTS} concurrent projects
            </p>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#ca8a04' }}>
              Cancel a pending application or wait until a project is completed before applying to another team.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar & Filters (1 row) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              top: '50%',
              left: '12px',
              transform: 'translateY(-50%)',
              color: 'var(--trans-text-muted)',
            }}
          />
          <input
            type="text"
            className="trans-form-input"
            style={{ paddingLeft: '38px', width: '100%', height: '42px', fontSize: '13px' }}
            placeholder="Search projects by title, comic, or leader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Target Language Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--trans-text-secondary)', whiteSpace: 'nowrap' }}>🌐 Target:</span>
          <select
            className="trans-form-input"
            style={{ height: '42px', fontSize: '13px', fontWeight: '600' }}
            value={selectedTargetLang}
            onChange={(e) => setSelectedTargetLang(e.target.value)}
          >
            <option value="ALL">All Languages</option>
            {COMIC_LANGUAGE_OPTIONS.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--trans-text-secondary)', whiteSpace: 'nowrap' }}>🔥 Priority:</span>
          <select
            className="trans-form-input"
            style={{ height: '42px', fontSize: '13px', fontWeight: '600' }}
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">🔥 Urgent Only</option>
            <option value="High">🟠 High Priority</option>
            <option value="Medium">🟣 Medium Priority</option>
            <option value="Low">⚪ Low Priority</option>
          </select>
        </div>
      </div>

      {/* Grid Projects */}
      <div className="available-projects-grid">
        {paginatedProjects.map((project) => {
          const alreadyApplied = appliedIds.includes(String(project.id));

          const totalMembers = Number(project.membersCount) || 1;
          const recruitedTranslators = Math.max(0, totalMembers - 1); // Exclude the leader
          const limit = Number(project.maxMembers) || 5;
          const spotsLeft = Math.max(0, limit - recruitedTranslators);
          const projectCooldown = cooldownForProject(appStatus, project.id, nowMs);
          const onCooldown = Boolean(projectCooldown);

          return (
            <div key={project.id} className="available-project-card">
              <div>
                <div className="project-card-header">
                  <h5 className="project-card-title">
                    {project.comicName || project.title}
                  </h5>
                  <span className={`project-card-badge ${spotsLeft > 0 ? 'spots-open' : 'spots-full'}`}>
                    {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
                  </span>
                </div>

                <p className="project-card-team-label">
                  Team: <strong>{project.title}</strong>
                </p>

                <ul className="project-details-list">
                  <li className="project-details-item">
                    <BookOpen size={15} />
                    Language: <strong>{project.sourceLang || 'Any'} ➔ {project.targetLang}</strong> &middot; {project.chaptersCount || 0} chapters
                  </li>
                  <li className="project-details-item">
                    <User size={15} />
                    Leader: <strong>{project.leaderName || 'No Leader'}</strong>
                  </li>
                  <li className="project-details-item">
                    <Users size={15} />
                    Available: <strong>{spotsLeft}</strong> translator{spotsLeft !== 1 ? 's' : ''} needed
                  </li>
                  <li className="project-details-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={project.priority === 'Urgent' ? '#ef4444' : '#a855f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    Urgency: <strong style={{
                      color: project.priority === 'Urgent' ? '#ef4444' : (project.priority === 'High' ? '#f97316' : 'var(--trans-text-secondary)')
                    }}>
                      {project.priority === 'Urgent' ? '🔥 URGENTLY Recruiting' : project.priority || 'Medium'}
                    </strong>
                  </li>
                  {onCooldown && (
                    <li className="project-details-item">
                      <Hourglass size={15} />
                      Cooldown: <strong style={{ color: '#f59e0b' }}>
                        {formatCooldownRemaining(projectCooldown.cooldownUntil, nowMs)}
                      </strong>
                    </li>
                  )}
                </ul>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
                {(() => {
                  const isProjectLeader = (project.leaderId && authUser?.id && String(project.leaderId) === String(authUser.id)) ||
                    (project.leaderName && (project.leaderName.toLowerCase().trim() === (userFullName || '').toLowerCase().trim() || project.leaderName.toLowerCase().trim() === (authUser?.username || '').toLowerCase().trim()));
                  const isProjectMember = myProjectTeams.some(mp => mp.id === project.id);

                  if (isProjectLeader) {
                    return (
                      <button
                        className="available-project-apply-btn"
                        disabled
                        style={{ flex: 1, opacity: 0.85, cursor: 'default', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontWeight: '600' }}
                      >
                        👑 Your Project (Leader)
                      </button>
                    );
                  }

                  if (isProjectMember) {
                    return (
                      <button
                        className="available-project-apply-btn"
                        disabled
                        style={{ flex: 1, opacity: 0.85, cursor: 'default', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', fontWeight: '600' }}
                      >
                        ✓ Active Member
                      </button>
                    );
                  }

                  if (isUserProjectLeader) {
                    return (
                      <button
                        className="available-project-apply-btn"
                        disabled
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#64748b',
                          cursor: 'not-allowed',
                          opacity: 0.6,
                          fontWeight: '600'
                        }}
                        title="Project Leaders manage teams and cannot apply to join"
                      >
                        Apply to Join
                      </button>
                    );
                  }

                  if (alreadyApplied) {
                    return (
                      <>
                        <button
                          className="available-project-apply-btn"
                          disabled
                          style={{ flex: 1, opacity: 0.7, cursor: 'not-allowed' }}
                        >
                          Applied ✓
                        </button>
                        <button
                          className="available-project-apply-btn"
                          onClick={() => handleCancelApplication(project.id)}
                          disabled={cancelling === project.id}
                          style={{
                            flex: 'none',
                            width: 'auto',
                            padding: '10px 18px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          {cancelling === project.id ? 'Cancelling...' : '✕ Cancel'}
                        </button>
                      </>
                    );
                  }

                  const applyDisabled = spotsLeft === 0 || onCooldown || atProjectLimit;

                  return (
                    <button
                      className="available-project-apply-btn"
                      disabled={applyDisabled}
                      onClick={() => handleApplyClick(project)}
                      style={{
                        flex: 1,
                        ...(onCooldown ? {
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.32)',
                          color: '#fbbf24',
                          cursor: 'not-allowed',
                          opacity: 0.95,
                          fontWeight: 700,
                          fontSize: '13px'
                        } : atProjectLimit && spotsLeft > 0 ? {
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.28)',
                          color: '#fca5a5',
                          cursor: 'not-allowed',
                          opacity: 0.9,
                          fontWeight: 700,
                          fontSize: '13px',
                          lineHeight: 1.25
                        } : {})
                      }}
                      title={onCooldown
                        ? `This project is on ${cooldownLabel(projectCooldown.cooldownType).toLowerCase()} cooldown. Remaining ${formatCooldownRemaining(projectCooldown.cooldownUntil, nowMs)}.`
                        : atProjectLimit
                        ? 'You have reached the maximum number of concurrent projects.'
                        : undefined}
                    >
                      {spotsLeft === 0
                        ? 'Team Full'
                        : onCooldown
                        ? <><Hourglass size={15} /> On Cooling down</>
                        : atProjectLimit
                        ? 'Maximum concurrent projects reached'
                        : 'Apply to Join'}
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--trans-text-muted)', fontSize: '14px', margin: 0 }}>No available recruiting projects found matching your filters.</p>
          </div>
        )}
      </div>

      {/* ── PAGINATION CONTROLS ──────────────────────────────────── */}
      {filteredProjects.length > 0 && (
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '13px', color: 'var(--trans-text-secondary)' }}>
            Showing <strong>{Math.min(filteredProjects.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}</strong> to{' '}
            <strong>{Math.min(filteredProjects.length, currentPage * ITEMS_PER_PAGE)}</strong> of{' '}
            <strong>{filteredProjects.length}</strong> available projects
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="trans-btn secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '6px 14px', fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                ‹ Prev
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: pageNum === currentPage ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    background: pageNum === currentPage ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontWeight: pageNum === currentPage ? '800' : '600',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="trans-btn secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '6px 14px', fontSize: '12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: REQUEST TO JOIN TEAM ────────────────── */}
      {showJoinModal && selectedProject && (
        <div
          className="trans-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="trans-modal-card"
            style={{
              background: 'var(--trans-card-bg)',
              border: '1px solid var(--trans-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              color: 'var(--trans-text-primary)',
            }}
          >
            <div
              className="trans-modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--trans-border)',
                paddingBottom: '14px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--trans-text-primary)' }}>
                Apply to Join Team
              </h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedProject(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '22px',
                  cursor: 'pointer',
                  lineHeight: '1',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <div className="trans-modal-body">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '14px',
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--trans-text-secondary)' }}>Comic Project:</p>
                <strong style={{ fontSize: '15px', color: '#c084fc' }}>{selectedProject.comicName || selectedProject.title}</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#10b981' }}>
                  Open Positions: {Math.max(0, (Number(selectedProject.maxMembers) || 5) - Math.max(0, (Number(selectedProject.membersCount) || 1) - 1))} spots left
                </p>
              </div>

              {/* Translator Credentials & Profile Card (Auto Attached) */}
              {translatorProfile && (
                <div style={{
                  background: 'rgba(168, 85, 247, 0.07)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ✓ Verified Translator Profile
                    </span>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>Auto-Attached</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                    {Array.isArray(translatorProfile.specializations) && translatorProfile.specializations.length > 0 && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#e2e8f0' }}>
                        🌐 {translatorProfile.specializations.join(', ')}
                      </span>
                    )}
                    {translatorProfile.experienceYears !== undefined && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#e2e8f0' }}>
                        ⏳ {translatorProfile.experienceYears} Years Experience
                      </span>
                    )}
                    {(translatorProfile.phoneNumber || translatorProfile.phone) && (
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: '#e2e8f0' }}>
                        📞 {translatorProfile.phoneNumber || translatorProfile.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="trans-form-group" style={{ marginBottom: '16px' }}>
                <label className="trans-form-label" style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Introduction Message
                </label>
                <textarea
                  className="trans-form-input textarea"
                  style={{ width: '100%', height: '90px' }}
                  placeholder="Tell the group leader about your experience or why you want to join..."
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                />
              </div>

              {/* CV / Resume Upload & Auto-Attached Document */}
              <div className="trans-form-group">
                <label className="trans-form-label" style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Attached CV / Resume <span style={{ color: '#c084fc', fontWeight: '500' }}>(PDF strictly required — max 5MB)</span>
                </label>

                {cvFile ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                    borderRadius: '8px', padding: '10px 14px'
                  }}>
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#c084fc', fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cvFile.name}
                      </p>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>({(cvFile.size / 1024).toFixed(0)} KB) — Newly selected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCvFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: 'rgba(239,68,68,0.15)', border: 'none', color: '#ef4444',
                        borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer'
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : translatorProfile?.cvUrl ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px', padding: '10px 14px', gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>📄</span>
                      <div>
                        <a
                          href={translatorProfile.cvUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#34d399', fontSize: '13px', fontWeight: '600', textDecoration: 'underline' }}
                        >
                          Profile_Verified_CV.pdf ↗
                        </a>
                        <span style={{ display: 'block', fontSize: '11px', color: '#10b981' }}>✓ Automatically attached from your Profile</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#e2e8f0',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      Upload New
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: '8px', padding: '12px 16px', cursor: 'pointer',
                    transition: 'border-color 0.2s'
                  }}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Click to select a PDF file (.pdf)</span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleCvFileChange}
                />
              </div>
            </div>

            <div
              className="trans-modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
                marginTop: '20px',
              }}
            >
              <button
                className="trans-btn secondary"
                disabled={uploading}
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedProject(null);
                  setCvFile(null);
                }}
              >
                Cancel
              </button>
              <button
                className="trans-btn primary"
                onClick={handleSendJoinRequest}
                disabled={uploading}
                style={{ opacity: uploading ? 0.7 : 1 }}
              >
                {uploading ? 'Uploading & Sending...' : 'Send Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectList;
