import { useState, useEffect, useMemo, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllAccountsApi, registerStaffApi, banUserApi, unbanUserApi, resetUserPasswordApi, updateUserApi } from '../../services/api/AccountApi'
import ModernButton from '../../components/common/ModernButton'
import AnimatedButton from '../../components/common/AnimatedButton'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { AIPopover } from '../../components/common/AIPopover'
import { ModernPagination } from '../../components/common/ModernPagination'
import { useTheme } from '../../context/ThemeContext'
import '../../assets/style/common/ai-popover.css'
import '../../assets/style/common/modern-pagination.css'
import '../../assets/style/common/skeleton-loader.css'
import '../../assets/style/admin/account-management.css'

// Fallback mock data when API is not available
const MOCK_ACCOUNTS = [
  { id: 1, userId: 'USR-0001', fullName: 'John Doe', username: 'johndoe', email: 'john@gmail.com', role: 'Reader', status: 'Active', createdDate: '2023-01-15', lastActive: 'Today' },
  { id: 2, userId: 'USR-0002', fullName: 'Spirit Group', username: 'spiritgroup', email: 'spirit@gmail.com', role: 'Translator', status: 'Active', createdDate: '2023-03-02', lastActive: '2 days ago' },
  { id: 3, userId: 'USR-0003', fullName: 'Author X', username: 'authorx', email: 'authorx@gmail.com', role: 'Author', status: 'Active', createdDate: '2023-04-18', lastActive: 'Yesterday' },
  { id: 4, userId: 'USR-0004', fullName: 'Mod Y', username: 'mody', email: 'mody@gmail.com', role: 'Moderator', status: 'Active', createdDate: '2023-05-10', lastActive: 'Today' },
  { id: 13, userId: 'USR-0013', fullName: 'Project Lead', username: 'projectlead', email: 'lead@comiverse.com', role: 'Project Leader', status: 'Active', createdDate: '2023-05-21', lastActive: 'Today' },
  { id: 5, userId: 'USR-0005', fullName: 'Sarah Chen', username: 'sarahchen', email: 'sarah@gmail.com', role: 'Reader', status: 'Active', createdDate: '2023-06-01', lastActive: '3 hours ago' },
  { id: 6, userId: 'USR-0006', fullName: 'Dragon Scans', username: 'dragonscans', email: 'dragon@group.com', role: 'Translator', status: 'Banned', createdDate: '2023-07-22', lastActive: '1 month ago' },
  { id: 7, userId: 'USR-0007', fullName: 'NoviceWriter', username: 'novicewriter', email: 'novice@mail.com', role: 'Author', status: 'Active', createdDate: '2023-08-05', lastActive: '5 days ago' },
  { id: 8, userId: 'USR-0008', fullName: 'ContentMod', username: 'contentmod', email: 'cmod@site.com', role: 'Moderator', status: 'Active', createdDate: '2023-09-14', lastActive: 'Today' },
  { id: 9, userId: 'USR-0009', fullName: 'MangaFan99', username: 'mangafan99', email: 'manga99@mail.com', role: 'Reader', status: 'Active', createdDate: '2023-10-03', lastActive: '1 hour ago' },
  { id: 10, userId: 'USR-0010', fullName: 'TranslateHQ', username: 'translatehq', email: 'thq@group.com', role: 'Translator', status: 'Active', createdDate: '2023-11-11', lastActive: '4 days ago' },
  { id: 11, userId: 'USR-0011', fullName: 'ProArtist', username: 'proartist', email: 'artist@mail.com', role: 'Author', status: 'Banned', createdDate: '2023-12-20', lastActive: '2 weeks ago' },
  { id: 12, userId: 'USR-0012', fullName: 'SuperAdmin', username: 'superadmin', email: 'admin@comiverse.com', role: 'Admin', status: 'Active', createdDate: '2023-01-01', lastActive: 'Today' },
]

const ITEMS_PER_PAGE = 8
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

