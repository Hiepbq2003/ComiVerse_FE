import AxiosClient from './AxiosClient';

/**
 * ============================================================================
 * 1. REPORT CATEGORY APIs (ReportCategoryController & ReportController)
 * ============================================================================
 */

/**
 * GET /reports/categories (or GET /report-categories)
 * Retrieve active report categories filtered by target_type and/or assigned_role
 * @param {string} [targetType] - 'COMIC' | 'CHAPTER' | 'CHAPTER_TRANSLATIONS'
 * @param {string} [assignedRole] - 'MODERATOR' | 'PROJECT_LEADER'
 * @returns {Promise<Array>} List<ReportCategoryResponse>
 */
export const getActiveReportCategoriesApi = async (targetType, assignedRole) => {
  const params = {};
  if (targetType && targetType !== 'ALL') params.target_type = targetType;
  if (assignedRole && assignedRole !== 'ALL') params.assigned_role = assignedRole;

  const res = await AxiosClient.get('/reports/categories', {
    params,
    suppressToast: true
  });
  const data = res?.data !== undefined ? res.data : res;
  return Array.isArray(data) ? data : (data?.categories || data?.items || []);
};

/**
 * GET /report-categories/admin/all
 * Retrieve all report categories (active & inactive) for Admin, Moderator, and Project Leader
 * @param {Object} [filterParams] - { is_active, assigned_role, target_type }
 * @returns {Promise<Array>} List<ReportCategoryResponse>
 */
export const getAllReportCategoriesApi = async (filterParams = {}) => {
  const params = {};
  if (filterParams.is_active !== undefined && filterParams.is_active !== 'ALL') {
    params.is_active = filterParams.is_active;
  }
  if (filterParams.assigned_role && filterParams.assigned_role !== 'ALL') {
    params.assigned_role = filterParams.assigned_role;
  }
  if (filterParams.target_type && filterParams.target_type !== 'ALL') {
    params.target_type = filterParams.target_type;
  }

  const res = await AxiosClient.get('/report-categories/admin/all', {
    params,
    suppressToast: true
  });
  const data = res?.data !== undefined ? res.data : res;
  return Array.isArray(data) ? data : (data?.categories || data?.items || []);
};

/**
 * GET /report-categories/{id}
 * Retrieve details of a single report category by ID
 * @param {string} id - Category UUID
 * @returns {Promise<Object>} ReportCategoryResponse
 */
export const getCategoryByIdApi = async (id) => {
  const res = await AxiosClient.get(`/report-categories/${id}`, {
    suppressToast: true
  });
  return res?.data !== undefined ? res.data : res;
};

/**
 * POST /report-categories
 * Create a new report category (Moderator/Admin)
 * @param {Object} categoryData - { name, description, assigned_role, target_types, is_active }
 * @returns {Promise<Object>} ReportCategoryResponse
 */
export const createReportCategoryApi = async (categoryData) => {
  const payload = {
    name: categoryData.name?.trim(),
    description: categoryData.description?.trim() || '',
    assigned_role: categoryData.assigned_role || 'MODERATOR',
    target_types: Array.isArray(categoryData.target_types) ? categoryData.target_types : ['COMIC'],
    is_active: categoryData.is_active !== undefined ? categoryData.is_active : true
  };
  const res = await AxiosClient.post('/report-categories', payload);
  return res?.data !== undefined ? res.data : res;
};

/**
 * PUT /report-categories/{id}
 * Update report category details, assigned role, target types, or active status
 * @param {string} id - Category UUID
 * @param {Object} categoryData - { name, description, assigned_role, target_types, is_active }
 * @returns {Promise<Object>} ReportCategoryResponse
 */
export const updateReportCategoryApi = async (id, categoryData) => {
  const payload = {
    name: categoryData.name?.trim(),
    description: categoryData.description?.trim() || '',
    assigned_role: categoryData.assigned_role || 'MODERATOR',
    target_types: Array.isArray(categoryData.target_types) ? categoryData.target_types : ['COMIC'],
    is_active: categoryData.is_active !== undefined ? categoryData.is_active : true
  };
  const res = await AxiosClient.put(`/report-categories/${id}`, payload);
  return res?.data !== undefined ? res.data : res;
};

/**
 * DELETE /report-categories/{id}
 * Soft delete / deactivate a report category
 * @param {string} id - Category UUID
 * @returns {Promise<Object>} BaseResponse<Void>
 */
export const deleteReportCategoryApi = async (id) => {
  const res = await AxiosClient.delete(`/report-categories/${id}`, {
    suppressToast: true
  });
  return res?.data !== undefined ? res.data : res;
};

/**
 * ============================================================================
 * 2. ADMIN & MODERATOR REPORT MANAGEMENT APIs (AdminReportController)
 * ============================================================================
 */

/**
 * GET /admin/reports
 * Retrieve paginated and filtered list of issue reports (Mod/Leader/Admin)
 * Filters: page, size, status, target_type, category_id, assigned_role, start_date, end_date, search
 * @param {Object} [filterDTO]
 * @returns {Promise<{ reports: Array, total: number, page: number, limit: number, totalPages: number }>}
 */
