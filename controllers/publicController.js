
import mongoose from "mongoose";

import Faculty from "../models/Faculty.js";
import Hall from "../models/Hall.js";
import Track from "../models/Track.js";
import Session from "../models/Session.js";
import Topic from "../models/Topic.js";

import asyncHandler from "../utils/asyncHandler.js";

import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

import {
  getPagination,
  buildPaginationMeta,
} from "../utils/pagination.js";

// ==========================================
// COMMON HELPERS
// ==========================================

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRegex = (value) =>
  new RegExp(escapeRegex(value.trim()), "i");

// Public Faculty population: name only
const publicFacultyPopulation = [
  { path: "chairperson", select: "fullName" },
  { path: "facultyId", select: "fullName" },
  { path: "moderatorId", select: "fullName" },
  { path: "panelistId", select: "fullName" },
  { path: "expertPanelistId", select: "fullName" },
];

// Public Session population
const publicSessionPopulation = [
  { path: "hallId", select: "hallName" },
  { path: "trackId", select: "trackName" },
  { path: "chairperson", select: "fullName" },
];

// Public Topic population
const publicTopicPopulation = [
  {
    path: "sessionId",
    populate: [
      { path: "hallId", select: "hallName" },
      { path: "trackId", select: "trackName" },
      { path: "chairperson", select: "fullName" },
    ],
  },
  ...publicFacultyPopulation.filter(
    (item) => item.path !== "chairperson"
  ),
];

// Validate date in YYYY-MM-DD format.
// Session dates are interpreted in Indian Standard Time.
const getIndianDateRange = (date) => {
  if (
    typeof date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return null;
  }

  const start = new Date(`${date}T00:00:00+05:30`);

  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return {
    $gte: start,
    $lt: nextDay,
  };
};

const getIndianDateString = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

// Get Session IDs matching Topic filters
const getSessionIdsByTopicFilters = async ({
  topicType,
  facultyId,
}) => {
  const topicQuery = {};

  if (topicType) {
    topicQuery.topicType = topicType;
  }

  if (facultyId) {
    topicQuery.$or = [
      { facultyId },
      { moderatorId: facultyId },
      { panelistId: facultyId },
      { expertPanelistId: facultyId },
    ];
  }

  const topics = await Topic.find(topicQuery)
    .select("sessionId")
    .lean();

  return [
    ...new Set(
      topics.map((topic) => String(topic.sessionId))
    ),
  ];
};

// ==========================================
// GET PUBLIC HALLS
// GET /api/public/halls
// ==========================================

export const getPublicHalls = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const filterQuery = {
    status: "Active",
  };

  if (search) {
    filterQuery.hallName = buildRegex(search);
  }

  const halls = await Hall.find(filterQuery)
    .select("hallName status")
    .sort({ hallName: 1 })
    .lean();

  return successResponse(res, {
    statusCode: 200,
    message: "Public Halls fetched successfully.",
    data: { halls },
  });
});

// ==========================================
// GET PUBLIC TRACKS
// GET /api/public/tracks
// ==========================================

export const getPublicTracks = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const filterQuery = {
    status: "Active",
  };

  if (search) {
    filterQuery.trackName = buildRegex(search);
  }

  const tracks = await Track.find(filterQuery)
    .select("trackName status")
    .sort({ trackName: 1 })
    .lean();

  return successResponse(res, {
    statusCode: 200,
    message: "Public Tracks fetched successfully.",
    data: { tracks },
  });
});




// ==========================================
// GET PUBLIC faculties
// GET /api/public/faculties
// ==========================================

export const getPublicFaculties = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const filterQuery = {};

  if (search && search.trim()) {
    filterQuery.fullName = buildRegex(search);
  }

  const faculties = await Faculty.find(filterQuery)
    .select("fullName")
    .sort({ fullName: 1 })
    .lean();

  return successResponse(res, {
    statusCode: 200,
    message: "Public Faculties fetched successfully.",
    data: { faculties },
  });
});


// ==========================================
// GET PUBLIC SCHEDULE DATES
// GET /api/public/dates
// ==========================================

export const getPublicScheduleDates = asyncHandler(
  async (req, res) => {
    const sessions = await Session.find()
      .select("sessionDate hallId trackId")
      .populate({
        path: "hallId",
        match: { status: "Active" },
        select: "hallName",
      })
      .populate({
        path: "trackId",
        match: { status: "Active" },
        select: "trackName",
      })
      .lean();

    const dates = [
      ...new Set(
        sessions
          .filter((session) => session.hallId && session.trackId)
          .map((session) =>
            getIndianDateString(session.sessionDate)
          )
      ),
    ].sort();

    return successResponse(res, {
      statusCode: 200,
      message: "Schedule dates fetched successfully.",
      data: { dates },
    });
  }
);

