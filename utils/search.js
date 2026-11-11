
/**
 * Escape RegExp special characters.
 */
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Build Search Query.
 */
const buildSearchQuery = (
  req,
  searchableFields = []
) => {
  if (
    !Array.isArray(searchableFields) ||
    searchableFields.length === 0
  ) {
    return {};
  }

  const rawSearch =
    typeof req.query.search === "string"
      ? req.query.search.trim()
      : "";

  if (!rawSearch) {
    return {};
  }

  const normalizedSearch = rawSearch.replace(/\s+/g, " ");

  const escapedSearch = escapeRegex(normalizedSearch);

  const regexPattern = escapedSearch.replace(/\s+/g, ".*");

  return {
    $or: searchableFields.map((field) => ({
      [field]: {
        $regex: regexPattern,
        $options: "i",
      },
    })),
  };
};

export default buildSearchQuery;
