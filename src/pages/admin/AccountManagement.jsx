import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllAccountsApi, registerStaffApi, banUserApi, unbanUserApi, resetUserPasswordApi, updateUserApi, approveAuthorLicenseApi, rejectAuthorLicenseApi, reopenAuthorLicenseApi } from '../../services/api/AccountApi'
import ModernButton from '../../components/common/ModernButton'
import AnimatedButton from '../../components/common/AnimatedButton'
import { exportToCsv } from '../../utils/exportToCsv'
import '../../assets/style/common/ai-popover.css'
import '../../assets/style/common/modern-pagination.css'
import '../../assets/style/common/skeleton-loader.css'
import '../../assets/style/admin/account-management.css'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
import { isScopeGlobal } from '../../utils/moderatorScope'

const ITEMS_PER_PAGE = 10
const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'PROJECT_LEADER', label: 'Project Leader' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'TRANSLATOR', label: 'Translator' },
  { value: 'READER', label: 'Reader' },
]

const normalizeRoleValue = (role) => (role || 'READER').toString().trim().toUpperCase().replace(/[\s-]+/g, '_')
const formatRoleLabel = (role) => {
  const normalized = normalizeRoleValue(role)
  const found = ROLE_OPTIONS.find((item) => item.value === normalized)
  if (found) return found.label
  return normalized
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
const roleToClassName = (role) => normalizeRoleValue(role).toLowerCase().replace(/_/g, '-')

const formatDate = (dateVal) => {
  if (!dateVal || dateVal === '-') return '-'
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(dateVal)
  }
}

const getDisplayLanguages = (acc) => {
  if (Array.isArray(acc?.assignedLanguages) && acc.assignedLanguages.length > 0) {
    return acc.assignedLanguages
  }
  return []
}