// ==========================================
// GET COMPLETE PUBLIC SCHEDULE
// GET /api/public/schedule
// ==========================================

export const getPublicSchedule = asyncHandler(
  async (req, res) => {
    const {
      date,
      hallId,
      trackId,
      sessionId,
      topicType,
      facultyId,
      search,
    } = req.query;

    const sessionFilter = {};

    // Validate Hall ID
    if (hallId) {
      if (!isValidId(hallId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Hall ID.",
        });
      }

      sessionFilter.hallId = hallId;
    }

    // Validate Track ID
    if (trackId) {
      if (!isValidId(trackId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Track ID.",
        });
      }

      sessionFilter.trackId = trackId;
    }

    // Validate Session ID
    if (sessionId) {
      if (!isValidId(sessionId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Session ID.",
        });
      }

      sessionFilter._id = sessionId;
    }

    // Filter by Indian local date
    if (date) {
      const dateRange = getIndianDateRange(date);

      if (!dateRange) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      sessionFilter.sessionDate = dateRange;
    }

    // Topic filters
    if (topicType || facultyId) {
      if (
        facultyId &&
        !isValidId(facultyId)
      ) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Faculty ID.",
        });
      }

      const matchingSessionIds =
        await getSessionIdsByTopicFilters({
          topicType,
          facultyId,
        });

      if (matchingSessionIds.length === 0) {
        return successResponse(res, {
          statusCode: 200,
          message: "Schedule fetched successfully.",
          data: { schedule: [] },
        });
      }

      sessionFilter._id = {
        ...(sessionFilter._id &&
        typeof sessionFilter._id === "object"
          ? sessionFilter._id
          : {}),
        $in: matchingSessionIds,
      };
    }

    // Search in Session names or Topic names
    if (search && search.trim()) {
      const regex = buildRegex(search);

      const [matchingSessions, matchingTopics] =
        await Promise.all([
          Session.find({
            $or: [
              { sessionName: regex },
              { startTime: regex },
              { endTime: regex },
            ],
          })
            .select("_id")
            .lean(),

          Topic.find({ topicName: regex })
            .select("sessionId")
            .lean(),
        ]);

      const searchSessionIds = [
        ...matchingSessions.map((item) => String(item._id)),
        ...matchingTopics.map((item) =>
          String(item.sessionId)
        ),
      ];

      const uniqueSearchIds = [
        ...new Set(searchSessionIds),
      ];

      if (uniqueSearchIds.length === 0) {
        return successResponse(res, {
          statusCode: 200,
          message: "Schedule fetched successfully.",
          data: { schedule: [] },
        });
      }

      const existingIdFilter = sessionFilter._id;

      if (existingIdFilter) {
        const allowedIds = Array.isArray(existingIdFilter.$in)
          ? existingIdFilter.$in.map(String)
          : [String(existingIdFilter)];

        const intersection = uniqueSearchIds.filter((id) =>
          allowedIds.includes(id)
        );

        sessionFilter._id = { $in: intersection };
      } else {
        sessionFilter._id = {
          $in: uniqueSearchIds,
        };
      }
    }

    // Fetch only Sessions whose Hall and Track are Active
    const sessions = await Session.find(sessionFilter)
      .populate({
        path: "hallId",
        match: { status: "Active" },
        select: "hallName",
      })
      .populate({
        path: "trackId",
        match: { status: "Active" },
        select: "trackName",
      })
      .populate({
        path: "chairperson",
        select: "fullName",
      })
      .sort({
        sessionDate: 1,
        startTime: 1,
      })
      .lean();

    const activeSessions = sessions.filter(
      (session) => session.hallId && session.trackId
    );

    if (activeSessions.length === 0) {
      return successResponse(res, {
        statusCode: 200,
        message: "Schedule fetched successfully.",
        data: { schedule: [] },
      });
    }

    const activeSessionIds = activeSessions.map(
      (session) => session._id
    );

    const topicFilter = {
      sessionId: { $in: activeSessionIds },
    };

    if (topicType) {
      topicFilter.topicType = topicType;
    }

    if (facultyId) {
      topicFilter.$or = [
        { facultyId },
        { moderatorId: facultyId },
        { panelistId: facultyId },
        { expertPanelistId: facultyId },
      ];
    }

    if (search && search.trim()) {
      topicFilter.topicName = buildRegex(search);
    }

    const topics = await Topic.find(topicFilter)
      .populate([
        { path: "facultyId", select: "fullName" },
        { path: "moderatorId", select: "fullName" },
        { path: "panelistId", select: "fullName" },
        { path: "expertPanelistId", select: "fullName" },
      ])
      .sort({ startTime: 1 })
      .lean();

    const topicsBySession = new Map();

    for (const topic of topics) {
      const key = String(topic.sessionId);

      if (!topicsBySession.has(key)) {
        topicsBySession.set(key, []);
      }

      topicsBySession.get(key).push(topic);
    }

    // Build date -> Hall -> Track -> Session -> Topic hierarchy
    const dateGroups = new Map();

    for (const session of activeSessions) {
      const dateKey = getIndianDateString(
        session.sessionDate
      );

      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, new Map());
      }

      const hallGroups = dateGroups.get(dateKey);
      const hallKey = String(session.hallId._id);

      if (!hallGroups.has(hallKey)) {
        hallGroups.set(hallKey, {
          hall: session.hallId,
          tracks: new Map(),
        });
      }

      const trackGroups = hallGroups.get(hallKey).tracks;
      const trackKey = String(session.trackId._id);

      if (!trackGroups.has(trackKey)) {
        trackGroups.set(trackKey, {
          track: session.trackId,
          sessions: [],
        });
      }

      trackGroups.get(trackKey).sessions.push({
        ...session,
        topics:
          topicsBySession.get(String(session._id)) || [],
      });
    }

    const schedule = Array.from(
      dateGroups.entries()
    ).map(([scheduleDate, hallGroups]) => ({
      date: scheduleDate,

      halls: Array.from(hallGroups.values()).map(
        (hallGroup) => ({
          hall: hallGroup.hall,

          tracks: Array.from(
            hallGroup.tracks.values()
          ),
        })
      ),
    }));

    return successResponse(res, {
      statusCode: 200,
      message: "Public schedule fetched successfully.",
      data: { schedule },
    });
  }
);

