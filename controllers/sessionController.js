
import mongoose from "mongoose";

import Session from "../models/Session.js";
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

// Invalidate Session Cache
const invalidateSessionCache = async () => {
  await deleteCacheByPattern("sessions:*");
};

// Allowed Search Fields
const ALLOWED_SEARCH_FIELDS = [
  "sessionName",
  "startTime",
  "endTime",
];

// Allowed Sort Fields
const ALLOWED_SORT_FIELDS = [
  "sessionName",
  "sessionDate",
  "startTime",
  "endTime",
  "createdAt",
  "updatedAt",
];

// Faculty Population
const populateChairperson = {
  path: "chairperson",
  select: "fullName email",
};

// Validate Session Name
const isValidSessionName = (sessionName) => {
  return (
    typeof sessionName === "string" &&
    sessionName.trim().length >= 2 &&
    sessionName.trim().length <= 100
  );
};

// Validate Session Date
const isValidSessionDate = (sessionDate) => {
  return (
    typeof sessionDate === "string" &&
    sessionDate.trim() !== "" &&
    !Number.isNaN(new Date(sessionDate).getTime())
  );
};

// Validate Time
const isValidTime = (time) => {
  return (
    typeof time === "string" &&
    /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(time.trim())
  );
};

// Validate Chairperson Array and Faculty Records
const validateChairpersons = async (chairperson) => {
  if (
    !Array.isArray(chairperson) ||
    chairperson.length === 0
  ) {
    return {
      valid: false,
      message: "At least one chairperson is required.",
    };
  }

  if (!chairperson.every((id) => isValidId(id))) {
    return {
      valid: false,
      message: "One or more chairperson IDs are invalid.",
    };
  }

  const uniqueIds = [...new Set(chairperson.map(String))];

  const faculties = await Faculty.find({
    _id: { $in: uniqueIds },
  })
    .select("_id")
    .lean();

  if (faculties.length !== uniqueIds.length) {
    return {
      valid: false,
      message: "One or more chairpersons were not found.",
    };
  }

  return {
    valid: true,
    data: uniqueIds,
  };
};

// ==========================================
// CREATE SESSION
// POST /api/sessions
// ==========================================

export const createSession = asyncHandler(async (req, res) => {
  const {
    sessionName,
    sessionDate,
    startTime,
    endTime,
    chairperson,
  } = req.body;

  // Validate Session Name
  if (!isValidSessionName(sessionName)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Session name must be between 2 and 100 characters.",
    });
  }

  // Validate Session Date
  if (!isValidSessionDate(sessionDate)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide a valid session date.",
    });
  }

  // Validate Start Time
  if (!isValidTime(startTime)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide a valid start time, e.g. 10:30 AM.",
    });
  }

  // Validate End Time
  if (!isValidTime(endTime)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide a valid end time, e.g. 11:00 AM.",
    });
  }

  // Validate Chairpersons
  const chairpersonValidation =
    await validateChairpersons(chairperson);

  if (!chairpersonValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: chairpersonValidation.message,
    });
  }

  // Create Session
  const session = await Session.create({
    sessionName: sessionName.trim(),
    sessionDate: new Date(sessionDate),
    startTime: startTime.trim().toUpperCase(),
    endTime: endTime.trim().toUpperCase(),
    chairperson: chairpersonValidation.data,
  });

  // Invalidate Cache
  await invalidateSessionCache();

  return successResponse(res, {
    statusCode: 201,
    message: "Session created successfully.",
    data: { session },
  });
});

// ==========================================
// GET ALL SESSIONS WITH PAGINATION
// GET /api/sessions
// ==========================================

