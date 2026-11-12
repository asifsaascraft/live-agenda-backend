
import authPaths from "./auth.swagger.js";
import hallPaths from "./hall.swagger.js";
import trackPaths from "./track.swagger.js";
import facultyPaths from "./faculty.swagger.js";
import sessionPaths from "./session.swagger.js";

const paths = {
  ...authPaths,
  ...hallPaths,
  ...trackPaths,
  ...facultyPaths,
  ...sessionPaths,

  // Add future module paths here.
};

export default paths;