// ==========================================
// GET PUBLIC SESSIONS WITH PAGINATION
// GET /api/public/sessions
// ==========================================

export const getPublicSessions = asyncHandler(
  async (req, res) => {
    const {
      date,
      hallId,
      trackId,
      search,
      topicType,
      facultyId,
    } = req.query;

    const { page, limit, skip } = getPagination(req);

    const filterQuery = {};

    if (hallId) {
      if (!isValidId(hallId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Hall ID.",
        });
      }

      filterQuery.hallId = hallId;
    }

    if (trackId) {
      if (!isValidId(trackId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Track ID.",
        });
      }

      filterQuery.trackId = trackId;
    }

    if (date) {
      const dateRange = getIndianDateRange(date);

      if (!dateRange) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid date. Use YYYY-MM-DD format.",
        });
      }

      filterQuery.sessionDate = dateRange;
    }

    if (topicType || facultyId) {
      if (facultyId && !isValidId(facultyId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Faculty ID.",
        });
      }

      const matchingIds = await getSessionIdsByTopicFilters({
        topicType,
        facultyId,
      });

      filterQuery._id = { $in: matchingIds };
    }

    if (search && search.trim()) {
      const regex = buildRegex(search);

      const [sessionMatches, topicMatches] =
        await Promise.all([
          Session.find({
            $or: [
              { sessionName: regex },
              { startTime: regex },
              { endTime: regex },
            ],
          }).select("_id").lean(),

          Topic.find({ topicName: regex })
            .select("sessionId")
            .lean(),
        ]);

      const matchingIds = [
        ...new Set([
          ...sessionMatches.map((item) => String(item._id)),
          ...topicMatches.map((item) =>
            String(item.sessionId)
          ),
        ]),
      ];

      if (filterQuery._id) {
        const allowed = new Set(
          filterQuery._id.$in.map(String)
        );

        filterQuery._id.$in = matchingIds.filter((id) =>
          allowed.has(id)
        );
      } else {
        filterQuery._id = { $in: matchingIds };
      }
    }

    const [sessions, total] = await Promise.all([
      Session.find(filterQuery)
        .populate({
          path: "hallId",
          match: { status: "Active" },
          select: "hallName",
        })
        .populate({
          path: "trackId",
          match: { status: "Active" },
          select: "trackName",
        })
        .populate({
          path: "chairperson",
          select: "fullName",
        })
        .sort({ sessionDate: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Session.countDocuments(filterQuery),
    ]);

    const activeSessions = sessions.filter(
      (session) => session.hallId && session.trackId
    );

    const pagination = buildPaginationMeta(
      total,
      page,
      limit
    );

    return successResponse(res, {
      statusCode: 200,
      message: "Public sessions fetched successfully.",
      data: { sessions: activeSessions },
      pagination,
    });
  }
);

// ==========================================
// GET PUBLIC SESSION BY ID
// GET /api/public/sessions/:id
// ==========================================