export const getAllSessions = asyncHandler(async (req, res) => {
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
    "sessionDate"
  );

  // Filter Query
  const filterQuery = {
    ...searchQuery,
  };

  // Redis Cache Key
  const cacheKey = `sessions:all:${JSON.stringify({
    query: req.query,
    page,
    limit,
  })}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Sessions fetched successfully.",
      data: cachedData.data,
      pagination: cachedData.pagination,
    });
  }

  // Fetch Sessions and Total Count
  const [sessions, total] = await Promise.all([
    Session.find(filterQuery)
      .populate(populateChairperson)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),

    Session.countDocuments(filterQuery),
  ]);

  // Pagination Metadata
  const pagination = buildPaginationMeta(
    total,
    page,
    limit
  );

  const data = { sessions };

  // Store in Redis
  await setCache(
    cacheKey,
    { data, pagination },
    3600
  );

  return successResponse(res, {
    statusCode: 200,
    message: "Sessions fetched successfully.",
    data,
    pagination,
  });
});

// ==========================================
// GET ALL SESSIONS WITHOUT PAGINATION
// GET /api/sessions/all
// ==========================================

export const getAllSessionsWithoutPagination =
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
      "sessionDate"
    );

    // Filter Query
    const filterQuery = {
      ...searchQuery,
    };

    // Redis Cache Key
    const cacheKey = `sessions:all:without-pagination:${JSON.stringify(
      req.query
    )}`;

    // Check Cache
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return successResponse(res, {
        statusCode: 200,
        message: "Sessions fetched successfully.",
        data: cachedData,
      });
    }

    // Fetch All Sessions
    const sessions = await Session.find(filterQuery)
      .populate(populateChairperson)
      .sort(sortQuery)
      .lean();

    const data = { sessions };

    // Store in Redis
    await setCache(cacheKey, data, 3600);

    return successResponse(res, {
      statusCode: 200,
      message: "Sessions fetched successfully.",
      data,
    });
  });

// ==========================================
// GET SESSION BY ID
// GET /api/sessions/:id
// ==========================================

export const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid session ID.",
    });
  }

  // Redis Cache Key
  const cacheKey = `sessions:single:${id}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Session fetched successfully.",
      data: cachedData,
    });
  }

  // Find Session and Populate Chairpersons
  const session = await Session.findById(id)
    .populate(populateChairperson)
    .lean();

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

  const data = { session };

  // Store in Redis
  await setCache(cacheKey, data, 3600);

  return successResponse(res, {
    statusCode: 200,
    message: "Session fetched successfully.",
    data,
  });
});

// ==========================================
// UPDATE SESSION
// PUT /api/sessions/:id
// ==========================================

export const updateSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    sessionName,
    sessionDate,
    startTime,
    endTime,
    chairperson,
  } = req.body;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid session ID.",
    });
  }

  const updateData = {};

  // Validate Session Name
  if (sessionName !== undefined) {
    if (!isValidSessionName(sessionName)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Session name must be between 2 and 100 characters.",
      });
    }

    updateData.sessionName = sessionName.trim();
  }

  // Validate Session Date
  if (sessionDate !== undefined) {
    if (!isValidSessionDate(sessionDate)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please provide a valid session date.",
      });
    }

    updateData.sessionDate = new Date(sessionDate);
  }

  // Validate Start Time
  if (startTime !== undefined) {
    if (!isValidTime(startTime)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please provide a valid start time, e.g. 10:30 AM.",
      });
    }

    updateData.startTime = startTime.trim().toUpperCase();
  }

  // Validate End Time
  if (endTime !== undefined) {
    if (!isValidTime(endTime)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please provide a valid end time, e.g. 11:00 AM.",
      });
    }

    updateData.endTime = endTime.trim().toUpperCase();
  }

  // Validate Chairpersons
  if (chairperson !== undefined) {
    const chairpersonValidation =
      await validateChairpersons(chairperson);

    if (!chairpersonValidation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: chairpersonValidation.message,
      });
    }

    updateData.chairperson = chairpersonValidation.data;
  }

  // Check Empty Update
  if (Object.keys(updateData).length === 0) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide at least one field to update.",
    });
  }

  // Update Session
  const session = await Session.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

  // Invalidate Cache
  await invalidateSessionCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Session updated successfully.",
    data: { session },
  });
});

// ==========================================
// DELETE SESSION
// DELETE /api/sessions/:id
// ==========================================

export const deleteSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid session ID.",
    });
  }

  // Delete Session
  const session = await Session.findByIdAndDelete(id);

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

  // Invalidate Cache
  await invalidateSessionCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Session deleted successfully.",
    data: { session },
  });
});