function AccountManagement() {
  const { theme } = useTheme()
  // Data states
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'ban'|'unban'|'reset-pw', account }

  // Edit user states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editForm, setEditForm] = useState({ fullName: '', role: 'READER' })
  const [editFormErrors, setEditFormErrors] = useState({})

  // Create staff form
  const [staffForm, setStaffForm] = useState({ username: '', password: '', fullName: '', email: '', role: 'READER' })
  const [staffFormErrors, setStaffFormErrors] = useState({})
  const [modalError, setModalError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Inline alert
  const [alert, setAlert] = useState(null) // { type: 'success'|'error', message }

  // Action loading (track which row is being acted upon)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Show alert with auto-dismiss
  const showAlert = useCallback((type, message) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 4000)
  }, [])

  // Fetch accounts from API with paginated backend integration
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = {
        page: currentPage,
        size: ITEMS_PER_PAGE,
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }
      if (roleFilter !== 'All Roles') {
        params.role = roleFilter
      }
      if (statusFilter !== 'All Status') {
        params.status = statusFilter === 'Active' ? 'ACTIVE' : 'INACTIVE'
      }

      const response = await getAllAccountsApi(params)
      const accountsList = response?.data || []
      const metadata = response?.metadata || {}

      const normalized = accountsList.map((acc) => ({
        id: acc.id || acc.userId,
        userId: acc.userId || `USR-${String(acc.id).padStart(4, '0')}`,
        fullName: acc.fullName || acc.name || acc.username,
        username: acc.username,
        email: acc.email,
        role: formatRoleLabel(acc.role?.roleName || acc.role || acc.roleName || 'Reader'),
        status: acc.status || (acc.banned ? 'Banned' : 'Active'),
        createdDate: acc.createdDate || acc.createdAt || '-',
        lastActive: acc.lastActive || acc.lastLogin || '-',
      }))
      setAccounts(normalized)
      setTotalPages(metadata.totalPages || 1)
      setTotalElements(metadata.totalElements || normalized.length)
      setIsMockData(false)
    } catch (err) {
      console.warn('API not available, using mock data:', err.message)
      // Fallback local search/filter & slicing for Mock Data
      const filteredMock = MOCK_ACCOUNTS.filter((account) => {
        const name = (account.fullName || '').toLowerCase()
        const email = (account.email || '').toLowerCase()
        const uid = (account.userId || '').toLowerCase()
        const uname = (account.username || '').toLowerCase()
        const search = searchTerm.toLowerCase()

        const matchesSearch =
          searchTerm === '' || name.includes(search) || email.includes(search) || uid.includes(search) || uname.includes(search)

        const matchesRole =
          roleFilter === 'All Roles' ||
          normalizeRoleValue(account.role) === normalizeRoleValue(roleFilter) ||
          (roleFilter.toLowerCase() === 'moderator' && (account.role || '').toLowerCase() === 'staff') ||
          (roleFilter.toLowerCase() === 'reader' && (account.role || '').toLowerCase() === 'user')

        const matchesStatus =
          statusFilter === 'All Status' || (account.status || '').toLowerCase() === statusFilter.toLowerCase()

        return matchesSearch && matchesRole && matchesStatus
      })

      setTotalPages(Math.max(1, Math.ceil(filteredMock.length / ITEMS_PER_PAGE)))
      setTotalElements(filteredMock.length)

      const paginatedMock = filteredMock.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
      setAccounts(paginatedMock)
      setIsMockData(true)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchTerm, roleFilter, statusFilter])

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

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // ── CREATE STAFF ──────────────────────────────────
  const handleInputChange = (field, value) => {
    setStaffForm((prev) => ({ ...prev, [field]: value }))
    if (staffFormErrors[field]) {
      setStaffFormErrors((prev) => ({ ...prev, [field]: null }))
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
      const result = await registerStaffApi({
        username: staffForm.username.trim(),
        password: staffForm.password.trim(),
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role,
      })
      // Add to local list
      const displayRole = formatRoleLabel(result?.role || staffForm.role)
      
      const newAccount = {
        id: result?.userId || result?.id || Date.now(),
        userId: result?.userId || `USR-${String(result?.id || Date.now()).padStart(4, '0')}`,
        fullName: result?.fullName || staffForm.fullName,
        username: result?.username || staffForm.username,
        email: result?.email || staffForm.email,
        role: displayRole,
        status: 'Active',
        createdDate: new Date().toISOString().split('T')[0],
        lastActive: 'Just now',
      }
      setAccounts((prev) => [newAccount, ...prev])
      setShowCreateModal(false)
      setStaffForm({ username: '', password: '', fullName: '', email: '', role: 'READER' })
      setStaffFormErrors({})
      setModalError(null)
      showAlert('success', `Account "${newAccount.fullName}" created successfully!`)
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
    setStaffForm({ username: '', password: '', fullName: '', email: '', role: 'READER' })
    setStaffFormErrors({})
    setModalError(null)
  }

  // ── EDIT USER ─────────────────────────────────────
  const handleOpenEditModal = (account) => {
    setEditingAccount(account)
    setEditForm({
      fullName: account.fullName,
      role: normalizeRoleValue(account.role || 'READER')
    })
    setEditFormErrors({})
    setModalError(null)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingAccount(null)
    setEditForm({ fullName: '', role: 'READER' })
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
    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors)
      setModalError('Validation failed. Please correct the errors below.')
      return
    }

    setIsSubmitting(true)
    setModalError(null)

    try {
      const response = await updateUserApi(editingAccount.id, {
        fullName: editForm.fullName.trim(),
        role: editForm.role
      })

      const updatedUser = response?.data || {}
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? {
                ...a,
                fullName: updatedUser.fullName || editForm.fullName,
                role: formatRoleLabel(updatedUser.role || editForm.role)
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

  // ── BAN / UNBAN ───────────────────────────────────
  const openConfirm = (type, account) => {
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

  return (
    <AdminLayout activeNav="account-management">
      <div className="admin-account-management-screen">
      {/* Inline Alert */}
      {alert && (
        <div className={`admin-inline-alert admin-inline-alert--${alert.type}`}>
          {alert.type === 'success' ? '✓' : '✕'} {alert.message}
        </div>
      )}

      {/* Mock data indicator */}
      {isMockData && !isLoading && (
        <div className="admin-inline-alert admin-inline-alert--info">
          ⓘ API is unavailable — displaying demo data. Connect the backend to see real accounts.
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Account Management</h1>
          <p>{totalElements} account{totalElements !== 1 ? 's' : ''} found</p>
        </div>
        <AnimatedButton
          variant={3}
          label="+ Create User Account"
          tooltip=""
          onClick={() => setShowCreateModal(true)}
        />
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
              accounts.map((account) => (
                <tr key={account.id}>
                  <td className="cell-user-id">{account.userId}</td>
                  <td className="cell-name">{account.fullName}</td>
                  <td className="cell-email">{account.email}</td>
                  <td>
                    <span className={`role-badge ${roleToClassName(account.role)}`}>
                      {formatRoleLabel(account.role)}
                    </span>
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
                          <ModernButton
                            variant={2}
                            label="Edit"
                            onClick={() => handleOpenEditModal(account)}
                            className="btn-edit"
                          />
                          {(account.status || '').toLowerCase() === 'banned' ? (
                            <ModernButton
                              variant={2}
                              label="Unban"
                              onClick={() => openConfirm('unban', account)}
                              className="btn-unban"
                            />
                          ) : (
                            <ModernButton
                              variant={2}
                              label="Ban"
                              onClick={() => openConfirm('ban', account)}
                              className="btn-ban"
                            />
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
                  value={editingAccount.username}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Email</label>
                <input
                  className="admin-form-input"
                  type="email"
                  value={editingAccount.email}
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
