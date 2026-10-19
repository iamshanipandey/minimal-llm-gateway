Minimal LLM Gateway

A lightweight LLM Gateway built with Node.js, Express.js, MongoDB, and Google Gemini.

The gateway sits between a client and an LLM provider. Instead of exposing the provider's API key to the client, it uses virtual API keys to identify users, enforce spending limits, calculate usage costs, and maintain request logs.

Features: 

    Virtual API keys with SHA-256 hashing.

    Gemini API integration.

    Per-user budget enforcement.

    Estimated cost reservation before provider calls.

    Token usage and cost calculation.

    Request history and usage summaries.

    Request-level logging in MongoDB.

    Atomic budget reservation to handle concurrent requests.

    Non-streaming responses.


Tech Stack: 

    Node.js

    Express.js

    MongoDB

    Mongoose

    Google Gemini API

    dotenv

    crypto


Project Structure

LLM-GATEWAY/
├── config/
│   ├── db.js
│   └── modelRegistry.js
├── controllers/
│   ├── chatController.js
│   ├── llmCall.js
│   └── viewLogs.js
├── models/
│   ├── UsageLog.js
│   └── User.js
├── routes/
│   ├── chatRoutes.js
│   └── logsRoutes.js
├── scripts/
│   └── createKey.js
├── utils/
├── .env
├── .gitignore
├── example.env
├── package.json
├── package-lock.json
├── server.js
├── testConcurrency.js
├── DECISIONS.md
├── AI-LOG.md
└── README.md

Prerequisites

Before running the project, install:

    Node.js and npm

    MongoDB, either locally or through MongoDB Atlas

    A Google Gemini API key


1. Clone and Install

git clone https://github.com/iamshanipandey/minimal-llm-gateway
cd <YOUR_REPOSITORY_FOLDER>
npm install

If your package.json is inside the backend folder, run the installation and subsequent commands from that folder:

cd backend
npm install

2. Configure Environment Variables

Create a .env file using .env.example as a reference.

Example configuration:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key

Use the exact environment variable names defined in your project's .env.example and source code.

Never commit your actual .env file or expose the Gemini API key in client-side code.


3. Start the Server

Run the command from the directory containing your backend package.json:

npm start

If no start script is configured, use:

node index.js

For development, if Nodemon is installed:

npx nodemon index.js

The server should start on the configured port.


4. Generate a Virtual API Key

The project includes a script for creating a virtual API key.

Run it from the backend directory:

node scripts/createKey.js

The script connects to MongoDB, generates a random virtual key, stores its SHA-256 hash, and prints the original key.

Save the generated key securely. It should be treated like a password because anyone possessing it may be able to use the associated budget.

Important: The original key is shown when it is generated. The database stores its hash rather than the original key.


5. Make an LLM Request

Endpoint

POST /api/v1/chat/complete

Request body

{
  "key": "YOUR_VIRTUAL_API_KEY",
  "llmModel": "gemini-3.5-flash-lite",
  "question": "Explain Node.js in simple words."
}

Replace YOUR_VIRTUAL_API_KEY with the key generated in the previous step. Use a model name supported by your model registry and Gemini integration.

Expected behavior

If the key is valid, the user is active, and sufficient budget is available, the gateway calls Gemini and returns the generated answer.

The gateway also calculates the request cost and records usage information.

If the key is invalid or the available budget is insufficient, the request is rejected instead of making an unnecessary provider call.

The exact response fields and status codes depend on the controller implementation.



6. Usage and Request Logs

The project includes endpoints for viewing request history, aggregated usage, and individual request details.

A. Request History

Method: POST

Route: /request-history/ under the logs router.

This endpoint retrieves a user's request history with pagination.

Example request body:

{
  "key": "YOUR_VIRTUAL_API_KEY"
}

Pagination is controlled through query parameters:

?page=1&limit=10

Example URL, assuming the logs router is mounted at /api/v1/logs:

POST /api/v1/logs/request-history/?page=1&limit=10

B. Usage Summary

Method: POST

Route: /usage-summary/ under the logs router.

Example request body:

{
  "key": "YOUR_VIRTUAL_API_KEY"
}

This endpoint returns aggregated usage information, such as request counts, token usage, and total recorded cost, according to the aggregation implemented in the controller.

C. Request Details

Method: GET

Route: /request-details/:requestId/:key under the logs router, according to the current route definition.

Example:

GET /api/v1/logs/request-details/REQUEST_ID/YOUR_VIRTUAL_API_KEY

This example assumes that the logs router is mounted at /api/v1/logs.

Security note: Passing a virtual key in a URL path can expose it through logs and browser history. A safer design is to send the key in a request body or use authentication middleware. If you change the route, update this documentation accordingly.



7. Budget Enforcement

Before sending a request to Gemini, the gateway checks the user's available budget.

The general flow is:

Validate the virtual API key.

Find the associated user.

Check whether the user is active and has sufficient budget.

Estimate the request cost.

Reserve the estimated cost atomically.

Call Gemini.

Calculate the actual cost from the returned usage.

Update the user's spending and release the reservation.

Store the request details in the usage log.

If the budget is insufficient, the gateway rejects the request. This prevents callers from bypassing budget checks by controlling their own client-side logic.



8. Error Handling

Depending on the condition, a request may fail because of:

Missing or invalid request fields.

An invalid virtual API key.

An inactive user.

Insufficient available budget.

An unsupported model.

A provider API failure.

A database or internal server error.

The gateway is designed to enforce budgets before making provider calls and record request usage or failures where supported by the current implementation.



9. Testing Checklist

Use the following checklist when testing the gateway:

Start the backend and confirm the database connection works.

Generate a virtual API key using node scripts/createKey.js.

Send a valid question to /api/v1/chat/complete.

Verify that the generated answer is returned.

Send a request with an invalid key.

Send a request after the available budget has been exhausted.

Check that usage and cost are recorded.

Retrieve request history.

Retrieve the usage summary.

Retrieve the details of a particular request.

Send two parallel requests when the remaining budget only allows one and verify the budget enforcement behavior.

Test provider failures and confirm that reserved budget is handled correctly.

Only mark a test as passed after actually running it.



10. Limitations and Future Improvements

The current implementation focuses on a working gateway with one LLM provider.

Possible improvements include:

Integrating additional LLM providers.

Implementing automatic provider fallback.

Improving recovery of budget reservations after unexpected server crashes.

Adding more automated tests for provider failures and concurrent requests.

Improving monitoring and provider-specific error reporting.

Adding authenticated administrative endpoints for usage and budget management.



11. Documentation

DECISIONS.md — architecture, trade-offs, budget enforcement, concurrency, and fallback decisions.

AI-LOG.md — AI tools used, suggestions evaluated, and lessons learned.
