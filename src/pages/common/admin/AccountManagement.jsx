import { useState, useMemo } from 'react'
import AdminLayout from '../../../components/layout/AdminLayout'

// Mock data matching the screenshot
const MOCK_ACCOUNTS = [
  { id: 'USR-0001', name: 'John Doe', email: 'john@gmail.com', role: 'Reader', status: 'Active', createdDate: 'Jan 15, 2023', lastActive: 'Today' },
  { id: 'USR-0002', name: 'Spirit Group', email: 'spirit@gmail.com', role: 'Translator', status: 'Active', createdDate: 'Mar 02, 2023', lastActive: '2 days ago' },
  { id: 'USR-0003', name: 'Author X', email: 'authorx@gmail.com', role: 'Author', status: 'Active', createdDate: 'Apr 18, 2023', lastActive: 'Yesterday' },
  { id: 'USR-0004', name: 'Mod Y', email: 'mody@gmail.com', role: 'Moderator', status: 'Active', createdDate: 'May 10, 2023', lastActive: 'Today' },
  { id: 'USR-0005', name: 'Sarah Chen', email: 'sarah@gmail.com', role: 'Reader', status: 'Active', createdDate: 'Jun 01, 2023', lastActive: '3 hours ago' },
  { id: 'USR-0006', name: 'Dragon Scans', email: 'dragon@group.com', role: 'Translator', status: 'Banned', createdDate: 'Jul 22, 2023', lastActive: '1 month ago' },
  { id: 'USR-0007', name: 'NoviceWriter', email: 'novice@mail.com', role: 'Author', status: 'Active', createdDate: 'Aug 05, 2023', lastActive: '5 days ago' },
  { id: 'USR-0008', name: 'ContentMod', email: 'cmod@site.com', role: 'Moderator', status: 'Active', createdDate: 'Sep 14, 2023', lastActive: 'Today' },
  { id: 'USR-0009', name: 'MangaFan99', email: 'manga99@mail.com', role: 'Reader', status: 'Active', createdDate: 'Oct 03, 2023', lastActive: '1 hour ago' },
  { id: 'USR-0010', name: 'TranslateHQ', email: 'thq@group.com', role: 'Translator', status: 'Active', createdDate: 'Nov 11, 2023', lastActive: '4 days ago' },
  { id: 'USR-0011', name: 'ProArtist', email: 'artist@mail.com', role: 'Author', status: 'Banned', createdDate: 'Dec 20, 2023', lastActive: '2 weeks ago' },
  { id: 'USR-0012', name: 'SuperAdmin', email: 'admin@comiverse.com', role: 'Moderator', status: 'Active', createdDate: 'Jan 01, 2023', lastActive: 'Today' },
]

const ITEMS_PER_PAGE = 8

function AccountManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter and search logic
  const filteredAccounts = useMemo(() => {
    return MOCK_ACCOUNTS.filter((account) => {
      const matchesSearch =
        searchTerm === '' ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole =
        roleFilter === 'All Roles' || account.role === roleFilter

      const matchesStatus =
        statusFilter === 'All Status' || account.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [searchTerm, roleFilter, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredAccounts.length)

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

  return (
    <AdminLayout activeNav="account-management">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Account Management</h1>
          <p>{filteredAccounts.length} accounts found</p>
        </div>
        <button className="btn-create-staff">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Staff Account
        </button>
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
            placeholder="Search by name, email, ID..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        <select
          className="admin-filter-select"
          value={roleFilter}
          onChange={handleRoleChange}
        >
          <option>All Roles</option>
          <option>Reader</option>
          <option>Translator</option>
          <option>Author</option>
          <option>Moderator</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={handleStatusChange}
        >
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
            {paginatedAccounts.map((account) => (
              <tr key={account.id}>
                <td className="cell-user-id">{account.id}</td>
                <td className="cell-name">{account.name}</td>
                <td className="cell-email">{account.email}</td>
                <td>
                  <span className={`role-badge ${account.role.toLowerCase()}`}>
                    {account.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${account.status.toLowerCase()}`}>
                    {account.status}
                  </span>
                </td>
                <td>{account.createdDate}</td>
                <td>{account.lastActive}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn-table-action reset-pw">Reset PW</button>
                    {account.status === 'Banned' ? (
                      <button className="btn-table-action unban">Unban</button>
                    ) : (
                      <button className="btn-table-action ban">Ban</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer with Pagination */}
        <div className="admin-table-footer">
          <span className="showing-info">
            Showing {startItem}-{endItem} of {filteredAccounts.length}
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
      </div>
    </AdminLayout>
  )
}

export default AccountManagement
