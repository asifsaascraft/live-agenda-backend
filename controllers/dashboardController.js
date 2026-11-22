
import asyncHandler from "../utils/asyncHandler.js";
import { successResponse } from "../utils/response.js";

import Faculty from "../models/Faculty.js";
import Hall from "../models/Hall.js";
import Session from "../models/Session.js";
import Topic from "../models/Topic.js";
import Track from "../models/Track.js";

// ==========================================
// DASHBOARD POPULATE CONFIGURATION
// ==========================================

const sessionPopulate = [
  {
    path: "hallId",
    select: "hallName status",
  },
  {
    path: "trackId",
    select: "trackName status",
  },
  {
    path: "chairperson",
    select: "fullName email",
  },
];

const topicFacultyPopulate = [
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

const topicSessionPopulate = {
  path: "sessionId",
  select: "sessionName sessionDate startTime endTime hallId trackId",
  populate: [
    {
      path: "hallId",
      select: "hallName",
    },
    {
      path: "trackId",
      select: "trackName",
    },
  ],
};

// ==========================================
// DASHBOARD DISTRIBUTION HELPERS
// ==========================================

const getSessionsByReference = async (field, Model, nameField) => {
  const results = await Session.aggregate([
    {
      $group: {
        _id: `$${field}`,
        sessionCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: Model.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "reference",
      },
    },
    {
      $unwind: {
        path: "$reference",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        name: {
          $ifNull: [`$reference.${nameField}`, "Unassigned"],
        },
        sessionCount: 1,
      },
    },
    {
      $sort: {
        sessionCount: -1,
        name: 1,
      },
    },
  ]);

  return results;
};

// ==========================================
// FACULTY ASSIGNMENT AGGREGATION
// ==========================================

const getFacultyAssignmentOverview = async () => {
  const results = await Topic.aggregate([
    {
      $project: {
        assignments: {
          $concatArrays: [
            {
              $map: {
                input: { $ifNull: ["$facultyId", []] },
                as: "id",
                in: {
                  facultyId: "$$id",
                  role: "Faculty",
                },
              },
            },
            {
              $map: {
                input: { $ifNull: ["$moderatorId", []] },
                as: "id",
                in: {
                  facultyId: "$$id",
                  role: "Moderator",
                },
              },
            },
            {
              $map: {
                input: { $ifNull: ["$panelistId", []] },
                as: "id",
                in: {
                  facultyId: "$$id",
                  role: "Panelist",
                },
              },
            },
            {
              $map: {
                input: { $ifNull: ["$expertPanelistId", []] },
                as: "id",
                in: {
                  facultyId: "$$id",
                  role: "Expert Panelist",
                },
              },
            },
          ],
        },
      },
    },
    {
      $unwind: "$assignments",
    },
    {
      $group: {
        _id: "$assignments.role",
        totalAssignments: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        role: "$_id",
        totalAssignments: 1,
      },
    },
    {
      $sort: {
        totalAssignments: -1,
      },
    },
  ]);

  return results;
};

const getTopAssignedFaculty = async () => {
  const results = await Topic.aggregate([
    {
      $project: {
        assignments: {
          $concatArrays: [
            { $ifNull: ["$facultyId", []] },
            { $ifNull: ["$moderatorId", []] },
            { $ifNull: ["$panelistId", []] },
            { $ifNull: ["$expertPanelistId", []] },
          ],
        },
      },
    },
    {
      $unwind: "$assignments",
    },
    {
      $group: {
        _id: "$assignments",
        totalAssignments: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: Faculty.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "faculty",
      },
    },
    {
      $unwind: "$faculty",
    },
    {
      $project: {
        _id: 0,
        facultyId: "$faculty._id",
        fullName: "$faculty.fullName",
        email: "$faculty.email",
        mobile: "$faculty.mobile",
        totalAssignments: 1,
      },
    },
    {
      $sort: {
        totalAssignments: -1,
        fullName: 1,
      },
    },
    {
      $limit: 10,
    },
  ]);

  return results;
};

// ==========================================
// GET DASHBOARD
// GET /api/dashboard
// ==========================================

export const getDashboard = asyncHandler(async (req, res) => {
  // Use UTC calendar boundaries consistently.
  // If your dashboard should follow Asia/Kolkata calendar days,
  // adjust these boundaries to that timezone.
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  // ==========================================
  // RUN DASHBOARD QUERIES IN PARALLEL
  // ==========================================

  const [
    totalSessions,
    totalTopics,
    totalFaculty,
    totalHalls,
    totalTracks,

    activeHalls,
    inactiveHalls,
    activeTracks,
    inactiveTracks,

    todaySessions,
    upcomingSessionsCount,
    pastSessions,

    sessionsByHall,
    sessionsByTrack,

    topicsByType,
    facultyAssignmentsByRole,
    topAssignedFaculty,

    upcomingSessions,
    recentSessions,
    recentTopics,
  ] = await Promise.all([
    // Summary counts
    Session.countDocuments(),
    Topic.countDocuments(),
    Faculty.countDocuments(),
    Hall.countDocuments(),
    Track.countDocuments(),

    // Hall and Track status
    Hall.countDocuments({ status: "Active" }),
    Hall.countDocuments({ status: "Inactive" }),
    Track.countDocuments({ status: "Active" }),
    Track.countDocuments({ status: "Inactive" }),

    // Schedule overview
    Session.countDocuments({
      sessionDate: {
        $gte: startOfToday,
        $lt: startOfTomorrow,
      },
    }),

    Session.countDocuments({
      sessionDate: {
        $gte: startOfTomorrow,
      },
    }),

    Session.countDocuments({
      sessionDate: {
        $lt: startOfToday,
      },
    }),

    // Session distributions
    getSessionsByReference("hallId", Hall, "hallName"),
    getSessionsByReference("trackId", Track, "trackName"),

    // Topic type distribution
    Topic.aggregate([
      {
        $group: {
          _id: "$topicType",
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          topicType: { $ifNull: ["$_id", "Unspecified"] },
          total: 1,
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
    ]),

    // Faculty assignment distribution
    getFacultyAssignmentOverview(),
    getTopAssignedFaculty(),

    // Next 8 sessions
    Session.find({
      sessionDate: {
        $gte: startOfToday,
      },
    })
      .populate(sessionPopulate)
      .sort({
        sessionDate: 1,
        createdAt: -1,
      })
      .limit(8)
      .lean(),

    // Latest 5 sessions
    Session.find()
      .populate(sessionPopulate)
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    // Latest 8 topics
    Topic.find()
      .populate(topicFacultyPopulate)
      .populate(topicSessionPopulate)
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  // ==========================================
  // RESPONSE
  // ==========================================

  const data = {
    generatedAt: now,

    summary: {
      totalSessions,
      totalTopics,
      totalFaculty,
      totalHalls,
      totalTracks,
    },

    statusOverview: {
      halls: {
        total: totalHalls,
        active: activeHalls,
        inactive: inactiveHalls,
      },

      tracks: {
        total: totalTracks,
        active: activeTracks,
        inactive: inactiveTracks,
      },
    },

    scheduleOverview: {
      todaySessions,
      upcomingSessions: upcomingSessionsCount,
      pastSessions,
    },

    distributions: {
      sessionsByHall,
      sessionsByTrack,
      topicsByType,
      facultyAssignmentsByRole,
      topAssignedFaculty,
    },

    lists: {
      upcomingSessions,
      recentSessions,
      recentTopics,
    },
  };

  return successResponse(res, {
    statusCode: 200,
    message: "Dashboard fetched successfully.",
    data,
  });
});
