const express = require("express");
const router = express.Router();

const {requestHistory, usageSummary, requestDetails} = require("../controllers/viewLogs");

router.post("/request-history/", requestHistory);
router.post("/usage-summary/", usageSummary);
router.get("/request-details/:requestId/:key", requestDetails);

module.exports = router;
