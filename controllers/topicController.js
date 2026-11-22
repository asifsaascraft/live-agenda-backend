import mongoose from "mongoose";

import Topic from "../models/Topic.js";
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

// Invalidate Topic Cache
const invalidateTopicCache = async () => {
  await deleteCacheByPattern("topics:*");
};

// Allowed Search Fields
const ALLOWED_SEARCH_FIELDS = [
  "topicName",
  "startTime",
  "endTime",
  "topicType",
];

// Allowed Sort Fields
const ALLOWED_SORT_FIELDS = [
  "topicName",
  "startTime",
  "endTime",
  "topicType",
  "createdAt",
  "updatedAt",
];

// Allowed Topic Types
const ALLOWED_TOPIC_TYPES = [
  "Talk",
  "Debate",
  "Panel Discussion",
];

// Faculty Population
const populateFacultyFields = [
  {
    path: "facultyId",
    select: "fullName email mobile",
  },
  {
    path: "moderatorId",
    select: "fullName email mobile",
  },
  {
    path: "panelistId",
    select: "fullName email mobile",
  },
  {
    path: "expertPanelistId",
    select: "fullName email mobile",
  },
];

// Session Population, including its chairpersons
const populateSession = {
  path: "sessionId",
  populate: {
    path: "chairperson",
    select: "fullName email mobile",
  },
};

// Validate Topic Name
const isValidTopicName = (topicName) => {
  return (
    typeof topicName === "string" &&
    topicName.trim().length >= 2 &&
    topicName.trim().length <= 100
  );
};

// Validate Time
const isValidTime = (time) => {
  return (
    typeof time === "string" &&
    /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i.test(time.trim())
  );
};

// Validate Session
const validateSession = async (sessionId) => {
  if (!isValidId(sessionId)) {
    return {
      valid: false,
      message: "Invalid session ID.",
    };
  }

  const session = await Session.findById(sessionId)
    .select("_id")
    .lean();

  if (!session) {
    return {
      valid: false,
      message: "Session not found.",
    };
  }

  return {
    valid: true,
    data: session._id,
  };
};

// Validate Faculty ID Arrays
const validateFacultyIds = async (facultyIds, fieldName) => {
  if (!Array.isArray(facultyIds)) {
    return {
      valid: false,
      message: `${fieldName} must be an array.`,
    };
  }

  if (!facultyIds.every((id) => isValidId(id))) {
    return {
      valid: false,
      message: `One or more ${fieldName} IDs are invalid.`,
    };
  }

  const uniqueIds = [...new Set(facultyIds.map(String))];

  if (uniqueIds.length === 0) {
    return {
      valid: true,
      data: [],
    };
  }

  const faculties = await Faculty.find({
    _id: { $in: uniqueIds },
  })
    .select("_id")
    .lean();

  if (faculties.length !== uniqueIds.length) {
    return {
      valid: false,
      message: `One or more ${fieldName} records were not found.`,
    };
  }

  return {
    valid: true,
    data: uniqueIds,
  };
};

// ==========================================
// CREATE TOPIC
// POST /api/topics
// ==========================================

export const createTopic = asyncHandler(async (req, res) => {
  const {
    sessionId,
    topicName,
    startTime,
    endTime,
    topicType,
    facultyId,
    moderatorId,
    panelistId,
    expertPanelistId,
  } = req.body;

  // Validate Topic Name
  if (!isValidTopicName(topicName)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Topic name must be between 2 and 100 characters.",
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

  // Validate Topic Type
  if (
    topicType !== undefined &&
    !ALLOWED_TOPIC_TYPES.includes(topicType)
  ) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid topic type.",
    });
  }

  // Validate Session
  const sessionValidation = await validateSession(sessionId);

  if (!sessionValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: sessionValidation.message,
    });
  }

  // Validate Faculty
  const facultyValidation = await validateFacultyIds(
    facultyId ?? [],
    "Faculty"
  );

  if (!facultyValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: facultyValidation.message,
    });
  }

  // Validate Moderators
  const moderatorValidation = await validateFacultyIds(
    moderatorId ?? [],
    "Moderator"
  );

  if (!moderatorValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: moderatorValidation.message,
    });
  }

  // Validate Panelists
  const panelistValidation = await validateFacultyIds(
    panelistId ?? [],
    "Panelist"
  );

  if (!panelistValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: panelistValidation.message,
    });
  }

  // Validate Expert Panelists
  const expertPanelistValidation = await validateFacultyIds(
    expertPanelistId ?? [],
    "Expert panelist"
  );

  if (!expertPanelistValidation.valid) {
    return errorResponse(res, {
      statusCode: 400,
      message: expertPanelistValidation.message,
    });
  }

  // Create Topic
  const topic = await Topic.create({
    sessionId: sessionValidation.data,
    topicName: topicName.trim(),
    startTime: startTime.trim().toUpperCase(),
    endTime: endTime.trim().toUpperCase(),
    topicType: topicType || "Talk",
    facultyId: facultyValidation.data,
    moderatorId: moderatorValidation.data,
    panelistId: panelistValidation.data,
    expertPanelistId: expertPanelistValidation.data,
  });

  // Invalidate Cache
  await invalidateTopicCache();

  return successResponse(res, {
    statusCode: 201,
    message: "Topic created successfully.",
    data: { topic },
  });
});

// ==========================================
// GET ALL TOPICS WITH PAGINATION
// GET /api/topics
// ==========================================