export const getAdminReportsApi = async (filterDTO = {}) => {
  const params = {};
  if (filterDTO.status && filterDTO.status !== 'ALL') params.status = filterDTO.status;
  if (filterDTO.target_type && filterDTO.target_type !== 'ALL') params.target_type = filterDTO.target_type;
  if (filterDTO.category_id && filterDTO.category_id !== 'ALL') params.category_id = filterDTO.category_id;
  if (filterDTO.assigned_role && filterDTO.assigned_role !== 'ALL') params.assigned_role = filterDTO.assigned_role;
  if (filterDTO.start_date) params.start_date = filterDTO.start_date;
  if (filterDTO.end_date) params.end_date = filterDTO.end_date;
  if (filterDTO.search) params.search = filterDTO.search.trim();

  // Spring Pageable pagination: 0-indexed page in Spring backend
  const requestedPage = filterDTO.page !== undefined ? Number(filterDTO.page) : 1;
  const pageSize = Number(filterDTO.size || filterDTO.limit || 10);
  params.page = Math.max(0, requestedPage > 0 ? requestedPage - 1 : requestedPage);
  params.size = pageSize;

  const res = await AxiosClient.get('/admin/reports', {
    params,
    suppressToast: true
  });

  const data = res?.data !== undefined ? res.data : res;

  // Handle Spring Page<ReportResponse> structure: { content: [...], totalElements: N, totalPages: M, number: 0 }
  if (data && data.content && Array.isArray(data.content)) {
    return {
      reports: data.content,
      total: data.totalElements ?? data.content.length,
      totalPages: data.totalPages ?? 1,
      page: (data.number ?? params.page) + 1,
      limit: data.size ?? pageSize
    };
  }

  // Fallback for custom wrapper or direct list
  if (Array.isArray(data)) {
    return {
      reports: data,
      total: res?.metadata?.total || data.length,
      totalPages: Math.ceil((res?.metadata?.total || data.length) / pageSize) || 1,
      page: requestedPage,
      limit: pageSize
    };
  }

  return {
    reports: data?.reports || data?.items || [],
    total: data?.total || data?.totalElements || 0,
    totalPages: data?.totalPages || 1,
    page: requestedPage,
    limit: pageSize
  };
};

/**
 * GET /admin/reports/{id}
 * View detailed report information, reporter profile, and reported target details
 * @param {string} id - Report UUID
 * @returns {Promise<Object>} ReportResponse
 */
export const getReportDetailApi = async (id) => {
  const res = await AxiosClient.get(`/admin/reports/${id}`, {
    suppressToast: true
  });
  return res?.data !== undefined ? res.data : res;
};

/**
 * PATCH /admin/reports/{id}/process
 * Process report resolution (action: "ACCEPT" | "REJECT", resolution_note: string)
 * Automatically dispatches notification to the reporting user.
 * @param {string} id - Report UUID
 * @param {Object} processRequest - { action: "ACCEPT" | "REJECT", resolution_note: string }
 * @returns {Promise<Object>} ReportResponse
 */
export const processReportApi = async (id, { action, resolution_note }) => {
  const payload = {
    action: action?.toUpperCase(),
    resolution_note: resolution_note?.trim() || ''
  };
  const res = await AxiosClient.patch(`/admin/reports/${id}/process`, payload);
  return res?.data !== undefined ? res.data : res;
};

/**
 * ============================================================================
 * 3. USER REPORT SUBMISSION & HISTORY APIs (ReportController)
 * ============================================================================
 */

/**
 * POST /reports
 * Submit a new issue report (Comic, Chapter, Chapter Translation)
 * @param {Object} reportRequest - { target_type, target_id, category_id, description_text }
 * @returns {Promise<Object>} ReportResponse
 */
export const createReportApi = async (reportRequest) => {
  const payload = {
    target_type: reportRequest.target_type,
    target_id: reportRequest.target_id,
    category_id: reportRequest.category_id,
    description_text: reportRequest.description_text?.trim(),
    ...(reportRequest.language_code ? { language_code: reportRequest.language_code } : {})
  };
  const res = await AxiosClient.post('/reports', payload);
  return res?.data !== undefined ? res.data : res;
};

/**
 * GET /reports/my-reports
 * Get list of reports submitted by the currently logged-in user
 * @param {Object} [pagination] - { page, size }
 * @returns {Promise<Object>} Page<ReportResponse>
 */
export const getMyReportsApi = async ({ page = 0, size = 10 } = {}) => {
  const res = await AxiosClient.get('/reports/my-reports', {
    params: { page, size },
    suppressToast: true
  });
  return res?.data !== undefined ? res.data : res;
};

/**
 * GET /reports/{id}
 * Get report details for reporter or assigned handler
 * @param {string} id - Report UUID
 * @returns {Promise<Object>} ReportResponse
 */
export const getUserReportByIdApi = async (id) => {
  const res = await AxiosClient.get(`/reports/${id}`, {
    suppressToast: true
  });
  return res?.data !== undefined ? res.data : res;
};
