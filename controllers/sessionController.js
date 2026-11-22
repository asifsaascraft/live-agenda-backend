import mongoose from "mongoose";

import Session from "../models/Session.js";
import Faculty from "../models/Faculty.js";
import Hall from "../models/Hall.js";
import Track from "../models/Track.js";

import asyncHandler from "../utils/asyncHandler.js";

import { successResponse, errorResponse } from "../utils/response.js";

import {
  getCache,
  setCache,
  deleteCacheByPattern,
} from "../utils/redisCache.js";

import { getPagination, buildPaginationMeta } from "../utils/pagination.js";

import buildSearchQuery from "../utils/search.js";
import buildSortQuery from "../utils/sort.js";

// ==========================================
// COMMON HELPERS
// ==========================================

const isValidId = (id) => mongoose.isValidObjectId(id);

const invalidateSessionCache = async () => {
  await deleteCacheByPattern("sessions:*");
};

// Allowed Search Fields
const ALLOWED_SEARCH_FIELDS = ["sessionName", "startTime", "endTime"];

// Allowed Sort Fields
const ALLOWED_SORT_FIELDS = [
  "sessionName",
  "sessionDate",
  "startTime",
  "endTime",
  "createdAt",
  "updatedAt",
];

// Populate Chairperson
const populateChairperson = {
  path: "chairperson",
  select: "fullName email mobile",
};

// Populate Hall - only hallName
const populateHall = {
  path: "hallId",
  select: "hallName",
};

// Populate Track - only trackName
const populateTrack = {
  path: "trackId",
  select: "trackName",
};

// All population fields used by Session GET APIs
const populateSessionFields = [
  populateHall,
  populateTrack,
  populateChairperson,
];

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

// Validate Hall ID and Check Hall Exists

const validateHall = async (hallId) => {
  if (!hallId || !isValidId(hallId)) {
    return {
      valid: false,
      message: "Please provide a valid Hall ID.",
    };
  }

  const hall = await Hall.findById(hallId).select("_id status").lean();

  if (!hall) {
    return {
      valid: false,
      message: "Hall not found.",
    };
  }

  if (hall.status !== "Active") {
    return {
      valid: false,
      message: "Selected Hall is inactive. Please select an active Hall.",
    };
  }

  return {
    valid: true,
    data: hall._id,
  };
};

// Validate Track ID and Check Track Exists

const validateTrack = async (trackId) => {
  if (!trackId || !isValidId(trackId)) {
    return {
      valid: false,
      message: "Please provide a valid Track ID.",
    };
  }

  const track = await Track.findById(trackId).select("_id status").lean();

  if (!track) {
    return {
      valid: false,
      message: "Track not found.",
    };
  }

  if (track.status !== "Active") {
    return {
      valid: false,
      message: "Selected Track is inactive. Please select an active Track.",
    };
  }

  return {
    valid: true,
    data: track._id,
  };
};

// Validate Chairperson Array and Faculty Records
const validateChairpersons = async (chairperson) => {
  if (!Array.isArray(chairperson) || chairperson.length === 0) {
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
    hallId,
    trackId,
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

  // Validate Hall
  const hallValidation = await validateHall(hallId);

  if (!hallValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: hallValidation.message,
    });
  }

  // Validate Track
  const trackValidation = await validateTrack(trackId);

  if (!trackValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: trackValidation.message,
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
  const chairpersonValidation = await validateChairpersons(chairperson);

  if (!chairpersonValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: chairpersonValidation.message,
    });
  }

  // Create Session
  const session = await Session.create({
    sessionName: sessionName.trim(),
    hallId: hallValidation.data,
    trackId: trackValidation.data,
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
  const { page, limit, skip } = getPagination(req);

  const searchQuery = buildSearchQuery(req, ALLOWED_SEARCH_FIELDS);

  const sortQuery = buildSortQuery(req, ALLOWED_SORT_FIELDS, "sessionDate");

  const filterQuery = {
    ...searchQuery,
  };

  const cacheKey = `sessions:all:${JSON.stringify({
    query: req.query,
    page,
    limit,
  })}`;

  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Sessions fetched successfully.",
      data: cachedData.data,
      pagination: cachedData.pagination,
    });
  }

  const [sessions, total] = await Promise.all([
    Session.find(filterQuery)
      .populate(populateSessionFields)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),

    Session.countDocuments(filterQuery),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  const data = { sessions };

  await setCache(cacheKey, { data, pagination }, 3600);

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

export const getAllSessionsWithoutPagination = asyncHandler(
  async (req, res) => {
    const searchQuery = buildSearchQuery(req, ALLOWED_SEARCH_FIELDS);

    const sortQuery = buildSortQuery(req, ALLOWED_SORT_FIELDS, "sessionDate");

    const filterQuery = {
      ...searchQuery,
    };

    const cacheKey = `sessions:all:without-pagination:${JSON.stringify(
      req.query,
    )}`;

    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return successResponse(res, {
        statusCode: 200,
        message: "Sessions fetched successfully.",
        data: cachedData,
      });
    }

    const sessions = await Session.find(filterQuery)
      .populate(populateSessionFields)
      .sort(sortQuery)
      .lean();

    const data = { sessions };

    await setCache(cacheKey, data, 3600);

    return successResponse(res, {
      statusCode: 200,
      message: "Sessions fetched successfully.",
      data,
    });
  },
);

// ==========================================
// GET SESSION BY ID
// GET /api/sessions/:id
// ==========================================

export const getSessionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid session ID.",
    });
  }

  const cacheKey = `sessions:single:${id}`;

  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Session fetched successfully.",
      data: cachedData,
    });
  }

  const session = await Session.findById(id)
    .populate(populateSessionFields)
    .lean();

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

  const data = { session };

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
    hallId,
    trackId,
    sessionDate,
    startTime,
    endTime,
    chairperson,
  } = req.body;

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

  // Validate Hall
  if (hallId !== undefined) {
    const hallValidation = await validateHall(hallId);

    if (!hallValidation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: hallValidation.message,
      });
    }

    updateData.hallId = hallValidation.data;
  }

  // Validate Track
  if (trackId !== undefined) {
    const trackValidation = await validateTrack(trackId);

    if (!trackValidation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: trackValidation.message,
      });
    }

    updateData.trackId = trackValidation.data;
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
    const chairpersonValidation = await validateChairpersons(chairperson);

    if (!chairpersonValidation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: chairpersonValidation.message,
      });
    }

    updateData.chairperson = chairpersonValidation.data;
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide at least one field to update.",
    });
  }

  const session = await Session.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

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

  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid session ID.",
    });
  }

  const session = await Session.findByIdAndDelete(id);

  if (!session) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Session not found.",
    });
  }

  await invalidateSessionCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Session deleted successfully.",
    data: { session },
  });
});