export const getAllTopics = asyncHandler(async (req, res) => {
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
  const cacheKey = `topics:all:${JSON.stringify({
    query: req.query,
    page,
    limit,
  })}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Topics fetched successfully.",
      data: cachedData.data,
      pagination: cachedData.pagination,
    });
  }

  // Fetch Topics and Total Count
  const [topics, total] = await Promise.all([
    Topic.find(filterQuery)
      .populate(populateFacultyFields)
      .populate(populateSession)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean(),

    Topic.countDocuments(filterQuery),
  ]);

  // Pagination Metadata
  const pagination = buildPaginationMeta(
    total,
    page,
    limit
  );

  const data = { topics };

  // Store in Redis
  await setCache(
    cacheKey,
    { data, pagination },
    3600
  );

  return successResponse(res, {
    statusCode: 200,
    message: "Topics fetched successfully.",
    data,
    pagination,
  });
});

// ==========================================
// GET ALL TOPICS WITHOUT PAGINATION
// GET /api/topics/all
// ==========================================

export const getAllTopicsWithoutPagination =
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
      "createdAt"
    );

    // Filter Query
    const filterQuery = {
      ...searchQuery,
    };

    // Redis Cache Key
    const cacheKey = `topics:all:without-pagination:${JSON.stringify(
      req.query
    )}`;

    // Check Cache
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
      return successResponse(res, {
        statusCode: 200,
        message: "Topics fetched successfully.",
        data: cachedData,
      });
    }

    // Fetch All Topics
    const topics = await Topic.find(filterQuery)
      .populate(populateFacultyFields)
      .populate(populateSession)
      .sort(sortQuery)
      .lean();

    const data = { topics };

    // Store in Redis
    await setCache(cacheKey, data, 3600);

    return successResponse(res, {
      statusCode: 200,
      message: "Topics fetched successfully.",
      data,
    });
  });

// ==========================================
// GET TOPIC BY ID
// GET /api/topics/:id
// ==========================================

export const getTopicById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid topic ID.",
    });
  }

  // Redis Cache Key
  const cacheKey = `topics:single:${id}`;

  // Check Cache
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return successResponse(res, {
      statusCode: 200,
      message: "Topic fetched successfully.",
      data: cachedData,
    });
  }

  // Find Topic and Populate References
  const topic = await Topic.findById(id)
    .populate(populateFacultyFields)
    .populate(populateSession)
    .lean();

  if (!topic) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Topic not found.",
    });
  }

  const data = { topic };

  // Store in Redis
  await setCache(cacheKey, data, 3600);

  return successResponse(res, {
    statusCode: 200,
    message: "Topic fetched successfully.",
    data,
  });
});

// ==========================================
// UPDATE TOPIC
// PUT /api/topics/:id
// ==========================================

export const updateTopic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    sessionId,
    topicName,
    startTime,
    endTime,
    topicType,
    facultyId,
    moderatorId,
    panelistId,
    expertPanelistId,
  } = req.body;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid topic ID.",
    });
  }

  const updateData = {};

  // Validate Session
  if (sessionId !== undefined) {
    const sessionValidation = await validateSession(sessionId);

    if (!sessionValidation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: sessionValidation.message,
      });
    }

    updateData.sessionId = sessionValidation.data;
  }

  // Validate Topic Name
  if (topicName !== undefined) {
    if (!isValidTopicName(topicName)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Topic name must be between 2 and 100 characters.",
      });
    }

    updateData.topicName = topicName.trim();
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

  // Validate Topic Type
  if (topicType !== undefined) {
    if (!ALLOWED_TOPIC_TYPES.includes(topicType)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid topic type.",
      });
    }

    updateData.topicType = topicType;
  }

  // Validate Faculty
  if (facultyId !== undefined) {
    const validation = await validateFacultyIds(
      facultyId,
      "Faculty"
    );

    if (!validation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: validation.message,
      });
    }

    updateData.facultyId = validation.data;
  }

  // Validate Moderators
  if (moderatorId !== undefined) {
    const validation = await validateFacultyIds(
      moderatorId,
      "Moderator"
    );

    if (!validation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: validation.message,
      });
    }

    updateData.moderatorId = validation.data;
  }

  // Validate Panelists
  if (panelistId !== undefined) {
    const validation = await validateFacultyIds(
      panelistId,
      "Panelist"
    );

    if (!validation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: validation.message,
      });
    }

    updateData.panelistId = validation.data;
  }

  // Validate Expert Panelists
  if (expertPanelistId !== undefined) {
    const validation = await validateFacultyIds(
      expertPanelistId,
      "Expert panelist"
    );

    if (!validation.valid) {
      return errorResponse(res, {
        statusCode: 400,
        message: validation.message,
      });
    }

    updateData.expertPanelistId = validation.data;
  }

  // Check Empty Update
  if (Object.keys(updateData).length === 0) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please provide at least one field to update.",
    });
  }

  // Update Topic
  const topic = await Topic.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!topic) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Topic not found.",
    });
  }

  // Invalidate Cache
  await invalidateTopicCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Topic updated successfully.",
    data: { topic },
  });
});

// ==========================================
// DELETE TOPIC
// DELETE /api/topics/:id
// ==========================================

export const deleteTopic = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!isValidId(id)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid topic ID.",
    });
  }

  // Delete Topic
  const topic = await Topic.findByIdAndDelete(id);

  if (!topic) {
    return errorResponse(res, {
      statusCode: 404,
      message: "Topic not found.",
    });
  }

  // Invalidate Cache
  await invalidateTopicCache();

  return successResponse(res, {
    statusCode: 200,
    message: "Topic deleted successfully.",
    data: { topic },
  });
});