export const getPublicSessionById = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid Session ID.",
      });
    }

    const session = await Session.findById(id)
      .populate({
        path: "hallId",
        match: { status: "Active" },
        select: "hallName",
      })
      .populate({
        path: "trackId",
        match: { status: "Active" },
        select: "trackName",
      })
      .populate({
        path: "chairperson",
        select: "fullName",
      })
      .lean();

    if (
      !session ||
      !session.hallId ||
      !session.trackId
    ) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Session not found.",
      });
    }

    const topics = await Topic.find({
      sessionId: id,
    })
      .populate([
        { path: "facultyId", select: "fullName" },
        { path: "moderatorId", select: "fullName" },
        { path: "panelistId", select: "fullName" },
        { path: "expertPanelistId", select: "fullName" },
      ])
      .sort({ startTime: 1 })
      .lean();

    return successResponse(res, {
      statusCode: 200,
      message: "Public session fetched successfully.",
      data: {
        session: {
          ...session,
          topics,
        },
      },
    });
  }
);


// ==========================================
// GET PUBLIC TOPICS WITHOUT PAGINATION
// GET /api/public/topics
// ==========================================

export const getPublicTopics = asyncHandler(
  async (req, res) => {
    const {
      search,
      topicType,
      sessionId,
      hallId,
      trackId,
      date,
      facultyId,
    } = req.query;

    const filterQuery = {};

    if (
      ![
        undefined,
        "Talk",
        "Debate",
        "Panel Discussion",
      ].includes(topicType)
    ) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid topicType.",
      });
    }

    if (topicType) {
      filterQuery.topicType = topicType;
    }

    if (search && search.trim()) {
      filterQuery.topicName = buildRegex(search);
    }

    if (facultyId) {
      if (!isValidId(facultyId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Faculty ID.",
        });
      }

      filterQuery.$or = [
        { facultyId },
        { moderatorId: facultyId },
        { panelistId: facultyId },
        { expertPanelistId: facultyId },
      ];
    }

    if (sessionId) {
      if (!isValidId(sessionId)) {
        return errorResponse(res, {
          statusCode: 400,
          message: "Invalid Session ID.",
        });
      }

      filterQuery.sessionId = sessionId;
    }

    // Resolve Hall, Track, and Date filters through Session
    if (hallId || trackId || date) {
      const sessionFilter = {};

      if (hallId) {
        if (!isValidId(hallId)) {
          return errorResponse(res, {
            statusCode: 400,
            message: "Invalid Hall ID.",
          });
        }

        sessionFilter.hallId = hallId;
      }

      if (trackId) {
        if (!isValidId(trackId)) {
          return errorResponse(res, {
            statusCode: 400,
            message: "Invalid Track ID.",
          });
        }

        sessionFilter.trackId = trackId;
      }

      if (date) {
        const dateRange = getIndianDateRange(date);

        if (!dateRange) {
          return errorResponse(res, {
            statusCode: 400,
            message: "Invalid date. Use YYYY-MM-DD format.",
          });
        }

        sessionFilter.sessionDate = dateRange;
      }

      const matchingSessions = await Session.find(sessionFilter)
        .select("_id")
        .populate({
          path: "hallId",
          match: { status: "Active" },
          select: "_id",
        })
        .populate({
          path: "trackId",
          match: { status: "Active" },
          select: "_id",
        })
        .lean();

      const matchingSessionIds = matchingSessions
        .filter((session) => session.hallId && session.trackId)
        .map((session) => session._id);

      if (filterQuery.sessionId) {
        if (
          !matchingSessionIds.some(
            (id) => String(id) === String(filterQuery.sessionId)
          )
        ) {
          filterQuery.sessionId = {
            $in: [],
          };
        }
      } else {
        filterQuery.sessionId = {
          $in: matchingSessionIds,
        };
      }
    }

    // Fetch all matching public topics
    const topics = await Topic.find(filterQuery)
      .populate(publicTopicPopulation)
      .sort({ startTime: 1 })
      .lean();

    const publicTopics = topics.filter(
      (topic) =>
        topic.sessionId &&
        topic.sessionId.hallId &&
        topic.sessionId.trackId
    );

    return successResponse(res, {
      statusCode: 200,
      message: "Public topics fetched successfully.",
      data: {
        topics: publicTopics,
      },
    });
  }
);



// ==========================================
// GET PUBLIC TOPIC BY ID
// GET /api/public/topics/:id
// ==========================================

export const getPublicTopicById = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid Topic ID.",
      });
    }

    const topic = await Topic.findById(id)
      .populate(publicTopicPopulation)
      .lean();

    if (
      !topic ||
      !topic.sessionId ||
      !topic.sessionId.hallId ||
      !topic.sessionId.trackId
    ) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Topic not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Public topic fetched successfully.",
      data: { topic },
    });
  }
);
