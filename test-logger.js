const { logger } = require("./app/lib/logger.js");

logger.info("Test info message");
logger.error("Test error message");
logger.warn("Test warning message");

logger.info({ userId: "123", action: "login" }, "User logged in");