function AccountManagement() {
  // Data states
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Debounce search input for high performance queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'ban'|'unban'|'reset-pw', account }
  const [licenseReviewAccount, setLicenseReviewAccount] = useState(null)
  const [licenseRejectionReason, setLicenseRejectionReason] = useState('')

  // MODERATOR SPECIALIZATION LANGUAGES
  const MODERATOR_LANGUAGES = COMIC_LANGUAGE_OPTIONS

  // Edit user states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editForm, setEditForm] = useState({ fullName: '', role: 'READER', assignedLanguages: ['Japanese', 'Korean'] })
  const [editFormErrors, setEditFormErrors] = useState({})

  // Create staff form
  const [staffForm, setStaffForm] = useState({ username: '', password: '', fullName: '', email: '', role: 'READER', assignedLanguages: ['Japanese', 'Korean'] })
  const [staffFormErrors, setStaffFormErrors] = useState({})
  const [modalError, setModalError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Action loading (track which row is being acted upon)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Show toast notification
  const showAlert = useCallback((type, message) => {
    if (type === 'success') {
      toast.success(message)
    } else if (type === 'error') {
      toast.error(message)
    } else if (type === 'warning') {
      toast.warning(message)
    } else {
      toast.info(message)
    }
  }, [])

  // Fetch accounts from API with paginated backend integration
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = {
        page: currentPage,
        size: ITEMS_PER_PAGE,
      }
      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim()
      }
      if (roleFilter !== 'All Roles') {
        params.role = roleFilter
      }
      if (statusFilter !== 'All Status') {
        params.status = statusFilter === 'Active' ? 'ACTIVE' : 'INACTIVE'
      }

      const response = await getAllAccountsApi(params)
      const responseData = response?.data?.data || response?.data || response;
      const accountsList = Array.isArray(responseData) ? responseData : (Array.isArray(response) ? response : []);
      const metadata = response?.metadata || response?.data?.metadata || {}

      const normalized = accountsList.map((acc) => {
        const cDate = acc.createdDate || acc.createdAt || acc.created_at
        const lActive = acc.lastActive || acc.lastActiveAt || acc.lastLogin || acc.lastLoginAt || acc.updatedDate || acc.updatedAt
        const normalizedRole = formatRoleLabel(acc.role?.roleName || acc.role || acc.roleName || 'Reader')
        return {
          id: acc.id || acc.userId,
          userId: acc.userId || `USR-${String(acc.id).padStart(4, '0')}`,
          fullName: acc.fullName || acc.name || acc.username,
          username: acc.username,
          email: acc.email,
          role: normalizedRole,
          status: acc.status || (acc.banned ? 'Banned' : 'Active'),
          createdDate: cDate ? formatDate(cDate) : '-',
          lastActive: lActive ? formatDate(lActive) : '-',
          assignedLanguages: Array.isArray(acc.assignedLanguages) && acc.assignedLanguages.length > 0 
            ? acc.assignedLanguages 
            : (normalizedRole.toLowerCase().includes('moderator') ? getDisplayLanguages(acc) : []),
          authorId: acc.authorId || null,
          authorLicenseStatus: acc.authorLicenseStatus || null,
          licenseUrl: acc.licenseUrl || null,
          licenseOriginalFilename: acc.licenseOriginalFilename || null,
          licenseDeadlineAt: acc.licenseDeadlineAt || null,
          licenseUploadedAt: acc.licenseUploadedAt || null,
          licenseRejectionReason: acc.licenseRejectionReason || null,
        }
      })
      setAccounts(normalized)
      setTotalPages(metadata.totalPages || 1)
      setTotalElements(metadata.totalElements || normalized.length)
    } catch (err) {
      console.error('Failed to fetch accounts:', err.message)
      setAccounts([])
      setTotalPages(1)
      setTotalElements(0)
      toast.error('Could not load accounts.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, debouncedSearchTerm, roleFilter, statusFilter])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const startItem = totalElements > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalElements)

  // Reset page when filters change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  // ── CREATE STAFF ──────────────────────────────────
  const handleInputChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }))
    if (staffFormErrors[field]) {
      setStaffFormErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  const toggleStaffLanguage = (lang) => {
    setStaffForm(prev => {
      const current = prev.assignedLanguages || []
      const updated = current.includes(lang)
        ? current.filter(l => l !== lang)
        : [...current, lang]
      return { ...prev, assignedLanguages: updated }
    })
    if (staffFormErrors.assignedLanguages) {
      setStaffFormErrors(prev => ({ ...prev, assignedLanguages: null }))
    }
  }

  const toggleEditLanguage = (lang) => {
    setEditForm(prev => {
      const current = prev.assignedLanguages || []
      const updated = current.includes(lang)
        ? current.filter(l => l !== lang)
        : [...current, lang]
      return { ...prev, assignedLanguages: updated }
    })
    if (editFormErrors.assignedLanguages) {
      setEditFormErrors(prev => ({ ...prev, assignedLanguages: null }))
    }
  }

  const validateStaffForm = () => {
    const errors = {}
    if (!staffForm.username.trim()) errors.username = 'Username is required'
    else if (staffForm.username.trim().length < 3) errors.username = 'At least 3 characters'

    if (!staffForm.password.trim()) errors.password = 'Password is required'
    else if (staffForm.password.trim().length < 6) errors.password = 'At least 6 characters'

    if (!staffForm.fullName.trim()) errors.fullName = 'Full name is required'

    if (!staffForm.email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffForm.email)) errors.email = 'Invalid email format'

    if (normalizeRoleValue(staffForm.role) === 'MODERATOR' && (!staffForm.assignedLanguages || staffForm.assignedLanguages.length === 0)) {
      errors.assignedLanguages = 'Please select at least one moderation language.'
    }

    setStaffFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setModalError('Validation failed. Please correct the errors below.')
      return false
    }
    setModalError(null)
    return true
  }

  const handleCreateStaff = async () => {
    if (!validateStaffForm()) return
    setIsSubmitting(true)
    try {
      const payload = {
        username: staffForm.username.trim(),
        password: staffForm.password.trim(),
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role
      }
      if (staffForm.role === 'MODERATOR') {
        payload.assignedLanguages = staffForm.assignedLanguages || []
      }

      await registerStaffApi(payload)
      setShowCreateModal(false)
      setStaffForm({ username: '', password: '', fullName: '', email: '', role: 'READER', assignedLanguages: ['Japanese', 'Korean'] })
      setStaffFormErrors({})
      setModalError(null)
      showAlert('success', `Account "${staffForm.fullName}" created successfully!${normalizeRoleValue(staffForm.role) === 'AUTHOR' ? ' Author license status: PENDING LICENSE (7-day PDF upload deadline).' : ''}`)
      await fetchAccounts()
    } catch (err) {
      let errorMsg = 'Failed to create account. Please try again.'
      const validationErrors = err.response?.data?.errors
      
      if (validationErrors) {
        setStaffFormErrors(validationErrors)
        errorMsg = err.response.data.message || 'Validation failed. Please correct the errors below.'
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setModalError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setStaffForm({ username: '', password: '', fullName: '', email: '', role: 'READER', assignedLanguages: ['Japanese', 'Korean'] })
    setStaffFormErrors({})
    setModalError(null)
  }

  // ── EDIT USER ─────────────────────────────────────
  const handleOpenEditModal = (account) => {
    setEditingAccount(account)
    setEditForm({
      fullName: account.fullName,
      role: normalizeRoleValue(account.role || 'READER'),
      assignedLanguages: getDisplayLanguages(account)
    })
    setEditFormErrors({})
    setModalError(null)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingAccount(null)
    setEditForm({ fullName: '', role: 'READER', assignedLanguages: ['Japanese', 'Korean'] })
    setEditFormErrors({})
    setModalError(null)
  }

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
    if (editFormErrors[field]) {
      setEditFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleEditSubmit = async () => {
    const errors = {}
    if (!editForm.fullName || !editForm.fullName.trim()) {
      errors.fullName = 'Full Name is required'
    }
    if (normalizeRoleValue(editForm.role) === 'MODERATOR' && (!editForm.assignedLanguages || editForm.assignedLanguages.length === 0)) {
      errors.assignedLanguages = 'Please select at least one moderation language.'
    }
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors)
      setModalError('Validation failed. Please correct the errors below.')
      return
    }

    setIsSubmitting(true)
    setModalError(null)

    try {
      const updatePayload = {
        fullName: editForm.fullName.trim(),
        role: editForm.role
      }
      if (normalizeRoleValue(editForm.role) === 'MODERATOR') {
        updatePayload.assignedLanguages = editForm.assignedLanguages || []
      }

      const response = await updateUserApi(editingAccount.id, updatePayload)

      const updatedUser = response?.data || {}
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? {
                ...a,
                fullName: updatedUser.fullName || editForm.fullName,
                role: formatRoleLabel(updatedUser.role || editForm.role),
                assignedLanguages: normalizeRoleValue(editForm.role) === 'MODERATOR' ? (editForm.assignedLanguages || []) : []
              }
            : a
        )
      )

      setShowEditModal(false)
      showAlert('success', 'User account updated successfully!')
    } catch (err) {
      console.error(err)
      let errorMsg = 'Failed to update user. Please try again.'
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      }
      setModalError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPasswordFromEdit = () => {
    if (!editingAccount) return
    openConfirm('reset-pw', editingAccount)
  }

  // ── AUTHOR LICENSE REVIEW ─────────────────────────
  const openLicenseReview = (account) => {
    if (!account?.authorId) {
      showAlert('error', 'Missing AuthorEntity.id for this Author.')
      return
    }
    setLicenseRejectionReason('')
    setLicenseReviewAccount(account)
  }

  const closeLicenseReview = () => {
    if (licenseReviewAccount && actionLoadingId === licenseReviewAccount.id) return
    setLicenseReviewAccount(null)
    setLicenseRejectionReason('')
  }

  const handleApproveAuthorLicense = async (account) => {
    if (!account?.authorId) return
    setActionLoadingId(account.id)
    try {
      await approveAuthorLicenseApi(account.authorId)
      showAlert('success', `License verified. ${account.fullName} is now ACTIVE.`)
      setLicenseReviewAccount(null)
      setLicenseRejectionReason('')
      await fetchAccounts()
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to approve Author license.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRejectAuthorLicense = async (account) => {
    if (!account?.authorId) return
    const rejectionReason = licenseRejectionReason.trim()
    if (!rejectionReason) {
      showAlert('error', 'Rejection reason is required.')
      return
    }
    setActionLoadingId(account.id)
    try {
      await rejectAuthorLicenseApi(account.authorId, { reason: rejectionReason, deadlineDays: 7 })
      showAlert('warning', `License rejected. ${account.fullName} can upload a replacement PDF within 7 days.`)
      setLicenseReviewAccount(null)
      setLicenseRejectionReason('')
      await fetchAccounts()
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to reject Author license.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReopenAuthorLicense = async (account) => {
    if (!account?.authorId) return
    if (!window.confirm(`Give ${account.fullName} a new 7-day license upload deadline?`)) return
    setActionLoadingId(account.id)
    try {
      await reopenAuthorLicenseApi(account.authorId, { deadlineDays: 7 })
      showAlert('success', 'New 7-day PDF upload deadline assigned.')
      await fetchAccounts()
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to reopen Author license upload.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // ── BAN / UNBAN ───────────────────────────────────
  const openConfirm = (type, account) => {
    if (['ban', 'unban'].includes(type) && normalizeRoleValue(account?.role) === 'ADMIN') {
      showAlert('warning', 'Admin accounts are protected from ban actions.')
      return
    }
    setConfirmAction({ type, account })
    setShowConfirmModal(true)
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    const { type, account } = confirmAction
    setShowConfirmModal(false)
    setActionLoadingId(account.id)

    try {
      if (type === 'ban') {
        await banUserApi(account.id)
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, status: 'Banned' } : a))
        )
        showAlert('success', `"${account.fullName}" has been banned.`)
      } else if (type === 'unban') {
        await unbanUserApi(account.id)
        setAccounts((prev) =>
          prev.map((a) => (a.id === account.id ? { ...a, status: 'Active' } : a))
        )
        showAlert('success', `"${account.fullName}" has been unbanned.`)
      } else if (type === 'reset-pw') {
        await resetUserPasswordApi(account.id)
        setShowEditModal(false)
        showAlert('success', `Password for "${account.fullName}" has been reset to abcd1234.`)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || `Failed to ${type} user. Please try again.`
      showAlert('error', errorMsg)
    } finally {
      setActionLoadingId(null)
      setConfirmAction(null)
    }
  }

  // ── RENDER ────────────────────────────────────────
  const renderSkeletonRows = () => (
    Array.from({ length: 6 }).map((_, i) => (
      <tr key={`skel-${i}`}>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--sm" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--md" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--lg" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--badge" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--sm" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--md" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--sm" /></td>
        <td><div className="admin-skeleton-cell admin-skeleton-cell--actions" /></td>
      </tr>
    ))
  )

  const handleExportAccounts = () => {
    const headers = ['User ID', 'Full Name', 'Username', 'Email', 'Role', 'Status', 'Created Date', 'Last Active']
    const rows = accounts.map(a => [
      a.userId || a.id,
      a.fullName || '',
      a.username || '',
      a.email || '',
      a.role || '',
      a.status || '',
      a.createdDate || '',
      a.lastActive || ''
    ])
    exportToCsv('ComiVerse_User_Accounts_Export', headers, rows)
  }

  return (
    <AdminLayout activeNav="account-management">
      <div className="admin-account-management-screen">

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Account Management</h1>
          <p>{totalElements} account{totalElements !== 1 ? 's' : ''} found</p>
        </div>
        <div className="admin-account-management-actions">
          <AnimatedButton
            variant={3}
            label="+ Create User Account"
            tooltip=""
            onClick={() => setShowCreateModal(true)}
          />
          <AnimatedButton
            variant={3}
            label="📥 Export Accounts"
            tooltip="Export CSV"
            className="btn-excel"
            onClick={handleExportAccounts}
            disabled={isLoading || accounts.length === 0}
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-filters-bar">
        <div className="admin-search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, email, username..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <select className="admin-filter-select" value={roleFilter} onChange={handleRoleChange}>
          <option value="All Roles">All Roles</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>

        <select className="admin-filter-select" value={statusFilter} onChange={handleStatusChange}>
          <option>All Status</option>
          <option>Active</option>
          <option>Banned</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="admin-data-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              renderSkeletonRows()
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="admin-empty-state">
                    <div className="admin-empty-icon">🔍</div>
                    <h3>No accounts found</h3>
                    <p>Try adjusting your search or filter criteria to find what you're looking for.</p>
                  </div>
                </td>
              </tr>
            ) : (
              accounts.map((account, index) => (
                <tr key={account.id || account.email || account.username || `account-${index}`}>
                  <td className="cell-user-id">{account.userId}</td>
                  <td className="cell-name">{account.fullName}</td>
                  <td className="cell-email">{account.email}</td>
                  <td>
                    <span className={`role-badge ${roleToClassName(account.role)}`}>
                      {formatRoleLabel(account.role)}
                    </span>
                    {normalizeRoleValue(account.role) === 'MODERATOR' && (
                      <div className="admin-lang-scope-tag" style={{ marginTop: '4px', fontSize: '11px', color: '#c084fc', fontWeight: '600' }}>
                        🌐 {(() => {
                          const langs = getDisplayLanguages(account);
                          const isGlobal = isScopeGlobal(langs);
                          return isGlobal ? 'All Languages' : langs.join(', ');
                        })()}
                      </div>
                    )}
                    {normalizeRoleValue(account.role) === 'AUTHOR' && account.authorLicenseStatus && (
                      <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: '700', color: account.authorLicenseStatus === 'ACTIVE' ? '#22c55e' : '#f59e0b' }}>
                        License: {account.authorLicenseStatus.replace(/_/g, ' ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${(account.status || '').toLowerCase()}`}>
                      {account.status}
                    </span>
                  </td>
                  <td>{formatDate(account.createdDate)}</td>
                  <td>{account.lastActive}</td>
                  <td>
                    <div className="table-actions">
                      {actionLoadingId === account.id ? (
                        <span className="admin-spinner-sm" />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-action-sm btn-action-sm--edit"
                            onClick={() => handleOpenEditModal(account)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          {normalizeRoleValue(account.role) === 'AUTHOR' && account.authorLicenseStatus === 'PENDING_VERIFICATION' && (
                            <button
                              type="button"
                              className="btn-action-sm btn-action-sm--unban"
                              onClick={() => openLicenseReview(account)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>Review</span>
                            </button>
                          )}

                          {normalizeRoleValue(account.role) === 'AUTHOR' && ['EXPIRED', 'AUTHOR_DISABLED'].includes(account.authorLicenseStatus) && (
                            <button type="button" className="btn-action-sm btn-action-sm--unban" onClick={() => handleReopenAuthorLicense(account)}>
                              <span>New Deadline</span>
                            </button>
                          )}

                          {normalizeRoleValue(account.role) === 'ADMIN' ? (
                            <span className="account-protected-label" title="Admin accounts cannot be banned">Protected</span>
                          ) : (account.status || '').toLowerCase() === 'banned' ? (
                            <button
                              type="button"
                              className="btn-action-sm btn-action-sm--unban"
                              onClick={() => openConfirm('unban', account)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                              <span>Unban</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-action-sm btn-action-sm--ban"
                              onClick={() => openConfirm('ban', account)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                              <span>Ban</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Footer with Pagination */}
        {!isLoading && totalElements > 0 && (
          <div className="admin-table-footer">
            <span className="showing-info">
              Showing {startItem}-{endItem} of {totalElements}
            </span>

            <div className="admin-pagination">
              <button
                className="page-nav"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={currentPage === page ? 'active' : ''}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                className="page-nav"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          AUTHOR LICENSE REVIEW MODAL
          ═══════════════════════════════════════════════ */}
      {licenseReviewAccount && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal admin-license-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title">Review Author License</h2>
                <p className="admin-license-review-subtitle">
                  Verify the submitted copyright document before activating Author permissions.
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeLicenseReview}
                disabled={actionLoadingId === licenseReviewAccount.id}
                aria-label="Close license review"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body admin-license-review-body">
              <div className="admin-license-review-meta">
                <div className="admin-license-review-meta-item">
                  <span>Author</span>
                  <strong>{licenseReviewAccount.fullName || '-'}</strong>
                </div>
                <div className="admin-license-review-meta-item">
                  <span>Email</span>
                  <strong>{licenseReviewAccount.email || '-'}</strong>
                </div>
                <div className="admin-license-review-meta-item">
                  <span>License status</span>
                  <strong>{licenseReviewAccount.authorLicenseStatus || '-'}</strong>
                </div>
                <div className="admin-license-review-meta-item">
                  <span>Uploaded</span>
                  <strong>{formatDate(licenseReviewAccount.licenseUploadedAt)}</strong>
                </div>
                <div className="admin-license-review-meta-item admin-license-review-meta-item--wide">
                  <span>Document</span>
                  <strong>{licenseReviewAccount.licenseOriginalFilename || 'Author license PDF'}</strong>
                </div>
              </div>

              <div className="admin-license-review-document">
                {licenseReviewAccount.licenseUrl ? (
                  <>
                    <iframe
                      title={`License document for ${licenseReviewAccount.fullName || 'Author'}`}
                      src={licenseReviewAccount.licenseUrl}
                      className="admin-license-review-frame"
                    />
                    <a
                      href={licenseReviewAccount.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-license-review-open-pdf"
                    >
                      Open PDF in new tab
                    </a>
                  </>
                ) : (
                  <div className="admin-license-review-missing">No license document URL was provided by the backend.</div>
                )}
              </div>

              <div className="admin-form-group admin-license-review-reason">
                <label className="admin-form-label" htmlFor="license-rejection-reason">
                  Rejection reason <span className="admin-license-review-optional">(required only when rejecting)</span>
                </label>
                <textarea
                  id="license-rejection-reason"
                  className="admin-form-input admin-license-review-textarea"
                  value={licenseRejectionReason}
                  onChange={(e) => setLicenseRejectionReason(e.target.value)}
                  placeholder="Explain what the Author needs to correct before uploading a replacement PDF..."
                  disabled={actionLoadingId === licenseReviewAccount.id}
                />
              </div>
            </div>

            <div className="admin-modal-footer admin-license-review-footer">
              <button
                type="button"
                className="admin-btn admin-btn--success"
                onClick={() => handleApproveAuthorLicense(licenseReviewAccount)}
                disabled={actionLoadingId === licenseReviewAccount.id || !licenseReviewAccount.licenseUrl}
              >
                {actionLoadingId === licenseReviewAccount.id ? 'Processing...' : 'Verify'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={() => handleRejectAuthorLicense(licenseReviewAccount)}
                disabled={actionLoadingId === licenseReviewAccount.id}
              >
                {actionLoadingId === licenseReviewAccount.id ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          CREATE STAFF MODAL
          ═══════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Create User Account</h2>
              <button className="admin-modal-close" onClick={handleCloseCreateModal}>×</button>
            </div>

            <div className="admin-modal-body">
              {modalError && (
                <div className="admin-inline-alert admin-inline-alert--error" style={{ marginBottom: '20px' }}>
                  ✕ {modalError}
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Username <span className="required">*</span>
                </label>
                <input
                  className={`admin-form-input ${staffFormErrors.username ? 'error' : ''}`}
                  type="text"
                  placeholder="Enter username"
                  value={staffForm.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
                {staffFormErrors.username && (
                  <div className="admin-form-error">{staffFormErrors.username}</div>
                )}
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  className={`admin-form-input ${staffFormErrors.fullName ? 'error' : ''}`}
                  type="text"
                  placeholder="Enter full name"
                  value={staffForm.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
                {staffFormErrors.fullName && (
                  <div className="admin-form-error">{staffFormErrors.fullName}</div>
                )}
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  className={`admin-form-input ${staffFormErrors.email ? 'error' : ''}`}
                  type="email"
                  placeholder="staff@comiverse.com"
                  value={staffForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                {staffFormErrors.email && (
                  <div className="admin-form-error">{staffFormErrors.email}</div>
                )}
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Role <span className="required">*</span>
                </label>
                <select
                  className="admin-form-input"
                  value={staffForm.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              {normalizeRoleValue(staffForm.role) === 'MODERATOR' && (
                <div className="admin-form-group fade-in" style={{ marginTop: '12px' }}>
                  <label className="admin-form-label" style={{ color: '#c084fc' }}>
                    🌐 Assigned Moderation Languages <span className="required">*</span>
                  </label>
                  <div className="admin-lang-checkbox-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {(() => {
                      const isAllSelected = (staffForm.assignedLanguages || []).length >= MODERATOR_LANGUAGES.length;
                      return (
                        <button
                          type="button"
                          className={`admin-lang-chip ${isAllSelected ? 'active' : ''}`}
                          onClick={() => {
                            if (isAllSelected) {
                              setStaffForm(prev => ({ ...prev, assignedLanguages: [] }));
                            } else {
                              setStaffForm(prev => ({ ...prev, assignedLanguages: [...MODERATOR_LANGUAGES] }));
                              if (staffFormErrors.assignedLanguages) {
                                setStaffFormErrors(prev => ({ ...prev, assignedLanguages: null }));
                              }
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: isAllSelected ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isAllSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isAllSelected ? '#ffffff' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isAllSelected ? '✓ All / Global' : 'All / Global'}
                        </button>
                      );
                    })()}
                    {MODERATOR_LANGUAGES.map((lang) => {
                      const isChecked = (staffForm.assignedLanguages || []).includes(lang)
                      return (
                        <button
                          key={lang}
                          type="button"
                          className={`admin-lang-chip ${isChecked ? 'active' : ''}`}
                          onClick={() => toggleStaffLanguage(lang)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: isChecked ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isChecked ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isChecked ? '#ffffff' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isChecked ? '✓ ' : '+ '} {lang}
                        </button>
                      )
                    })}
                  </div>
                  {staffFormErrors.assignedLanguages && (
                    <div className="admin-form-error" style={{ marginTop: '8px' }}>{staffFormErrors.assignedLanguages}</div>
                  )}
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Password <span className="required">*</span>
                </label>
                <input
                  className={`admin-form-input ${staffFormErrors.password ? 'error' : ''}`}
                  type="password"
                  placeholder="Min. 6 characters"
                  value={staffForm.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                />
                {staffFormErrors.password && (
                  <div className="admin-form-error">{staffFormErrors.password}</div>
                )}
              </div>
            </div>

            <div className="admin-modal-footer">
              <ModernButton
                variant={2}
                label="Cancel"
                onClick={handleCloseCreateModal}
                disabled={isSubmitting}
                className="btn-cancel"
              />
              <ModernButton
                variant={2}
                label={isSubmitting ? "Creating..." : "Create Account"}
                onClick={handleCreateStaff}
                disabled={isSubmitting}
                className="btn-save"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          EDIT USER MODAL
          ═══════════════════════════════════════════════ */}
      {showEditModal && editingAccount && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Edit User Account</h2>
              <button className="admin-modal-close" onClick={handleCloseEditModal}>×</button>
            </div>

            <div className="admin-modal-body">
              {modalError && (
                <div className="admin-inline-alert admin-inline-alert--error" style={{ marginBottom: '20px' }}>
                  ✕ {modalError}
                </div>
              )}

              <div className="admin-form-group">
                <label className="admin-form-label">Username</label>
                <input
                  className="admin-form-input"
                  type="text"
                  value={editingAccount?.username || ''}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Email</label>
                <input
                  className="admin-form-input"
                  type="email"
                  value={editingAccount?.email || ''}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Full Name <span className="required">*</span>
                </label>
                <input
                  className={`admin-form-input ${editFormErrors.fullName ? 'error' : ''}`}
                  type="text"
                  placeholder="Enter full name"
                  value={editForm.fullName}
                  onChange={(e) => handleEditInputChange('fullName', e.target.value)}
                />
                {editFormErrors.fullName && (
                  <div className="admin-form-error">{editFormErrors.fullName}</div>
                )}
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">
                  Role <span className="required">*</span>
                </label>
                <select
                  className="admin-form-input"
                  value={editForm.role}
                  onChange={(e) => handleEditInputChange('role', e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>

              {normalizeRoleValue(editForm.role) === 'MODERATOR' && (
                <div className="admin-form-group fade-in" style={{ marginTop: '12px' }}>
                  <label className="admin-form-label" style={{ color: '#c084fc' }}>
                    🌐 Assigned Moderation Languages <span className="required">*</span>
                  </label>
                  <div className="admin-lang-checkbox-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {(() => {
                      const isAllSelected = (editForm.assignedLanguages || []).length >= MODERATOR_LANGUAGES.length;
                      return (
                        <button
                          type="button"
                          className={`admin-lang-chip ${isAllSelected ? 'active' : ''}`}
                          onClick={() => {
                            if (isAllSelected) {
                              setEditForm(prev => ({ ...prev, assignedLanguages: [] }));
                            } else {
                              setEditForm(prev => ({ ...prev, assignedLanguages: [...MODERATOR_LANGUAGES] }));
                              if (editFormErrors.assignedLanguages) {
                                setEditFormErrors(prev => ({ ...prev, assignedLanguages: null }));
                              }
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: isAllSelected ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isAllSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isAllSelected ? '#ffffff' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isAllSelected ? '✓ All / Global' : 'All / Global'}
                        </button>
                      );
                    })()}
                    {MODERATOR_LANGUAGES.map((lang) => {
                      const isChecked = (editForm.assignedLanguages || []).includes(lang)
                      return (
                        <button
                          key={lang}
                          type="button"
                          className={`admin-lang-chip ${isChecked ? 'active' : ''}`}
                          onClick={() => toggleEditLanguage(lang)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: isChecked ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isChecked ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            color: isChecked ? '#ffffff' : '#cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isChecked ? '✓ ' : '+ '} {lang}
                        </button>
                      )
                    })}
                  </div>
                  {editFormErrors.assignedLanguages && (
                    <div className="admin-form-error" style={{ marginTop: '8px' }}>{editFormErrors.assignedLanguages}</div>
                  )}
                </div>
              )}
            </div>

            <div className="admin-modal-footer" style={{ justifyContent: 'space-between' }}>
              <ModernButton
                variant={2}
                label="Reset Password"
                onClick={handleResetPasswordFromEdit}
                disabled={isSubmitting}
                className="btn-ban"
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <ModernButton
                  variant={2}
                  label="Cancel"
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                  className="btn-cancel"
                />
                <ModernButton
                  variant={2}
                  label={isSubmitting ? "Saving..." : "Save Changes"}
                  onClick={handleEditSubmit}
                  disabled={isSubmitting}
                  className="btn-save"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          CONFIRMATION MODAL
          ═══════════════════════════════════════════════ */}
      {showConfirmModal && confirmAction && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-body" style={{ paddingTop: '32px', paddingBottom: '28px' }}>
              <div className={`admin-confirm-icon ${
                confirmAction.type === 'ban' ? 'admin-confirm-icon--danger' :
                confirmAction.type === 'unban' ? 'admin-confirm-icon--info' :
                'admin-confirm-icon--warning'
              }`}>
                {confirmAction.type === 'ban' ? '🚫' : confirmAction.type === 'unban' ? '✅' : '🔑'}
              </div>

              <div className="admin-confirm-text">
                <h3>
                  {confirmAction.type === 'ban' && 'Ban this account?'}
                  {confirmAction.type === 'unban' && 'Unban this account?'}
                  {confirmAction.type === 'reset-pw' && 'Reset password?'}
                </h3>
                <p>
                  {confirmAction.type === 'ban' &&
                    `"${confirmAction.account.fullName}" will be banned and unable to access the platform.`}
                  {confirmAction.type === 'unban' &&
                    `"${confirmAction.account.fullName}" will regain access to the platform.`}
                  {confirmAction.type === 'reset-pw' &&
                    `The password for "${confirmAction.account.fullName}" will be reset to the default: abcd1234.`}
                </p>
              </div>

              <div className="admin-confirm-footer">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  className={`admin-btn ${
                    confirmAction.type === 'ban' ? 'admin-btn--danger' :
                    confirmAction.type === 'unban' ? 'admin-btn--success' :
                    'admin-btn--primary'
                  }`}
                  onClick={handleConfirmAction}
                >
                  {confirmAction.type === 'ban' && 'Yes, Ban'}
                  {confirmAction.type === 'unban' && 'Yes, Unban'}
                  {confirmAction.type === 'reset-pw' && 'Reset to Default'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
}

export default AccountManagement
