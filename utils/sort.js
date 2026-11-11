
const buildSortQuery = (
  req,
  allowedSortFields = [],
  defaultSort = "createdAt"
) => {
  const sortBy =
    typeof req.query.sortBy === "string" &&
    Array.isArray(allowedSortFields) &&
    allowedSortFields.includes(req.query.sortBy.trim())
      ? req.query.sortBy.trim()
      : defaultSort;

  const order =
    typeof req.query.order === "string"
      ? req.query.order.toLowerCase()
      : "desc";

  const direction = order === "asc" ? 1 : -1;

  return {
    [sortBy]: direction,
  };
};

export default buildSortQuery;
