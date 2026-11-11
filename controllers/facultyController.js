
import mongoose from "mongoose";

import Faculty from "../models/Faculty.js";

import asyncHandler from "../utils/asyncHandler.js";

import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "../utils/redisCache.js";

import {
  getPagination,
  buildPaginationMeta,
} from "../utils/pagination.js";

import buildSearchQuery from "../utils/search.js";
import buildSortQuery from "../utils/sort.js";

// ==========================================
// COMMON HELPERS
// ==========================================

// Validate MongoDB ObjectId
const isValidId = (id) => mongoose.isValidObjectId(id);

// Invalidate Faculty Cache
const invalidateFacultyCache = async () => {
  await deleteCacheByPattern("faculties:*");
};

// Allowed Search Fields
const ALLOWED_SEARCH_FIELDS = [
  "fullName",
  "email",
  "mobile",
];

// Allowed Sort Fields
const ALLOWED_SORT_FIELDS = [
  "fullName",
  "email",
  "mobile",
  "createdAt",
  "updatedAt",
];

// Validate Full Name
const isValidFullName = (fullName) => {
  return (
    typeof fullName === "string" &&
    fullName.trim().length >= 2 &&
    fullName.trim().length <= 100
  );
};

// Validate Email
const isValidEmail = (email) => {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
};

// Validate Mobile
const isValidMobile = (mobile) => {
  return (
    typeof mobile === "string" &&
    mobile.trim().length > 0
  );
};

// ==========================================
// CREATE FACULTY
// POST /api/faculties
// ==========================================

export const createFaculty = asyncHandler(async (req, res) => {
  const { fullName, email, mobile } = req.body;

  // Validate Full Name
  if (!isValidFullName(fullName)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Faculty name must be between 2 and 100 characters.",
    });
  }

  // Validate Email
  if (!isValidEmail(email)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide a valid email address.",
    });
  }

  // Validate Mobile
  if (!isValidMobile(mobile)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Mobile number is required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.trim();

  // Check Duplicate Email or Mobile
  const existingFaculty = await Faculty.findOne({
    $or: [
      { email: normalizedEmail },
      { mobile: normalizedMobile },
    ],
  }).lean();

  if (existingFaculty) {
    return errorResponse(res, {
      statusCode: 409,
      message:
        existingFaculty.email === normalizedEmail
          ? "Email already exists."
          : "Mobile number already exists.",
    });
  }

  // Create Faculty
  let faculty;

  try {
    faculty = await Faculty.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return errorResponse(res, {
        statusCode: 409,
        message:
          duplicateField === "email"
            ? "Email already exists."
            : "Mobile number already exists.",
      });
    }

    throw error;
  }

  // Invalidate Cache
  await invalidateFacultyCache();

  return successResponse(res, {
    statusCode: 201,
    message: "Faculty created successfully.",
    data: { faculty },
  });
});

// ==========================================
// GET ALL FACULTIES WITH PAGINATION
// GET /api/faculties
// ==========================================

