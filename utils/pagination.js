/**
 * Pagination Utilities
 *
 * Supports:
 *
 * ?page=1
 * ?limit=20
 */

/* -------------------------------------------------------------------------- */
/* Get Pagination                                                              */
/* -------------------------------------------------------------------------- */

export const getPagination = (
  req,
  maxLimit = 100,
  defaultLimit = 20,
) => {
  let page = Number.parseInt(
    req.query.page,
    10,
  )

  let limit = Number.parseInt(
    req.query.limit,
    10,
  )

  // Page

  if (
    Number.isNaN(page) ||
    page < 1
  ) {
    page = 1
  }

  // Limit

  if (
    Number.isNaN(limit) ||
    limit < 1
  ) {
    limit = defaultLimit
  }

  if (limit > maxLimit) {
    limit = maxLimit
  }

  const skip = (page - 1) * limit

  return {
    page,
    limit,
    skip,
  }
}

/* -------------------------------------------------------------------------- */
/* Build Pagination Metadata                                                   */
/* -------------------------------------------------------------------------- */

export const buildPaginationMeta = (
  total,
  page,
  limit,
) => {
  const totalPages =
    total === 0
      ? 0
      : Math.ceil(total / limit)

  const from =
    total === 0
      ? 0
      : (page - 1) * limit + 1

  const to =
    total === 0
      ? 0
      : Math.min(page * limit, total)

  return {
    page,
    limit,

    total,

    totalPages,

    from,

    to,

    hasPreviousPage:
      page > 1,

    hasNextPage:
      page < totalPages,
  }
}