export const getAllFaculties = asyncHandler(async (req, res) => {
  // Pagination Utility
  const { page, limit, skip } = getPagination(req);

  // Search Utility
  const searchQuery = buildSearchQuery(
    req,
    ALLOWED_SEARCH_FIELDS
  );

  // Sort Utility
  const sortQuery = buildSortQuery(
    req,
    ALLOWED_SORT_FIELDS,
    "createdAt"
  );

  // Filter Query
  const filterQuery = {
    ...searchQuery,
  };

  // Redis Cache Key
  const cacheKey = `faculties:all:${JSON.stringify({
    query: req.query,
    page,
    limit,
  })}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Faculties fetched successfully.",
      data: cachedData.data,
      pagination: cachedData.pagination,
    });
  }

  // Fetch Faculties and Total Count
  const [faculties, total] = await Promise.all([
    Faculty.find(filterQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),

    Faculty.countDocuments(filterQuery),
  ]);

  // Pagination Metadata Utility
  const pagination = buildPaginationMeta(
    total,
    page,
    limit
  );

  const data = { faculties };

  // Store in Redis
  await setCache(
    cacheKey,
    { data, pagination },
    3600
  );

  return successResponse(res, {
    statusCode: 200,
    message: "Faculties fetched successfully.",
    data,
    pagination,
  });
});

// ==========================================
// GET ALL FACULTIES WITHOUT PAGINATION
// GET /api/faculties/all
// ==========================================

export const getAllFacultiesWithoutPagination =
  asyncHandler(async (req, res) => {
    // Search Utility
    const searchQuery = buildSearchQuery(
      req,
      ALLOWED_SEARCH_FIELDS
    );

    // Sort Utility
    const sortQuery = buildSortQuery(
      req,
      ALLOWED_SORT_FIELDS,
      "fullName"
    );

    // Filter Query
    const filterQuery = {
      ...searchQuery,
    };

    // Redis Cache Key
    const cacheKey = `faculties:all:without-pagination:${JSON.stringify(
      req.query
    )}`;

    // Check Cache
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return successResponse(res, {
        statusCode: 200,
        message: "Faculties fetched successfully.",
        data: cachedData,
      });
    }

    // Fetch All Faculties
    const faculties = await Faculty.find(filterQuery)
      .sort(sortQuery)
      .lean();

    const data = { faculties };

    // Store in Redis
    await setCache(cacheKey, data, 3600);

    return successResponse(res, {
      statusCode: 200,
      message: "Faculties fetched successfully.",
      data,
    });
  });

// ==========================================
// GET FACULTY BY ID
// GET /api/faculties/:id
// ==========================================

export const getFacultyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid faculty ID.",
    });
  }

  // Redis Cache Key
  const cacheKey = `faculties:single:${id}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Faculty fetched successfully.",
      data: cachedData,
    });
  }

  // Find Faculty
  const faculty = await Faculty.findById(id).lean();

  if (!faculty) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Faculty not found.",
    });
  }

  const data = { faculty };

  // Store in Redis
  await setCache(cacheKey, data, 3600);

  return successResponse(res, {
    statusCode: 200,
    message: "Faculty fetched successfully.",
    data,
  });
});

// ==========================================
// UPDATE FACULTY
// PUT /api/faculties/:id
// ==========================================

export const updateFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, mobile } = req.body;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid faculty ID.",
    });
  }

  const updateData = {};

  // Validate Full Name
  if (fullName !== undefined) {
    if (!isValidFullName(fullName)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Faculty name must be between 2 and 100 characters.",
      });
    }

    updateData.fullName = fullName.trim();
  }

  // Validate Email
  if (email !== undefined) {
    if (!isValidEmail(email)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please provide a valid email address.",
      });
    }

    updateData.email = email.trim().toLowerCase();
  }

  // Validate Mobile
  if (mobile !== undefined) {
    if (!isValidMobile(mobile)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Mobile number is required.",
      });
    }

    updateData.mobile = mobile.trim();
  }

  // Check Empty Update
  if (Object.keys(updateData).length === 0) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide at least one field to update.",
    });
  }

  // Check Duplicate Email or Mobile
  const duplicateConditions = [];

  if (updateData.email !== undefined) {
    duplicateConditions.push({ email: updateData.email });
  }

  if (updateData.mobile !== undefined) {
    duplicateConditions.push({ mobile: updateData.mobile });
  }

  if (duplicateConditions.length > 0) {
    const existingFaculty = await Faculty.findOne({
      _id: { $ne: id },
      $or: duplicateConditions,
    }).lean();

    if (existingFaculty) {
      return errorResponse(res, {
        statusCode: 409,
        message:
          updateData.email !== undefined &&
          existingFaculty.email === updateData.email
            ? "Email already exists."
            : "Mobile number already exists.",
      });
    }
  }

  // Update Faculty
  let faculty;

  try {
    faculty = await Faculty.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return errorResponse(res, {
        statusCode: 409,
        message:
          duplicateField === "email"
            ? "Email already exists."
            : "Mobile number already exists.",
      });
    }

    throw error;
  }

  if (!faculty) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Faculty not found.",
    });
  }

  // Invalidate Cache
  await invalidateFacultyCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Faculty updated successfully.",
    data: { faculty },
  });
});

// ==========================================
// DELETE FACULTY
// DELETE /api/faculties/:id
// ==========================================

export const deleteFaculty = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid faculty ID.",
    });
  }

  // Delete Faculty
  const faculty = await Faculty.findByIdAndDelete(id);

  if (!faculty) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Faculty not found.",
    });
  }

  // Invalidate Cache
  await invalidateFacultyCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Faculty deleted successfully.",
    data: { faculty },
  });
});
